import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminAuth } from '../../../lib/authMiddleware';
import {
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  successResponse,
  errorResponse,
} from '../../../lib/errorHandler';

/**
 * Actualiza el estado de un pedido
 *
 * SEGURIDAD:
 * - Requiere autenticación con Firebase ID Token
 * - Requiere permisos de administrador (custom claim: admin = true)
 * - Registra la acción en logs para auditoría
 *
 * USO:
 * POST /api/admin/update-order-status
 * Headers: { Authorization: "Bearer <idToken>" }
 * Body: { id: "order123", status: "processing" }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Verificar autenticación y permisos de admin
    const authResult = await verifyAdminAuth(request);

    if (!authResult.success) {
      if (authResult.error?.includes('token') || authResult.error?.includes('autenticación')) {
        return unauthorizedResponse(authResult.error);
      }
      return forbiddenResponse(authResult.error);
    }

    const { decodedToken } = authResult;

    // 2. Validar parámetros de entrada
    const { id, status } = await request.json();

    if (!id || !status) {
      return validationErrorResponse('Faltan parámetros requeridos: id y status');
    }

    // Validar que el status sea válido
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return validationErrorResponse(
        `Estado inválido. Valores permitidos: ${validStatuses.join(', ')}`
      );
    }

    // 3. Obtener el pedido actual para auditoría
    const db = getAdminDb();
    const orderRef = db.collection('orders').doc(String(id));
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return validationErrorResponse('Pedido no encontrado', { orderId: id });
    }

    const oldStatus = orderSnap.data()?.status;

    // 4. Actualizar el estado del pedido
    await orderRef.set(
      {
        status: String(status),
        updatedAt: FieldValue.serverTimestamp(),
        lastUpdatedBy: decodedToken.uid,
      },
      { merge: true }
    );

    // 5. Registrar en audit log
    await db.collection('audit_logs').add({
      action: 'UPDATE_ORDER_STATUS',
      performedBy: decodedToken.uid,
      performedByEmail: decodedToken.email || 'unknown',
      orderId: String(id),
      oldStatus,
      newStatus: String(status),
      timestamp: FieldValue.serverTimestamp(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    console.log(
      `[update-order-status] Pedido ${id} actualizado de "${oldStatus}" a "${status}" por ${decodedToken.email}`
    );

    return successResponse({
      success: true,
      orderId: id,
      oldStatus,
      newStatus: status,
    });
  } catch (error: any) {
    return errorResponse(error, 'update-order-status');
  }
};

