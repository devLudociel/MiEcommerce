// src/pages/api/save-order.ts
import type { APIRoute } from 'astro';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const POST: APIRoute = async ({ request }) => {
  try {
    const orderData = await request.json();

    // Validar datos básicos
    if (!orderData.items || !orderData.shippingInfo || !orderData.total) {
      return new Response(
        JSON.stringify({ error: 'Datos de pedido incompletos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Guardar pedido en Firestore
    const docRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: orderData.status || 'pending',
    });

    return new Response(
      JSON.stringify({
        success: true,
        orderId: docRef.id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error guardando pedido:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Error guardando pedido'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
