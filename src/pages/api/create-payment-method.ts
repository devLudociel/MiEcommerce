// src/pages/api/create-payment-method.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { logger } from '../../lib/logger';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Crea un Payment Method de Stripe de forma segura en el servidor
 *
 * IMPORTANTE: Este endpoint acepta datos de tarjeta pero SOLO para propósitos
 * de desarrollo/testing. En producción real, deberías usar Stripe Elements
 * para que los datos de tarjeta nunca pasen por tu servidor.
 *
 * Sin embargo, esta implementación es más segura que hacerlo en el cliente
 * porque al menos los datos se tokeniz an inmediatamente en el servidor.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const { cardNumber, expMonth, expYear, cvc, billingDetails } = await request.json();

    // Validar datos requeridos
    if (!cardNumber || !expMonth || !expYear || !cvc) {
      return new Response(JSON.stringify({ error: 'Datos de tarjeta incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Crear Payment Method usando la API de Stripe en el servidor
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: cardNumber,
        exp_month: expMonth,
        exp_year: expYear,
        cvc: cvc,
      },
      billing_details: {
        name: billingDetails?.name,
        email: billingDetails?.email,
        phone: billingDetails?.phone,
        address: billingDetails?.address
          ? {
              line1: billingDetails.address.line1,
              city: billingDetails.address.city,
              postal_code: billingDetails.address.postal_code,
              state: billingDetails.address.state,
              country: billingDetails.address.country,
            }
          : undefined,
      },
    });

    logger.info('[API] Payment Method creado', {
      paymentMethodId: paymentMethod.id,
      last4: paymentMethod.card?.last4,
    });

    return new Response(
      JSON.stringify({
        paymentMethodId: paymentMethod.id,
        card: {
          brand: paymentMethod.card?.brand,
          last4: paymentMethod.card?.last4,
          exp_month: paymentMethod.card?.exp_month,
          exp_year: paymentMethod.card?.exp_year,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    logger.error('[API] Error creando Payment Method', error);

    // Mejorar mensajes de error de Stripe
    let errorMessage = 'Error procesando los datos de la tarjeta';

    if (error.type === 'StripeCardError') {
      errorMessage = error.message || 'Tarjeta inválida';
    } else if (error.code === 'incorrect_number') {
      errorMessage = 'Número de tarjeta incorrecto';
    } else if (error.code === 'invalid_expiry_month' || error.code === 'invalid_expiry_year') {
      errorMessage = 'Fecha de vencimiento inválida';
    } else if (error.code === 'invalid_cvc') {
      errorMessage = 'CVV inválido';
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: import.meta.env.DEV ? error.message : undefined,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
