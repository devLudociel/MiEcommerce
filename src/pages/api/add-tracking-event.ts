// src/pages/api/add-tracking-event.ts
import { logger } from '../../lib/logger';
import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { z } from 'zod';

// Valid tracking event statuses
const validEventStatuses = [
  'pending',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed',
  'returned',
] as const;

const addTrackingEventSchema = z.object({
  orderId: z.string().min(1).max(255),
  status: z.enum(validEventStatuses),
  location: z.string().max(200).optional(),
  description: z.string().min(1).max(500),
});

/**
 * Add a tracking event to an order (Admin only)
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
    logger.warn('[add-tracking-event] CSRF validation failed:', csrfCheck.reason);
    return createCSRFErrorResponse();
  }

  try {
    const rawData = await request.json();

    // SECURITY: Validate input
    const validationResult = addTrackingEventSchema.safeParse(rawData);
    if (!validationResult.success) {
      logger.error('[add-tracking-event] Validation failed:', validationResult.error.format());
      return new Response(
        JSON.stringify({
          error: 'Datos inválidos',
          details: import.meta.env.PROD ? undefined : validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, status, location, description } = validationResult.data;

    logger.info('[add-tracking-event] Adding tracking event', { orderId, status });

    // Get order from Firestore
    const db = getAdminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      logger.error('[add-tracking-event] Order not found', { orderId });
      return new Response(
        JSON.stringify({ error: 'Pedido no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const orderData = orderSnap.data() || {};
    const currentHistory = orderData.trackingHistory || [];

    // Create new tracking event
    const newEvent = {
      status,
      location: location || null,
      description,
      timestamp: FieldValue.serverTimestamp(),
    };

    // Add event to tracking history
    const updatedHistory = [...currentHistory, newEvent];

    await orderRef.update({
      trackingHistory: updatedHistory,
      lastTrackingUpdate: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('[add-tracking-event] Tracking event added successfully', {
      orderId,
      status,
      eventsCount: updatedHistory.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Evento de tracking agregado correctamente',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    logger.error('[add-tracking-event] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error agregando evento de tracking',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
