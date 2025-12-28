import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../../lib/firebase-admin';
import { logger } from '../../../lib/logger';
import { z } from 'zod';

const deleteDesignSchema = z.object({
  designId: z.string().min(1),
});

/**
 * DELETE /api/designs/delete
 *
 * Elimina un diseño guardado
 *
 * Headers: Authorization: Bearer <token>
 * Body: { designId: string }
 *
 * Returns: { success: boolean }
 */
export const DELETE: APIRoute = async ({ request }) => {
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
    const validationResult = deleteDesignSchema.safeParse(rawData);
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

    const { designId } = validationResult.data;

    logger.info('[designs/delete] Deleting design:', designId);

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

    await designRef.delete();

    logger.info('[designs/delete] Design deleted successfully');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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

    logger.error('[designs/delete] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error deleting design',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
