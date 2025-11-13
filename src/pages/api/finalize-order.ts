// src/pages/api/finalize-order.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getAdminDb } from '../../lib/firebase-admin';
import { finalizeOrder } from '../../lib/orders/finalizeOrder';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { verifyAuthToken } from '../../lib/auth/authHelpers';
import { createScopedLogger } from '../../lib/utils/apiLogger';
import { z } from 'zod';

const logger = createScopedLogger('finalize-order');

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

const finalizeOrderSchema = z.object({
  orderId: z.string().min(1).max(255),
  paymentIntentId: z.string().min(1).max(255),
});

/**
 * Execute post-payment actions for an order after successful payment
 *
 * This endpoint is called from the client after payment confirmation.
 * It's idempotent - if webhook already executed finalizeOrder, it will skip.
 *
 * Actions include:
 * - Wallet debit (if used)
 * - Coupon usage tracking
 * - Cashback credit
 * - Confirmation email
 *
 * SECURITY:
 * - CSRF protection
 * - User authentication required
 * - Validates order ownership (user must own the order OR be admin)
 * - Validates payment was actually successful with Stripe
 * - Validates order exists and belongs to the payment
 */
export const POST: APIRoute = async ({ request }) => {
  // SECURITY: CSRF protection
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    logger.warn('[finalize-order] CSRF validation failed', { reason: csrfCheck.reason });
    return createCSRFErrorResponse();
  }

  // SECURITY: User authentication required
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) {
    logger.warn('[finalize-order] Unauthenticated access attempt');
    return authResult.error!;
  }

  try {
    const rawData = await request.json();

    // SECURITY: Validate input
    const validationResult = finalizeOrderSchema.safeParse(rawData);
    if (!validationResult.success) {
      logger.error('[finalize-order] Validation failed', validationResult.error.format());
      return new Response(
        JSON.stringify({
          error: 'Datos inválidos',
          details: import.meta.env.PROD ? undefined : validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, paymentIntentId } = validationResult.data;

    logger.info('[finalize-order] Processing finalization', { orderId, paymentIntentId });

    // Verify payment intent status with Stripe
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (stripeError: any) {
      logger.error('[finalize-order] Error retrieving payment intent', stripeError);
      return new Response(
        JSON.stringify({ error: 'Error verificando el pago' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Verify payment was successful
    if (paymentIntent.status !== 'succeeded') {
      logger.warn('[finalize-order] Payment not succeeded', {
        orderId,
        paymentIntentId,
        status: paymentIntent.status,
      });
      return new Response(
        JSON.stringify({ error: 'El pago no se completó exitosamente' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Verify payment is for this order
    const paymentOrderId = paymentIntent.metadata?.orderId || paymentIntent.metadata?.order_id;
    if (paymentOrderId !== orderId) {
      logger.error('[finalize-order] Order ID mismatch', {
        requestedOrderId: orderId,
        paymentOrderId,
      });
      return new Response(
        JSON.stringify({ error: 'El pago no corresponde a este pedido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get order data from Firestore
    const db = getAdminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      logger.error('[finalize-order] Order not found', { orderId });
      return new Response(
        JSON.stringify({ error: 'Pedido no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const orderData = orderSnap.data() || {};

    // SECURITY: Verify order ownership (user must own the order OR be admin)
    const orderUserId = orderData.userId;
    const requestingUserId = authResult.uid;

    if (orderUserId !== requestingUserId && !authResult.isAdmin) {
      logger.warn('[finalize-order] Unauthorized order access attempt', {
        orderId,
        orderUserId,
        requestingUserId,
      });
      return new Response(
        JSON.stringify({ error: 'No tienes permiso para finalizar este pedido' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logger.info('[finalize-order] Order ownership verified', {
      orderId,
      userId: requestingUserId,
      isAdmin: authResult.isAdmin,
    });

    // Execute post-payment actions (idempotent)
    try {
      await finalizeOrder({
        db,
        orderId,
        orderData,
        requestUrl: request.url,
      });

      logger.info('[finalize-order] Post-payment actions completed', { orderId });
    } catch (finalizeError: any) {
      logger.error('[finalize-order] Error executing finalizeOrder', finalizeError);
      return new Response(
        JSON.stringify({
          error: 'Error ejecutando acciones post-pago',
          message: finalizeError?.message || 'Error desconocido',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update order status
    await orderRef.set(
      {
        paymentStatus: 'paid',
        status: orderData?.status === 'pending' ? 'processing' : orderData?.status || 'processing',
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pedido finalizado correctamente',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    logger.error('[finalize-order] Unexpected error', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error procesando solicitud',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
