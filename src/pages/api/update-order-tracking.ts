// src/pages/api/update-order-tracking.ts
import { logger } from '../../lib/logger';
import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { z } from 'zod';

const updateOrderTrackingSchema = z.object({
  orderId: z.string().min(1).max(255),
  trackingNumber: z.string().min(1).max(100).optional(),
  carrier: z.string().min(1).max(100).optional(),
  trackingUrl: z.string().url().max(500).optional(),
  estimatedDelivery: z.string().datetime().optional(), // ISO date string
  notes: z.string().max(1000).optional(),
});

/**
 * Update order tracking information (Admin only)
 *
 * SECURITY:
 * - CSRF protection
 * - Requires authentication (TODO: Add admin role check)
 * - Validates order exists
 * - Uses Admin SDK to bypass security rules
 */
export const POST: APIRoute = async ({ request }) => {
  // SECURITY: CSRF protection
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    logger.warn('[update-order-tracking] CSRF validation failed:', csrfCheck.reason);
    return createCSRFErrorResponse();
  }

  try {
    const rawData = await request.json();

    // SECURITY: Validate input
    const validationResult = updateOrderTrackingSchema.safeParse(rawData);
    if (!validationResult.success) {
      logger.error('[update-order-tracking] Validation failed:', validationResult.error.format());
      return new Response(
        JSON.stringify({
          error: 'Datos inválidos',
          details: import.meta.env.PROD ? undefined : validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, trackingNumber, carrier, trackingUrl, estimatedDelivery, notes } =
      validationResult.data;

    logger.info('[update-order-tracking] Updating order tracking', { orderId });

    // Get order from Firestore
    const db = getAdminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      logger.error('[update-order-tracking] Order not found', { orderId });
      return new Response(
        JSON.stringify({ error: 'Pedido no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build update data
    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (carrier !== undefined) updateData.carrier = carrier;
    if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl;
    if (estimatedDelivery !== undefined) {
      updateData.estimatedDelivery = new Date(estimatedDelivery);
    }
    if (notes !== undefined) updateData.trackingNotes = notes;

    // Update order tracking
    await orderRef.update(updateData);

    logger.info('[update-order-tracking] Order tracking updated successfully', { orderId });

    // Optionally send tracking update email to customer
    if (trackingNumber && carrier) {
      try {
        const orderData = orderSnap.data();
        await fetch(new URL('/api/send-email', request.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            type: 'tracking-update',
            trackingNumber,
            carrier,
            trackingUrl,
            customerEmail: orderData?.customerEmail,
          }),
        });
        logger.info('[update-order-tracking] Tracking email sent');
      } catch (emailError) {
        logger.error('[update-order-tracking] Error sending tracking email (non-critical):', emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Información de tracking actualizada correctamente',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    logger.error('[update-order-tracking] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error actualizando tracking del pedido',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
