// src/pages/api/save-order.ts
import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { checkRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '../../lib/rate-limiter';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { finalizeOrder } from '../../lib/orders/finalizeOrder';
import { createScopedLogger } from '../../lib/utils/apiLogger';
import { z } from 'zod';

const logger = createScopedLogger('save-order');

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
  // SECURITY: Rate limiting (strict for order creation)
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.STRICT, 'save-order');
  if (!rateLimitResult.allowed) {
    logger.warn('[save-order] Rate limit exceeded');
    return createRateLimitResponse(rateLimitResult);
  }

  // SECURITY: CSRF protection
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    logger.warn('[save-order] CSRF validation failed:', csrfCheck.reason);
    return createCSRFErrorResponse();
  }
  const isProd = import.meta.env.PROD === true;
  logger.info('API save-order: Solicitud recibida');

  try {
    const rawData = await request.json();

    // LOG: Ver estructura de datos recibidos
    logger.info('API save-order: Datos recibidos:', JSON.stringify(rawData, null, 2));

    // SECURITY: Validar datos con Zod para prevenir inyección y datos maliciosos
    const validationResult = orderDataSchema.safeParse(rawData);

    if (!validationResult.success) {
      // LOG: Mostrar errores de validación detallados
      const errorDetails = validationResult.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      logger.error('API save-order: Validación Zod falló:', JSON.stringify(errorDetails, null, 2));

      return new Response(
        JSON.stringify({
          error: 'Datos de pedido inválidos',
          details: isProd ? undefined : errorDetails,
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
      logger.info('API save-order: Datos recibidos (redacted):', redacted);
    } else {
      logger.info('API save-order: Datos validados:', JSON.stringify(orderData, null, 2));
    }

    logger.info('API save-order: Intentando guardar en Firestore con Admin SDK...');

    // Guardar pedido en Firestore usando Admin SDK (bypasa reglas de seguridad)
    let adminDb;
    try {
      adminDb = getAdminDb();
    } catch (adminInitError: any) {
      logger.error('API save-order: Error inicializando Firebase Admin:', adminInitError);
      return new Response(
        JSON.stringify({
          error: 'El servidor no pudo inicializar Firebase Admin.',
          hint: 'Configura credenciales: FIREBASE_SERVICE_ACCOUNT (JSON) o FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY + PUBLIC_FIREBASE_PROJECT_ID en .env',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // IDEMPOTENCY: Check if an order with this idempotency key already exists
    logger.info('[save-order] Checking idempotency key:', idempotencyKey);
    const existingOrderQuery = await adminDb
      .collection('orders')
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();

    if (!existingOrderQuery.empty) {
      const existingOrder = existingOrderQuery.docs[0];
      logger.info('[save-order] Order with this idempotency key already exists:', existingOrder.id);
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

    logger.info('API save-order: Pedido guardado con ID:', docRef.id);

    const paymentMethod = String(orderData.paymentMethod || 'card');
    const orderStatus = String(orderData.status || 'pending');
    const shouldDeferPostPaymentActions =
      paymentMethod === 'card' &&
      (orderStatus === 'pending' || String(orderData.paymentStatus || '').toLowerCase() === 'pending');

    if (shouldDeferPostPaymentActions) {
      logger.info(
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
        logger.error('[save-order] Error running post-payment actions. Rolling back order.', finalizeError);
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
  } catch (error: unknown) {
    // SECURITY: No exponer stack traces en producción
    logger.error('API save-order: Error:', error);
    logger.error('API save-order: Stack:', error instanceof Error ? error.stack : undefined);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error guardando pedido',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
