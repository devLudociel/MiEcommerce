// src/pages/api/create-payment-intent.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getAdminDb } from '../../lib/firebase-admin';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Crea un Payment Intent de Stripe asociado a un pedido
 *
 * SEGURIDAD:
 * - Protección CSRF
 * - Valida que el orderId exista en Firestore
 * - Valida que el monto coincida con el total del pedido
 * - Previene manipulación de montos
 */
export const POST: APIRoute = async ({ request }) => {
  // SECURITY: CSRF protection
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    console.warn('[create-payment-intent] CSRF validation failed:', csrfCheck.reason);
    return createCSRFErrorResponse();
  }

  try {
    const { orderId, amount, currency = 'eur' } = await request.json();

    // Validar datos requeridos
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID es requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!amount || amount < 0.5) {
      return new Response(JSON.stringify({ error: 'Monto inválido. Mínimo €0.50' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
    // SECURITY: No exponer detalles internos
    console.error('❌ Error creando Payment Intent:', error);

    // Si es error de Stripe, podemos dar feedback más útil sin exponer detalles internos
    let userMessage = 'Error procesando pago';
    if (error?.type === 'StripeCardError') {
      userMessage = 'Error con la tarjeta. Por favor, verifica los datos e intenta nuevamente.';
    } else if (error?.type === 'StripeInvalidRequestError') {
      userMessage = 'Solicitud de pago inválida. Por favor, contacta a soporte.';
    }

    return new Response(
      JSON.stringify({ error: userMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
