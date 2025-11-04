// src/pages/api/subscribe-newsletter.ts
import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email('Email inválido').max(255),
  source: z.string().max(100).optional(), // De dónde vino (footer, popup, etc.)
});

/**
 * Subscribe an email to the newsletter
 *
 * SECURITY:
 * - CSRF protection
 * - Email validation
 * - Prevents duplicate subscriptions
 * - Stores subscriber metadata for marketing
 */
export const POST: APIRoute = async ({ request }) => {
  // SECURITY: CSRF protection
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    console.warn('[subscribe-newsletter] CSRF validation failed:', csrfCheck.reason);
    return createCSRFErrorResponse();
  }

  try {
    const rawData = await request.json();

    // SECURITY: Validate email
    const validationResult = subscribeSchema.safeParse(rawData);
    if (!validationResult.success) {
      console.error('[subscribe-newsletter] Validation failed:', validationResult.error.format());
      return new Response(
        JSON.stringify({
          error: 'Email inválido',
          details: import.meta.env.PROD ? undefined : validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { email, source } = validationResult.data;
    const emailLower = email.toLowerCase().trim();

    console.log('[subscribe-newsletter] Processing subscription', { email: emailLower, source });

    const db = getAdminDb();
    const subscribersRef = db.collection('newsletter_subscribers');

    // Check if already subscribed
    const existingQuery = await subscribersRef.where('email', '==', emailLower).limit(1).get();

    if (!existingQuery.empty) {
      const existingDoc = existingQuery.docs[0];
      const existingData = existingDoc.data();

      // If previously unsubscribed, reactivate
      if (existingData.status === 'unsubscribed') {
        await existingDoc.ref.update({
          status: 'active',
          resubscribedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        console.log('[subscribe-newsletter] Reactivated subscription', { email: emailLower });

        return new Response(
          JSON.stringify({
            success: true,
            message: '¡Bienvenido de nuevo! Te has vuelto a suscribir correctamente.',
            alreadySubscribed: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Already active subscription
      console.log('[subscribe-newsletter] Email already subscribed', { email: emailLower });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Ya estás suscrito a nuestro newsletter.',
          alreadySubscribed: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create new subscription
    const subscriptionData = {
      email: emailLower,
      status: 'active',
      source: source || 'footer',
      subscribedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      // Marketing metadata
      emailsSent: 0,
      emailsOpened: 0,
      emailsClicked: 0,
      lastEmailSentAt: null,
      // Preferences (can be updated later)
      preferences: {
        offers: true,
        newProducts: true,
        tips: true,
      },
    };

    await subscribersRef.add(subscriptionData);

    console.log('[subscribe-newsletter] New subscription created', { email: emailLower });

    // Optionally send welcome email
    try {
      await fetch(new URL('/api/send-email', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailLower,
          type: 'newsletter-welcome',
        }),
      });
      console.log('[subscribe-newsletter] Welcome email sent');
    } catch (emailError) {
      console.error('[subscribe-newsletter] Error sending welcome email (non-critical):', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: '¡Gracias por suscribirte! Revisa tu email para confirmar.',
        alreadySubscribed: false,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[subscribe-newsletter] Error:', error);
    return new Response(
      JSON.stringify({
        error: error?.message || 'Error al procesar la suscripción',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
