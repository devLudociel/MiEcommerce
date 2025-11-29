import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { verifyAdminAuth, logErrorSafely, createErrorResponse } from '../../../lib/auth-helpers';

/**
 * Endpoint de administración para obtener detalles de pedidos
 *
 * SEGURIDAD: Requiere autenticación de admin
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    // SECURITY: Verificar autenticación de admin
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isAuthenticated && !authResult.isAdmin) {
      return createErrorResponse(
        authResult.error || 'Forbidden: Admin access required',
        authResult.isAuthenticated ? 403 : 401
      );
    }

    const id = url.searchParams.get('id');
    if (!id) {
      return createErrorResponse('Falta id', 400);
    }

    const db = getAdminDb();
    const snap = await db.collection('orders').doc(String(id)).get();

    if (!snap.exists) {
      return createErrorResponse('Pedido no encontrado', 404);
    }

    const order = { id: snap.id, ...snap.data() };
    return new Response(JSON.stringify({ order }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    // SECURITY: No exponer detalles internos
    logErrorSafely('admin/get-order', e);
    return createErrorResponse('Error obteniendo pedido', 500);
  }
};
