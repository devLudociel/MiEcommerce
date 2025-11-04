// src/pages/api/save-order.ts
import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimit } from '../../lib/rateLimit';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { finalizeOrder } from '../../lib/orders/finalizeOrder';
import { z } from 'zod';

// SECURITY: Zod schema para validar datos de pedido
// Schema matches actual Checkout.tsx data structure
const shippingInfoSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(255),
  phone: z.string().min(9).max(20),
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  zipCode: z.string().min(4).max(10),
  country: z.string().min(2).max(100).default('España'),
  shippingMethod: z.string().optional(),
});

const billingInfoSchema = z.object({
  fiscalName: z.string().min(1).max(200),
  nifCif: z.string().max(50).optional(),
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  zipCode: z.string().min(4).max(10),
  country: z.string().min(2).max(100),
});

const orderItemSchema = z.object({
  productId: z.string(),
  name: z.string().min(1).max(500),
  price: z.number().min(0).max(1000000),
  quantity: z.number().int().min(1).max(1000),
  image: z.string().optional(), // Not always a valid URL, can be relative path
  variantId: z.number().optional(),
  variantName: z.string().optional(),
  customization: z.record(z.any()).optional(),
});

const orderDataSchema = z.object({
  idempotencyKey: z.string().min(10).max(255),
  items: z.array(orderItemSchema).min(1).max(100),
  shippingInfo: shippingInfoSchema,
  billingInfo: billingInfoSchema.optional(),
  userId: z.string().optional(),
  customerEmail: z.string().email().optional(),
  paymentMethod: z.enum(['card', 'wallet', 'transfer', 'cash']).default('card'),
  subtotal: z.number().min(0).max(1000000),
  shippingCost: z.number().min(0).max(10000).optional(),
  tax: z.number().min(0).optional(),
  taxType: z.string().optional(),
  taxRate: z.number().min(0).max(1).optional(),
  taxLabel: z.string().optional(),
  total: z.number().min(0).max(1000000),
  couponDiscount: z.number().min(0).optional(),
  couponCode: z.string().optional(),
  couponId: z.string().optional(),
  walletDiscount: z.number().min(0).optional(),
  usedWallet: z.boolean().optional(),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const POST: APIRoute = async ({ request }) => {
  // SECURITY: CSRF protection
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    console.warn('[save-order] CSRF validation failed:', csrfCheck.reason);
    return createCSRFErrorResponse();
  }

  // Rate limit básico: 10/min por IP para guardar orden
  try {
    const { ok, remaining, resetAt } = await rateLimit(request, 'save-order', {
      intervalMs: 60_000,
      max: 10,
    });
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(resetAt),
        },
      });
    }
  } catch (rateLimitError) {
    // SECURITY FIX: Log rate limit failures instead of silently ignoring
    console.error('[save-order] Rate limit check failed:', rateLimitError);
    // Continue anyway - don't block orders if rate limiting system fails
  }
  const isProd = import.meta.env.PROD === true;
  console.log('API save-order: Solicitud recibida');

  try {
    const rawData = await request.json();

    // SECURITY: Validar datos con Zod para prevenir inyección y datos maliciosos
    const validationResult = orderDataSchema.safeParse(rawData);

    if (!validationResult.success) {
      console.error('API save-order: Validación Zod falló:', validationResult.error.format());
      return new Response(
        JSON.stringify({
          error: 'Datos de pedido inválidos',
          details: isProd ? undefined : validationResult.error.format(),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Datos validados y sanitizados por Zod
    const orderData = validationResult.data;
    const idempotencyKey = orderData.idempotencyKey;

    if (isProd) {
      const redacted = {
        itemsCount: orderData.items.length,
        total: orderData.total,
        hasShippingInfo: Boolean(orderData.shippingInfo),
      };
      console.log('API save-order: Datos recibidos (redacted):', redacted);
    } else {
      console.log('API save-order: Datos validados:', JSON.stringify(orderData, null, 2));
    }

    console.log('API save-order: Intentando guardar en Firestore con Admin SDK...');

    // Guardar pedido en Firestore usando Admin SDK (bypasa reglas de seguridad)
    let adminDb;
    try {
      adminDb = getAdminDb();
    } catch (adminInitError: any) {
      console.error('API save-order: Error inicializando Firebase Admin:', adminInitError);
      return new Response(
        JSON.stringify({
          error: 'El servidor no pudo inicializar Firebase Admin.',
          hint: 'Configura credenciales: FIREBASE_SERVICE_ACCOUNT (JSON) o FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY + PUBLIC_FIREBASE_PROJECT_ID en .env',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // IDEMPOTENCY: Check if an order with this idempotency key already exists
    console.log('[save-order] Checking idempotency key:', idempotencyKey);
    const existingOrderQuery = await adminDb
      .collection('orders')
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();

    if (!existingOrderQuery.empty) {
      const existingOrder = existingOrderQuery.docs[0];
      console.log('[save-order] Order with this idempotency key already exists:', existingOrder.id);
      return new Response(
        JSON.stringify({
          success: true,
          orderId: existingOrder.id,
          duplicate: true,
          message: 'Order already created (idempotency key matched)',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const sanitizedItems = Array.isArray(orderData.items)
      ? orderData.items.map((i: any) => ({
          ...i,
          price: Number(i?.price) || 0,
          quantity: Number(i?.quantity) || 0,
        }))
      : [];
    const docRef = await adminDb.collection('orders').add({
      ...orderData,
      items: sanitizedItems,
      subtotal: Number(orderData.subtotal) || 0,
      shipping: Number(orderData.shippingCost) || 0,
      shippingCost: Number(orderData.shippingCost) || 0,
      total: Number(orderData.total) || 0,
      idempotencyKey, // Store the idempotency key with the order
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      status: orderData.status || 'pending',
    });

    console.log('API save-order: Pedido guardado con ID:', docRef.id);

    const paymentMethod = String(orderData.paymentMethod || 'card');
    const orderStatus = String(orderData.status || 'pending');
    const shouldDeferPostPaymentActions =
      paymentMethod === 'card' &&
      (orderStatus === 'pending' || String(orderData.paymentStatus || '').toLowerCase() === 'pending');

    if (shouldDeferPostPaymentActions) {
      console.log(
        `[save-order] Post-payment actions deferred for order ${docRef.id} until payment confirmation`
      );
    } else {
      try {
        await finalizeOrder({
          db: adminDb,
          orderId: docRef.id,
          orderData: { ...orderData, items: sanitizedItems },
          requestUrl: request.url,
        });
      } catch (finalizeError) {
        console.error('[save-order] Error running post-payment actions. Rolling back order.', finalizeError);
        await docRef.delete();
        throw finalizeError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: docRef.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    // SECURITY: No exponer stack traces en producción
    console.error('API save-order: Error:', error);
    console.error('API save-order: Stack:', error?.stack);
    return new Response(
      JSON.stringify({
        error: error.message || 'Error guardando pedido',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
