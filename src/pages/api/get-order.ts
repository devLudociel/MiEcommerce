import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../lib/firebase-admin';

// Simple console logger for API routes (avoids import issues)
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
  debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data || ''),
};

export const GET: APIRoute = async ({ url, request }) => {
  try {
    // SECURITY: Verify user authentication
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Authentication required' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
          Expires: '0',
        },
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
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    }

    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    }

    // Obtener la orden desde Firestore con Admin SDK (ignora reglas)
    const db = getAdminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
          Expires: '0',
        },
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
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    }

    // Formatear la orden para que coincida con la interfaz esperada
    const createdAtIso =
      typeof orderData.createdAt?.toDate === 'function'
        ? orderData.createdAt.toDate().toISOString()
        : new Date().toISOString();

    const order = {
      id: orderSnap.id,
      date: createdAtIso,
      createdAt: createdAtIso,
      items: orderData.items || [],
      shippingInfo: orderData.shippingInfo || {},
      paymentInfo: { method: orderData.paymentMethod || 'card' },
      paymentMethod: orderData.paymentMethod || 'card',
      subtotal: Number(orderData.subtotal || 0),
      shipping: Number(orderData.shipping || orderData.shippingCost || 0),
      total: Number(orderData.total || 0),
      status: orderData.status || 'pending',
    };

    return new Response(JSON.stringify(order), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error: unknown) {
    logger.error('Error fetching order:', error);
    // SECURITY FIX: Don't expose error details in production
    return new Response(
      JSON.stringify({
        error: 'Error al obtener pedido',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
};
