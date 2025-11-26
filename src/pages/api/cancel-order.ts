import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../lib/firebase-admin';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { FieldValue } from 'firebase-admin/firestore';

// Simple console logger for API routes (avoids import issues)
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
  debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data || ''),
};

export const POST: APIRoute = async ({ request }) => {
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    logger.warn('[cancel-order] CSRF validation failed:', csrfCheck.reason);
    return createCSRFErrorResponse();
  }

  // SECURITY: Require authentication
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('[cancel-order] Missing authorization header');
    return new Response(JSON.stringify({ error: 'No autorizado - Token requerido' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const idToken = authHeader.replace('Bearer ', '').trim();
  let uid: string;
  let isAdmin = false;

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    uid = decodedToken.uid;
    isAdmin = !!decodedToken.admin;
  } catch (error) {
    logger.error('[cancel-order] Invalid token:', error);
    return new Response(JSON.stringify({ error: 'No autorizado - Token inválido' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { orderId, idempotencyKey, reason } = await request.json();

    if (!orderId || typeof orderId !== 'string') {
      return new Response(JSON.stringify({ error: 'orderId es requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return new Response(JSON.stringify({ error: 'idempotencyKey es requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getAdminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = orderSnap.data() || {};

    // SECURITY: Verify ownership
    if (data.userId !== uid && !isAdmin) {
      logger.warn('[cancel-order] Unauthorized cancellation attempt', {
        orderId,
        attemptedBy: uid,
        orderOwner: data.userId,
      });
      return new Response(
        JSON.stringify({ error: 'No tienes permiso para cancelar este pedido' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (data.idempotencyKey !== idempotencyKey) {
      logger.warn('[cancel-order] Idempotency key mismatch for order', orderId);
      return new Response(JSON.stringify({ error: 'Idempotency key inválido' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (data.paymentStatus === 'paid' || data.paymentStatus === 'completed') {
      return new Response(
        JSON.stringify({ error: 'El pedido ya está pagado y no puede cancelarse automáticamente' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (data.postPaymentActionsCompleted) {
      logger.warn(
        '[cancel-order] Order already finalized. Skipping automatic cancellation.',
        orderId
      );
      return new Response(
        JSON.stringify({
          error:
            'El pedido ya fue finalizado. Contacta con soporte para revertir la operación si es necesario.',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    await orderRef.delete();

    await db.collection('order_cancellations').add({
      orderId,
      idempotencyKey,
      reason: reason || 'payment_failed',
      createdAt: FieldValue.serverTimestamp(),
    });

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    logger.error('[cancel-order] Error cancelling order:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error cancelando el pedido',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
