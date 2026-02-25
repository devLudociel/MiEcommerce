import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../save-order';
import { createDb } from './testDb';

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
  Timestamp: {
    fromMillis: (ms: number) => new Date(ms),
  },
  FieldPath: {
    documentId: () => '__name__',
  },
}));

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
      body: JSON.stringify({ items: [] }),
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(400);
  });

  it('guarda pedido con precios calculados en servidor', async () => {
    // Inicializar wallet usuario
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
      basePrice: 10,
      active: true,
      tags: [],
    };

    const req = new Request('http://local/api/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'test-key-12345',
        checkoutId: 'test-key-12345',
        items: [{ productId: 'p1', name: 'Prod 1', quantity: 2 }],
        shippingInfo: {
          fullName: 'Juan Pérez',
          email: 'juan@example.com',
          phone: '123456789',
          address: 'Calle Test 123',
          city: 'Madrid',
          state: 'Las Palmas',
          zipCode: '28001',
          country: 'España',
          shippingMethodId: 'm1',
        },
        usedWallet: false,
      }),
    });

    const res = await POST({ request: req } as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.orderId).toBeTruthy();

    // Verificaciones en memoria
    const orders = Object.values(__mockDb.data.orders);
    expect(orders.length).toBe(1);
    expect(orders[0].total).toBe(20);

    // NOTA: Wallet debit y cashback ahora se ejecutan en finalize-order (después de confirmar pago)
    // En save-order solo se guarda el pedido, las transacciones de wallet se difieren
    // para evitar debitar fondos antes de confirmar el pago con Stripe
  });

  it('continúa si se solicita wallet sin autenticación (no falla 200)', async () => {
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
      basePrice: 10,
      active: true,
      tags: [],
    };

    const req = new Request('http://local/api/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'test-key-67890',
        checkoutId: 'test-key-67890',
        items: [{ productId: 'p1', name: 'Prod 1', quantity: 2 }],
        shippingInfo: {
          fullName: 'Juan García',
          email: 'juan2@example.com',
          phone: '987654321',
          address: 'Avenida Test 456',
          city: 'Barcelona',
          state: 'Las Palmas',
          zipCode: '08001',
          country: 'España',
          shippingMethodId: 'm1',
        },
        usedWallet: true,
      }),
    });
    const res = await POST({ request: req } as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('ignora __proto__ en customization y no rompe con 500', async () => {
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
      basePrice: 10,
      active: true,
      tags: [],
    };

    const req = new Request('http://local/api/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'test-key-proto-1',
        checkoutId: 'test-key-proto-1',
        items: [
          {
            productId: 'p1',
            name: 'Prod 1',
            quantity: 1,
            customization: JSON.parse('{"__proto__":{"polluted":"yes"},"safe":"ok"}'),
          },
        ],
        shippingInfo: {
          fullName: 'Ana García',
          email: 'ana2@example.com',
          phone: '987654321',
          address: 'Avenida Test 456',
          city: 'Barcelona',
          state: 'Las Palmas',
          zipCode: '08001',
          country: 'España',
          shippingMethodId: 'm1',
        },
        usedWallet: false,
      }),
    });

    const res = await POST({ request: req } as any);
    expect(res.status).toBe(200);
    expect((Object.prototype as any).polluted).toBeUndefined();
  });

  it('rechaza si la cantidad excede el stock (409)', async () => {
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
      basePrice: 10,
      active: true,
      tags: [],
      trackInventory: true,
      stock: 1,
      allowBackorder: false,
    };

    const req = new Request('http://local/api/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: 'test-key-stock-1',
        checkoutId: 'test-key-stock-1',
        items: [{ productId: 'p1', name: 'Prod 1', quantity: 2 }],
        shippingInfo: {
          fullName: 'Ana Pérez',
          email: 'ana@example.com',
          phone: '123456789',
          address: 'Calle Stock 123',
          city: 'Madrid',
          state: 'Las Palmas',
          zipCode: '28001',
          country: 'España',
          shippingMethodId: 'm1',
        },
        usedWallet: false,
      }),
    });

    const res = await POST({ request: req } as any);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe('INSUFFICIENT_STOCK');
  });
});
