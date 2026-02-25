import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../create-payment-intent';
import { createDb } from './testDb';

// Mock Stripe
vi.mock('stripe', () => {
  class StripeMock {
    paymentIntents = {
      create: vi.fn(async () => ({ id: 'pi_123', client_secret: 'secret_123' })),
      retrieve: vi.fn(async (_id: string) => ({
        id: 'pi_123',
        client_secret: 'secret_123',
        status: 'requires_payment_method',
        amount: 1999,
        currency: 'eur',
      })),
    };
    constructor(..._args: any[]) {}
  }
  return { default: StripeMock };
});

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => new Date(),
    increment: (n: number) => ({ __inc: n }),
  },
  Timestamp: {
    fromMillis: (ms: number) => new Date(ms),
  },
  FieldPath: {
    documentId: () => '__name__',
  },
}));

vi.mock('../../../lib/firebase-admin', () => {
  const db = createDb();
  return { getAdminDb: () => db, __mockDb: db } as any;
});

// Mock CSRF protection (tested separately, should not block business logic tests)
vi.mock('../../../lib/csrf', () => ({
  validateCSRF: vi.fn(() => ({ valid: true })),
  createCSRFErrorResponse: vi.fn(),
}));

vi.mock('../../../lib/auth/authHelpers', () => ({
  verifyAuthToken: vi.fn((request: Request) => {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: new Response(JSON.stringify({ error: 'Autenticación requerida' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      };
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (token === 'valid-token') {
      return { success: true, uid: 'user-123', isAdmin: false };
    }
    if (token === 'other-token') {
      return { success: true, uid: 'user-999', isAdmin: false };
    }

    return {
      success: false,
      error: new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }),
}));

describe('API create-payment-intent', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
  });

  it('valida body y rechaza orderId faltante', async () => {
    const req = new Request('http://local/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { Authorization: 'Bearer valid-token' },
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(400);
  });

  it('rechaza si el pedido no existe', async () => {
    const req = new Request('http://local/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId: 'missing' }),
      headers: { Authorization: 'Bearer valid-token' },
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(404);
  });

  it('crea Payment Intent cuando el monto coincide', async () => {
    const { __mockDb } = (await import('../../../lib/firebase-admin')) as any;
    __mockDb.data.shipping_zones['z1'] = {
      active: true,
      priority: 1,
      provinces: ['Las Palmas'],
      postalCodes: [],
    };
    __mockDb.data.shipping_methods['m1'] = {
      active: true,
      zoneId: 'z1',
      basePrice: 0,
    };
    __mockDb.data.products['p1'] = {
      name: 'Prod 1',
      basePrice: 19.99,
      active: true,
      tags: [],
    };
    __mockDb.data.orders['o1'] = {
      customerEmail: 'ok@example.com',
      userId: 'user-123',
      items: [{ productId: 'p1', quantity: 1, name: 'Prod 1' }],
      shippingInfo: { state: 'Las Palmas', zipCode: '35001', shippingMethodId: 'm1' },
    };
    const req = new Request('http://local/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId: 'o1' }),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.paymentIntentId).toBe('pi_123');
    expect(body.clientSecret).toBeTruthy();
  });

  it('rechaza si el pedido no pertenece al usuario (404)', async () => {
    const { __mockDb } = (await import('../../../lib/firebase-admin')) as any;
    __mockDb.data.shipping_zones['z1'] = {
      active: true,
      priority: 1,
      provinces: ['Las Palmas'],
      postalCodes: [],
    };
    __mockDb.data.shipping_methods['m1'] = {
      active: true,
      zoneId: 'z1',
      basePrice: 0,
    };
    __mockDb.data.products['p2'] = {
      name: 'Prod 2',
      basePrice: 50,
      active: true,
      tags: [],
    };
    __mockDb.data.orders['o2'] = {
      items: [{ productId: 'p2', quantity: 1, name: 'Prod 2' }],
      shippingInfo: { state: 'Las Palmas', zipCode: '35001', shippingMethodId: 'm1' },
      userId: 'user-123',
    };
    const req = new Request('http://local/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId: 'o2' }),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer other-token' },
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(404);
  });

  it('rechaza si no hay stock disponible (409)', async () => {
    const { __mockDb } = (await import('../../../lib/firebase-admin')) as any;
    __mockDb.data.shipping_zones['z1'] = {
      active: true,
      priority: 1,
      provinces: ['Las Palmas'],
      postalCodes: [],
    };
    __mockDb.data.shipping_methods['m1'] = {
      active: true,
      zoneId: 'z1',
      basePrice: 0,
    };
    __mockDb.data.products['p3'] = {
      name: 'Prod 3',
      basePrice: 20,
      active: true,
      tags: [],
      trackInventory: true,
      stock: 0,
      allowBackorder: false,
    };
    __mockDb.data.orders['o3'] = {
      items: [{ productId: 'p3', quantity: 1, name: 'Prod 3' }],
      shippingInfo: { state: 'Las Palmas', zipCode: '35001', shippingMethodId: 'm1' },
      userId: 'user-123',
    };

    const req = new Request('http://local/api/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId: 'o3' }),
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer valid-token' },
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('OUT_OF_STOCK');
  });
});
