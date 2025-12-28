import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../lib/logger';
import { z } from 'zod';

const duplicateDesignSchema = z.object({
  designId: z.string().min(1),
});

/**
 * POST /api/designs/duplicate
 *
 * Duplica un diseño guardado
 *
 * Headers: Authorization: Bearer <token>
 * Body: { designId: string }
 *
 * Returns: { designId: string; message: string }
 */
export const POST: APIRoute = async ({ request }) => {
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
    const validationResult = duplicateDesignSchema.safeParse(rawData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          details: import.meta.env.PROD ? undefined : validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { designId } = validationResult.data;

    logger.info('[designs/duplicate] Duplicating design:', designId);

    const db = getAdminDb();
    const designRef = db.collection('saved_designs').doc(designId);
    const designSnap = await designRef.get();

    if (!designSnap.exists) {
      return new Response(JSON.stringify({ error: 'Design not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const designData = designSnap.data();

    // Verify ownership
    if (designData?.userId !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create duplicate
    const duplicateData = {
      ...designData,
      name: `${designData.name} (copia)`,
      usageCount: 0,
      isFavorite: false,
      createdAt: FieldValue.serverTimestamp(),
      lastUsedAt: FieldValue.serverTimestamp(),
    };

    const newDesignRef = await db.collection('saved_designs').add(duplicateData);

    logger.info('[designs/duplicate] Design duplicated successfully:', newDesignRef.id);

    return new Response(
      JSON.stringify({
        designId: newDesignRef.id,
        message: 'Diseño duplicado correctamente',
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

    logger.error('[designs/duplicate] Error:', error);
    // SECURITY FIX: Don't expose error details in production
    return new Response(
      JSON.stringify({
        error: 'Error duplicating design',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
