// src/pages/api/whatsapp-order.ts
// Endpoint para registrar pedidos confirmados por WhatsApp + Stripe Payment Link
// Llamado desde n8n cuando se confirma el pago

import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Auth: secret header
  const secret = request.headers.get('x-whatsapp-order-secret');
  const expectedSecret = import.meta.env.WHATSAPP_ORDER_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const {
    telefono,
    importe,
    producto,
    cantidad,
    detalles,
    envio,
    customerName,
    customerEmail,
    stripePaymentIntentId,
    stripeSessionId,
  } = body as Record<string, string>;

  if (!telefono || !importe) {
    return new Response(JSON.stringify({ error: 'telefono and importe required' }), { status: 400 });
  }

  // Debug: check Firebase env vars
  const hasSvc = !!import.meta.env.FIREBASE_SERVICE_ACCOUNT;
  const hasEmail = !!import.meta.env.FIREBASE_CLIENT_EMAIL;
  const hasKey = !!import.meta.env.FIREBASE_PRIVATE_KEY;
  console.log('[whatsapp-order] Firebase env vars:', { hasSvc, hasEmail, hasKey });

  try {
    const db = getAdminDb();
    const orderId = `wa_${telefono}_${Date.now()}`;

    await db.collection('orders').doc(orderId).set({
      orderId,
      source: 'whatsapp',
      status: 'processing',
      paymentStatus: 'paid',
      paymentMethod: 'stripe_payment_link',
      stripePaymentIntentId: stripePaymentIntentId || null,
      stripeSessionId: stripeSessionId || null,
      customerPhone: telefono,
      customerName: customerName || null,
      customerEmail: customerEmail || null,
      total: parseFloat(importe),
      totalCents: Math.round(parseFloat(importe) * 100),
      currency: 'eur',
      items: [
        {
          productId: 'whatsapp-custom',
          name: producto || 'Pedido personalizado WhatsApp',
          quantity: parseInt(cantidad || '1', 10) || 1,
          details: detalles || null,
          customization: { envio: envio || null },
        },
      ],
      shippingInfo: {
        phone: telefono,
        fullName: customerName || telefono,
        email: customerEmail || null,
        notes: detalles || null,
        shippingMethod: envio || 'pendiente',
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return new Response(JSON.stringify({ ok: true, orderId }), { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[whatsapp-order] Error creating order:', err);
    return new Response(JSON.stringify({ error: 'Internal error', detail: msg, firebase: { hasSvc, hasEmail, hasKey } }), { status: 500 });
  }
};
