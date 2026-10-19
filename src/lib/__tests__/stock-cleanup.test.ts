import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanupExpiredReservations } from '../orders/stock';
import { createDb } from '../../pages/api/__tests__/testDb';

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => new Date(),
    increment: (n: number) => ({ __inc: n }),
  },
  Timestamp: {
    now: () => new Date(),
  },
}));

function seedAbandonedOrder(
  db: ReturnType<typeof createDb>,
  overrides: Record<string, unknown> = {}
) {
  db.data.products['p1'] = { name: 'Taza', stock: 3 };
  db.data.wallets['u1'] = { balance: 0, reservedBalance: 10 };
  db.data.orders['o1'] = {
    userId: 'u1',
    status: 'pending',
    paymentStatus: 'pending',
    stockReservationStatus: 'reserved',
    stockReservationExpiresAt: new Date(Date.now() - 60_000),
    stockReservedItems: [{ productId: 'p1', quantity: 2 }],
    walletReservationStatus: 'reserved',
    walletReservedAmount: 10,
    ...overrides,
  };
}

describe('cleanupExpiredReservations', () => {
  let db: ReturnType<typeof createDb>;

  beforeEach(() => {
    db = createDb();
  });

  it('devuelve el stock y el saldo del monedero de un pedido abandonado', async () => {
    seedAbandonedOrder(db);

    const processed = await cleanupExpiredReservations(db as any);

    expect(processed).toBe(1);
    expect(db.data.orders['o1'].stockReservationStatus).toBe('expired');
    expect(db.data.products['p1'].stock).toBe(5);
    expect(db.data.wallets['u1']).toMatchObject({ balance: 10, reservedBalance: 0 });
    expect(db.data.orders['o1'].walletReservationStatus).toBe('released');
  });

  it('no libera el saldo dos veces si se ejecuta de nuevo', async () => {
    seedAbandonedOrder(db);

    await cleanupExpiredReservations(db as any);
    await cleanupExpiredReservations(db as any);

    expect(db.data.wallets['u1']).toMatchObject({ balance: 10, reservedBalance: 0 });
    expect(db.data.products['p1'].stock).toBe(5);
  });

  it('no toca el saldo de un pedido ya pagado', async () => {
    seedAbandonedOrder(db, { paymentStatus: 'paid' });

    await cleanupExpiredReservations(db as any);

    expect(db.data.wallets['u1']).toMatchObject({ balance: 0, reservedBalance: 10 });
    expect(db.data.orders['o1'].walletReservationStatus).toBe('reserved');
  });
});
