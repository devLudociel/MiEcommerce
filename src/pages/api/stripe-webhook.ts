import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getAdminDb } from '../../lib/firebase-admin';
import { finalizeOrder } from '../../lib/orders/finalizeOrder';
import { FieldValue } from 'firebase-admin/firestore';
import { createScopedLogger } from '../../lib/utils/apiLogger';
import { releaseWalletReservation } from '../../lib/orders/walletReservations';
import { expireReservedOrder, releaseReservedStock } from '../../lib/orders/stock';
import type { OrderData } from '../../types/firebase';
import { sendMetaPurchaseEvent } from '../../lib/analytics/metaConversions';

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

      let shouldFinalize = false;
      let mismatchReason: string | null = null;
      let mismatchDetails: Record<string, unknown> | null = null;
      let freshOrderData: Record<string, unknown> | null = null;

      await db.runTransaction(async (tx) => {
        const freshSnap = await tx.get(orderRef);
        if (!freshSnap.exists) {
          mismatchReason = 'order_not_found';
          return;
        }

        const data = freshSnap.data() || {};
        freshOrderData = data;

        const paymentStatus = String(data.paymentStatus || '').toLowerCase();
        if (paymentStatus === 'paid' || paymentStatus === 'completed') {
          return;
        }

        const reservationStatus = String(data.stockReservationStatus || '');
        const rawExpiresAt = data.stockReservationExpiresAt as
          | { toDate?: () => Date }
          | Date
          | undefined;
        const expiresAt =
          rawExpiresAt && typeof rawExpiresAt.toDate === 'function'
            ? rawExpiresAt.toDate()
            : rawExpiresAt instanceof Date
              ? rawExpiresAt
              : null;

        if (reservationStatus === 'expired') {
          mismatchReason = 'stock_reservation_expired';
          mismatchDetails = { reservationStatus };
          return;
        }

        if (reservationStatus === 'reserved' && expiresAt && expiresAt.getTime() < Date.now()) {
          mismatchReason = 'stock_reservation_expired';
          mismatchDetails = { reservationStatus, expiresAt: expiresAt.toISOString() };
          return;
        }

        const orderStatus = String(data.status || '').toLowerCase();
        const allowedStatuses = new Set(['pending', 'reserved']);
        if (!allowedStatuses.has(orderStatus)) {
          mismatchReason = `invalid_order_status:${orderStatus || 'unknown'}`;
          mismatchDetails = { orderStatus };
          return;
        }

        const expectedAmount = Number(data.totalCents);
        if (!Number.isInteger(expectedAmount) || expectedAmount <= 0) {
          mismatchReason = 'invalid_order_total_cents';
          mismatchDetails = { expectedAmount: data.totalCents };
          return;
        }

        const expectedCurrency = String(data.paymentCurrency || data.currency || 'eur').toLowerCase();
        if (!paymentIntentCurrency || paymentIntentCurrency !== expectedCurrency) {
          mismatchReason = 'currency_mismatch';
          mismatchDetails = { expectedCurrency, paymentIntentCurrency };
          return;
        }

        const expectedPaymentIntentId = String(data.paymentIntentId || '');
        if (!expectedPaymentIntentId) {
          mismatchReason = 'missing_payment_intent_id';
          mismatchDetails = { expectedPaymentIntentId };
          return;
        }
        if (expectedPaymentIntentId !== paymentIntentId) {
          mismatchReason = 'payment_intent_id_mismatch';
          mismatchDetails = { expectedPaymentIntentId, paymentIntentId };
          return;
        }

        if (paymentIntentAmount !== expectedAmount) {
          mismatchReason = 'amount_mismatch';
          mismatchDetails = { expectedAmount, paymentIntentAmount };
          return;
        }

        shouldFinalize = true;
      });

      if (!shouldFinalize) {
        if (mismatchReason === 'stock_reservation_expired') {
          logger.warn('[webhook_payment_received_for_expired_order]', {
            orderId,
            paymentIntentId,
          });
          await expireReservedOrder({ db, orderId, reason: 'reservation_expired_webhook' });
        }
        if (mismatchReason && mismatchReason !== 'order_not_found') {
          logger.warn('[Stripe Webhook] Payment validation mismatch', {
            orderId,
            reason: mismatchReason,
            paymentIntentId,
            paymentIntentAmount,
            paymentIntentCurrency,
            details: mismatchDetails || {},
          });

          await orderRef.set(
            {
              paymentMismatch: true,
              paymentMismatchReason: mismatchReason,
              paymentMismatchAt: new Date(),
              paymentIntentId: paymentIntentId || null,
              paymentIntentAmount,
              paymentIntentCurrency,
              expectedAmount:
                freshOrderData && Number.isInteger(Number(freshOrderData.totalCents))
                  ? Number(freshOrderData.totalCents)
                  : null,
              expectedCurrency:
                freshOrderData
                  ? String(freshOrderData.paymentCurrency || freshOrderData.currency || 'eur').toLowerCase()
                  : null,
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
          orderData: freshOrderData || orderData,
          requestUrl: request.url,
        });
      } catch (finalizeError) {
        logger.error('[Stripe Webhook] Error applying post-payment actions:', finalizeError);
        return new Response(JSON.stringify({ error: 'Post-payment actions failed' }), {
          status: 500,
        });
      }

      try {
        const orderForCapi = (freshOrderData || orderData) as OrderData;
        await sendMetaPurchaseEvent({
          order: orderForCapi,
          orderId,
          eventId: orderId,
          testEventCode: import.meta.env.META_CONVERSIONS_API_TEST_EVENT_CODE,
        });
      } catch (capiError) {
        logger.warn('[Stripe Webhook] Meta CAPI failed', { orderId, error: capiError });
      }

      const nextStatus =
        freshOrderData?.status === 'pending' ? 'processing' : freshOrderData?.status || 'processing';

      await orderRef.set(
        {
          paymentStatus: 'paid',
          status: nextStatus,
          stockReservationStatus:
            freshOrderData?.stockReservationStatus === 'reserved'
              ? 'captured'
              : freshOrderData?.stockReservationStatus,
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
