// src/pages/api/whatsapp-order.ts
// Registra pedidos de WhatsApp en Firestore usando la REST API directamente
// (evita problemas de gRPC del firebase-admin SDK en Vercel)

import type { APIRoute } from 'astro';
import crypto from 'crypto';

export const prerender = false;

async function getGoogleAccessToken(svc: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: svc.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const signingInput = `${header}.${payload}`;
  const privateKey = svc.private_key.replace(/\\n/g, '\n');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(privateKey, 'base64url');

  const jwt = `${signingInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json() as Record<string, string>;
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export const POST: APIRoute = async ({ request }) => {
  const secret = request.headers.get('x-whatsapp-order-secret');
  const expectedSecret = (process.env.WHATSAPP_ORDER_SECRET || import.meta.env.WHATSAPP_ORDER_SECRET) as string;

  if (!expectedSecret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { telefono, importe, producto, cantidad, detalles, envio, customerName, customerEmail, stripePaymentIntentId, stripeSessionId } = body;

  if (!telefono || !importe) {
    return new Response(JSON.stringify({ error: 'telefono and importe required' }), { status: 400 });
  }

  try {
    const svcRaw = (process.env.FIREBASE_SERVICE_ACCOUNT || import.meta.env.FIREBASE_SERVICE_ACCOUNT) as string;
    const svc = JSON.parse(svcRaw) as Record<string, string>;
    const projectId = svc.project_id;

    const token = await getGoogleAccessToken(svc);

    const orderId = `wa_${telefono}_${Date.now()}`;
    const now = new Date().toISOString();

    const nameParts = (customerName || '').trim().split(' ');
    const firstName = nameParts[0] || 'WhatsApp';
    const lastName = nameParts.slice(1).join(' ') || telefono;

    const fields: Record<string, unknown> = {};
    const doc = {
      orderId, source: 'whatsapp', status: 'processing', paymentStatus: 'paid',
      paymentMethod: 'stripe_payment_link',
      stripePaymentIntentId: stripePaymentIntentId || null,
      stripeSessionId: stripeSessionId || null,
      customerPhone: telefono,
      customerName: customerName || null,
      customerEmail: customerEmail || null,
      total: parseFloat(importe),
      totalCents: Math.round(parseFloat(importe) * 100),
      currency: 'eur',
      shippingInfo: {
        firstName,
        lastName,
        email: customerEmail || '',
        phone: telefono,
        address: 'Pedido WhatsApp',
        city: 'Los Llanos de Aridane',
        state: 'Santa Cruz de Tenerife',
        zipCode: '38760',
        country: 'España',
        notes: detalles || '',
        shippingMethod: envio || 'pendiente',
      },
    };

    for (const [k, v] of Object.entries(doc)) {
      fields[k] = toFirestoreValue(v);
    }
    // Store as proper Firestore Timestamps so .toDate() works in the dashboard
    fields['createdAt'] = { timestampValue: now };
    fields['updatedAt'] = { timestampValue: now };

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders?documentId=${orderId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    const result = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(`Firestore error ${res.status}: ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({ ok: true, orderId }), { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[whatsapp-order] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', detail: msg }), { status: 500 });
  }
};
