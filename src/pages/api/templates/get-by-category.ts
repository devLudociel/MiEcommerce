import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { logger } from '../../../lib/logger';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../../lib/rate-limiter';

/**
 * GET /api/templates/get-by-category
 *
 * Obtiene plantillas de diseño para una categoría específica
 *
 * Query params:
 * - category: ID de la categoría (ej: "camisetas")
 * - limit: Número máximo de plantillas (default: 100)
 * - premiumOnly: Solo plantillas premium (optional)
 *
 * Returns: { templates: DesignTemplate[] }
 */
export const GET: APIRoute = async ({ request, url }) => {
  const rateLimitResult = await checkRateLimit(
    request,
    RATE_LIMIT_CONFIGS.STANDARD,
    'templates-get-by-category'
  );
  if (!rateLimitResult.allowed) {
    logger.warn('[get-by-category] Rate limit exceeded');
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const categoryId = url.searchParams.get('category');
    const limitRaw = parseInt(url.searchParams.get('limit') || '100', 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 100;
    const premiumOnly = url.searchParams.get('premiumOnly') === 'true';

    if (!categoryId) {
      return new Response(JSON.stringify({ error: 'category parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    logger.info('[get-by-category] Fetching templates for category:', categoryId);

    const db = getAdminDb();
    let query = db
      .collection('design_templates')
      .where('category', '==', categoryId)
      .orderBy('popularity', 'desc')
      .limit(limit);

    if (premiumOnly) {
      query = query.where('isPremium', '==', true);
    }

    const snapshot = await query.get();

    const templates = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    logger.info(`[get-by-category] Found ${templates.length} templates`);

    return new Response(JSON.stringify({ templates }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('[get-by-category] Error:', error);
    // SECURITY FIX: Don't expose error details in production
    return new Response(
      JSON.stringify({
        error: 'Error fetching templates',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
