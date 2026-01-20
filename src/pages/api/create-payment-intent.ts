// src/pages/api/create-payment-intent.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getAdminDb } from '../../lib/firebase-admin';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { executeStripeOperation } from '../../lib/externalServices';
import { createScopedLogger } from '../../lib/utils/apiLogger';
import { calculateOrderPricing } from '../../lib/orders/pricing';
import { verifyAuthToken } from '../../lib/auth/authHelpers';
import { validateStockAvailability } from '../../lib/orders/stock';
import {
  releaseWalletReservation,
  reserveWalletFunds,
} from '../../lib/orders/walletReservations';
import { z } from 'zod';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../lib/rate-limiter';

const logger = createScopedLogger('create-payment-intent');

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// Zod schema para validar datos de Payment Intent
const paymentIntentSchema = z.object({
  orderId: z.string().min(1).max(255),
  amount: z.number().min(0.5).max(1000000).optional(), // Opcional para compatibilidad
  currency: z.enum(['eur', 'usd', 'gbp']).default('eur'),
});

/**
 * Crea un Payment Intent de Stripe asociado a un pedido
 *
 * SEGURIDAD:
 * - Protección CSRF
 * - Validación Zod de inputs
 * - Valida que el orderId exista en Firestore
 * - Valida que el monto coincida con el total del pedido
 * - Previene manipulación de montos
 */
