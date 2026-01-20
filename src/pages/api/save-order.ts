// src/pages/api/save-order.ts
import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../lib/rate-limiter';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { verifyAuthToken } from '../../lib/auth/authHelpers';
import { createScopedLogger } from '../../lib/utils/apiLogger';
import { calculateOrderPricing } from '../../lib/orders/pricing';
import { reserveStockForOrder, releaseReservedStock } from '../../lib/orders/stock';
import type { StockReservationItem } from '../../lib/orders/stock';
// SECURITY NOTE: finalizeOrder ya NO se importa aquí
// Solo debe llamarse desde stripe-webhook.ts después de confirmar pago
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
  shippingMethodId: z.string().max(100).optional(),
  shippingMethodName: z.string().max(200).optional(),
  shippingZoneId: z.string().max(100).optional(),
  shippingZoneName: z.string().max(200).optional(),
  estimatedDays: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
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
  name: z.string().min(1).max(500).optional(),
  quantity: z.number().int().min(1).max(1000),
  image: z.string().optional(), // Not always a valid URL, can be relative path
  variantId: z.number().optional(),
  variantName: z.string().optional(),
  customization: z.record(z.any()).optional(),
});

/** Inferred type from orderItemSchema */
type OrderItem = z.infer<typeof orderItemSchema>;

const orderDataSchema = z.object({
  idempotencyKey: z.string().min(10).max(255),
  items: z.array(orderItemSchema).min(1).max(100),
  shippingInfo: shippingInfoSchema,
  billingInfo: billingInfoSchema.optional(),
  // SECURITY FIX: userId is set server-side from auth token, NOT from client
  // userId: removed - will be set from authenticated user
  customerEmail: z.string().email().optional(),
  paymentMethod: z.enum(['card', 'transfer', 'cash', 'paypal']).default('card'),
  couponCode: z.string().optional(),
  couponId: z.string().optional(),
  usedWallet: z.boolean().optional(),
  // SECURITY FIX: status is always 'pending' for new orders - removed from client control
  // status: removed - always set to 'pending' server-side
  // paymentStatus: removed - always set to 'pending' server-side
  notes: z.string().max(1000).optional(),
});

