// src/pages/api/save-order.ts
import type { APIRoute } from 'astro';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const POST: APIRoute = async ({ request }) => {
  console.log('🔵 API save-order: Solicitud recibida');

  try {
    const orderData = await request.json();
    console.log('🔵 API save-order: Datos recibidos:', JSON.stringify(orderData, null, 2));

    // Validar datos básicos
    if (!orderData.items || !orderData.shippingInfo || !orderData.total) {
      console.error('❌ API save-order: Datos incompletos');
      return new Response(
        JSON.stringify({ error: 'Datos de pedido incompletos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔵 API save-order: Intentando guardar en Firestore...');

    // Guardar pedido en Firestore
    const docRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: orderData.status || 'pending',
    });

    console.log('✅ API save-order: Pedido guardado con ID:', docRef.id);

    // Enviar email de confirmación automáticamente
    try {
      console.log('📧 API save-order: Enviando email de confirmación...');

      const emailResponse = await fetch(new URL('/api/send-email', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: docRef.id,
          type: 'confirmation',
        }),
      });

      if (emailResponse.ok) {
        console.log('✅ API save-order: Email de confirmación enviado');
      } else {
        console.error('⚠️ API save-order: Error enviando email (no crítico)');
      }
    } catch (emailError) {
      console.error('⚠️ API save-order: Error enviando email (no crítico):', emailError);
      // No falla la operación si el email falla
    }

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
    console.error('❌ API save-order: Error:', error);
    console.error('❌ API save-order: Stack:', error.stack);
    return new Response(
      JSON.stringify({
        error: error.message || 'Error guardando pedido',
        details: error.stack
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
