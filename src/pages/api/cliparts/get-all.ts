import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { logger } from '../../../lib/logger';

/**
 * GET /api/cliparts/get-all
 *
 * Obtiene cliparts con paginación y filtros
 *
 * Query params:
 * - category: Categoría (optional)
 * - page: Número de página (default: 1)
 * - limit: Cliparts por página (default: 20, max: 100)
 * - premiumOnly: Solo cliparts premium (optional)
 *
 * Returns: { cliparts: Clipart[]; hasMore: boolean; total: number }
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const category = url.searchParams.get('category');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const premiumOnly = url.searchParams.get('premiumOnly') === 'true';

    logger.info('[cliparts/get-all] Fetching cliparts:', { category, page, limit });

    const db = getAdminDb();
    let query = db.collection('cliparts').orderBy('usageCount', 'desc');

    // Filter by category
    if (category && category !== 'Todos') {
      query = query.where('category', '==', category);
    }

    // Filter by premium
    if (premiumOnly) {
      query = query.where('isPremium', '==', true);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit + 1).offset(offset);

    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > limit;
    const cliparts = snapshot.docs.slice(0, limit).map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    logger.info(`[cliparts/get-all] Found ${cliparts.length} cliparts`);

    return new Response(
      JSON.stringify({
        cliparts,
        hasMore,
        page,
        limit,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('[cliparts/get-all] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error fetching cliparts',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
