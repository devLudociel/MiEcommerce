import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../../lib/firebase-admin';
import { logger } from '../../../lib/logger';

/**
 * GET /api/designs/get-user-designs
 *
 * Obtiene todos los diseños guardados del usuario autenticado
 *
 * Headers: Authorization: Bearer <token>
 *
 * Returns: { designs: SavedDesign[] }
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    // Get auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No authorization token provided' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    logger.info('[designs/get-user-designs] Fetching designs for user:', userId);

    const db = getAdminDb();
    const snapshot = await db
      .collection('saved_designs')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const designs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    logger.info(`[designs/get-user-designs] Found ${designs.length} designs`);

    return new Response(
      JSON.stringify({ designs }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    // Handle token errors
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return new Response(
        JSON.stringify({ error: 'Token inválido o expirado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logger.error('[designs/get-user-designs] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error fetching designs',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
