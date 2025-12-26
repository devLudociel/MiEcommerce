import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../../lib/logger';
import { z } from 'zod';

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  tags: z.array(z.string()),
  thumbnail: z.string().url(),
  isPremium: z.boolean(),
  popularity: z.number().int().min(0).default(0),
  template: z.object({
    fields: z.array(z.any()),
    previewImage: z.string().url().optional(),
  }),
});

/**
 * POST /api/admin/templates/create
 *
 * Crea una nueva plantilla de diseño (solo admins)
 *
 * Headers: Authorization: Bearer <token>
 * Body: { name, description, category, subcategory, tags, thumbnail, template }
 *
 * Returns: { templateId: string }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // SECURITY: Admin authentication required
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[admin/templates/create] No auth token provided');
      return new Response(JSON.stringify({ error: 'Unauthorized: Token required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);

    // Check if user is admin
    if (!decodedToken.admin && !isAdminEmail(decodedToken.email)) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rawData = await request.json();

    // Validate input
    const validationResult = createTemplateSchema.safeParse(rawData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const templateData = validationResult.data;

    logger.info('[admin/templates/create] Creating template:', templateData.name);

    const db = getAdminDb();

    // Create template document
    const docData = {
      ...templateData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: 'system',
    };

    const templateRef = await db.collection('design_templates').add(docData);

    logger.info('[admin/templates/create] Template created successfully:', templateRef.id);

    return new Response(
      JSON.stringify({
        templateId: templateRef.id,
        message: 'Plantilla creada correctamente',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
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

    logger.error('[admin/templates/create] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error creating template',
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
