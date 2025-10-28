import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getAdminDb } from '../../lib/firebase-admin';

// Importante: configurar STRIPE_WEBHOOK_SECRET en el entorno de producción
const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get('stripe-signature') || request.headers.get('Stripe-Signature');
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET as string | undefined;

  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), { status: 500 });
  }

  let event: Stripe.Event;
  const body = await request.text();

  try {
    event = stripe.webhooks.constructEvent(body, sig as string, webhookSecret);
  } catch (err: any) {
    console.error('[Stripe Webhook] Signature verification failed:', err?.message || err);
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
      console.warn('[Stripe Webhook] Missing orderId in metadata for event', event.id, type);
      await evtRef.set({ processedAt: new Date(), type, note: 'No orderId metadata' });
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const orderRef = db.collection('orders').doc(orderId);

    if (type === 'payment_intent.succeeded') {
      await orderRef.set(
        {
          paymentStatus: 'paid',
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } else if (type === 'payment_intent.payment_failed' || type === 'charge.failed') {
      await orderRef.set(
        {
          paymentStatus: 'failed',
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }

    await evtRef.set({ processedAt: new Date(), type, orderId });
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('[Stripe Webhook] Error handling event:', error);
    return new Response(JSON.stringify({ error: 'Webhook handler error' }), { status: 500 });
  }
};

