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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const str = (value: unknown): string => (typeof value === 'string' ? value : value == null ? '' : String(value));

  const telefono = str(body.telefono).replace(/[^0-9]/g, '');
  const producto = str(body.producto);
  const cantidad = str(body.cantidad);
  const detalles = str(body.detalles);
  const envio = str(body.envio);
  const customerName = str(body.customerName);
  const customerEmail = str(body.customerEmail);
  const stripePaymentIntentId = str(body.stripePaymentIntentId);
  const stripeSessionId = str(body.stripeSessionId);
  const invoiceNumber = str(body.invoiceNumber).slice(0, 60);
  const invoiceUrl = str(body.invoiceUrl).slice(0, 500);

  // Un importe no numerico llegaba a Firestore como NaN y dejaba el pedido
  // inservible sin dar ningun error.
  const total = Number.parseFloat(str(body.importe));
  if (!Number.isFinite(total) || total <= 0) {
    return new Response(JSON.stringify({ error: 'importe must be a positive number' }), { status: 400 });
  }

  // Metodos aceptados: los de Stripe y los que se confirman a mano.
  const ALLOWED_PAYMENT_METHODS = new Set([
    'stripe_payment_link', 'bizum', 'transfer', 'cash', 'card', 'paypal', 'other',
  ]);
  const requestedMethod = str(body.paymentMethod);
  const paymentMethod = ALLOWED_PAYMENT_METHODS.has(requestedMethod) ? requestedMethod : 'stripe_payment_link';

  // Un orderId propio hace la operacion idempotente: Firestore rechaza un
  // documento que ya existe, asi que reintentar no duplica la venta.
  const providedOrderId = str(body.orderId).trim();
  if (providedOrderId && !/^[A-Za-z0-9_-]{1,120}$/.test(providedOrderId)) {
    return new Response(JSON.stringify({ error: 'orderId has invalid characters' }), { status: 400 });
  }
  if (!providedOrderId && !telefono) {
    return new Response(JSON.stringify({ error: 'telefono or orderId required' }), { status: 400 });
  }

  // Lineas reales de la factura si vienen; si no, se sintetiza una como antes.
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 50) : null;
  const invoiceItems = rawItems
    ? rawItems.map((raw) => {
        const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
        const qty = Number.parseInt(str(item.quantity), 10);
        const price = Number.parseFloat(str(item.price));
        return {
          productId: 'whatsapp-custom',
          name: str(item.name).slice(0, 200) || 'Pedido personalizado WhatsApp',
          quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
          price: Number.isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : 0,
          productionStatus: 'pending',
          customization: null as unknown,
        };
      })
    : null;

  try {
    const svcRaw = (process.env.FIREBASE_SERVICE_ACCOUNT || import.meta.env.FIREBASE_SERVICE_ACCOUNT) as string;
    const svc = JSON.parse(svcRaw) as Record<string, string>;
    const projectId = svc.project_id;

    const token = await getGoogleAccessToken(svc);

    const orderId = providedOrderId || `wa_${telefono}_${Date.now()}`;
    const now = new Date().toISOString();

    const nameParts = (customerName || '').trim().split(' ');
    const firstName = nameParts[0] || 'WhatsApp';
    const lastName = nameParts.slice(1).join(' ') || telefono;

    const fields: Record<string, unknown> = {};
    const doc = {
      orderId, source: 'whatsapp', status: 'processing', paymentStatus: 'paid',
      paymentMethod,
      stripePaymentIntentId: stripePaymentIntentId || null,
      stripeSessionId: stripeSessionId || null,
      // Trazabilidad con el sistema de facturacion: desde el pedido se llega a
      // la factura que lo respalda, y al reves por el numero.
      invoiceNumber: invoiceNumber || null,
      invoiceUrl: invoiceUrl || null,
      customerPhone: telefono,
      customerName: customerName || null,
      customerEmail: customerEmail || null,
      total,
      totalCents: Math.round(total * 100),
      currency: 'eur',
      items: invoiceItems || (() => {
        const qty = parseInt(cantidad || '1', 10) || 1;
        const unitPrice = total / qty;
        const customizationValues: Array<{ fieldLabel: string; value: string }> = [];
        if (detalles) customizationValues.push({ fieldLabel: 'Detalles del pedido', value: detalles });
        if (envio) customizationValues.push({ fieldLabel: 'Método de envío', value: envio });
        return [{
          productId: 'whatsapp-custom',
          name: producto || 'Pedido personalizado WhatsApp',
          quantity: qty,
          price: Math.round(unitPrice * 100) / 100,
          productionStatus: 'pending',
          customization: customizationValues.length > 0
            ? { categoryName: 'Pedido WhatsApp', values: customizationValues }
            : null,
        }];
      })(),
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
      // El mismo pedido enviado dos veces no es un fallo: ya esta registrado.
      // Firestore devuelve 409 ALREADY_EXISTS al crear con un documentId usado.
      if (res.status === 409) {
        return new Response(JSON.stringify({ ok: true, orderId, duplicate: true }), { status: 200 });
      }
      throw new Error(`Firestore error ${res.status}: ${JSON.stringify(result)}`);
    }

    return new Response(JSON.stringify({ ok: true, orderId }), { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[whatsapp-order] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', detail: msg }), { status: 500 });
  }
};
