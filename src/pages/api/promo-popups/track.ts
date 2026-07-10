// src/pages/api/promo-popups/track.ts
import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { validateCSRF, createCSRFErrorResponse } from '../../../lib/csrf';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../../lib/rate-limiter';
import { z } from 'zod';

// Simple console logger for API routes (avoids import issues)
const logger = {
  warn: (msg: string, data?: unknown) => console.warn(`[WARN] ${msg}`, data ?? ''),
  error: (msg: string, error?: unknown) => console.error(`[ERROR] ${msg}`, error ?? ''),
};

const trackPopupSchema = z.object({
  popupId: z.string().min(1).max(128),
  stat: z.enum(['impressions', 'clicks', 'dismissals']),
});

/**
 * Increment a promo popup counter (impressions / clicks / dismissals).
 *
 * Visitors are anonymous, so this must run server-side: Firestore rules
 * only allow admins to write to promo_popups. Uses FieldValue.increment
 * so concurrent visitors don't lose counts (the old client-side
 * read-then-write raced besides being denied).
 */
export const POST: APIRoute = async ({ request }) => {
  const rateLimitResult = await checkRateLimit(
    request,
    RATE_LIMIT_CONFIGS.GENEROUS,
    'promo-popups-track'
  );
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  const csrfResult = validateCSRF(request);
  if (!csrfResult.valid) {
    return createCSRFErrorResponse();
  }

  let parsed: z.infer<typeof trackPopupSchema>;
  try {
    const raw = await request.json();
    const result = trackPopupSchema.safeParse(raw);
    if (!result.success) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    parsed = result.data;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await getAdminDb()
      .collection('promo_popups')
      .doc(parsed.popupId)
      .update({
        [parsed.stat]: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
  } catch (error) {
    // Doc inexistente (popup borrado con visitas en vuelo) no es un error del
    // cliente ni debe filtrar qué ids existen — se ignora silenciosamente.
    const code = (error as { code?: number | string })?.code;
    if (code !== 5 && code !== 'not-found') {
      logger.error('[promo-popups/track] Failed to increment', {
        stat: parsed.stat,
        error: String(error),
      });
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(null, { status: 204 });
};
