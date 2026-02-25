import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../lib/logger';
import { z } from 'zod';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../../lib/rate-limiter';

const incrementUsageSchema = z.object({
  templateId: z.string().min(1),
});

/**
 * POST /api/templates/increment-usage
 *
 * Incrementa el contador de popularidad de una plantilla
 *
 * Body: { templateId: string }
 *
 * Returns: { success: boolean }
 */
export const POST: APIRoute = async ({ request }) => {
  const rateLimitResult = await checkRateLimit(
    request,
    RATE_LIMIT_CONFIGS.STANDARD,
    'templates-increment-usage'
  );
  if (!rateLimitResult.allowed) {
    logger.warn('[increment-usage] Rate limit exceeded');
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const rawData = await request.json();

    // Validate input
    const validationResult = incrementUsageSchema.safeParse(rawData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          details: import.meta.env.PROD ? undefined : validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { templateId } = validationResult.data;

    logger.info('[increment-usage] Incrementing usage for template:', templateId);

    const db = getAdminDb();
    const templateRef = db.collection('design_templates').doc(templateId);

    // Check if template exists
    const templateSnap = await templateRef.get();
    if (!templateSnap.exists) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Increment popularity counter
    await templateRef.update({
      popularity: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('[increment-usage] Successfully incremented usage');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('[increment-usage] Error:', error);
    // SECURITY FIX: Don't expose error details in production
    return new Response(
      JSON.stringify({
        error: 'Error incrementing usage',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
