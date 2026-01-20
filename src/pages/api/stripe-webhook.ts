import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getAdminDb } from '../../lib/firebase-admin';
import { finalizeOrder } from '../../lib/orders/finalizeOrder';
import { FieldValue } from 'firebase-admin/firestore';
import { createScopedLogger } from '../../lib/utils/apiLogger';
import { releaseWalletReservation } from '../../lib/orders/walletReservations';
import { releaseReservedStock } from '../../lib/orders/stock';

const logger = createScopedLogger('stripe-webhook');

// Importante: configurar STRIPE_WEBHOOK_SECRET en el entorno de producción
const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get('stripe-signature') || request.headers.get('Stripe-Signature');
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET as string | undefined;

  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
      status: 500,
    });
  }

  let event: Stripe.Event;
  const body = await request.text();

  try {
    event = stripe.webhooks.constructEvent(body, sig as string, webhookSecret);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('[Stripe Webhook] Signature verification failed:', errorMessage);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }

  try {
    const db = getAdminDb();

    // Idempotencia: evita reprocesar eventos
    const evtRef = db.collection('stripe_events').doc(event.id);
    const evtSnap = await evtRef.get();
    if (evtSnap.exists) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }

    const type = event.type;
    const data = event.data.object as any;
    const orderId: string | undefined = data?.metadata?.orderId || data?.metadata?.order_id;

    if (!orderId) {
      logger.warn('[Stripe Webhook] Missing orderId in metadata for event', event.id, type);
      await evtRef.set({ processedAt: new Date(), type, note: 'No orderId metadata' });
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      logger.warn('[Stripe Webhook] Order not found for event', orderId, type);
      await evtRef.set({
        processedAt: new Date(),
        type,
        orderId,
        note: 'order_not_found',
      });
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const orderData = orderSnap.data() || {};

    if (type === 'payment_intent.succeeded') {
      const paymentIntent = data as Stripe.PaymentIntent;
      const paymentIntentId = String(paymentIntent?.id || '');
      const paymentIntentAmount = Number(paymentIntent?.amount ?? 0);
      const paymentIntentCurrency = String(paymentIntent?.currency || '').toLowerCase();
      const expectedCurrency = String(orderData.paymentCurrency || orderData.currency || 'eur').toLowerCase();
      const orderTotal = Number(orderData.total ?? 0);
      const expectedAmount = Math.round(orderTotal * 100);
      const orderStatus = String(orderData.status || '').toLowerCase();
      const paymentStatus = String(orderData.paymentStatus || '').toLowerCase();
      const expectedPaymentIntentId = String(orderData.paymentIntentId || '');
      let shouldFinalize = true;
      let mismatchReason: string | null = null;

      if (paymentStatus === 'paid' || paymentStatus === 'completed') {
        logger.info('[Stripe Webhook] Order already paid. Skipping finalize.', {
          orderId,
          paymentStatus,
        });
        shouldFinalize = false;
      }

      if (!mismatchReason) {
        const allowedStatuses = new Set(['pending', 'processing', 'reserved']);
        if (!allowedStatuses.has(orderStatus)) {
          mismatchReason = `invalid_order_status:${orderStatus || 'unknown'}`;
          shouldFinalize = false;
        }
      }

      if (!mismatchReason) {
        if (!Number.isFinite(orderTotal) || !Number.isFinite(expectedAmount)) {
          mismatchReason = 'invalid_order_total';
          shouldFinalize = false;
        } else if (paymentIntentAmount !== expectedAmount) {
          mismatchReason = 'amount_mismatch';
          shouldFinalize = false;
        }
      }

      if (!mismatchReason) {
        if (!paymentIntentCurrency || paymentIntentCurrency !== expectedCurrency) {
          mismatchReason = 'currency_mismatch';
          shouldFinalize = false;
        }
      }

      if (!mismatchReason) {
        if (!expectedPaymentIntentId) {
          mismatchReason = 'missing_payment_intent_id';
          shouldFinalize = false;
        } else if (expectedPaymentIntentId !== paymentIntentId) {
          mismatchReason = 'payment_intent_id_mismatch';
          shouldFinalize = false;
        }
      }

      if (!shouldFinalize) {
        if (mismatchReason) {
          logger.warn('[Stripe Webhook] Payment validation mismatch', {
            orderId,
            reason: mismatchReason,
            paymentIntentId,
            expectedPaymentIntentId,
            paymentIntentAmount,
            expectedAmount,
            paymentIntentCurrency,
            expectedCurrency,
          });
          await orderRef.set(
            {
              paymentMismatch: true,
              paymentMismatchReason: mismatchReason,
              paymentMismatchAt: new Date(),
              paymentIntentId: expectedPaymentIntentId || paymentIntentId || null,
              paymentIntentAmount,
              paymentIntentCurrency,
              expectedAmount,
              expectedCurrency,
              updatedAt: new Date(),
            },
            { merge: true }
          );
        }

        await evtRef.set({ processedAt: new Date(), type, orderId });
        return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 });
      }

      try {
        await finalizeOrder({
          db,
          orderId,
          orderData,
          requestUrl: request.url,
        });
      } catch (finalizeError) {
        logger.error('[Stripe Webhook] Error applying post-payment actions:', finalizeError);
        return new Response(JSON.stringify({ error: 'Post-payment actions failed' }), {
          status: 500,
        });
      }

      await orderRef.set(
        {
          paymentStatus: 'paid',
          status:
            orderData?.status === 'pending' ? 'processing' : orderData?.status || 'processing',
          stockReservationStatus:
            orderData?.stockReservationStatus === 'reserved' ? 'captured' : orderData?.stockReservationStatus,
          stockCapturedAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } else if (
      type === 'payment_intent.payment_failed' ||
      type === 'payment_intent.canceled' ||
      type === 'charge.failed'
    ) {
      if (orderData?.paymentStatus === 'paid') {
        logger.warn(
          '[Stripe Webhook] Received payment failure for already paid order. Skipping deletion.',
          orderId
        );
      } else {
        const reservationStatus = String(orderData.walletReservationStatus || '');
        const reservedAmount = Number(orderData.walletReservedAmount || 0);
        const orderUserId = typeof orderData.userId === 'string' ? orderData.userId : null;

        if (reservationStatus === 'reserved' && reservedAmount > 0 && orderUserId && orderUserId !== 'guest') {
          try {
            await releaseWalletReservation({
              db,
              orderId,
              userId: orderUserId,
              amount: reservedAmount,
            });
          } catch (walletError) {
            logger.error('[Stripe Webhook] Failed to release wallet reservation', walletError);
          }
        }

        if (orderData?.stockReservationStatus === 'reserved' && Array.isArray(orderData.stockReservedItems)) {
          try {
            await releaseReservedStock({
              db,
              items: orderData.stockReservedItems,
            });
          } catch (stockError) {
            logger.error('[Stripe Webhook] Failed to release stock reservation', stockError);
          }
        }

        await orderRef.delete();
        await db.collection('order_cancellations').add({
          orderId,
          reason: 'payment_failed_webhook',
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await evtRef.set({ processedAt: new Date(), type, orderId });
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    logger.error('[Stripe Webhook] Error handling event:', error);
    return new Response(JSON.stringify({ error: 'Webhook handler error' }), { status: 500 });
  }
};
