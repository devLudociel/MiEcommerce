import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../get-order';

vi.mock('../../../lib/firebase', () => ({ db: {} }));

// Mock Firebase Admin Auth (authentication required for get-order endpoint)
vi.mock('../../../lib/firebase-admin', () => ({
  getAdminAuth: () => ({
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === 'valid-token') {
        return { uid: 'test-user-123', email: 'test@example.com' };
      }
      if (token === 'valid-token-other') {
        return { uid: 'other-user-999', email: 'other@example.com' };
      }
      throw new Error('Invalid token');
    }),
  }),
  getAdminDb: () => ({
    collection: (_name: string) => {
      const filters: Array<[any, string, any]> = [];
      const query = {
        where: (field: any, op: string, value: any) => {
          filters.push([field, op, value]);
          return query;
        },
        limit: (_n: number) => query,
        get: async () => {
          const hasUserMatch = filters.some(([, , value]) => value === 'test-user-123');
          const hasOrderMatch = filters.some(([, , value]) => value === 'exists');
          if (hasUserMatch && hasOrderMatch) {
            return {
              docs: [
                {
                  exists: true,
                  id: 'exists',
                  data: () => ({
                    createdAt: new Date('2024-01-01'),
                    items: [{ name: 'A' }],
                    shippingInfo: { city: 'Madrid' },
                    paymentMethod: 'card',
                    subtotal: 10,
                    shippingCost: 0,
                    total: 10,
                    status: 'pending',
                    userId: 'test-user-123',
                  }),
                },
              ],
            };
          }
          return { docs: [] };
        },
        doc: (id: string) => ({
          get: async () => {
            if (id === 'exists') {
              return {
                exists: true,
                id: 'exists',
                data: () => ({
                  createdAt: new Date('2024-01-01'),
                  items: [{ name: 'A' }],
                  shippingInfo: { city: 'Madrid' },
                  paymentMethod: 'card',
                  subtotal: 10,
                  shippingCost: 0,
                  total: 10,
                  status: 'pending',
                  userId: 'test-user-123',
                }),
              };
            }
            return { exists: false };
          },
        }),
      };
      return query;
    },
  }),
}));

vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((db: any, col: string, id: string) => ({ db, col, id })),
    getDoc: vi.fn(async (ref: any) => {
      if (ref.id === 'exists') {
        return {
          exists: () => true,
          id: 'exists',
          data: () => ({
            createdAt: { toDate: () => new Date('2024-01-01') },
            items: [{ name: 'A' }],
            shippingInfo: { city: 'Madrid' },
            paymentMethod: 'card',
            subtotal: 10,
            shippingCost: 0,
            total: 10,
            status: 'pending',
          }),
        } as any;
      }
      return { exists: () => false } as any;
    }),
  };
});

describe('API get-order', () => {
  it('401 cuando falta authorization header', async () => {
    const url = new URL('http://local/api/get-order?orderId=exists');
    const request = new Request(url.toString(), {
      method: 'GET',
      headers: {},
    });
    const res = await GET({ url, request } as any);
    expect(res.status).toBe(401);
  });

  it('400 cuando falta orderId', async () => {
    const url = new URL('http://local/api/get-order');
    const request = new Request(url.toString(), {
      method: 'GET',
      headers: { Authorization: 'Bearer valid-token' },
    });
    const res = await GET({ url, request } as any);
    expect(res.status).toBe(400);
  });

  it('404 cuando no existe', async () => {
    const url = new URL('http://local/api/get-order?orderId=missing');
    const request = new Request(url.toString(), {
      method: 'GET',
      headers: { Authorization: 'Bearer valid-token' },
    });
    const res = await GET({ url, request } as any);
    expect(res.status).toBe(404);
  });

  it('404 cuando el pedido no pertenece al usuario autenticado', async () => {
    const url = new URL('http://local/api/get-order?orderId=exists');
    const request = new Request(url.toString(), {
      method: 'GET',
      headers: { Authorization: 'Bearer valid-token-other' },
    });
    const res = await GET({ url, request } as any);
    expect(res.status).toBe(404);
  });

  it('200 y da formato esperado cuando existe', async () => {
    const url = new URL('http://local/api/get-order?orderId=exists');
    const request = new Request(url.toString(), {
      method: 'GET',
      headers: { Authorization: 'Bearer valid-token' },
    });
    const res = await GET({ url, request } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('exists');
    expect(body.total).toBe(10);
    expect(Array.isArray(body.items)).toBe(true);
  });
});