function stripImageUrls(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(stripImageUrls);
  }

  if (!input || typeof input !== 'object') {
    return input;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (key === 'imageUrl' || key === 'previewImage') {
      continue;
    }
    result[key] = stripImageUrls(value);
  }

  return result;
}

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

  // SECURITY FIX CRÍTICO: Verificar autenticación
  // El userId DEBE venir del token, NO del cliente
  const authResult = await verifyAuthToken(request);
  let authenticatedUserId: string | null = null;
  let authenticatedEmail: string | null = null;

  if (authResult.success) {
    authenticatedUserId = authResult.uid || null;
    authenticatedEmail = authResult.email || null;
    logger.info('[save-order] Authenticated user:', { uid: authenticatedUserId });
  } else {
    // Permitir checkout como invitado, pero sin userId
    logger.info('[save-order] Guest checkout (no authentication)');
  }

  const isProd = import.meta.env.PROD === true;
  logger.info('API save-order: Solicitud recibida');

  let adminDb: ReturnType<typeof getAdminDb> | null = null;
  let reservedItems: StockReservationItem[] = [];

  try {
    const rawData = await request.json();

    // SECURITY FIX MEDIA: NO loguear datos completos antes de redactar
    // Solo loguear en DEV mode y con datos redactados
    if (!isProd) {
      logger.info('API save-order: Datos recibidos (DEV only):', JSON.stringify(rawData, null, 2));
    }

    // SECURITY: Validar datos con Zod para prevenir inyección y datos maliciosos
    const validationResult = orderDataSchema.safeParse(rawData);

    if (!validationResult.success) {
      // LOG: Mostrar errores de validación detallados
      const errorDetails = validationResult.error.issues.map((issue) => ({
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
    try {
      adminDb = getAdminDb();
    } catch (adminInitError: unknown) {
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
      ? orderData.items.map((i: OrderItem) => ({
          productId: i.productId,
          name: i.name,
          quantity: Number(i?.quantity) || 0,
          image: i.image,
          variantId: i.variantId,
          variantName: i.variantName,
          customization: i.customization,
        }))
      : [];

    // SECURITY FIX CRÍTICO: Usar userId del token autenticado, NO del cliente
    // Si no hay autenticación, se guarda como 'guest'
    const secureUserId = authenticatedUserId || 'guest';
    const secureCustomerEmail = orderData.customerEmail || authenticatedEmail || orderData.shippingInfo.email;

    const pricing = await calculateOrderPricing({
      items: sanitizedItems,
      shippingInfo: orderData.shippingInfo as Record<string, unknown>,
      couponCode: orderData.couponCode || null,
      couponId: orderData.couponId || null,
      useWallet: Boolean(orderData.usedWallet),
      userId: secureUserId,
    });

    let reservedItems: Array<Record<string, unknown>> = [];

    const stockReservation = await reserveStockForOrder({
      db: adminDb,
      items: pricing.items,
    });

    if (!stockReservation.ok) {
      logger.warn('[save-order] Stock reservation failed', stockReservation.details);
      return new Response(
        JSON.stringify({
          error: stockReservation.code,
          message: stockReservation.message,
          details: stockReservation.details,
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    reservedItems = stockReservation.reservedItems;

    const itemsForDoc = pricing.items.map((item) => {
      const docItem: Record<string, unknown> = {
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      };
      if (item.image) docItem.image = item.image;
      if (typeof item.variantId === 'number') docItem.variantId = item.variantId;
      if (item.variantName) docItem.variantName = item.variantName;
      if (item.customization) docItem.customization = stripImageUrls(item.customization);
      return docItem;
    });

    const orderPayload: Record<string, unknown> = {
      idempotencyKey,
      items: itemsForDoc,
      shippingInfo: orderData.shippingInfo,
      paymentMethod: orderData.paymentMethod,
      // SECURITY FIX: userId viene del servidor, no del cliente
      userId: secureUserId,
      customerEmail: secureCustomerEmail,
      subtotal: pricing.subtotal,
      bundleDiscount: pricing.bundleDiscount,
      bundleDiscountDetails: pricing.bundleDiscountDetails,
      couponDiscount: pricing.couponDiscount,
      shipping: pricing.shippingCost,
      shippingCost: pricing.shippingCost,
      tax: pricing.tax,
      taxType: pricing.taxType,
      taxRate: pricing.taxRate,
      taxLabel: pricing.taxLabel,
      walletDiscount: pricing.walletDiscount,
      usedWallet: pricing.walletDiscount > 0,
      total: pricing.total,
      totalCents: Math.round(pricing.total * 100),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      // SECURITY FIX CRÍTICO: status SIEMPRE es 'pending' para nuevos pedidos
      // Solo el webhook de Stripe o un admin puede cambiar esto
      status: 'pending',
      paymentStatus: 'pending',
      stockReservationStatus: stockReservation.reservedItems.length > 0 ? 'reserved' : 'not_required',
    };

    if (stockReservation.reservedItems.length > 0) {
      orderPayload.stockReservedItems = stockReservation.reservedItems;
      orderPayload.stockReservedAt = FieldValue.serverTimestamp();
    }

    if (orderData.billingInfo) {
      orderPayload.billingInfo = orderData.billingInfo;
    }

    if (pricing.couponCode) {
      orderPayload.couponCode = pricing.couponCode;
    }

    if (pricing.couponId) {
      orderPayload.couponId = pricing.couponId;
    }

    if (orderData.notes) {
      orderPayload.notes = orderData.notes;
    }

    const docRef = await adminDb.collection('orders').add(orderPayload);

    logger.info('API save-order: Pedido guardado con ID:', docRef.id);

    // SECURITY FIX CRÍTICO: NUNCA ejecutar finalizeOrder desde save-order
    // finalizeOrder SOLO debe ejecutarse desde:
    // 1. El webhook de Stripe después de confirmar el pago (stripe-webhook.ts)
    // 2. Un admin manualmente para métodos de pago alternativos
    //
    // Esto previene que un atacante obtenga:
    // - Acceso a productos digitales sin pagar
    // - Cashback/créditos en wallet sin pagar
    // - Uso de cupones sin completar la compra
    logger.info(
      `[save-order] Order ${docRef.id} created with status 'pending'. ` +
      'Post-payment actions will run after payment confirmation via webhook.'
    );

    return new Response(
      JSON.stringify({
        success: true,
        orderId: docRef.id,
        totals: {
          subtotal: pricing.subtotal,
          bundleDiscount: pricing.bundleDiscount,
          couponDiscount: pricing.couponDiscount,
          shippingCost: pricing.shippingCost,
          tax: pricing.tax,
          taxLabel: pricing.taxLabel,
          walletDiscount: pricing.walletDiscount,
          total: pricing.total,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    if (adminDb && reservedItems.length > 0) {
      try {
        await releaseReservedStock({
          db: adminDb,
          items: reservedItems,
        });
      } catch (releaseError) {
        logger.error('[save-order] Failed to release stock reservation after error', releaseError);
      }
    }
    // SECURITY: No exponer stack traces en producción
    logger.error('API save-order: Error:', error);
    if (import.meta.env.DEV) {
      logger.error('API save-order: Stack:', error instanceof Error ? error.stack : undefined);
    }
    // SECURITY FIX: Don't expose error details in production
    return new Response(
      JSON.stringify({
        error: 'Error guardando pedido',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
