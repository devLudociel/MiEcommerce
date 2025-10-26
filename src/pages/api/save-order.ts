// src/pages/api/save-order.ts
import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const CASHBACK_PERCENTAGE = 0.05; // 5% de cashback

export const POST: APIRoute = async ({ request }) => {
  console.log('API save-order: Solicitud recibida');

  try {
    const orderData = await request.json();
    console.log('API save-order: Datos recibidos:', JSON.stringify(orderData, null, 2));

    // Validar datos básicos
    if (
      !Array.isArray(orderData.items) ||
      orderData.items.length === 0 ||
      !orderData.shippingInfo ||
      typeof orderData.total !== 'number'
    ) {
      console.error('API save-order: Datos incompletos o inválidos');
      return new Response(JSON.stringify({ error: 'Datos de pedido incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('API save-order: Intentando guardar en Firestore con Admin SDK...');

    // Guardar pedido en Firestore usando Admin SDK (bypasa reglas de seguridad)
    let adminDb;
    try {
      adminDb = getAdminDb();
    } catch (adminInitError: any) {
      console.error('API save-order: Error inicializando Firebase Admin:', adminInitError);
      return new Response(
        JSON.stringify({
          error: 'El servidor no pudo inicializar Firebase Admin.',
          hint:
            'Configura credenciales: FIREBASE_SERVICE_ACCOUNT (JSON) o FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY + PUBLIC_FIREBASE_PROJECT_ID en .env',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedItems = Array.isArray(orderData.items)
      ? orderData.items.map((i: any) => ({
          ...i,
          price: Number(i?.price) || 0,
          quantity: Number(i?.quantity) || 0,
        }))
      : [];
    const docRef = await adminDb.collection('orders').add({
      ...orderData,
      items: sanitizedItems,
      subtotal: Number(orderData.subtotal) || 0,
      shipping: Number(orderData.shipping) || 0,
      total: Number(orderData.total) || 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      status: orderData.status || 'pending',
    });

    console.log('API save-order: Pedido guardado con ID:', docRef.id);

    // Procesar wallet (admin) si se usó saldo
    if (orderData.discounts?.wallet && orderData.userId) {
      try {
        console.log('API save-order: Procesando gasto de wallet (admin)...');
        const userId: string = String(orderData.userId);
        const walletAmount: number = Number(orderData.discounts.wallet.amount) || 0;
        const walletRef = adminDb.collection('wallets').doc(userId);
        const snap = await walletRef.get();
        const current = snap.exists ? (snap.data() as any) : { balance: 0, totalEarned: 0, totalSpent: 0, userId };
        const newBalance = Math.max(0, Number(current.balance || 0) - walletAmount);
        await walletRef.set(
          {
            userId,
            balance: newBalance,
            totalSpent: Number(current.totalSpent || 0) + walletAmount,
            totalEarned: Number(current.totalEarned || 0),
            updatedAt: FieldValue.serverTimestamp(),
            ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
          },
          { merge: true }
        );
        await adminDb.collection('wallet_transactions').add({
          userId,
          type: 'spend',
          amount: walletAmount,
          balance: newBalance,
          orderId: docRef.id,
          description: `Compra - Pedido ${docRef.id}`,
          createdAt: FieldValue.serverTimestamp(),
        });
        console.log('API save-order: Wallet procesado correctamente (admin)');
      } catch (walletError) {
        console.error('API save-order: Error procesando wallet (admin, no crítico):', walletError);
      }
    }

    // Procesar cupón (admin) si se usó
    if (orderData.discounts?.coupon && orderData.userId) {
      try {
        console.log('API save-order: Procesando cupón (admin)...');
        const couponId: string = String(orderData.discounts.coupon.id);
        const couponCode: string = String(orderData.discounts.coupon.code || '');
        const discountAmount: number = Number(orderData.discounts.coupon.amount) || 0;
        const userId: string = String(orderData.userId);
        const couponRef = adminDb.collection('coupons').doc(couponId);
        await couponRef.set(
          { currentUses: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
          { merge: true }
        );
        await adminDb.collection('coupon_usage').add({
          couponId,
          couponCode,
          userId,
          orderId: docRef.id,
          discountAmount,
          usedAt: FieldValue.serverTimestamp(),
        });
        console.log('API save-order: Cupón procesado correctamente (admin)');
      } catch (couponError) {
        console.error('API save-order: Error procesando cupón (admin, no crítico):', couponError);
      }
    }

    // Agregar cashback al wallet (solo si hay userId)
    if (orderData.userId && orderData.subtotal) {
      try {
        console.log('API save-order: Calculando cashback...');
        const cashbackAmount = orderData.subtotal * CASHBACK_PERCENTAGE;
        const userId: string = String(orderData.userId);
        const walletRef = adminDb.collection('wallets').doc(userId);
        const snap = await walletRef.get();
        const current = snap.exists ? (snap.data() as any) : { balance: 0, totalEarned: 0, totalSpent: 0, userId };
        const newBalance = Number(current.balance || 0) + Number(cashbackAmount);
        await walletRef.set(
          {
            userId,
            balance: newBalance,
            totalEarned: Number(current.totalEarned || 0) + Number(cashbackAmount),
            totalSpent: Number(current.totalSpent || 0),
            updatedAt: FieldValue.serverTimestamp(),
            ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
          },
          { merge: true }
        );
        await adminDb.collection('wallet_transactions').add({
          userId,
          type: 'earn',
          amount: Number(cashbackAmount),
          balance: newBalance,
          orderId: docRef.id,
          description: `Cashback 5% - Pedido ${docRef.id}`,
          createdAt: FieldValue.serverTimestamp(),
        });
        console.log(`API save-order: Cashback de €${Number(cashbackAmount).toFixed(2)} agregado (admin)`);
      } catch (cashbackError) {
        console.error('API save-order: Error agregando cashback (admin, no crítico):', cashbackError);
      }
    }

    // Enviar email de confirmación automáticamente
    try {
      console.log('API save-order: Enviando email de confirmación...');

      const emailResponse = await fetch(new URL('/api/send-email', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: docRef.id,
          type: 'confirmation',
        }),
      });

      if (emailResponse.ok) {
        console.log('API save-order: Email de confirmación enviado');
      } else {
        console.error('API save-order: Error enviando email (no crítico)');
      }
    } catch (emailError) {
      console.error('API save-order: Error enviando email (no crítico):', emailError);
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
    console.error('API save-order: Error:', error);
    console.error('API save-order: Stack:', error?.stack);
    return new Response(
      JSON.stringify({
        error: error.message || 'Error guardando pedido',
        details: error?.stack,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

