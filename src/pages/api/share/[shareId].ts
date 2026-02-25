import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../lib/logger';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../../lib/rate-limiter';

const PRIVATE_PREFIXES = [
  'users/',
  'uploads/',
  'personalizaciones/',
  'profiles/',
];

function extractStoragePath(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('data:')) return null;
  if (url.startsWith('gs://')) {
    return url.replace(/^gs:\/\/[^/]+\//, '');
  }
  const storageMatch = url.match(/^https?:\/\/storage\.googleapis\.com\/[^/]+\/(.+)$/);
  if (storageMatch) {
    return decodeURIComponent(storageMatch[1].split('?')[0]);
  }
  const firebaseMatch = url.match(/^https?:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/(.+)$/);
  if (firebaseMatch) {
    return decodeURIComponent(firebaseMatch[1].split('?')[0]);
  }
  const parts = url.split('/o/');
  if (parts.length < 2) return null;
  const rawPath = parts[1].split('?')[0];
  if (!rawPath) return null;
  return decodeURIComponent(rawPath);
}

function isPrivatePath(path: string): boolean {
  return PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * GET /api/share/[shareId]
 *
 * Retrieves a shared design by its ID
 * Increments view count on each access
 *
 * Returns: SharedDesign object or 404
 */
export const GET: APIRoute = async ({ params, request }) => {
  const rateLimitResult = await checkRateLimit(request, RATE_LIMIT_CONFIGS.STANDARD, 'share-get');
  if (!rateLimitResult.allowed) {
    logger.warn('[share/get] Rate limit exceeded');
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const { shareId } = params;

    if (!shareId) {
      return new Response(JSON.stringify({ error: 'Share ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // SECURITY FIX LOW-003: Validate shareId format
    // Only allow alphanumeric, hyphens, and underscores (8-50 chars)
    if (!/^[a-zA-Z0-9_-]{8,50}$/.test(shareId)) {
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

    let imageUrl: string | null = shareData?.imageUrl || null;
    const imagePath =
      shareData?.imagePath ||
      (shareData?.imageUrl ? extractStoragePath(shareData.imageUrl) : null);

    if (imagePath && isPrivatePath(imagePath)) {
      try {
        const storage = getStorage();
        const bucket = storage.bucket();
        const expiresInSeconds = 5 * 60;
        const expiresAt = Date.now() + expiresInSeconds * 1000;
        const [signedUrl] = await bucket.file(imagePath).getSignedUrl({
          action: 'read',
          expires: expiresAt,
        });
        imageUrl = signedUrl;
      } catch (err) {
        logger.warn('[share/get] Failed to sign image path', err);
      }
    }

    logger.info('[share/get] Shared design retrieved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: shareData?.id,
          productId: shareData?.productId,
          productName: shareData?.productName,
          designData: shareData?.designData,
          imageUrl: imageUrl,
          createdAt: shareData?.createdAt,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('[share/get] Error:', error);
    // SECURITY FIX: Don't expose error details in production
    return new Response(
      JSON.stringify({
        error: 'Error fetching shared design',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
