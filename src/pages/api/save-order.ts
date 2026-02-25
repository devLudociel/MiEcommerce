// src/pages/api/save-order.ts
import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../lib/rate-limiter';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { verifyAuthToken } from '../../lib/auth/authHelpers';
import { createScopedLogger } from '../../lib/utils/apiLogger';
import { calculateOrderPricing } from '../../lib/orders/pricing';
import { reserveStockForOrderTx } from '../../lib/orders/stock';
import type { StockReservationItem } from '../../lib/orders/stock';
// SECURITY NOTE: finalizeOrder ya NO se importa aquí
// Solo debe llamarse desde stripe-webhook.ts después de confirmar pago
import { z } from 'zod';
import crypto from 'crypto';

const logger = createScopedLogger('save-order');

/** Extract a specific cookie value from the Cookie header */
function getCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Get the client IP from common headers */
function getClientIp(request: Request): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

const ORDER_LOCK_STATUSES = new Set(['processing', 'paid', 'cancelled', 'refunded']);

const createOrderAccessToken = (): string => crypto.randomBytes(32).toString('hex');
const hashOrderAccessToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const isOrderLocked = (orderData: Record<string, unknown>): boolean => {
  const status = String(orderData.status || 'pending').toLowerCase();
  const paymentStatus = String(orderData.paymentStatus || 'pending').toLowerCase();
  const paymentIntentId =
    typeof orderData.paymentIntentId === 'string' ? orderData.paymentIntentId.trim() : '';

  return (
    Boolean(paymentIntentId) ||
    ORDER_LOCK_STATUSES.has(status) ||
    paymentStatus !== 'pending'
  );
};

