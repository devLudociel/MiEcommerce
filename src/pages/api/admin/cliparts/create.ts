import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../../lib/logger';
import { z } from 'zod';

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
  try {
    // Get auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For development, allow without auth
      // TODO: Enable auth check in production
      logger.warn('[admin/cliparts/create] No auth token provided (dev mode)');
    } else {
      const token = authHeader.substring(7);
      const auth = getAdminAuth();
      const decodedToken = await auth.verifyIdToken(token);

      // Check if user is admin
      if (!decodedToken.admin && !isAdminEmail(decodedToken.email)) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: Admin access required' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const rawData = await request.json();

    // Validate input
    const validationResult = createClipartSchema.safeParse(rawData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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

    return new Response(
      JSON.stringify({
        clipartId: clipartRef.id,
        message: 'Clipart creado correctamente',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return new Response(
        JSON.stringify({ error: 'Token inválido o expirado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logger.error('[admin/cliparts/create] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error creating clipart',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Helper function to check admin emails
function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  const adminEmails = import.meta.env.PUBLIC_ADMIN_EMAILS?.split(',') || [];
  return adminEmails.includes(email);
}
