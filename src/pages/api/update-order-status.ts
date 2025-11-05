// src/pages/api/update-order-status.ts
import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { z } from 'zod';

// Valid order statuses
const validStatuses = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1).max(255),
  status: z.enum(validStatuses),
  adminNotes: z.string().max(1000).optional(),
});

/**
 * Update order status (Admin only)
 *
 * SECURITY:
 * - CSRF protection
 * - Requires authentication (TODO: Add admin role check)
 * - Validates order exists
 * - Logs all status changes
 */
export const POST: APIRoute = async ({ request }) => {
  // SECURITY: CSRF protection
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    console.warn('[update-order-status] CSRF validation failed:', csrfCheck.reason);
    return createCSRFErrorResponse();
  }

  try {
    const rawData = await request.json();

    // SECURITY: Validate input
    const validationResult = updateOrderStatusSchema.safeParse(rawData);
    if (!validationResult.success) {
      console.error('[update-order-status] Validation failed:', validationResult.error.format());
      return new Response(
        JSON.stringify({
          error: 'Datos inválidos',
          details: import.meta.env.PROD ? undefined : validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, status, adminNotes } = validationResult.data;

    console.log('[update-order-status] Updating order status', { orderId, status });

    // Get order from Firestore
    const db = getAdminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.error('[update-order-status] Order not found', { orderId });
      return new Response(
        JSON.stringify({ error: 'Pedido no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const currentData = orderSnap.data() || {};
    const previousStatus = currentData.status;

    // Update order status
    const updateData: Record<string, any> = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    await orderRef.update(updateData);

    // Log status change
    await db.collection('order_status_history').add({
      orderId,
      previousStatus,
      newStatus: status,
      changedAt: FieldValue.serverTimestamp(),
      notes: adminNotes || null,
    });

    console.log('[update-order-status] Order status updated successfully', {
      orderId,
      previousStatus,
      newStatus: status,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Estado actualizado correctamente',
        previousStatus,
        newStatus: status,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[update-order-status] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error actualizando estado del pedido',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
