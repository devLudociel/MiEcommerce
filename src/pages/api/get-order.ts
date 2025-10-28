import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';

export const GET: APIRoute = async ({ url }) => {
  try {
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
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
