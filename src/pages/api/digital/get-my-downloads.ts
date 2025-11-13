import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../../lib/firebase-admin';
import { logger } from '../../../lib/logger';

/**
 * GET /api/digital/get-my-downloads
 *
 * Obtiene todos los productos digitales que el usuario ha comprado
 * Requiere autenticación
 *
 * Headers: Authorization: Bearer <token>
 *
 * Returns: { downloads: DigitalAccess[] }
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    // Get auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    logger.info('[digital/get-my-downloads] Fetching downloads for user', { userId });

    const db = getAdminDb();

    // Get all digital access records for this user
    const snapshot = await db
      .collection('digital_access')
      .where('userId', '==', userId)
      .orderBy('purchasedAt', 'desc')
      .get();

    const downloads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      purchasedAt: doc.data().purchasedAt?.toDate?.()?.toISOString() || null,
      lastDownloadAt: doc.data().lastDownloadAt?.toDate?.()?.toISOString() || null,
    }));

    logger.info('[digital/get-my-downloads] Downloads fetched', {
      userId,
      count: downloads.length,
    });

    return new Response(
      JSON.stringify({ downloads }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return new Response(
        JSON.stringify({ error: 'Token inválido o expirado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logger.error('[digital/get-my-downloads] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error al obtener descargas',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
