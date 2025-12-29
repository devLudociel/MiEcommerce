import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../lib/logger';
import { z } from 'zod';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../../lib/rate-limiter';
import { validateCSRF, createCSRFErrorResponse } from '../../../lib/csrf';

const saveDesignSchema = z.object({
  name: z.string().min(1).max(100),
  productId: z.string().min(1),
  productName: z.string().min(1),
  categoryId: z.string().min(1),
  designData: z.any(), // ProductCustomization object
  previewImage: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * POST /api/designs/save
 *
 * Guarda un diseño personalizado del usuario
 *
 * Headers: Authorization: Bearer <token>
 * Body: {
 *   name: string;
 *   productId: string;
 *   productName: string;
 *   categoryId: string;
 *   designData: ProductCustomization;
 *   previewImage?: string;
 *   tags?: string[];
 * }
 *
 * Returns: { designId: string }
 */
export const POST: APIRoute = async ({ request }) => {
  // SECURITY: Rate limiting (standard limit for saving designs)
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.STANDARD, 'designs-save');
  if (!rateLimitResult.allowed) {
    logger.warn('[designs/save] Rate limit exceeded');
    return createRateLimitResponse(rateLimitResult);
  }

  // SECURITY FIX: Add CSRF protection
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    logger.warn('[designs/save] CSRF validation failed:', csrfCheck.reason);
    return createCSRFErrorResponse();
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
    const validationResult = saveDesignSchema.safeParse(rawData);
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

    const { name, productId, productName, categoryId, designData, previewImage, tags } =
      validationResult.data;

    logger.info('[designs/save] Saving design for user:', userId);

    const db = getAdminDb();

    // Create saved design document
    const savedDesign = {
      userId,
      name,
      thumbnail: previewImage || '',
      originalProductId: productId,
      originalCategory: categoryId,
      designData,
      usageCount: 0,
      products: [productId],
      tags: tags || [],
      isFavorite: false,
      createdAt: FieldValue.serverTimestamp(),
      lastUsedAt: FieldValue.serverTimestamp(),
    };

    const designRef = await db.collection('saved_designs').add(savedDesign);

    logger.info('[designs/save] Design saved successfully:', designRef.id);

    return new Response(
      JSON.stringify({
        designId: designRef.id,
        message: 'Diseño guardado correctamente',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    // Handle token errors
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

    logger.error('[designs/save] Error:', error);
    // SECURITY FIX: Don't expose internal error messages in production
    return new Response(
      JSON.stringify({
        error: 'Error al guardar el diseño',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
