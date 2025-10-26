// src/pages/api/create-payment-intent.ts
import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { amount, currency = 'eur' } = await request.json();

    // Validar que el monto sea válido
    if (!amount || amount < 50) { // Mínimo 0.50 EUR
      return new Response(
        JSON.stringify({ error: 'Monto inválido. Mínimo €0.50' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertir a centavos
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error creando Payment Intent:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Error procesando pago'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
