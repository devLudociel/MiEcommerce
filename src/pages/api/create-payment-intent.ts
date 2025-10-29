// src/pages/api/create-payment-intent.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getAdminDb } from '../../lib/firebase-admin';
import { validateCsrfToken, csrfErrorResponse } from '../../lib/csrfProtection';
import { validateSafeId, validateRange } from '../../lib/inputSanitization';
import { rateLimit } from '../../lib/rateLimit';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Crea un Payment Intent de Stripe asociado a un pedido
 *
 * SEGURIDAD:
 * - Protección CSRF
 * - Rate limiting
 * - Valida que el orderId exista en Firestore
 * - Valida que el monto coincida con el total del pedido
 * - Previene manipulación de montos
 */
export const POST: APIRoute = async ({ request }) => {
  // 1. CSRF Protection
  const csrfResult = validateCsrfToken(request);
  if (!csrfResult.valid) {
    console.warn('[create-payment-intent] CSRF validation failed:', csrfResult.error);
    return csrfErrorResponse(csrfResult.error);
  }

  // 2. Rate limiting: 10 requests por minuto por IP
  try {
    const { ok, remaining, resetAt } = await rateLimit(request, 'create-payment-intent', {
      intervalMs: 60_000,
      max: 10,
    });
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Intenta de nuevo más tarde' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(resetAt),
        },
      });
    }
  } catch {}

  try {
    const { orderId, amount, currency = 'eur' } = await request.json();

    // 3. Validar orderId
    if (!orderId || !validateSafeId(orderId)) {
      return new Response(JSON.stringify({ error: 'Order ID inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Validar amount
    if (!amount || !validateRange(amount, { min: 0.5, max: 1000000 })) {
      return new Response(JSON.stringify({ error: 'Monto inválido. Mínimo €0.50' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. Validar currency (solo EUR)
    if (currency !== 'eur') {
      return new Response(JSON.stringify({ error: 'Moneda no soportada' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. Validar que el pedido existe y obtener el monto real
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
      console.error(`Mismatch de monto: order=${orderTotal}, requested=${amount}`, { orderId });
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

    // Crear Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
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
    });

    // Actualizar pedido con el Payment Intent ID
    await orderRef.update({
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'pending',
      updatedAt: new Date(),
    });

    console.log(`✅ Payment Intent creado para pedido ${orderId}: ${paymentIntent.id}`);

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
  } catch (error: any) {
    console.error('❌ Error creando Payment Intent:', error);

    // En producción, no exponer detalles del error
    const errorMessage = import.meta.env.PROD
      ? 'Error procesando pago'
      : (error.message || 'Error procesando pago');

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
