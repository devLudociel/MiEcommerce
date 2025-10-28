import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../get-order';

vi.mock('../../../lib/firebase', () => ({ db: {} }));

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
  it('400 cuando falta orderId', async () => {
    const url = new URL('http://local/api/get-order');
    const res = await GET({ url } as any);
    expect(res.status).toBe(400);
  });

  it('404 cuando no existe', async () => {
    const url = new URL('http://local/api/get-order?orderId=missing');
    const res = await GET({ url } as any);
    expect(res.status).toBe(404);
  });

  it('200 y da formato esperado cuando existe', async () => {
    const url = new URL('http://local/api/get-order?orderId=exists');
    const res = await GET({ url } as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('exists');
    expect(body.total).toBe(10);
    expect(Array.isArray(body.items)).toBe(true);
  });
});

