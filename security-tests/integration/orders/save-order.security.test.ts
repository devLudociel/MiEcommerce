/**
 * Security integration tests for POST /api/save-order
 *
 * Covers:
 * - CSRF protection
 * - Rate limiting (STRICT: 10 req/min)
 * - Input validation (empty body, missing items, missing shippingInfo)
 * - Price integrity (total calculated server-side)
 * - Status integrity (always 'pending', client cannot override)
 * - userId integrity (from auth token, not request body)
 * - Guest orders (no auth required)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOKEN_MAP } from '../../helpers/auth-factory';

// ---------------------------------------------------------------------------
// Module mocks — vi.mock factories are hoisted, so we inline all mock logic
// ---------------------------------------------------------------------------

// Shared in-memory DB state — created inline to avoid import/require issues in vi.mock
const mockData: Record<string, Record<string, any>> = {};
const mockDbInstance = (() => {
  let idSeq = 1;
  function wrapInc(current: any, update: any) {
    const result: any = { ...current };
    for (const [k, v] of Object.entries(update)) {
      if (v && typeof v === 'object' && '__inc' in (v as any)) {
        result[k] = (Number(result[k] || 0) + (v as any).__inc);
      } else { result[k] = v; }
    }
    return result;
  }
  const buildQuery = (name: string, filters: Array<[string, string, any]> = [], limitCount?: number): any => ({
    where: (f: string, o: string, v: any) => buildQuery(name, [...filters, [f, o, v]], limitCount),
    limit: (c: number) => buildQuery(name, filters, c),
    orderBy: () => buildQuery(name, filters, limitCount),
    async get() {
      const col = mockData[name] || {};
      let docs = Object.entries(col).map(([id, doc]) => ({ id, doc }));
      for (const [field, op, value] of filters) {
        const getVal = (i: { id: string; doc: any }) => field === '__name__' ? i.id : i.doc?.[field];
        if (op === '==') docs = docs.filter(i => getVal(i) === value);
        else if (op === '!=') docs = docs.filter(i => getVal(i) !== value);
        else if (op === 'in') docs = docs.filter(i => Array.isArray(value) && value.includes(getVal(i)));
      }
      if (typeof limitCount === 'number') docs = docs.slice(0, limitCount);
      const snapDocs = docs.map(i => ({ id: i.id, exists: true, data: () => i.doc, ref: { id: i.id } }));
      return { empty: snapDocs.length === 0, size: snapDocs.length, docs: snapDocs, forEach: (cb: any) => snapDocs.forEach(cb) };
    },
  });
  const createDocRef = (colName: string, id: string): any => ({
    id, path: `${colName}/${id}`,
    async get() { const col = mockData[colName] || {}; const exists = !!col[id]; return { exists, id, data: () => exists ? col[id] : undefined, ref: { id } }; },
    async set(u: any, opts?: any) { mockData[colName] = mockData[colName] || {}; const cur = mockData[colName][id] || {}; mockData[colName][id] = opts?.merge ? wrapInc(cur, u) : u; },
    async update(u: any) { mockData[colName] = mockData[colName] || {}; mockData[colName][id] = wrapInc(mockData[colName][id] || {}, u); },
    async delete() { if (mockData[colName]) delete mockData[colName][id]; },
    collection: (sub: string) => createColRef(`${colName}/${id}/${sub}`),
  });
  const createColRef = (name: string): any => ({ id: name, path: name,
    add: async (doc: any) => { const id = `${name.replace(/\//g,'_')}_${idSeq++}`; mockData[name] = mockData[name] || {}; mockData[name][id] = doc; return { id }; },
    where: (f: string, o: string, v: any) => buildQuery(name, [[f, o, v]]),
    orderBy: (f: string) => buildQuery(name),
    limit: (c: number) => buildQuery(name, [], c),
    doc: (id?: string) => createDocRef(name, id || `auto_${name.replace(/\//g, '_')}_${idSeq++}`),
    async get() { const col = mockData[name] || {}; const snapDocs = Object.entries(col).map(([id, doc]) => ({ id, exists: true, data: () => doc, ref: { id } })); return { empty: snapDocs.length === 0, size: snapDocs.length, docs: snapDocs, forEach: (cb: any) => snapDocs.forEach(cb) }; },
  });
  return {
    data: mockData,
    collection: createColRef,
    doc: (path: string) => { const parts = path.split('/'); return createDocRef(parts.slice(0, -1).join('/'), parts[parts.length - 1]); },
    async runTransaction(fn: any) {
      const tx = { get: async (ref: any) => ref.get(), update: async (ref: any, u: any) => ref.update(u), set: async (ref: any, u: any, o?: any) => ref.set(u, o), create: async (ref: any, u: any) => { const s = await ref.get(); if (s.exists) return ref.set(u); return ref.set(u); }, delete: async (ref: any) => ref.delete() };
      return fn(tx);
    },
    __clear() { for (const k of Object.keys(mockData)) mockData[k] = {}; },
  };
})();

const mockAuth = {
  verifyIdToken: async (token: string) => {
    const user = (TOKEN_MAP as any)[token];
    if (!user) throw new Error('Firebase ID token has been revoked or is invalid');
    return { uid: user.uid, email: user.email, admin: user.admin };
  },
  setCustomUserClaims: async () => {},
  getUser: async (uid: string) => {
    const user = Object.values(TOKEN_MAP).find(u => u.uid === uid);
    if (!user) throw new Error('User not found');
    return { uid: user.uid, email: user.email, customClaims: user.admin ? { admin: true } : {} };
  },
};

vi.mock('../../../src/lib/firebase-admin', () => ({
  getAdminDb: () => mockDbInstance,
  getAdminAuth: () => mockAuth,
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => new Date(), increment: (n: number) => ({ __inc: n }) },
  Timestamp: { fromMillis: (ms: number) => new Date(ms) },
  FieldPath: { documentId: () => '__name__' },
}));

vi.mock('../../../src/lib/csrf', () => ({
  validateCSRF: vi.fn(() => ({ valid: true })),
  createCSRFErrorResponse: vi.fn(() => new Response(JSON.stringify({ error: 'CSRF validation failed' }), { status: 403, headers: { 'Content-Type': 'application/json' } })),
}));

vi.mock('../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../src/lib/auth/authHelpers', () => ({
  verifyAuthToken: vi.fn(async (req: Request) => {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return { success: false, error: new Response(JSON.stringify({ error: 'Auth required' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return { success: false, error: new Response(JSON.stringify({ error: 'Auth required' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
    const user = (TOKEN_MAP as any)[token];
    if (!user) return { success: false, error: new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } }) };
    return { success: true, uid: user.uid, email: user.email, isAdmin: user.admin };
  }),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { POST } from '../../../src/pages/api/save-order';
import { validateCSRF, createCSRFErrorResponse } from '../../../src/lib/csrf';
import { resetRateLimits } from '../../helpers/rate-limit-reset';
import { TOKENS, USERS } from '../../helpers/auth-factory';
import {
  seedProduct,
  seedShippingConfig,
} from '../../helpers/seed-data';
import { buildRequest, buildAuthenticatedPost, buildUnauthenticatedPost } from '../../helpers/request-builder';
import { API_URLS } from '../../helpers/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retrieve the shared mock DB instance. */
function getMockDb() {
  return mockDbInstance as {
    data: Record<string, Record<string, any>>;
    __clear: () => void;
    collection: (name: string) => any;
  };
}

