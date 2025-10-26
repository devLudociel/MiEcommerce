// src/pages/api/save-order.ts
import type { APIRoute } from 'astro';
import { addWalletFunds, spendWalletFunds, recordCouponUsage } from '../../lib/firebase';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const CASHBACK_PERCENTAGE = 0.05; // 5% de cashback

export const POST: APIRoute = async ({ request }) => {
  console.log('🔵 API save-order: Solicitud recibida');

  try {
    const orderData = await request.json();
    console.log('🔵 API save-order: Datos recibidos:', JSON.stringify(orderData, null, 2));

    // Validar datos básicos
    if (!orderData.items || !orderData.shippingInfo || !orderData.total) {
      console.error('❌ API save-order: Datos incompletos');
      return new Response(JSON.stringify({ error: 'Datos de pedido incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('🔵 API save-order: Intentando guardar en Firestore con Admin SDK...');

    // Guardar pedido en Firestore usando Admin SDK (bypasea reglas de seguridad)
    const adminDb = getAdminDb();
    const docRef = await adminDb.collection('orders').add({
      ...orderData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      status: orderData.status || 'pending',
    });

    console.log('✅ API save-order: Pedido guardado con ID:', docRef.id);

    // Procesar wallet si se usó saldo
    if (orderData.discounts?.wallet && orderData.userId) {
      try {
        console.log('💰 API save-order: Procesando gasto de wallet...');
        const walletAmount = orderData.discounts.wallet.amount;
        await spendWalletFunds(
          orderData.userId,
          walletAmount,
          `Compra - Pedido ${docRef.id}`,
          docRef.id
        );
        console.log('✅ API save-order: Wallet procesado correctamente');
      } catch (walletError) {
        console.error('⚠️ API save-order: Error procesando wallet (no crítico):', walletError);
      }
    }

    // Procesar cupón si se usó
    if (orderData.discounts?.coupon && orderData.userId) {
      try {
        console.log('🎟️ API save-order: Procesando cupón...');
        await recordCouponUsage(
          orderData.discounts.coupon.id,
          orderData.userId,
          docRef.id,
          orderData.discounts.coupon.amount,
          orderData.discounts.coupon.code
        );
        console.log('✅ API save-order: Cupón procesado correctamente');
      } catch (couponError) {
        console.error('⚠️ API save-order: Error procesando cupón (no crítico):', couponError);
      }
    }

    // Agregar cashback al wallet (solo si hay userId)
    if (orderData.userId && orderData.subtotal) {
      try {
        console.log('💸 API save-order: Calculando cashback...');
        const cashbackAmount = orderData.subtotal * CASHBACK_PERCENTAGE;
        await addWalletFunds(
          orderData.userId,
          cashbackAmount,
          `Cashback 5% - Pedido ${docRef.id}`,
          docRef.id
        );
        console.log(`✅ API save-order: Cashback de $${cashbackAmount.toFixed(2)} agregado`);
      } catch (cashbackError) {
        console.error('⚠️ API save-order: Error agregando cashback (no crítico):', cashbackError);
      }
    }

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
        orderId: docRef.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ API save-order: Error:', error);
    console.error('❌ API save-order: Stack:', error.stack);
    return new Response(
      JSON.stringify({
        error: error.message || 'Error guardando pedido',
        details: error.stack,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
