import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

const roundMoney = (value: number): number => {
  const numeric = Number.isFinite(value) ? value : 0;
  return Math.round(numeric * 100) / 100;
};

interface WalletReservationParams {
  db: Firestore;
  orderId: string;
  userId: string;
  amount: number;
}

export async function reserveWalletFunds({
  db,
  orderId,
  userId,
  amount,
}: WalletReservationParams): Promise<void> {
  const reserveAmount = roundMoney(amount);
  if (reserveAmount <= 0) return;

  const walletRef = db.collection('wallets').doc(userId);
  const orderRef = db.collection('orders').doc(orderId);

  await db.runTransaction(async (transaction) => {
    const walletSnap = await transaction.get(walletRef);
    if (!walletSnap.exists) {
      throw new Error('Wallet no encontrado. Por favor, recarga la página.');
    }

    const data = walletSnap.data() as Record<string, unknown>;
    const currentBalance = Number(data.balance || 0);
    const reservedBalance = Number(data.reservedBalance || 0);

    if (currentBalance < reserveAmount) {
      throw new Error('Saldo insuficiente en el monedero');
    }

    const newBalance = roundMoney(currentBalance - reserveAmount);
    const newReserved = roundMoney(reservedBalance + reserveAmount);

    transaction.set(
      walletRef,
      {
        balance: newBalance,
        reservedBalance: newReserved,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      orderRef,
      {
        walletReservationStatus: 'reserved',
        walletReservedAmount: reserveAmount,
        walletReservedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function releaseWalletReservation({
  db,
  orderId,
  userId,
  amount,
}: WalletReservationParams): Promise<number> {
  const releaseAmount = roundMoney(amount);
  if (releaseAmount <= 0) return 0;

  const walletRef = db.collection('wallets').doc(userId);
  const orderRef = db.collection('orders').doc(orderId);

  let released = 0;

  await db.runTransaction(async (transaction) => {
    const walletSnap = await transaction.get(walletRef);
    if (!walletSnap.exists) {
      throw new Error('Wallet no encontrado');
    }

    const data = walletSnap.data() as Record<string, unknown>;
    const currentBalance = Number(data.balance || 0);
    const reservedBalance = Number(data.reservedBalance || 0);

    released = Math.min(reservedBalance, releaseAmount);
    const newBalance = roundMoney(currentBalance + released);
    const newReserved = roundMoney(reservedBalance - released);

    transaction.set(
      walletRef,
      {
        balance: newBalance,
        reservedBalance: newReserved,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      orderRef,
      {
        walletReservationStatus: 'released',
        walletReleasedAt: FieldValue.serverTimestamp(),
        walletReleasedAmount: released,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  if (released > 0) {
    await db.collection('wallet_transactions').add({
      userId,
      type: 'refund',
      amount: released,
      description: `Liberación de reserva en pedido #${orderId}`,
      orderId,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return released;
}

export async function captureWalletReservation({
  db,
  orderId,
  userId,
  amount,
}: WalletReservationParams): Promise<number> {
  const captureAmount = roundMoney(amount);
  if (captureAmount <= 0) return 0;

  const walletRef = db.collection('wallets').doc(userId);
  const orderRef = db.collection('orders').doc(orderId);

  let captured = 0;

  await db.runTransaction(async (transaction) => {
    const walletSnap = await transaction.get(walletRef);
    if (!walletSnap.exists) {
      throw new Error('Wallet no encontrado');
    }

    const data = walletSnap.data() as Record<string, unknown>;
    const reservedBalance = Number(data.reservedBalance || 0);

    captured = Math.min(reservedBalance, captureAmount);
    const newReserved = roundMoney(reservedBalance - captured);
    const totalSpent = Number(data.totalSpent || 0);
    const newTotalSpent = roundMoney(totalSpent + captured);

    transaction.set(
      walletRef,
      {
        reservedBalance: newReserved,
        totalSpent: newTotalSpent,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      orderRef,
      {
        walletReservationStatus: 'captured',
        walletCapturedAt: FieldValue.serverTimestamp(),
        walletCapturedAmount: captured,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  if (captured > 0) {
    await db.collection('wallet_transactions').add({
      userId,
      type: 'debit',
      amount: captured,
      description: `Pago de pedido #${orderId}`,
      orderId,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return captured;
}
