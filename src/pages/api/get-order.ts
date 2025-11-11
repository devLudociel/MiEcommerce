import { logger } from '../../lib/logger';
import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../lib/firebase-admin';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    // SECURITY: Verify user authentication
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const idToken = authHeader.replace('Bearer ', '').trim();
    let decodedToken;

    try {
      decodedToken = await getAdminAuth().verifyIdToken(idToken);
    } catch (verificationError) {
      logger.error('[get-order] Invalid token:', verificationError);
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Obtener la orden desde Firestore con Admin SDK (ignora reglas)
    const db = getAdminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const orderData = orderSnap.data() as any;

    // SECURITY: Verify user owns this order or is admin
    if (orderData.userId !== decodedToken.uid && !decodedToken.admin) {
      logger.warn('[get-order] Unauthorized access attempt:', {
        orderId,
        orderUserId: orderData.userId,
        requestUserId: decodedToken.uid,
      });
      return new Response(JSON.stringify({ error: 'Forbidden - You do not own this order' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Formatear la orden para que coincida con la interfaz esperada
    const order = {
      id: orderSnap.id,
      date:
        typeof orderData.createdAt?.toDate === 'function'
          ? orderData.createdAt.toDate().toISOString()
          : new Date().toISOString(),
      items: orderData.items || [],
      shippingInfo: orderData.shippingInfo || {},
      paymentInfo: { method: orderData.paymentMethod || 'card' },
      subtotal: Number(orderData.subtotal || 0),
      shipping: Number(orderData.shipping || orderData.shippingCost || 0),
      total: Number(orderData.total || 0),
      status: orderData.status || 'pending',
    };

    return new Response(JSON.stringify(order), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logger.error('Error fetching order:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
