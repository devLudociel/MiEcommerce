import type { APIRoute } from 'astro';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const GET: APIRoute = async ({ url }) => {
  try {
    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Obtener la orden de Firestore
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const orderData = orderSnap.data();

    // Formatear la orden para que coincida con la interfaz esperada
    const order = {
      id: orderSnap.id,
      date: orderData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      items: orderData.items || [],
      shippingInfo: orderData.shippingInfo || {},
      paymentInfo: { method: orderData.paymentMethod || 'card' },
      subtotal: orderData.subtotal || 0,
      shipping: orderData.shippingCost || 0,
      total: orderData.total || 0,
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
