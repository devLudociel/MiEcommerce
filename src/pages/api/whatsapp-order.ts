// src/pages/api/whatsapp-order.ts
// Endpoint para registrar pedidos confirmados por WhatsApp + Stripe Payment Link
// Llamado desde n8n cuando se confirma el pago

import type { APIRoute } from 'astro';
import { initializeApp, getApps, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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

  try {
    // Initialize Firebase Admin — use process.env to bypass Astro's env handling
    const appName = `wa-order-${Date.now()}`;
    const svcRaw = (process.env.FIREBASE_SERVICE_ACCOUNT || import.meta.env.FIREBASE_SERVICE_ACCOUNT) as string;
    const svc = JSON.parse(svcRaw);
    // Normalize private_key newlines (Vercel sometimes stores \\n instead of \n)
    if (svc.private_key) {
      svc.private_key = svc.private_key.replace(/\\n/g, '\n');
    }

    const app = initializeApp({
      credential: cert(svc),
      projectId: svc.project_id,
    }, appName);
    const db = getFirestore(app);

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

    // Clean up the temporary app
    await deleteApp(app);

    return new Response(JSON.stringify({ ok: true, orderId }), { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[whatsapp-order] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', detail: msg }), { status: 500 });
  }
};