const buildTotalsFromOrder = (orderData: Record<string, unknown>) => ({
  subtotal: Number(orderData.subtotal || 0),
  bundleDiscount: Number(orderData.bundleDiscount || 0),
  couponDiscount: Number(orderData.couponDiscount || 0),
  shippingCost: Number(orderData.shippingCost ?? orderData.shipping ?? 0),
  tax: Number(orderData.tax || 0),
  taxLabel: typeof orderData.taxLabel === 'string' ? orderData.taxLabel : undefined,
  walletDiscount: Number(orderData.walletDiscount || 0),
  total: Number(orderData.total || 0),
});

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
  checkoutId: z.string().min(10).max(255).regex(/^[a-zA-Z0-9_-]+$/),
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
  let orderId: string | null = null;

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
    const checkoutId = orderData.checkoutId;

    if (idempotencyKey !== checkoutId) {
      return new Response(JSON.stringify({ error: 'checkoutId must match idempotencyKey' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (isProd) {
      const redacted = {
        itemsCount: orderData.items.length,
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
    // Si no hay autenticación, userId = null (guest)
    const secureUserId = authenticatedUserId || null;
    const secureCustomerEmail = orderData.customerEmail || authenticatedEmail || orderData.shippingInfo.email;
    const orderAccessToken = secureUserId ? null : createOrderAccessToken();
    const orderAccessTokenHash = orderAccessToken ? hashOrderAccessToken(orderAccessToken) : null;

    const pricing = await calculateOrderPricing({
      items: sanitizedItems,
      shippingInfo: orderData.shippingInfo as Record<string, unknown>,
      couponCode: orderData.couponCode || null,
      couponId: orderData.couponId || null,
      useWallet: Boolean(orderData.usedWallet),
      userId: secureUserId,
    });

    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

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

    const baseOrderPayload: Record<string, unknown> = {
      idempotencyKey,
      checkoutId,
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
    };

    if (orderAccessTokenHash) {
      baseOrderPayload.orderAccessTokenHash = orderAccessTokenHash;
    }

    if (orderData.billingInfo) {
      baseOrderPayload.billingInfo = orderData.billingInfo;
    }

    if (pricing.couponCode) {
      baseOrderPayload.couponCode = pricing.couponCode;
    }

    if (pricing.couponId) {
      baseOrderPayload.couponId = pricing.couponId;
    }

    if (orderData.notes) {
      baseOrderPayload.notes = orderData.notes;
    }

    // Capture Facebook cookies and client info for Meta Conversions API (server-side)
    const fbClickId = getCookieValue(request, '_fbc');
    const fbBrowserId = getCookieValue(request, '_fbp');
    const clientIp = getClientIp(request);
    const clientUserAgent = request.headers.get('user-agent');

    if (fbClickId) baseOrderPayload.fbClickId = fbClickId;
    if (fbBrowserId) baseOrderPayload.fbBrowserId = fbBrowserId;
    if (clientIp) baseOrderPayload.clientIpAddress = clientIp;
    if (clientUserAgent) baseOrderPayload.clientUserAgent = clientUserAgent;

    const expiresAt = Timestamp.fromMillis(Date.now() + 15 * 60 * 1000);

    const checkoutIndexRef = adminDb.collection('orders_by_checkout').doc(checkoutId);

    const txResult = await adminDb.runTransaction(async (tx) => {
      const indexSnap = await tx.get(checkoutIndexRef);
      if (indexSnap.exists) {
        const indexData = indexSnap.data() || {};
        const existingOrderId =
          typeof indexData.orderId === 'string' ? indexData.orderId.trim() : '';
        if (!existingOrderId) {
          throw new Error('ORDER_INDEX_INVALID');
        }

        const existingOrderRef = adminDb!.collection('orders').doc(existingOrderId);
        const existingOrderSnap = await tx.get(existingOrderRef);
        if (!existingOrderSnap.exists) {
          throw new Error('ORDER_NOT_FOUND');
        }

        const existingOrder = existingOrderSnap.data() || {};
        const existingUserId =
          typeof existingOrder.userId === 'string' ? existingOrder.userId : null;

        if (secureUserId && existingUserId !== secureUserId) {
          throw new Error('ORDER_ACCESS_DENIED');
        }
        if (!secureUserId && existingUserId) {
          throw new Error('ORDER_ACCESS_DENIED');
        }

        const locked = isOrderLocked(existingOrder);
        return {
          kind: 'existing',
          orderId: existingOrderId,
          orderData: existingOrder,
          locked,
        } as const;
      }

      const orderRef = adminDb!.collection('orders').doc();
      const newOrderId = orderRef.id;

      const stockReservation = await reserveStockForOrderTx({
        db: adminDb!,
        tx,
        items: pricing.items,
      });

      if (!stockReservation.ok) {
        const err = new Error(stockReservation.code || 'STOCK_ERROR');
        (err as any).stock = stockReservation;
        throw err;
      }

      const reservationItems = stockReservation.reservedItems;
      const orderPayload: Record<string, unknown> = {
        ...baseOrderPayload,
        stockReservationStatus: reservationItems.length > 0 ? 'reserved' : 'not_required',
      };

      if (reservationItems.length > 0) {
        orderPayload.stockReservedItems = reservationItems;
        orderPayload.stockReservedAt = FieldValue.serverTimestamp();
        orderPayload.stockReservationExpiresAt = expiresAt;
      }

      tx.create(orderRef, orderPayload);
      tx.create(checkoutIndexRef, {
        orderId: newOrderId,
        userId: secureUserId,
        ...(orderAccessTokenHash ? { orderAccessTokenHash } : {}),
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        kind: 'created',
        orderId: newOrderId,
        reservedItems: reservationItems,
        status: reservationItems.length > 0 ? 'reserved' : 'not_required',
      } as const;
    });

    orderId = txResult.orderId;

    const reservationStatus =
      txResult.kind === 'created'
        ? String(txResult.status || '')
        : String((txResult.orderData || {}).stockReservationStatus || '');
    const reservedCount =
      txResult.kind === 'created' && Array.isArray(txResult.reservedItems)
        ? txResult.reservedItems.length
        : Array.isArray((txResult as any).orderData?.stockReservedItems)
          ? (txResult as any).orderData.stockReservedItems.length
          : 0;

    if (reservationStatus === 'reserved') {
      logger.info('[reserve_stock_success]', { orderId, itemsCount: reservedCount });
    } else if (reservationStatus === 'not_required') {
      logger.info('[reserve_stock_success]', { orderId, itemsCount: 0 });
    }
    if (txResult.kind === 'existing' && (txResult as any).locked) {
      logger.info('[save-order] Existing order is locked. Returning persisted data only.', {
        orderId,
      });
    }

    logger.info('API save-order: Pedido guardado con ID:', orderId);

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
      `[save-order] Order ${orderId} created with status 'pending'. ` +
      'Post-payment actions will run after payment confirmation via webhook.'
    );

    const totals =
      txResult.kind === 'existing'
        ? buildTotalsFromOrder(txResult.orderData || {})
        : {
            subtotal: pricing.subtotal,
            bundleDiscount: pricing.bundleDiscount,
            couponDiscount: pricing.couponDiscount,
            shippingCost: pricing.shippingCost,
            tax: pricing.tax,
            taxLabel: pricing.taxLabel,
            walletDiscount: pricing.walletDiscount,
            total: pricing.total,
          };

    const responsePayload: Record<string, unknown> = {
      success: true,
      orderId,
      totals,
    };

    if (txResult.kind === 'created' && orderAccessToken) {
      responsePayload.orderAccessToken = orderAccessToken;
    }

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const stockError =
      error && typeof error === 'object' && 'stock' in error ? (error as any).stock : null;
    if (stockError && stockError.details) {
      logger.warn('[reserve_stock_fail]', {
        orderId: orderId || 'unknown',
        reason: stockError.code,
      });
      logger.warn('[save-order] Stock reservation failed', stockError.details);
      return new Response(
        JSON.stringify({
          error: stockError.code,
          message: stockError.message,
          details: stockError.details,
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    if (error instanceof Error && error.message === 'ORDER_ACCESS_DENIED') {
      return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (error instanceof Error && (error.message === 'ORDER_INDEX_INVALID' || error.message === 'ORDER_NOT_FOUND')) {
      return new Response(JSON.stringify({ error: 'Pedido no disponible' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
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