export const POST: APIRoute = async ({ request }) => {
  // SECURITY: Rate limiting (very strict for payment operations)
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.VERY_STRICT, 'payment');
  if (!rateLimitResult.allowed) {
    logger.warn('[create-payment-intent] Rate limit exceeded');
    return createRateLimitResponse(rateLimitResult);
  }

  // SECURITY: CSRF protection
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    logger.warn('[create-payment-intent] CSRF validation failed:', csrfCheck.reason);
    return createCSRFErrorResponse();
  }

  let adminDb: ReturnType<typeof getAdminDb> | null = null;
  let reservationToRelease: { orderId: string; userId: string; amount: number } | null = null;

  try {
    const rawData = await request.json();

    // SECURITY: Validar datos con Zod
    const validationResult = paymentIntentSchema.safeParse(rawData);

    if (!validationResult.success) {
      logger.error(
        '[create-payment-intent] Validación Zod falló:',
        validationResult.error.format()
      );
      return new Response(
        JSON.stringify({
          error: 'Datos inválidos',
          details: import.meta.env.PROD ? undefined : validationResult.error.format(),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { orderId, amount, currency } = validationResult.data;

    // Validar que el pedido existe y obtener el monto real
    adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const orderData = orderSnap.data() || {};
    const orderUserId = typeof orderData.userId === 'string' ? orderData.userId : null;
    const requiresAuth = Boolean(orderUserId && orderUserId !== 'guest');

    if (requiresAuth) {
      const authResult = await verifyAuthToken(request);
      if (!authResult.success) {
        return authResult.error!;
      }

      if (authResult.uid !== orderUserId && !authResult.isAdmin) {
        logger.warn('[create-payment-intent] Unauthorized order access', {
          orderId,
          orderUserId,
          requester: authResult.uid,
        });
        return new Response(
          JSON.stringify({ error: 'No tienes permiso para pagar este pedido' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validar que el pedido no haya sido pagado ya
    if (orderData?.paymentStatus === 'paid' || orderData?.paymentStatus === 'completed') {
      return new Response(
        JSON.stringify({
          error: 'Este pedido ya ha sido pagado',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const pricing = await calculateOrderPricing({
      items: orderData.items || [],
      shippingInfo: orderData.shippingInfo || {},
      couponCode: orderData.couponCode || null,
      couponId: orderData.couponId || null,
      useWallet: Boolean(orderData.usedWallet),
      userId: orderUserId || null,
    });

    const stockReservationStatus = String(orderData.stockReservationStatus || '');
    const hasReservation =
      stockReservationStatus === 'reserved' || stockReservationStatus === 'captured';

    if (!hasReservation) {
      const stockCheck = await validateStockAvailability({
        db: adminDb,
        items: pricing.items,
      });

      if (!stockCheck.ok) {
        logger.warn('[create-payment-intent] Stock validation failed', stockCheck.details);
        return new Response(
          JSON.stringify({
            error: stockCheck.code,
            message: stockCheck.message,
            details: stockCheck.details,
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    const orderTotal = pricing.total;

    // Validar que el monto coincide con el total calculado por servidor
    if (amount !== undefined && Math.abs(orderTotal - amount) > 0.01) {
      logger.error(`Mismatch de monto: server=${orderTotal}, requested=${amount}`, { orderId });
      return new Response(
        JSON.stringify({
          error: 'El monto no coincide con el total del pedido',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const reservationStatus = String(orderData.walletReservationStatus || '');
    const reservedAmount = Number(orderData.walletReservedAmount || 0);
    const isGuest = !orderUserId || orderUserId === 'guest';
    const reservationEpsilon = 0.01;

    if (!isGuest && orderUserId) {
      try {
        if (pricing.walletDiscount > 0) {
          if (
            reservationStatus === 'reserved' &&
            Math.abs(reservedAmount - pricing.walletDiscount) <= reservationEpsilon
          ) {
            logger.info('[create-payment-intent] Wallet reservation already in place', {
              orderId,
              amount: reservedAmount,
            });
          } else {
            if (reservationStatus === 'reserved' && reservedAmount > 0) {
              await releaseWalletReservation({
                db: adminDb,
                orderId,
                userId: orderUserId,
                amount: reservedAmount,
              });
            }

            await reserveWalletFunds({
              db: adminDb,
              orderId,
              userId: orderUserId,
              amount: pricing.walletDiscount,
            });
            reservationToRelease = {
              orderId,
              userId: orderUserId,
              amount: pricing.walletDiscount,
            };
          }
        } else if (reservationStatus === 'reserved' && reservedAmount > 0) {
          await releaseWalletReservation({
            db: adminDb,
            orderId,
            userId: orderUserId,
            amount: reservedAmount,
          });
        }
      } catch (walletError: unknown) {
        const message =
          walletError instanceof Error ? walletError.message : 'Error procesando el monedero';
        logger.warn('[create-payment-intent] Wallet reservation failed', {
          orderId,
          message,
        });
        return new Response(JSON.stringify({ error: message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Crear Payment Intent with circuit breaker protection
    const paymentIntent = await executeStripeOperation(
      () =>
        stripe.paymentIntents.create({
          amount: Math.round(orderTotal * 100), // Usar el monto del pedido, no el enviado
          currency,
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            orderId: orderId,
            customerEmail: orderData?.customerEmail || '',
          },
          description: `Pedido #${orderId}`,
        }),
      `create-payment-intent-${orderId}`
    );

    // Actualizar pedido con el Payment Intent ID y precios verificados
    const orderUpdate: Record<string, unknown> = {
      paymentIntentId: paymentIntent.id,
      paymentCurrency: currency,
      paymentStatus: 'pending',
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
      updatedAt: new Date(),
    };

    if (pricing.couponCode) {
      orderUpdate.couponCode = pricing.couponCode;
    }
    if (pricing.couponId) {
      orderUpdate.couponId = pricing.couponId;
    }

    await orderRef.update(orderUpdate);

    logger.info(`✅ Payment Intent creado para pedido ${orderId}: ${paymentIntent.id}`);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    if (reservationToRelease && adminDb) {
      try {
        await releaseWalletReservation({
          db: adminDb,
          orderId: reservationToRelease.orderId,
          userId: reservationToRelease.userId,
          amount: reservationToRelease.amount,
        });
      } catch (releaseError) {
        logger.error('[create-payment-intent] Failed to release wallet reservation', releaseError);
      }
    }

    // SECURITY: No exponer detalles internos
    logger.error('❌ Error creando Payment Intent:', error);

    // Si es error de Stripe, podemos dar feedback más útil sin exponer detalles internos
    let userMessage = 'Error procesando pago';
    const errorType = (error as Record<string, unknown>)?.type;
    if (errorType === 'StripeCardError') {
      userMessage = 'Error con la tarjeta. Por favor, verifica los datos e intenta nuevamente.';
    } else if (errorType === 'StripeInvalidRequestError') {
      userMessage = 'Solicitud de pago inválida. Por favor, contacta a soporte.';
    }

    return new Response(JSON.stringify({ error: userMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
