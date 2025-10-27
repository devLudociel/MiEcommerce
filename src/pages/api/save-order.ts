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

    // Procesar wallet debit si se usó saldo (nueva estructura del checkout)
    if (orderData.usedWallet && orderData.walletDiscount && orderData.userId && orderData.userId !== 'guest') {
      try {
        console.log('[save-order] Processing wallet debit...');
        const userId: string = String(orderData.userId);
        const walletAmount: number = Number(orderData.walletDiscount) || 0;

        if (walletAmount > 0) {
          const walletRef = adminDb.collection('wallets').doc(userId);
          const snap = await walletRef.get();

          if (!snap.exists) {
            console.warn('[save-order] Wallet document does not exist for user, creating...');
          }

          const current = snap.exists ? (snap.data() as any) : { balance: 0, totalEarned: 0, totalSpent: 0, userId };
          const currentBalance = Number(current.balance || 0);

          // Ensure we don't go negative
          if (currentBalance < walletAmount) {
            console.error(`[save-order] Insufficient wallet balance. Current: €${currentBalance}, Required: €${walletAmount}`);
            throw new Error('Saldo insuficiente en el monedero');
          }

          const newBalance = currentBalance - walletAmount;

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
            type: 'debit',
            amount: walletAmount,
            description: `Pago de pedido #${docRef.id}`,
            orderId: docRef.id,
            createdAt: FieldValue.serverTimestamp(),
          });

          console.log(`[save-order] Wallet debited: €${walletAmount.toFixed(2)}, New balance: €${newBalance.toFixed(2)}`);
        }
      } catch (walletError) {
        console.error('[save-order] Error processing wallet debit:', walletError);
        // Don't throw - log and continue
      }
    }

    // Procesar cupón si se usó (actualizado con nueva estructura)
    if (orderData.couponCode && orderData.couponId && orderData.userId && orderData.userId !== 'guest') {
      try {
        console.log('[save-order] Processing coupon usage...');
        const couponId: string = String(orderData.couponId);
        const couponCode: string = String(orderData.couponCode);
        const discountAmount: number = Number(orderData.couponDiscount) || 0;
        const userId: string = String(orderData.userId);

        const couponRef = adminDb.collection('coupons').doc(couponId);
        await couponRef.set(
          {
            timesUsed: FieldValue.increment(1),
            currentUses: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp()
          },
          { merge: true }
        );

        await adminDb.collection('coupon_usage').add({
          couponId,
          couponCode,
          userId,
          orderId: docRef.id,
          discountAmount,
          createdAt: FieldValue.serverTimestamp(),
          usedAt: FieldValue.serverTimestamp(),
        });

        console.log(`[save-order] Coupon processed: ${couponCode} (-€${discountAmount.toFixed(2)})`);
      } catch (couponError) {
        console.error('[save-order] Error processing coupon:', couponError);
        // Don't throw - log and continue
      }
    }

    // Agregar cashback al wallet (5% del subtotal después de descuentos, solo para usuarios autenticados)
    if (orderData.userId && orderData.userId !== 'guest' && orderData.subtotal) {
      try {
        console.log('[save-order] Calculating cashback...');

        // Calculate cashback on subtotal after coupon discount, before shipping and IVA
        const subtotal = Number(orderData.subtotal) || 0;
        const couponDiscount = Number(orderData.couponDiscount) || 0;
        const subtotalAfterDiscount = subtotal - couponDiscount;
        const cashbackAmount = subtotalAfterDiscount * CASHBACK_PERCENTAGE;

        if (cashbackAmount > 0) {
          const userId: string = String(orderData.userId);
          const walletRef = adminDb.collection('wallets').doc(userId);
          const snap = await walletRef.get();
          const current = snap.exists ? (snap.data() as any) : { balance: 0, totalEarned: 0, totalSpent: 0, userId };
          const newBalance = Number(current.balance || 0) + cashbackAmount;

          await walletRef.set(
            {
              userId,
              balance: newBalance,
              totalEarned: Number(current.totalEarned || 0) + cashbackAmount,
              totalSpent: Number(current.totalSpent || 0),
              updatedAt: FieldValue.serverTimestamp(),
              ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
            },
            { merge: true }
          );

          await adminDb.collection('wallet_transactions').add({
            userId,
            type: 'cashback',
            amount: cashbackAmount,
            description: `Cashback 5% del pedido #${docRef.id}`,
            orderId: docRef.id,
            createdAt: FieldValue.serverTimestamp(),
          });

          console.log(`[save-order] Cashback added: €${cashbackAmount.toFixed(2)} (5% of €${subtotalAfterDiscount.toFixed(2)})`);
        }
      } catch (cashbackError) {
        console.error('[save-order] Error adding cashback:', cashbackError);
        // Don't throw - log and continue
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

