// src/pages/api/create-payment-intent.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getAdminDb } from '../../lib/firebase-admin';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { executeStripeOperation } from '../../lib/externalServices';
import { createScopedLogger } from '../../lib/utils/apiLogger';
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
  amount: z.number().min(0.5).max(1000000), // Mínimo €0.50, máximo €1M
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
    const db = getAdminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const orderData = orderSnap.data();
    const orderTotal = orderData?.total || 0;

    // Validar que el monto coincide con el total del pedido
    // Permitir pequeña diferencia por redondeo (0.01 EUR)
    if (Math.abs(orderTotal - amount) > 0.01) {
      logger.error(`Mismatch de monto: order=${orderTotal}, requested=${amount}`, { orderId });
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

    // Actualizar pedido con el Payment Intent ID
    await orderRef.update({
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'pending',
      updatedAt: new Date(),
    });

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
