import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

const CASHBACK_PERCENTAGE = 0.05; // 5% cashback

interface FinalizeOrderParams {
  db: Firestore;
  orderId: string;
  orderData?: Record<string, any> | null;
  requestUrl?: string;
}

/**
 * Execute post-payment actions for an order:
 * - Wallet debit (if used)
 * - Coupon usage tracking
 * - Cashback credit
 * - Confirmation email
 *
 * Idempotent: guarded by `postPaymentActionsCompleted` flag on the order document.
 */
export async function finalizeOrder({
  db,
  orderId,
  orderData,
  requestUrl,
}: FinalizeOrderParams): Promise<void> {
  const orderRef = db.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    console.warn(`[finalizeOrder] Order ${orderId} not found. Skipping post-payment actions.`);
    return;
  }

  const existingData = orderSnap.data() || {};
  if (existingData.postPaymentActionsCompleted) {
    console.log(`[finalizeOrder] Order ${orderId} already finalized. Skipping duplicate run.`);
    return;
  }

  const data = { ...existingData, ...(orderData || {}) };

  // Wallet debit (only for authenticated users with wallet usage)
  if (
    data.usedWallet &&
    data.walletDiscount &&
    data.userId &&
    data.userId !== 'guest' &&
    Number(data.walletDiscount) > 0
  ) {
    try {
      const userId: string = String(data.userId);
      const walletAmount: number = Number(data.walletDiscount) || 0;
      const walletRef = db.collection('wallets').doc(userId);

      await db.runTransaction(async (transaction) => {
        const snap = await transaction.get(walletRef);

        if (!snap.exists) {
          throw new Error('Wallet no encontrado. Por favor, recarga la página.');
        }

        const current = snap.data() as any;
        const currentBalance = Number(current.balance || 0);

        if (currentBalance < walletAmount) {
          throw new Error('Saldo insuficiente en el monedero');
        }

        const newBalance = currentBalance - walletAmount;

        transaction.set(
          walletRef,
          {
            userId,
            balance: newBalance,
            totalSpent: Number(current.totalSpent || 0) + walletAmount,
            totalEarned: Number(current.totalEarned || 0),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      await db.collection('wallet_transactions').add({
        userId,
        type: 'debit',
        amount: walletAmount,
        description: `Pago de pedido #${orderId}`,
        orderId,
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(
        `[finalizeOrder] Wallet debited for order ${orderId}: €${walletAmount.toFixed(2)}`
      );
    } catch (walletError) {
      console.error('[finalizeOrder] Error processing wallet debit:', walletError);
      throw walletError;
    }
  }

  // Coupon usage tracking
  if (
    data.couponCode &&
    data.couponId &&
    data.userId &&
    data.userId !== 'guest' &&
    Number(data.couponDiscount) > 0
  ) {
    try {
      const couponId: string = String(data.couponId);
      const couponCode: string = String(data.couponCode);
      const discountAmount: number = Number(data.couponDiscount) || 0;
      const userId: string = String(data.userId);

      const couponRef = db.collection('coupons').doc(couponId);

      await db.runTransaction(async (transaction) => {
        const couponSnap = await transaction.get(couponRef);

        if (!couponSnap.exists) {
          throw new Error('Cupón no encontrado');
        }

        const couponData = couponSnap.data() as any;
        const currentUses = Number(couponData.currentUses || 0);
        const maxUses = Number(couponData.maxUses || 0);

        if (maxUses > 0 && currentUses >= maxUses) {
          throw new Error('Este cupón ha alcanzado su límite de usos');
        }

        transaction.set(
          couponRef,
          {
            timesUsed: FieldValue.increment(1),
            currentUses: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      await db.collection('coupon_usage').add({
        couponId,
        couponCode,
        userId,
        orderId,
        discountAmount,
        createdAt: FieldValue.serverTimestamp(),
        usedAt: FieldValue.serverTimestamp(),
      });

      console.log(
        `[finalizeOrder] Coupon ${couponCode} applied to order ${orderId} (-€${discountAmount.toFixed(
          2
        )})`
      );
    } catch (couponError) {
      console.error('[finalizeOrder] Error processing coupon:', couponError);
      throw couponError;
    }
  }

  // Cashback credit
  if (data.userId && data.userId !== 'guest' && Number(data.subtotal) > 0) {
    try {
      const subtotal = Number(data.subtotal) || 0;
      const couponDiscount = Number(data.couponDiscount) || 0;
      const subtotalAfterDiscount = subtotal - couponDiscount;
      const cashbackAmount = subtotalAfterDiscount * CASHBACK_PERCENTAGE;

      if (cashbackAmount > 0) {
        const userId: string = String(data.userId);
        const walletRef = db.collection('wallets').doc(userId);

        await db.runTransaction(async (transaction) => {
          const snap = await transaction.get(walletRef);
          const current = snap.exists
            ? (snap.data() as any)
            : { balance: 0, totalEarned: 0, totalSpent: 0, userId };
          const newBalance = Number(current.balance || 0) + cashbackAmount;

          transaction.set(
            walletRef,
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
        });

        await db.collection('wallet_transactions').add({
          userId,
          type: 'cashback',
          amount: cashbackAmount,
          description: `Cashback 5% del pedido #${orderId}`,
          orderId,
          createdAt: FieldValue.serverTimestamp(),
        });

        console.log(
          `[finalizeOrder] Cashback added for order ${orderId}: €${cashbackAmount.toFixed(2)}`
        );
      }
    } catch (cashbackError) {
      console.error('[finalizeOrder] Error adding cashback:', cashbackError);
      // Not critical - do not throw
    }
  }

  // Confirmation email (non critical)
  if (requestUrl) {
    try {
      console.log(`[finalizeOrder] Sending confirmation email for order ${orderId}...`);
      const emailResponse = await fetch(new URL('/api/send-email', requestUrl).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          type: 'confirmation',
        }),
      });

      if (!emailResponse.ok) {
        console.error(
          `[finalizeOrder] Failed to send confirmation email for order ${orderId} (non critical)`
        );
      }
    } catch (emailError) {
      console.error(
        `[finalizeOrder] Error sending confirmation email for order ${orderId} (non critical):`,
        emailError
      );
    }
  }

  await orderRef.set(
    {
      postPaymentActionsCompleted: true,
      postPaymentActionsAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
