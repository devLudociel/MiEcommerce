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

// In-memory DB mock for orders
function createDb() {
  const orders: Record<string, any> = {};
  return {
    orders,
    collection(name: string) {
      return {
        doc: (id: string) => ({
          async get() {
            const exists = !!orders[id];
            return { exists, data: () => (exists ? orders[id] : undefined) } as any;
          },
          async update(update: any) {
            orders[id] = { ...(orders[id] || {}), ...update };
          },
        }),
      } as any;
    },
  };
}

vi.mock('../../../lib/firebase-admin', () => {
  const db = createDb();
  return { getAdminDb: () => db, __mockDb: db } as any;
});

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
    const { __mockDb } = await import('../../../lib/firebase-admin') as any;
    __mockDb.orders['o1'] = { total: 19.99, customerEmail: 'ok@example.com' };
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
    const { __mockDb } = await import('../../../lib/firebase-admin') as any;
    __mockDb.orders['o2'] = { total: 50 };
    const req = new Request('http://local/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId: 'o2', amount: 45 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(400);
  });
});
