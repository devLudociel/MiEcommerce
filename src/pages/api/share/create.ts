import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../lib/logger';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../../lib/rate-limiter';

// Generate short IDs (8 characters, URL-safe)
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 8);

const createShareSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  designData: z.any(), // ProductCustomization object
  previewImage: z.string().url().optional(),
});

/**
 * POST /api/share/create
 *
 * Crea un enlace compartible para un diseño
 *
 * Body: {
 *   productId: string;
 *   productName: string;
 *   designData: ProductCustomization;
 *   previewImage?: string;
 * }
 *
 * Returns: { shareId: string; shareUrl: string }
 */
export const POST: APIRoute = async ({ request }) => {
  // SECURITY: Rate limiting (standard limit for share creation)
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.STANDARD, 'share-create');
  if (!rateLimitResult.allowed) {
    logger.warn('[share/create] Rate limit exceeded');
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const rawData = await request.json();

    // Validate input
    const validationResult = createShareSchema.safeParse(rawData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { productId, productName, designData, previewImage } = validationResult.data;

    // Generate unique share ID
    const shareId = nanoid();

    logger.info('[share/create] Creating shareable design:', shareId);

    const db = getAdminDb();

    // Calculate expiration date (90 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Create shared design document
    const sharedDesign = {
      id: shareId,
      userId: 'anonymous', // TODO: Get from auth if available
      productId,
      productName,
      designData,
      imageUrl: previewImage || '',
      shareCount: 0,
      viewCount: 0,
      clickCount: 0,
      conversionCount: 0,
      platform: {
        whatsapp: 0,
        facebook: 0,
        instagram: 0,
        twitter: 0,
        pinterest: 0,
        email: 0,
        link: 0,
      },
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    };

    await db.collection('shared_designs').doc(shareId).set(sharedDesign);

    logger.info('[share/create] Shared design created successfully');

    return new Response(
      JSON.stringify({
        shareId,
        message: 'Enlace creado correctamente',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('[share/create] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error creating share link',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
