import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../create-payment-intent';

// Mock Stripe
vi.mock('stripe', () => {
  class StripeMock {
    paymentIntents = {
      create: vi.fn(async () => ({ id: 'pi_123', client_secret: 'secret_123' })),
    };
    constructor(..._args: any[]) {}
  }
  return { default: StripeMock };
});

// In-memory DB mock
function createDb() {
  let idSeq = 1;
  const collections: Record<string, Record<string, any>> = {
    orders: {},
    products: {},
    bundleDiscounts: {},
    coupons: {},
    coupon_usage: {},
    users: {},
    shipping_methods: {},
    wallets: {},
  };

  const buildQuery = (
    name: string,
    filters: Array<[string, string, any]> = [],
    limitCount?: number
  ) => ({
    where: (field: string, op: string, value: any) =>
      buildQuery(name, [...filters, [field, op, value]], limitCount),
    limit: (count: number) => buildQuery(name, filters, count),
    async get() {
      const col = collections[name] || {};
      let docs = Object.entries(col).map(([id, data]) => ({ id, data }));
      for (const [field, op, value] of filters) {
        if (op === '==') {
          docs = docs.filter((doc) => doc.data?.[field] === value);
        }
      }
      if (typeof limitCount === 'number') {
        docs = docs.slice(0, limitCount);
      }
      const snapDocs = docs.map((doc) => ({
        id: doc.id,
        data: () => doc.data,
      }));
      return {
        empty: snapDocs.length === 0,
        size: snapDocs.length,
        docs: snapDocs,
        forEach: (cb: (doc: any) => void) => snapDocs.forEach(cb),
      } as any;
    },
  });

  return {
    data: collections,
    collection(name: string) {
      return {
        add: async (doc: any) => {
          const id = `${name}_${idSeq++}`;
          collections[name] = collections[name] || {};
          collections[name][id] = doc;
          return { id } as any;
        },
        doc: (id: string) => ({
          async get() {
            const col = collections[name] || {};
            const exists = !!col[id];
            return { exists, id, data: () => (exists ? col[id] : undefined) } as any;
          },
          async update(update: any) {
            const col = (collections[name] = collections[name] || {});
            col[id] = { ...(col[id] || {}), ...update };
          },
          async set(update: any) {
            const col = (collections[name] = collections[name] || {});
            col[id] = update;
          },
        }),
        where: (field: string, op: string, value: any) =>
          buildQuery(name, [[field, op, value]]),
      } as any;
    },
  };
}

vi.mock('../../../lib/firebase-admin', () => {
  const db = createDb();
  return { getAdminDb: () => db, __mockDb: db } as any;
});

// Mock CSRF protection (tested separately, should not block business logic tests)
vi.mock('../../../lib/csrf', () => ({
  validateCSRF: vi.fn(() => ({ valid: true })),
  createCSRFErrorResponse: vi.fn(),
}));

describe('API create-payment-intent', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
  });

  it('valida body y rechaza orderId faltante', async () => {
    const req = new Request('http://local/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ amount: 10 }),
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(400);
  });

  it('rechaza si el pedido no existe', async () => {
    const req = new Request('http://local/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId: 'missing', amount: 10 }),
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(404);
  });

  it('crea Payment Intent cuando el monto coincide', async () => {
    const { __mockDb } = (await import('../../../lib/firebase-admin')) as any;
    __mockDb.data.products['p1'] = {
      name: 'Prod 1',
      basePrice: 19.99,
      active: true,
      tags: [],
    };
    __mockDb.data.orders['o1'] = {
      customerEmail: 'ok@example.com',
      userId: 'guest',
      items: [{ productId: 'p1', quantity: 1, name: 'Prod 1' }],
      shippingInfo: { state: 'Las Palmas' },
    };
    const req = new Request('http://local/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId: 'o1', amount: 19.99 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.paymentIntentId).toBe('pi_123');
    expect(body.clientSecret).toBeTruthy();
  });

  it('rechaza si el monto no coincide', async () => {
    const { __mockDb } = (await import('../../../lib/firebase-admin')) as any;
    __mockDb.data.products['p2'] = {
      name: 'Prod 2',
      basePrice: 50,
      active: true,
      tags: [],
    };
    __mockDb.data.orders['o2'] = {
      items: [{ productId: 'p2', quantity: 1, name: 'Prod 2' }],
      shippingInfo: { state: 'Las Palmas' },
      userId: 'guest',
    };
    const req = new Request('http://local/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId: 'o2', amount: 45 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(400);
  });
});
