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
  clipartId: z.string().min(1),
});

/**
 * POST /api/cliparts/increment-usage
 *
 * Incrementa el contador de uso de un clipart
 *
 * Body: { clipartId: string }
 *
 * Returns: { success: boolean }
 */
export const POST: APIRoute = async ({ request }) => {
  const rateLimitResult = checkRateLimit(
    request,
    RATE_LIMIT_CONFIGS.STANDARD,
    'cliparts-increment-usage'
  );
  if (!rateLimitResult.allowed) {
    logger.warn('[cliparts/increment-usage] Rate limit exceeded');
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

    const { clipartId } = validationResult.data;

    logger.info('[cliparts/increment-usage] Incrementing usage for clipart:', clipartId);

    const db = getAdminDb();
    const clipartRef = db.collection('cliparts').doc(clipartId);

    // Check if clipart exists
    const clipartSnap = await clipartRef.get();
    if (!clipartSnap.exists) {
      return new Response(JSON.stringify({ error: 'Clipart not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Increment usage counter
    await clipartRef.update({
      usageCount: FieldValue.increment(1),
    });

    logger.info('[cliparts/increment-usage] Successfully incremented usage');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('[cliparts/increment-usage] Error:', error);
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
