import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { createScopedLogger } from '../utils/apiLogger';

const logger = createScopedLogger('finalizeOrder');

const CASHBACK_PERCENTAGE = 0.05; // 5% cashback

interface FinalizeOrderParams {
  db: Firestore;
  orderId: string;
  orderData?: Record<string, unknown> | null;
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
    logger.warn(`[finalizeOrder] Order ${orderId} not found. Skipping post-payment actions.`);
    return;
  }

  const existingData = orderSnap.data() || {};
  if (existingData.postPaymentActionsCompleted) {
    logger.info(`[finalizeOrder] Order ${orderId} already finalized. Skipping duplicate run.`);
    return;
  }

  const data = { ...existingData, ...(orderData || {}) };

  // Wallet debit (only for authenticated users with wallet usage)
  logger.info('[finalizeOrder] Checking wallet conditions:', {
    orderId,
    usedWallet: data.usedWallet,
    walletDiscount: data.walletDiscount,
    userId: data.userId,
    isGuest: data.userId === 'guest',
    walletAmount: Number(data.walletDiscount),
    // DEBUG: Log all order data keys to see what's available
    availableKeys: Object.keys(data),
  });

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

        const current = snap.data() as Record<string, unknown>;
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

      logger.info(`[finalizeOrder] Wallet debited for order ${orderId}`, {
        amount: walletAmount,
        userId,
      });
    } catch (walletError) {
      logger.error('[finalizeOrder] Error processing wallet debit', walletError);
      throw walletError;
    }
  } else {
    logger.debug('[finalizeOrder] Wallet debit skipped', {
      orderId,
      reason: !data.usedWallet
        ? 'usedWallet is false'
        : !data.walletDiscount
          ? 'no walletDiscount'
          : !data.userId
            ? 'no userId'
            : data.userId === 'guest'
              ? 'guest user'
              : Number(data.walletDiscount) <= 0
                ? 'walletDiscount is 0'
                : 'unknown',
    });
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

        const couponData = couponSnap.data() as Record<string, unknown>;
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

      logger.info('[finalizeOrder] Coupon applied', {
        orderId,
        couponCode,
        discountAmount,
      });
    } catch (couponError) {
      logger.error('[finalizeOrder] Error processing coupon', couponError);
      throw couponError;
    }
  }

  // Grant access to digital products
  if (data.userId && data.userId !== 'guest' && data.items) {
    try {
      const items = Array.isArray(data.items) ? data.items : [];

      for (const item of items) {
        // Check if this is a digital product
        const productRef = db.collection('products').doc(String(item.productId));
        const productSnap = await productRef.get();

        if (productSnap.exists) {
          const productData = productSnap.data();

          if (productData?.isDigital && productData?.digitalFiles) {
            logger.info('[finalizeOrder] Granting access to digital product', {
              orderId,
              productId: item.productId,
              productName: item.productName,
              userId: data.userId,
            });

            // Create digital access record
            await db.collection('digital_access').add({
              userId: String(data.userId),
              userEmail: String(data.shippingInfo?.email || data.customerEmail || ''),
              productId: String(item.productId),
              productName: String(item.productName),
              orderId,
              files: productData.digitalFiles,
              purchasedAt: FieldValue.serverTimestamp(),
              totalDownloads: 0,
              expiresAt: null, // null = never expires
              maxDownloads: null, // null = unlimited
            });

            logger.info('[finalizeOrder] Digital access granted', {
              orderId,
              productId: item.productId,
              filesCount: productData.digitalFiles.length,
            });
          }
        }
      }
    } catch (digitalError) {
      logger.error('[finalizeOrder] Error granting digital access', digitalError);
      // Non-critical - don't throw
    }
  }

  // Cashback credit
  // Only give cashback on the amount actually paid (after wallet and coupon discounts)
  if (data.userId && data.userId !== 'guest' && Number(data.subtotal) > 0) {
    try {
      const subtotal = Number(data.subtotal) || 0;
      const couponDiscount = Number(data.couponDiscount) || 0;
      const walletDiscount = Number(data.walletDiscount) || 0;

      // Calculate amount actually paid with card (not from wallet or coupons)
      const amountPaidWithCard = subtotal - couponDiscount - walletDiscount;
      const cashbackAmount = amountPaidWithCard * CASHBACK_PERCENTAGE;

      if (cashbackAmount > 0) {
        const userId: string = String(data.userId);
        const walletRef = db.collection('wallets').doc(userId);

        await db.runTransaction(async (transaction) => {
          const snap = await transaction.get(walletRef);
          const current = snap.exists
            ? (snap.data() as Record<string, unknown>)
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
          description: `Cashback 5% del pedido #${orderId} (€${amountPaidWithCard.toFixed(2)} pagado)`,
          orderId,
          createdAt: FieldValue.serverTimestamp(),
        });

        logger.info('[finalizeOrder] Cashback added', {
          orderId,
          cashbackAmount,
          amountPaidWithCard,
        });
      } else if (amountPaidWithCard <= 0) {
        logger.debug('[finalizeOrder] No cashback', {
          orderId,
          reason: 'Paid entirely with wallet/coupons',
        });
      }
    } catch (cashbackError) {
      logger.error('[finalizeOrder] Error adding cashback', cashbackError);
      // Not critical - do not throw
    }
  }

  // Confirmation email (non critical)
  if (requestUrl) {
    try {
      logger.debug('[finalizeOrder] Sending confirmation email', { orderId });
      const emailResponse = await fetch(new URL('/api/send-email', requestUrl).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          type: 'confirmation',
        }),
      });

      if (!emailResponse.ok) {
        logger.warn('[finalizeOrder] Failed to send confirmation email (non critical)', {
          orderId,
        });
      }
    } catch (emailError) {
      logger.warn('[finalizeOrder] Error sending confirmation email (non critical)', emailError);
    }
  }

  logger.info('[finalizeOrder] Post-payment actions completed', { orderId });

  await orderRef.set(
    {
      postPaymentActionsCompleted: true,
      postPaymentActionsAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