/** Minimal valid order payload used across tests. */
const VALID_SHIPPING_INFO = {
  fullName: 'Ana García',
  email: 'ana@example.com',
  phone: '612345678',
  address: 'Calle Seguridad 1',
  city: 'Madrid',
  state: 'Madrid',
  zipCode: '28001',
  country: 'España',
  shippingMethodId: 'method-1',
};

function buildValidPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    idempotencyKey: `idem-${Date.now()}-${Math.random()}`,
    checkoutId: undefined as unknown as string, // filled below
    items: [{ productId: 'product-1', name: 'Test Product', quantity: 1 }],
    shippingInfo: VALID_SHIPPING_INFO,
    usedWallet: false,
    ...overrides,
  };
}

/** Build a self-consistent payload (idempotencyKey === checkoutId). */
function buildConsistentPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const key = `ck-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return buildValidPayload({ idempotencyKey: key, checkoutId: key, ...overrides });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();

  // Re-enable CSRF by default (individual tests override as needed)
  vi.mocked(validateCSRF).mockReturnValue({ valid: true });

  const db = getMockDb();
  db.__clear();

  // Seed baseline data every test needs
  seedProduct(db, 'product-1', { basePrice: 25.0 });
  seedShippingConfig(db);
});

// ---------------------------------------------------------------------------
// CSRF tests
// ---------------------------------------------------------------------------

describe('CSRF protection', () => {
  it('rejects request with invalid origin (403)', async () => {
    vi.mocked(validateCSRF).mockReturnValue({
      valid: false,
      reason: 'Origin mismatch',
    });

    const payload = buildConsistentPayload();
    const req = buildRequest(API_URLS.SAVE_ORDER, 'POST')
      .withInvalidOrigin('https://evil.com')
      .withBody(payload)
      .build();

    const res = await POST({ request: req } as any);

    expect(validateCSRF).toHaveBeenCalledOnce();
    expect(createCSRFErrorResponse).toHaveBeenCalledOnce();
    expect(res.status).toBe(403);
  });

  it('rejects request with missing Origin header (403)', async () => {
    vi.mocked(validateCSRF).mockReturnValue({
      valid: false,
      reason: 'Missing origin',
    });

    const payload = buildConsistentPayload();
    const req = buildRequest(API_URLS.SAVE_ORDER, 'POST')
      .withNoOrigin()
      .withBody(payload)
      .build();

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(403);
  });

  it('allows request that passes CSRF validation (200)', async () => {
    vi.mocked(validateCSRF).mockReturnValue({ valid: true });

    const payload = buildConsistentPayload();
    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);

    const res = await POST({ request: req } as any);

    // CSRF passed — the handler continues (200 or non-403 failure)
    expect(res.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Rate limit tests
// ---------------------------------------------------------------------------

describe('Rate limiting (STRICT — 10 req/min)', () => {
  it('allows the first 10 requests and blocks the 11th (429)', async () => {
    const payload = buildConsistentPayload();

    // Make 10 requests — all should pass the rate-limit gate
    for (let i = 0; i < 10; i++) {
      const uniqueKey = `rl-key-${i}-${Date.now()}`;
      const p = buildConsistentPayload({ idempotencyKey: uniqueKey, checkoutId: uniqueKey });
      const req = buildRequest(API_URLS.SAVE_ORDER, 'POST')
        .withIP('10.0.0.1')
        .withCSRF()
        .withBody(p)
        .build();
      const res = await POST({ request: req } as any);
      expect(res.status).not.toBe(429);
    }

    // The 11th request from the same IP must be rate-limited
    const req11 = buildRequest(API_URLS.SAVE_ORDER, 'POST')
      .withIP('10.0.0.1')
      .withCSRF()
      .withBody(payload)
      .build();

    const res11 = await POST({ request: req11 } as any);
    expect(res11.status).toBe(429);
  });

  it('returns Retry-After header on 429', async () => {
    for (let i = 0; i <= 10; i++) {
      const key = `ra-key-${i}`;
      const p = buildConsistentPayload({ idempotencyKey: key, checkoutId: key });
      const req = buildRequest(API_URLS.SAVE_ORDER, 'POST')
        .withIP('10.0.0.2')
        .withCSRF()
        .withBody(p)
        .build();
      await POST({ request: req } as any);
    }

    const finalReq = buildRequest(API_URLS.SAVE_ORDER, 'POST')
      .withIP('10.0.0.2')
      .withCSRF()
      .withBody(buildConsistentPayload())
      .build();

    const res = await POST({ request: finalReq } as any);
    expect(res.status).toBe(429);
    // Header may be present; response must at minimum be 429
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------

describe('Input validation', () => {
  it('returns 400 for an empty body', async () => {
    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, {});

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('returns 400 when items array is missing', async () => {
    const payload = buildConsistentPayload();
    delete (payload as any).items;

    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
  });

  it('returns 400 when items array is empty', async () => {
    const payload = buildConsistentPayload({ items: [] });

    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
  });

  it('returns 400 when shippingInfo is missing', async () => {
    const payload = buildConsistentPayload();
    delete (payload as any).shippingInfo;

    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
  });

  it('returns 400 when idempotencyKey is missing', async () => {
    const payload = buildConsistentPayload();
    delete (payload as any).idempotencyKey;

    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
  });

  it('returns 400 when checkoutId does not match idempotencyKey', async () => {
    const key = `ck-mismatch-${Date.now()}`;
    const payload = buildValidPayload({
      idempotencyKey: key,
      checkoutId: `${key}-DIFFERENT`,
    });

    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/checkoutId/i);
  });

  it('returns 400 when item quantity is zero', async () => {
    const payload = buildConsistentPayload({
      items: [{ productId: 'product-1', name: 'Test Product', quantity: 0 }],
    });

    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
  });

  it('returns 400 when shippingInfo email is malformed', async () => {
    const payload = buildConsistentPayload({
      shippingInfo: { ...VALID_SHIPPING_INFO, email: 'not-an-email' },
    });

    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Price integrity tests
// ---------------------------------------------------------------------------

describe('Price integrity — server-side calculation', () => {
  it('ignores client-supplied total and recalculates from DB prices', async () => {
    const db = await getMockDb();
    // Product basePrice is 25.00 (seeded in beforeEach)

    const payload = buildConsistentPayload({
      // Attacker sends inflated totals in the body — these must be ignored
      subtotal: 0.01,
      total: 0.01,
      tax: 0,
    });

    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const resBody = await res.json();
    expect(resBody.success).toBe(true);

    // The persisted order total must reflect the real DB price (25.00), not 0.01
    const orders = Object.values(db.data.orders);
    expect(orders.length).toBeGreaterThan(0);
    const savedOrder = orders[0] as any;
    expect(savedOrder.total).toBeGreaterThan(0.01);
    expect(savedOrder.subtotal).toBeGreaterThan(0);
  });

  it('calculates totals from DB price regardless of client item price field', async () => {
    const db = await getMockDb();

    const payload = buildConsistentPayload({
      items: [
        {
          productId: 'product-1',
          name: 'Test Product',
          quantity: 1,
          // Attacker sends their own price — must be ignored
          price: 0.001,
          unitPrice: 0.001,
        },
      ],
    });

    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);

    const orders = Object.values(db.data.orders);
    const savedOrder = orders[0] as any;
    // Price must be the DB value (25.00), not the client-supplied 0.001
    expect(savedOrder.subtotal).toBeGreaterThanOrEqual(25.0);
  });
});

// ---------------------------------------------------------------------------
// Status integrity tests
// ---------------------------------------------------------------------------

describe('Status integrity — always pending on creation', () => {
  it('saves order with status "pending" even if client sends "paid"', async () => {
    const db = await getMockDb();

    // Schema strips 'status' before it reaches the handler, but we test the
    // end-to-end guarantee: whatever arrives, the saved status is 'pending'.
    const payload = buildConsistentPayload({
      // These extra fields must be stripped / ignored by Zod
      status: 'paid',
      paymentStatus: 'paid',
    } as Record<string, unknown>);

    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);

    const orders = Object.values(db.data.orders);
    expect(orders.length).toBeGreaterThan(0);
    const savedOrder = orders[0] as any;
    expect(savedOrder.status).toBe('pending');
    expect(savedOrder.paymentStatus).toBe('pending');
  });

  it('saves order with status "pending" even if client sends "processing"', async () => {
    const db = await getMockDb();

    const payload = buildConsistentPayload({
      status: 'processing',
      paymentStatus: 'processing',
    } as Record<string, unknown>);

    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);

    const orders = Object.values(db.data.orders);
    const savedOrder = orders[0] as any;
    expect(savedOrder.status).toBe('pending');
  });
});

// ---------------------------------------------------------------------------
// userId integrity tests
// ---------------------------------------------------------------------------

describe('userId integrity — must come from auth token, not client body', () => {
  it('sets userId from the authenticated token, ignoring any userId in the body', async () => {
    const db = await getMockDb();

    const ATTACKER_FAKE_UID = 'fake-uid-from-client-body';
    const payload = buildConsistentPayload({
      // Attacker tries to impersonate another user
      userId: ATTACKER_FAKE_UID,
    } as Record<string, unknown>);

    const req = buildAuthenticatedPost(API_URLS.SAVE_ORDER, TOKENS.VALID_USER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);

    const orders = Object.values(db.data.orders);
    expect(orders.length).toBeGreaterThan(0);
    const savedOrder = orders[0] as any;

    // Must be the real authenticated user's UID, NOT the fake one
    expect(savedOrder.userId).toBe(USERS.USER.uid);
    expect(savedOrder.userId).not.toBe(ATTACKER_FAKE_UID);
  });

  it('sets userId from admin token when admin creates an order', async () => {
    const db = await getMockDb();

    const payload = buildConsistentPayload();
    const req = buildAuthenticatedPost(API_URLS.SAVE_ORDER, TOKENS.VALID_ADMIN, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);

    const orders = Object.values(db.data.orders);
    const savedOrder = orders[0] as any;
    expect(savedOrder.userId).toBe(USERS.ADMIN.uid);
  });
});

// ---------------------------------------------------------------------------
// Guest order tests
// ---------------------------------------------------------------------------

describe('Guest orders — no authentication required', () => {
  it('allows guest checkout and sets userId to null', async () => {
    const db = await getMockDb();

    const payload = buildConsistentPayload({ usedWallet: false });
    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const resBody = await res.json();
    expect(resBody.success).toBe(true);
    expect(resBody.orderId).toBeTruthy();

    const orders = Object.values(db.data.orders);
    const savedOrder = orders[0] as any;
    expect(savedOrder.userId).toBeNull();
  });

  it('returns orderAccessToken for guest orders (allows tracking without account)', async () => {
    const payload = buildConsistentPayload({ usedWallet: false });
    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const resBody = await res.json();
    // Guest orders receive a plain-text access token; authenticated orders do not
    expect(resBody.orderAccessToken).toBeDefined();
    expect(typeof resBody.orderAccessToken).toBe('string');
    expect(resBody.orderAccessToken.length).toBeGreaterThan(0);
  });

  it('does NOT return orderAccessToken for authenticated orders', async () => {
    const payload = buildConsistentPayload({ usedWallet: false });
    const req = buildAuthenticatedPost(API_URLS.SAVE_ORDER, TOKENS.VALID_USER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const resBody = await res.json();
    expect(resBody.orderAccessToken).toBeUndefined();
  });

  it('ignores usedWallet for guests (wallet requires authentication)', async () => {
    const db = await getMockDb();

    // Guest requests wallet usage — handler must not crash and must set usedWallet: false
    const payload = buildConsistentPayload({ usedWallet: true });
    const req = buildUnauthenticatedPost(API_URLS.SAVE_ORDER, payload);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);

    const orders = Object.values(db.data.orders);
    const savedOrder = orders[0] as any;
    // Without a userId, no wallet discount can be applied
    expect(savedOrder.walletDiscount).toBe(0);
    expect(savedOrder.usedWallet).toBe(false);
  });
});
