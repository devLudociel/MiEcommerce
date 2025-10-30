import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../validate-coupon';

// Mock Firebase Admin DB
vi.mock('../../../lib/firebase-admin', () => {
  const state: any = { code: null };
  const users: Record<string, any> = { u1: { email: 'user@example.com' } };

  function couponsWhere(field: string, op: string, value: any) {
    if (field === 'code') state.code = value;
    return {
      where: couponsWhere,
      async get() {
        if (state.code === 'PERC10') {
          return {
            empty: false,
            docs: [
              {
                id: 'c1',
                data: () => ({
                  code: 'PERC10',
                  active: true,
                  type: 'percentage',
                  value: 10,
                }),
              },
            ],
          } as any;
        }
        if (state.code === 'FREESHIP') {
          return {
            empty: false,
            docs: [
              {
                id: 'c2',
                data: () => ({ code: 'FREESHIP', active: true, type: 'free_shipping', value: 0 }),
              },
            ],
          } as any;
        }
        return { empty: true } as any;
      },
    } as any;
  }

  const collections: Record<string, any> = {
    coupons: { where: couponsWhere },
    users: {
      doc: (id: string) => ({ get: async () => ({ data: () => users[id] }) }),
    },
    coupon_usage: {
      where: () => ({ where: () => ({ get: async () => ({ size: 0 }) }) }),
    },
  };

  return {
    getAdminDb: () => ({ collection: (name: string) => collections[name] }),
  };
});

describe('API validate-coupon', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rechaza body inválido con 400', async () => {
    const req = new Request('http://local/api/validate-coupon', {
      method: 'POST',
      body: JSON.stringify({ wrong: true }),
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(400);
  });

  it('retorna valid=false cuando el cupón no existe', async () => {
    const req = new Request('http://local/api/validate-coupon', {
      method: 'POST',
      body: JSON.stringify({ code: 'NOPE', cartTotal: 100 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST({ request: req } as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.valid).toBe(false);
  });

  it('acepta PERC10 y calcula descuento', async () => {
    const req = new Request('http://local/api/validate-coupon', {
      method: 'POST',
      body: JSON.stringify({ code: 'PERC10', cartTotal: 200 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST({ request: req } as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.coupon.discountAmount).toBe(20);
  });

  it('acepta FREESHIP y marca freeShipping', async () => {
    const req = new Request('http://local/api/validate-coupon', {
      method: 'POST',
      body: JSON.stringify({ code: 'FREESHIP', cartTotal: 50 }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST({ request: req } as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.coupon.freeShipping).toBe(true);
  });
});
