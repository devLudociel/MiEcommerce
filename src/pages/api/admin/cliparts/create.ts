import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../../lib/logger';
import { z } from 'zod';
import { getSecurityHeaders } from '../../../../lib/auth-helpers';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../../../lib/rate-limiter';
import { validateCSRF, createCSRFErrorResponse } from '../../../../lib/csrf';

const createClipartSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  tags: z.array(z.string()),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  isPremium: z.boolean(),
  usageCount: z.number().int().min(0).default(0),
  format: z.enum(['png', 'svg']),
  hasTransparency: z.boolean(),
  dimensions: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  colors: z.array(z.string()).optional().default([]),
});

/**
 * POST /api/admin/cliparts/create
 *
 * Crea un nuevo clipart (solo admins)
 *
 * Headers: Authorization: Bearer <token>
 * Body: { name, category, subcategory, tags, imageUrl, ... }
 *
 * Returns: { clipartId: string }
 */
export const POST: APIRoute = async ({ request }) => {
  // SECURITY FIX: Add rate limiting
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.STANDARD, 'admin-cliparts-create');
  if (!rateLimitResult.allowed) {
    logger.warn('[admin/cliparts/create] Rate limit exceeded');
    return createRateLimitResponse(rateLimitResult);
  }

  // SECURITY FIX: Add CSRF protection
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    logger.warn('[admin/cliparts/create] CSRF validation failed:', csrfCheck.reason);
    return createCSRFErrorResponse();
  }

  try {
    // SECURITY: Admin authentication required
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[admin/cliparts/create] No auth token provided');
      return new Response(JSON.stringify({ error: 'Unauthorized: Token required' }), {
        status: 401,
        headers: getSecurityHeaders(),
      });
    }

    const token = authHeader.substring(7);
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);

    // SECURITY FIX: Only check admin claim, not email list (server-side ADMIN_EMAILS is acceptable but claims are preferred)
    if (!decodedToken.admin) {
      logger.warn('[admin/cliparts/create] Non-admin user attempted access:', decodedToken.uid);
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
        status: 403,
        headers: getSecurityHeaders(),
      });
    }

    const rawData = await request.json();

    // Validate input
    const validationResult = createClipartSchema.safeParse(rawData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          details: import.meta.env.DEV ? validationResult.error.format() : undefined,
        }),
        { status: 400, headers: getSecurityHeaders() }
      );
    }

    const clipartData = validationResult.data;

    logger.info('[admin/cliparts/create] Creating clipart:', clipartData.name);

    const db = getAdminDb();

    // Create clipart document
    const docData = {
      ...clipartData,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: 'system',
    };

    const clipartRef = await db.collection('cliparts').add(docData);

    logger.info('[admin/cliparts/create] Clipart created successfully:', clipartRef.id);

    logger.info('[admin/cliparts/create] Clipart created by admin:', decodedToken.uid);

    return new Response(
      JSON.stringify({
        clipartId: clipartRef.id,
        message: 'Clipart creado correctamente',
      }),
      { status: 200, headers: getSecurityHeaders() }
    );
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    if (
      firebaseError.code === 'auth/id-token-expired' ||
      firebaseError.code === 'auth/argument-error'
    ) {
      return new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 401,
        headers: getSecurityHeaders(),
      });
    }

    logger.error('[admin/cliparts/create] Error:', error);
    // SECURITY FIX: Don't expose error details in production
    return new Response(
      JSON.stringify({
        error: 'Error creating clipart',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      { status: 500, headers: getSecurityHeaders() }
    );
  }
};
