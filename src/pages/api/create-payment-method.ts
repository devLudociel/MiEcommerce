// src/pages/api/create-payment-method.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { logger } from '../../lib/logger';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * @deprecated SECURITY VIOLATION - PCI-DSS Non-Compliant
 *
 * ⚠️ THIS ENDPOINT IS INSECURE AND SHOULD NOT BE USED ⚠️
 *
 * PROBLEM:
 * - Accepts raw card data (number, expiry, CVV) via POST
 * - Card data passes through your server
 * - Violates PCI-DSS compliance requirements
 * - Exposes you to legal and security risks
 *
 * SOLUTION:
 * - Use Stripe Elements instead (client-side tokenization)
 * - See: src/components/checkout/SecureCardPayment.tsx
 * - Card data goes directly from browser to Stripe (never touches your server)
 *
 * This endpoint is kept ONLY for backwards compatibility during migration.
 * It will be removed in the next major version.
 *
 * Migration guide:
 * 1. Wrap checkout with <StripeProvider>
 * 2. Use <SecureCardPayment> component
 * 3. Remove all references to this endpoint
 * 4. Delete this file
 */
export const POST: APIRoute = async ({ request }) => {
  // Log warning every time this deprecated endpoint is used
  logger.warn(
    '⚠️ DEPRECATED ENDPOINT USED: /api/create-payment-method - MIGRATE TO STRIPE ELEMENTS'
  );
  logger.warn('Card data is passing through your server - PCI-DSS violation');
  logger.warn('See: src/components/checkout/SecureCardPayment.tsx for secure implementation');
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
  } catch (error: unknown) {
    logger.error('[API] Error creando Payment Method', error);

    // Mejorar mensajes de error de Stripe
    let errorMessage = 'Error procesando los datos de la tarjeta';
    const errorObj = error as Record<string, any>;

    if (errorObj.type === 'StripeCardError') {
      errorMessage = errorObj.message || 'Tarjeta inválida';
    } else if (errorObj.code === 'incorrect_number') {
      errorMessage = 'Número de tarjeta incorrecto';
    } else if (errorObj.code === 'invalid_expiry_month' || errorObj.code === 'invalid_expiry_year') {
      errorMessage = 'Fecha de vencimiento inválida';
    } else if (errorObj.code === 'invalid_cvc') {
      errorMessage = 'CVV inválido';
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: import.meta.env.DEV ? errorObj.message : undefined,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
