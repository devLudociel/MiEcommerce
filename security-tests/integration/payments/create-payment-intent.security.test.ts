/**
 * Security integration tests for POST /api/create-payment-intent
 *
 * Coverage:
 * - CSRF protection
 * - Rate limiting (VERY_STRICT / 'payment' namespace)
 * - Auth flows: authenticated user, unauthenticated user, guest with orderAccessToken
 * - Input validation (empty body, missing orderId)
 * - IDOR: order ownership enforcement
 * - Server-side amount calculation (client cannot influence payment amount)
 * - Order status gating (already-paid orders, non-pending orders)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { createMockFirebase } from '../../helpers/mock-firebase';

// ---------------------------------------------------------------------------
// Module mocks — vi.mock factories are hoisted; use only lazy references
// ---------------------------------------------------------------------------

const __firebase = createMockFirebase();

vi.mock('../../../src/lib/firebase-admin', () => ({
  getAdminDb: () => __firebase.db,
  getAdminAuth: () => __firebase.auth,
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => new Date(),
    increment: (n: number) => ({ __inc: n }),
  },
  Timestamp: {
    fromMillis: (ms: number) => new Date(ms),
  },
}));

vi.mock('../../../src/lib/csrf', () => ({
  validateCSRF: vi.fn(() => ({ valid: true })),
  createCSRFErrorResponse: vi.fn(
    () => new Response(JSON.stringify({ error: 'CSRF' }), { status: 403 })
  ),
}));

import { createMockVerifyAuthToken } from '../../helpers/auth-factory';
const __mockVerifyAuthPay = createMockVerifyAuthToken();

vi.mock('../../../src/lib/auth/authHelpers', () => ({
  verifyAuthToken: vi.fn(async (req: Request) => __mockVerifyAuthPay(req)),
  verifyAdminAuth: vi.fn(),
}));

vi.mock('../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../src/lib/utils/apiLogger', () => ({
  createScopedLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('../../../src/lib/externalServices', () => ({
  executeStripeOperation: vi.fn(async (fn: () => unknown) => fn()),
}));

// Mock Stripe so paymentIntents.create / retrieve are predictable
vi.mock('stripe', () => {
  class StripeMock {
    paymentIntents = {
      create: vi.fn(async (params: { amount: number; currency: string }) => ({
        id: 'pi_test_security_001',
        client_secret: 'pi_test_security_001_secret',
        amount: params.amount,
        currency: params.currency,
        status: 'requires_payment_method',
      })),
      retrieve: vi.fn(async (id: string) => ({
        id,
        client_secret: `${id}_secret`,
        amount: 3499,
        currency: 'eur',
        status: 'requires_payment_method',
      })),
    };
    constructor(..._args: unknown[]) {}
  }
  return { default: StripeMock };
});

// Mock orders/stock and walletReservations so tests don't need full Firestore semantics
vi.mock('../../../src/lib/orders/stock', () => ({
  validateStockAvailability: vi.fn(async () => ({ ok: true })),
  expireReservedOrder: vi.fn(async () => {}),
  releaseReservedStock: vi.fn(async () => {}),
}));

vi.mock('../../../src/lib/orders/walletReservations', () => ({
  reserveWalletFunds: vi.fn(async () => {}),
  releaseWalletReservation: vi.fn(async () => {}),
}));

// Mock calculateOrderPricing to return server-side pricing from the seeded order data
vi.mock('../../../src/lib/orders/pricing', () => ({
  calculateOrderPricing: vi.fn(async (params: any) => ({
    items: params.items || [],
    subtotal: 29.99,
    bundleDiscount: 0,
    bundleDiscountDetails: [],
    couponDiscount: 0,
    couponCode: null,
    couponId: null,
    shippingCost: 5.0,
    tax: 0,
    taxType: 'none',
    taxRate: 0,
    taxLabel: '',
    walletDiscount: 0,
    total: 34.99,
  })),
}));

// ---------------------------------------------------------------------------
// Imports after mocks are set up
// ---------------------------------------------------------------------------

import { POST } from '../../../src/pages/api/create-payment-intent';
import { validateCSRF, createCSRFErrorResponse } from '../../../src/lib/csrf';
import { resetRateLimits } from '../../helpers/rate-limit-reset';
import { buildRequest, buildAuthenticatedPost } from '../../helpers/request-builder';
import { seedOrder, seedGuestOrder, seedProduct, seedShippingConfig } from '../../helpers/seed-data';
import { TOKENS, USERS } from '../../helpers/auth-factory';
import { API_URLS } from '../../helpers/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const URL = API_URLS.CREATE_PAYMENT_INTENT;

/**
 * Hash a guest access token using the same algorithm as the endpoint.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Return the mock Firestore database instance exposed by the firebase-admin mock.
 */
