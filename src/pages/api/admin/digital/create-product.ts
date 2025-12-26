import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../../lib/logger';
import { z } from 'zod';

const digitalFileSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  fileUrl: z.string().url(),
  fileSize: z.number().int().positive(),
  fileType: z.string(),
  format: z.enum(['image', 'pdf', 'zip', 'other']),
});

const createDigitalProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  basePrice: z.number().positive(),
  images: z.array(z.string().url()).min(1),
  tags: z.array(z.string()),
  featured: z.boolean().default(false),
  digitalFiles: z.array(digitalFileSchema).min(1),
});

/**
 * POST /api/admin/digital/create-product
 *
 * Crea un producto digital (solo admins)
 *
 * Headers: Authorization: Bearer <token>
 * Body: { name, description, basePrice, images, tags, digitalFiles }
 *
 * Returns: { productId: string }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // SECURITY: Admin authentication required
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[admin/digital/create-product] No auth token provided');
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
    const validationResult = createDigitalProductSchema.safeParse(rawData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const productData = validationResult.data;

    logger.info('[admin/digital/create-product] Creating digital product:', productData.name);

    const db = getAdminDb();

    // Generate slug
    const slug = productData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Create product document
    const docData = {
      name: productData.name,
      description: productData.description,
      category: 'digital' as const,
      basePrice: productData.basePrice,
      images: productData.images,
      customizable: false,
      tags: productData.tags,
      featured: productData.featured,
      slug,
      active: true,
      isDigital: true,
      digitalFiles: productData.digitalFiles,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const productRef = await db.collection('products').add(docData);

    logger.info('[admin/digital/create-product] Product created successfully:', productRef.id);

    return new Response(
      JSON.stringify({
        productId: productRef.id,
        message: 'Producto digital creado correctamente',
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

    logger.error('[admin/digital/create-product] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error creating digital product',
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
