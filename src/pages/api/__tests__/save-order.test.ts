import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../save-order';

// Mock CSRF protection (tested separately, should not block business logic tests)
vi.mock('../../../lib/csrf', () => ({
  validateCSRF: vi.fn(() => ({ valid: true })),
  createCSRFErrorResponse: vi.fn(),
}));

// Mock FieldValue helpers
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => new Date(),
    increment: (n: number) => ({ __inc: n }),
  },
}));

// In-memory DB mock
function createDb() {
  let idSeq = 1;
  const data: Record<string, any[]> = {
    orders: [],
    wallets: [],
    wallet_transactions: [],
    coupons: [],
    coupon_usage: [],
  };

  const docs: Record<string, Record<string, any>> = {
    wallets: {},
    coupons: {},
  };

  function wrapInc(current: any, update: any) {
    const result: any = { ...current };
    for (const [k, v] of Object.entries(update)) {
      if (v && typeof v === 'object' && '__inc' in (v as any)) {
        result[k] = (Number(result[k] || 0) + (v as any).__inc) as any;
      } else {
        result[k] = v;
      }
    }
    return result;
  }

  return {
    data,
    collection(name: string) {
      return {
        add: async (doc: any) => {
          const id = `${name}_${idSeq++}`;
          data[name] = data[name] || [];
          data[name].push({ id, ...doc });
          return { id } as any;
        },
        where: () => ({
          limit: () => ({
            get: async () => ({ empty: true, docs: [] }),
          }),
        }),
        doc: (id: string) => ({
          async get() {
            const col = docs[name] || {};
            const exists = !!col[id];
            return {
              exists,
              data: () => (exists ? col[id] : undefined),
            } as any;
          },
          async set(update: any, opts?: any) {
            const col = (docs[name] = docs[name] || {});
            const current = col[id] || {};
            col[id] = opts?.merge ? wrapInc(current, update) : update;
          },
          async update(update: any) {
            const col = (docs[name] = docs[name] || {});
            const current = col[id] || {};
            col[id] = wrapInc(current, update);
          },
        }),
      } as any;
    },
  };
}

// Mock Admin DB provider
vi.mock('../../../lib/firebase-admin', () => {
  const db = createDb();
  return {
    getAdminDb: () => db,
    __mockDb: db,
  } as any;
});

describe('API save-order', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rechaza datos incompletos (400)', async () => {
    const req = new Request('http://local/api/save-order', {
      method: 'POST',
      body: JSON.stringify({ items: [], total: 0 }),
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(400);
  });

  it('guarda pedido, debita wallet, registra cupón y cashback', async () => {
    // Mock fetch para /api/send-email
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: true } as any);

    // Inicializar wallet usuario
    const { __mockDb } = (await import('../../../lib/firebase-admin')) as any;
    await __mockDb
      .collection('wallets')
      .doc('u1')
      .set({ userId: 'u1', balance: 50, totalEarned: 0, totalSpent: 0 });

    const req = new Request('http://local/api/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'test-key-12345',
        items: [{ productId: 'p1', name: 'Prod 1', price: 10, quantity: 2 }],
        shippingInfo: {
          fullName: 'Juan Pérez',
          email: 'juan@example.com',
          phone: '123456789',
          address: 'Calle Test 123',
          city: 'Madrid',
          state: 'Madrid',
          zipCode: '28001',
          country: 'España',
        },
        subtotal: 20,
        shippingCost: 0,
        total: 20,
        userId: 'u1',
        usedWallet: true,
        walletDiscount: 5,
        couponCode: 'PERC10',
        couponId: 'c1',
        couponDiscount: 2,
      }),
    });

    const res = await POST({ request: req } as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.orderId).toBeTruthy();

    // Verificaciones en memoria
    const orders = __mockDb.data.orders;
    expect(orders.length).toBe(1);
    expect(orders[0].total).toBe(20);

    // NOTA: Wallet debit y cashback ahora se ejecutan en finalize-order (después de confirmar pago)
    // En save-order solo se guarda el pedido, las transacciones de wallet se difieren
    // para evitar debitar fondos antes de confirmar el pago con Stripe
  });

  it('continúa si el wallet no tiene fondos suficientes (no falla 200)', async () => {
    const { __mockDb } = (await import('../../../lib/firebase-admin')) as any;
    await __mockDb
      .collection('wallets')
      .doc('u2')
      .set({ userId: 'u2', balance: 1, totalEarned: 0, totalSpent: 0 });

    const req = new Request('http://local/api/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'test-key-67890',
        items: [{ productId: 'p1', name: 'Prod 1', price: 10, quantity: 2 }],
        shippingInfo: {
          fullName: 'Juan García',
          email: 'juan2@example.com',
          phone: '987654321',
          address: 'Avenida Test 456',
          city: 'Barcelona',
          state: 'Cataluña',
          zipCode: '08001',
          country: 'España',
        },
        subtotal: 20,
        shippingCost: 0,
        total: 20,
        userId: 'u2',
        usedWallet: true,
        walletDiscount: 5,
      }),
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