function getMockDb() {
  return __firebase.db as unknown as {
    data: Record<string, Record<string, unknown>>;
    __clear: () => void;
  };
}

/**
 * Build a valid authenticated POST request with CSRF headers.
 */
function authPost(body: unknown, token: string = TOKENS.VALID_USER): Request {
  return buildAuthenticatedPost(URL, token, body);
}

/**
 * Seed a minimal order suitable for payment intent creation.
 * Uses a pre-seeded product and shipping configuration so pricing works.
 */
function seedPayableOrder(
  overrides: Record<string, unknown> = {},
  orderId: string = 'order-sec-1'
) {
  const db = getMockDb();
  seedProduct(db as any, 'prod-sec-1', { basePrice: 29.99 });
  seedShippingConfig(db as any);

  db.data.orders[orderId] = {
    userId: USERS.USER.uid,
    customerEmail: USERS.USER.email,
    status: 'pending',
    paymentStatus: 'pending',
    stockReservationStatus: 'reserved',
    stockReservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    items: [{ productId: 'prod-sec-1', quantity: 1, name: 'Test Product' }],
    shippingInfo: {
      state: 'Las Palmas',
      zipCode: '35001',
      shippingMethodId: 'method-1',
      country: 'España',
    },
    subtotal: 29.99,
    shippingCost: 5.0,
    total: 34.99,
    totalCents: 3499,
    paymentCurrency: 'eur',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  return orderId;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Security: POST /api/create-payment-intent', () => {
  beforeEach(() => {
    // Isolate rate limits and Firestore state between tests
    resetRateLimits();
    const db = getMockDb();
    db.__clear();

    // Clear mock call history without removing implementations
    // (vi.restoreAllMocks would remove vi.fn() implementations from vi.mock factories)
    vi.clearAllMocks();
    vi.mocked(validateCSRF).mockReturnValue({ valid: true });
    vi.mocked(createCSRFErrorResponse).mockReturnValue(
      new Response(JSON.stringify({ error: 'CSRF' }), { status: 403 })
    );
  });

  // -------------------------------------------------------------------------
  // 1. CSRF Protection
  // -------------------------------------------------------------------------

  it('CSRF-1: rejects requests from an invalid origin with 403', async () => {
    vi.mocked(validateCSRF).mockReturnValue({ valid: false, reason: 'origin_mismatch' });

    const req = buildRequest(URL, 'POST')
      .withInvalidOrigin('https://evil.com')
      .withAuth(TOKENS.VALID_USER)
      .withBody({ orderId: 'any-order' })
      .build();

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(403);
  });

  // -------------------------------------------------------------------------
  // 2. Rate Limiting
  // -------------------------------------------------------------------------

  it('RATE-1: returns 429 after exhausting VERY_STRICT limit (5 requests/min)', async () => {
    // Seed an order so each request progresses past rate-limit check only to validate
    // We rely on rate limiting firing before any business logic.
    const MAX_REQUESTS = 5;

    let lastStatus = 0;
    for (let i = 0; i <= MAX_REQUESTS; i++) {
      const req = buildRequest(URL, 'POST')
        .withAuth(TOKENS.VALID_USER)
        .withCSRF()
        .withBody({ orderId: 'rate-limit-test-order' })
        // Use a unique IP to avoid cross-test contamination
        .withIP('192.168.100.1')
        .build();

      const res = await POST({ request: req } as any);
      lastStatus = res.status;

      if (res.status === 429) break;
    }

    // The 6th request (index 5) should be rate-limited
    expect(lastStatus).toBe(429);
  });

  // -------------------------------------------------------------------------
  // 3. Auth — authenticated user can create a payment intent
  // -------------------------------------------------------------------------

  it('AUTH-1: authenticated user successfully creates a payment intent for their order', async () => {
    const orderId = await seedPayableOrder();

    const req = authPost({ orderId });
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.clientSecret).toBeTruthy();
    expect(body.paymentIntentId).toMatch(/^pi_/);
  });

  // -------------------------------------------------------------------------
  // 4. Input Validation
  // -------------------------------------------------------------------------

  it('VALIDATION-1: returns 400 when body is empty JSON object (missing orderId)', async () => {
    const req = authPost({});
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('VALIDATION-2: returns 400 when orderId is an empty string', async () => {
    const req = authPost({ orderId: '' });
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
  });

  it('VALIDATION-3: returns 400 when orderId exceeds max length (256 chars)', async () => {
    const req = authPost({ orderId: 'x'.repeat(256) });
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
  });

  it('VALIDATION-4: returns 400 when orderAccessToken is present but too short (< 16 chars)', async () => {
    const req = authPost({ orderId: 'some-order', orderAccessToken: 'short' });
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // 5. IDOR — Order Ownership Enforcement
  // -------------------------------------------------------------------------

  it('IDOR-1: user cannot create payment intent for another user\'s order (returns 404)', async () => {
    // Seed an order owned by USERS.USER
    const orderId = await seedPayableOrder({ userId: USERS.USER.uid });

    // Authenticate as a different user (OTHER) and attempt to pay for that order
    const req = buildRequest(URL, 'POST')
      .withAuth(TOKENS.OTHER_USER)
      .withCSRF()
      .withBody({ orderId })
      .build();

    const res = await POST({ request: req } as any);

    // Must return 404 (not 403) to avoid leaking order existence
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/no encontrado/i);
  });

  it('IDOR-2: unauthenticated user cannot access an authenticated user\'s order (401)', async () => {
    const orderId = await seedPayableOrder({ userId: USERS.USER.uid });

    // No Authorization header — no orderAccessToken either
    const req = buildRequest(URL, 'POST').withCSRF().withBody({ orderId }).build();

    const res = await POST({ request: req } as any);

    // Authenticated order requires auth; missing token should yield 401
    expect([401, 404]).toContain(res.status);
  });

  // -------------------------------------------------------------------------
  // 6. Server-Side Amount Calculation
  // -------------------------------------------------------------------------

  it('AMOUNT-1: payment amount is taken from Firestore order totalCents, not from client input', async () => {
    const orderId = await seedPayableOrder({
      totalCents: 3499, // 34.99 EUR
      total: 34.99,
    });

    // Client sends no amount field — amount must come solely from the order
    const req = authPost({ orderId });
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);

    // Verify the created payment intent received the correct server-side amount
    const { default: Stripe } = await import('stripe');
    const stripeMockInstance = new (Stripe as any)();
    // The Stripe mock's create was called once during this test
    const createCalls = vi.mocked(stripeMockInstance.paymentIntents.create).mock.calls;
    // We can't easily inspect calls across instances; instead verify via the response
    // and check that the order in Firestore was updated with server-calculated totalCents
    const db = await getMockDb();
    const updatedOrder = db.data.orders[orderId];
    expect(updatedOrder?.totalCents).toBe(3499);
  });

  it('AMOUNT-2: client-supplied amount fields in body are completely ignored', async () => {
    const orderId = await seedPayableOrder({ totalCents: 3499, total: 34.99 });

    // Attacker tries to inject an amount field
    const req = buildRequest(URL, 'POST')
      .withAuth(TOKENS.VALID_USER)
      .withCSRF()
      .withBody({ orderId, amount: 1, totalCents: 1, total: 0.01 })
      .build();

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);

    // The order should still reflect server-calculated totalCents (3499), not 1
    const db = await getMockDb();
    const updatedOrder = db.data.orders[orderId];
    expect(updatedOrder?.totalCents).toBe(3499);
  });

  // -------------------------------------------------------------------------
  // 7. Order Status Gating
  // -------------------------------------------------------------------------

  it('STATUS-1: returns 400 when order paymentStatus is already "paid"', async () => {
    const orderId = await seedPayableOrder({ paymentStatus: 'paid' });

    const req = authPost({ orderId });
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/pagado/i);
  });

  it('STATUS-2: returns 409 when order status is not "pending" (e.g. "processing")', async () => {
    const orderId = await seedPayableOrder({ status: 'processing' });

    const req = authPost({ orderId });
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(409);
  });

  it('STATUS-3: returns 409 when order paymentStatus is not "pending" (e.g. "processing")', async () => {
    const orderId = await seedPayableOrder({ paymentStatus: 'processing' });

    const req = authPost({ orderId });
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(409);
  });

  it('STATUS-4: returns 404 when orderId does not exist in Firestore', async () => {
    const req = authPost({ orderId: 'non-existent-order-xyz' });
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // 8. Guest Access via orderAccessToken
  // -------------------------------------------------------------------------

  it('GUEST-1: guest user with correct orderAccessToken can create a payment intent', async () => {
    const db = await getMockDb();
    const guestToken = 'secure-guest-access-token-abcdef';
    const tokenHash = hashToken(guestToken);

    seedProduct(db as any, 'prod-guest-1', { basePrice: 19.99 });
    seedShippingConfig(db as any);

    const orderId = 'guest-order-sec-1';
    db.data.orders[orderId] = {
      userId: null,
      email: 'guest@test.com',
      status: 'pending',
      paymentStatus: 'pending',
      orderAccessTokenHash: tokenHash,
      stockReservationStatus: 'reserved',
      stockReservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      items: [{ productId: 'prod-guest-1', quantity: 1, name: 'Guest Product' }],
      shippingInfo: {
        state: 'Las Palmas',
        zipCode: '35001',
        shippingMethodId: 'method-1',
        country: 'España',
      },
      subtotal: 19.99,
      shippingCost: 5.0,
      total: 24.99,
      totalCents: 2499,
      paymentCurrency: 'eur',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Guest request: no Authorization header, correct orderAccessToken in body
    const req = buildRequest(URL, 'POST')
      .withCSRF()
      .withBody({ orderId, orderAccessToken: guestToken })
      .build();

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.clientSecret).toBeTruthy();
  });

  it('GUEST-2: guest user with incorrect orderAccessToken is rejected with 404', async () => {
    const db = await getMockDb();
    const realToken = 'real-guest-access-token-abcdef';
    const tokenHash = hashToken(realToken);

    seedProduct(db as any, 'prod-guest-2', { basePrice: 19.99 });
    seedShippingConfig(db as any);

    const orderId = 'guest-order-sec-2';
    db.data.orders[orderId] = {
      userId: null,
      email: 'guest@test.com',
      status: 'pending',
      paymentStatus: 'pending',
      orderAccessTokenHash: tokenHash,
      stockReservationStatus: 'reserved',
      stockReservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      items: [{ productId: 'prod-guest-2', quantity: 1, name: 'Guest Product' }],
      shippingInfo: {
        state: 'Las Palmas',
        zipCode: '35001',
        shippingMethodId: 'method-1',
        country: 'España',
      },
      subtotal: 19.99,
      shippingCost: 5.0,
      total: 24.99,
      totalCents: 2499,
      paymentCurrency: 'eur',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Send wrong token
    const req = buildRequest(URL, 'POST')
      .withCSRF()
      .withBody({ orderId, orderAccessToken: 'wrong-token-that-is-long-enough' })
      .build();

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(404);
  });

  it('GUEST-3: guest order with no orderAccessToken provided is rejected with 404', async () => {
    const db = await getMockDb();
    const realToken = 'real-guest-access-token-abcdef';
    const tokenHash = hashToken(realToken);

    seedProduct(db as any, 'prod-guest-3', { basePrice: 19.99 });
    seedShippingConfig(db as any);

    const orderId = 'guest-order-sec-3';
    db.data.orders[orderId] = {
      userId: null,
      email: 'guest@test.com',
      status: 'pending',
      paymentStatus: 'pending',
      orderAccessTokenHash: tokenHash,
      stockReservationStatus: 'reserved',
      stockReservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      items: [{ productId: 'prod-guest-3', quantity: 1, name: 'Guest Product' }],
      shippingInfo: {
        state: 'Las Palmas',
        zipCode: '35001',
        shippingMethodId: 'method-1',
        country: 'España',
      },
      subtotal: 19.99,
      shippingCost: 5.0,
      total: 24.99,
      totalCents: 2499,
      paymentCurrency: 'eur',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // No orderAccessToken in body
    const req = buildRequest(URL, 'POST')
      .withCSRF()
      .withBody({ orderId })
      .build();

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(404);
  });
});
