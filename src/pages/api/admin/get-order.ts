import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { verifyAdminAuth } from '../../../lib/authMiddleware';
import { rateLimit } from '../../../lib/rateLimit';
import {
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  errorResponse,
} from '../../../lib/errorHandler';

/**
 * Obtiene los detalles de un pedido (solo admin)
 *
 * SEGURIDAD:
 * - Requiere autenticación con Firebase ID Token
 * - Requiere permisos de administrador (custom claim: admin = true)
 *
 * USO:
 * GET /api/admin/get-order?id=order123
 * Headers: { Authorization: "Bearer <idToken>" }
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    // 1. Rate limiting: 30 requests por minuto por IP
    const rateLimitResult = await rateLimit(request, 'admin-get-order', {
      intervalMs: 60_000,
      max: 30,
    });

    if (!rateLimitResult.ok) {
      return new Response(
        JSON.stringify({
          error: rateLimitResult.blocked
            ? 'IP bloqueada temporalmente por exceso de solicitudes'
            : 'Demasiadas solicitudes. Intenta de nuevo más tarde',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
            'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    // 2. Verificar autenticación y permisos de admin
    const authResult = await verifyAdminAuth(request);

    if (!authResult.success) {
      if (authResult.error?.includes('token') || authResult.error?.includes('autenticación')) {
        return unauthorizedResponse(authResult.error);
      }
      return forbiddenResponse(authResult.error);
    }

    // 2. Validar parámetros
    const id = url.searchParams.get('id');
    if (!id) {
      return validationErrorResponse('Falta el parámetro "id"');
    }

    // 3. Obtener el pedido
    const db = getAdminDb();
    const snap = await db.collection('orders').doc(String(id)).get();

    if (!snap.exists) {
      return notFoundResponse('Pedido no encontrado');
    }

    const order = { id: snap.id, ...snap.data() };

    console.log(
      `[admin/get-order] Pedido ${id} consultado por ${authResult.decodedToken?.email}`
    );

    return successResponse({ order });
  } catch (error: any) {
    return errorResponse(error, 'admin-get-order');
  }
};

