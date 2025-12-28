import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../lib/logger';

/**
 * GET /api/share/[shareId]
 *
 * Retrieves a shared design by its ID
 * Increments view count on each access
 *
 * Returns: SharedDesign object or 404
 */
export const GET: APIRoute = async ({ params }) => {
  try {
    const { shareId } = params;

    if (!shareId) {
      return new Response(JSON.stringify({ error: 'Share ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // SECURITY FIX LOW-003: Validate shareId format
    // Only allow alphanumeric, hyphens, and underscores (10-50 chars)
    if (!/^[a-zA-Z0-9_-]{10,50}$/.test(shareId)) {
      logger.warn('[share/get] Invalid shareId format:', shareId);
      return new Response(JSON.stringify({ error: 'Invalid share ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    logger.info('[share/get] Fetching shared design:', shareId);

    const db = getAdminDb();
    const shareRef = db.collection('shared_designs').doc(shareId);
    const shareSnap = await shareRef.get();

    if (!shareSnap.exists) {
      logger.warn('[share/get] Shared design not found:', shareId);
      return new Response(JSON.stringify({ error: 'Shared design not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const shareData = shareSnap.data();

    // Check if expired
    if (shareData?.expiresAt && shareData.expiresAt.toDate() < new Date()) {
      logger.warn('[share/get] Shared design expired:', shareId);
      return new Response(JSON.stringify({ error: 'This shared design has expired' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Increment view count
    await shareRef.update({
      viewCount: FieldValue.increment(1),
    });

    logger.info('[share/get] Shared design retrieved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: shareData?.id,
          productId: shareData?.productId,
          productName: shareData?.productName,
          designData: shareData?.designData,
          imageUrl: shareData?.imageUrl,
          createdAt: shareData?.createdAt,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('[share/get] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error fetching shared design',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
