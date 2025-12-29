import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../../lib/firebase-admin';
import { logger } from '../../../lib/logger';
import { z } from 'zod';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../../lib/rate-limiter';

const toggleFavoriteSchema = z.object({
  designId: z.string().min(1),
  isFavorite: z.boolean(),
});

/**
 * POST /api/designs/toggle-favorite
 *
 * Marca/desmarca un diseño como favorito
 *
 * Headers: Authorization: Bearer <token>
 * Body: { designId: string; isFavorite: boolean }
 *
 * Returns: { success: boolean }
 */
export const POST: APIRoute = async ({ request }) => {
  // SECURITY FIX: Add rate limiting to prevent abuse
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.GENEROUS, 'designs-toggle-favorite');
  if (!rateLimitResult.allowed) {
    logger.warn('[designs/toggle-favorite] Rate limit exceeded');
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    // Get auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No authorization token provided' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const rawData = await request.json();

    // Validate input
    const validationResult = toggleFavoriteSchema.safeParse(rawData);
    if (!validationResult.success) {
      // SECURITY FIX MED-006: Don't expose validation details in production
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          details: import.meta.env.DEV ? validationResult.error.format() : undefined,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { designId, isFavorite } = validationResult.data;

    logger.info('[designs/toggle-favorite] Toggling favorite:', { designId, isFavorite });

    const db = getAdminDb();
    const designRef = db.collection('saved_designs').doc(designId);
    const designSnap = await designRef.get();

    if (!designSnap.exists) {
      return new Response(JSON.stringify({ error: 'Design not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const designData = designSnap.data();

    // Verify ownership
    if (designData?.userId !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await designRef.update({ isFavorite });

    logger.info('[designs/toggle-favorite] Favorite toggled successfully');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    if (
      firebaseError.code === 'auth/id-token-expired' ||
      firebaseError.code === 'auth/argument-error'
    ) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    logger.error('[designs/toggle-favorite] Error:', error);
    // SECURITY FIX: Don't expose internal error messages in production
    return new Response(
      JSON.stringify({
        error: 'Error al actualizar favorito',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
