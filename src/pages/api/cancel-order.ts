import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { FieldValue } from 'firebase-admin/firestore';

export const POST: APIRoute = async ({ request }) => {
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    console.warn('[cancel-order] CSRF validation failed:', csrfCheck.reason);
    return createCSRFErrorResponse();
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

    if (data.idempotencyKey !== idempotencyKey) {
      console.warn('[cancel-order] Idempotency key mismatch for order', orderId);
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
      console.warn(
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
    console.error('[cancel-order] Error cancelling order:', error);
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
