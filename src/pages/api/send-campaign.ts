// src/pages/api/send-campaign.ts
import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { verifyAdminAuth } from '../../lib/auth/authHelpers';
import { z } from 'zod';
import { logger } from '../../lib/logger';
import {
  newCouponCampaignTemplate,
  newProductCampaignTemplate,
} from '../../lib/campaignEmailTemplates';

const couponCampaignSchema = z.object({
  type: z.literal('coupon'),
  couponCode: z.string().min(1).max(50),
  discountValue: z.string().min(1).max(50),
  expiryDate: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

const productCampaignSchema = z.object({
  type: z.literal('product'),
  productName: z.string().min(1).max(200),
  productDescription: z.string().min(1).max(1000),
  productImage: z.string().url().max(500),
  productPrice: z.string().min(1).max(50),
  productUrl: z.string().url().max(500),
});

const sendCampaignSchema = z.discriminatedUnion('type', [
  couponCampaignSchema,
  productCampaignSchema,
]);

/**
 * Send marketing campaign to all active newsletter subscribers (Admin only)
 *
 * SECURITY:
 * - CSRF protection
 * - Admin authentication required
 * - Uses Admin SDK to query subscribers
 * - Batch email sending with rate limiting
 */
export const POST: APIRoute = async ({ request }) => {
  // SECURITY: CSRF protection
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    logger.warn('[send-campaign] CSRF validation failed', { reason: csrfCheck.reason });
    return createCSRFErrorResponse();
  }

  // SECURITY: Admin authentication required
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    logger.warn('[send-campaign] Unauthorized admin access attempt');
    return authResult.error!;
  }

  logger.info('[send-campaign] Authorized admin user', { email: authResult.email });

  try {
    const rawData = await request.json();

    // SECURITY: Validate input
    const validationResult = sendCampaignSchema.safeParse(rawData);
    if (!validationResult.success) {
      logger.error('[send-campaign] Validation failed', validationResult.error.format());
      return new Response(
        JSON.stringify({
          error: 'Datos inválidos',
          details: import.meta.env.PROD ? undefined : validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const campaignData = validationResult.data;

    logger.info('[send-campaign] Starting campaign', { type: campaignData.type });

    // Check Resend API key
    const resendApiKey = import.meta.env.RESEND_API_KEY;
    if (!resendApiKey) {
      logger.error('[send-campaign] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({
          error: 'Servicio de email no configurado. Contacta al administrador.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Get all active newsletter subscribers
    const db = getAdminDb();
    const subscribersSnapshot = await db
      .collection('newsletter_subscribers')
      .where('status', '==', 'active')
      .get();

    if (subscribersSnapshot.empty) {
      logger.warn('[send-campaign] No active subscribers found');
      return new Response(
        JSON.stringify({
          error: 'No hay suscriptores activos en la base de datos',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const subscribers = subscribersSnapshot.docs.map((doc) => ({
      id: doc.id,
      email: doc.data().email,
    }));

    logger.info('[send-campaign] Found subscribers', { count: subscribers.length });

    // Generate email template based on campaign type
    let emailTemplate: { subject: string; html: string };

    if (campaignData.type === 'coupon') {
      emailTemplate = newCouponCampaignTemplate({
        couponCode: campaignData.couponCode,
        discountValue: campaignData.discountValue,
        expiryDate: campaignData.expiryDate,
        description: campaignData.description,
      });
    } else {
      // type === 'product'
      emailTemplate = newProductCampaignTemplate({
        productName: campaignData.productName,
        productDescription: campaignData.productDescription,
        productImage: campaignData.productImage,
        productPrice: campaignData.productPrice,
        productUrl: campaignData.productUrl,
      });
    }

    // Send emails in batches to respect rate limits
    const BATCH_SIZE = 100; // Resend allows 100 emails per request
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    // Process subscribers in batches
    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);

      logger.info('[send-campaign] Sending batch', {
        batchNumber: Math.floor(i / BATCH_SIZE) + 1,
        totalBatches: Math.ceil(subscribers.length / BATCH_SIZE),
        batchSize: batch.length,
      });

      // Send emails to batch
      const batchPromises = batch.map(async (subscriber) => {
        try {
          const response = await resend.emails.send({
            from: import.meta.env.EMAIL_FROM || 'ImprimeArte <noreply@imprimearte.es>',
            to: [subscriber.email],
            subject: emailTemplate.subject,
            html: emailTemplate.html,
          });

          logger.info('[send-campaign] Email sent successfully', {
            email: subscriber.email,
            emailId: response.data?.id,
          });

          // Update subscriber stats
          try {
            await db
              .collection('newsletter_subscribers')
              .doc(subscriber.id)
              .update({
                emailsSent: FieldValue.increment(1),
                lastEmailSent: FieldValue.serverTimestamp(),
              });
          } catch (updateError) {
            logger.warn('[send-campaign] Failed to update subscriber stats (non-critical)', {
              subscriberId: subscriber.id,
              error: updateError,
            });
          }

          successCount++;
          return { success: true, email: subscriber.email };
        } catch (error: unknown) {
          logger.error('[send-campaign] Failed to send email', {
            email: subscriber.email,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          errorCount++;
          errors.push({
            email: subscriber.email,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          return { success: false, email: subscriber.email };
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);

      // Delay between batches to avoid rate limits
      if (i + BATCH_SIZE < subscribers.length) {
        logger.debug('[send-campaign] Waiting before next batch...');
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    logger.info('[send-campaign] Campaign completed', {
      totalSubscribers: subscribers.length,
      successCount,
      errorCount,
    });

    // Store campaign record in Firestore
    try {
      await db.collection('newsletter_campaigns').add({
        type: campaignData.type,
        campaignData,
        subject: emailTemplate.subject,
        totalRecipients: subscribers.length,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors.slice(0, 100) : [], // Store first 100 errors
        createdAt: FieldValue.serverTimestamp(),
      });

      logger.info('[send-campaign] Campaign record saved to Firestore');
    } catch (storeError) {
      logger.warn('[send-campaign] Failed to store campaign record (non-critical)', storeError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Campaña enviada correctamente',
        stats: {
          totalRecipients: subscribers.length,
          successCount,
          errorCount,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    logger.error('[send-campaign] Error', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error enviando campaña',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
