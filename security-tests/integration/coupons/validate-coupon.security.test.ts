/**
 * Security integration tests for POST /api/validate-coupon
 *
 * Covers:
 * - CSRF protection
 * - Rate limiting (STANDARD: 60 req/min)
 * - Input validation (missing code field, empty body)
 * - Coupon validity checks: inactive/non-existent, expired, not yet started,
 *   minPurchase threshold, maxUses reached, maxUsesPerUser reached
 * - Discount calculation: percentage coupon, maxDiscount cap
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  FieldPath: {
    documentId: () => '__name__',
  },
}));

vi.mock('../../../src/lib/csrf', () => ({
  validateCSRF: vi.fn(() => ({ valid: true })),
  createCSRFErrorResponse: vi.fn(
    () =>
      new Response(JSON.stringify({ error: 'CSRF validation failed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
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

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { POST } from '../../../src/pages/api/validate-coupon';
import { validateCSRF, createCSRFErrorResponse } from '../../../src/lib/csrf';
import { resetRateLimits } from '../../helpers/rate-limit-reset';
import { USERS } from '../../helpers/auth-factory';
import { buildRequest, buildUnauthenticatedPost } from '../../helpers/request-builder';
import { API_URLS } from '../../helpers/constants';

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

/** Minimal active coupon seeded into the mock DB. */
interface CouponSeed {
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  active: boolean;
  currentUses?: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  minPurchase?: number;
  maxDiscount?: number;
  startDate?: string | null;
  endDate?: string | null;
  userSpecific?: string[];
  description?: string;
}

function seedCoupon(id: string, overrides: Partial<CouponSeed> = {}): void {
  __firebase.db.data['coupons'][id] = {
    code: overrides.code ?? id.toUpperCase(),
    type: overrides.type ?? 'percentage',
    value: overrides.value ?? 10,
    active: overrides.active ?? true,
    currentUses: overrides.currentUses ?? 0,
    ...(overrides.maxUses !== undefined && { maxUses: overrides.maxUses }),
    ...(overrides.maxUsesPerUser !== undefined && { maxUsesPerUser: overrides.maxUsesPerUser }),
    ...(overrides.minPurchase !== undefined && { minPurchase: overrides.minPurchase }),
    ...(overrides.maxDiscount !== undefined && { maxDiscount: overrides.maxDiscount }),
    ...(overrides.startDate !== undefined && { startDate: overrides.startDate }),
    ...(overrides.endDate !== undefined && { endDate: overrides.endDate }),
    ...(overrides.userSpecific !== undefined && { userSpecific: overrides.userSpecific }),
    ...(overrides.description !== undefined && { description: overrides.description }),
  };
}

/** Seed a coupon_usage record representing one prior use by a user. */
function seedCouponUsage(couponId: string, userId: string): void {
  const usageId = `usage-${couponId}-${userId}`;
  __firebase.db.data['coupon_usage'][usageId] = {
    couponId,
    userId,
    usedAt: new Date().toISOString(),
  };
}

/** Seed a user document into the users collection. */
function seedUser(uid: string, email: string): void {
  __firebase.db.data['users'][uid] = { email, uid };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  __firebase.db.__clear();

  // Restore CSRF mock to the permissive default after each test
  vi.mocked(validateCSRF).mockReturnValue({ valid: true });
});

// ---------------------------------------------------------------------------
// CSRF tests
// ---------------------------------------------------------------------------

describe('CSRF protection', () => {
  it('CSRF-1: rejects request with invalid origin (403)', async () => {
    vi.mocked(validateCSRF).mockReturnValueOnce({
      valid: false,
      reason: 'origin mismatch',
    } as any);

    const body = { code: 'SAVE10', cartTotal: 100 };
    const req = buildRequest(API_URLS.VALIDATE_COUPON, 'POST')
      .withInvalidOrigin('https://evil.com')
      .withBody(body)
      .build();

    const res = await POST({ request: req } as any);

    expect(validateCSRF).toHaveBeenCalledOnce();
    expect(createCSRFErrorResponse).toHaveBeenCalledOnce();
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Rate limit tests
// ---------------------------------------------------------------------------

describe('Rate limiting (STANDARD — 60 req/min)', () => {
  it('RATE-1: allows 60 requests then blocks the 61st (429)', async () => {
    seedCoupon('coupon-rl', { code: 'RLTEST', active: true });

    const body = { code: 'RLTEST', cartTotal: 50 };

    // Send exactly 60 requests from the same IP — all must pass the rate-limit gate
    for (let i = 0; i < 60; i++) {
      const req = buildRequest(API_URLS.VALIDATE_COUPON, 'POST')
        .withIP('10.1.2.3')
        .withCSRF()
        .withBody(body)
        .build();
      const res = await POST({ request: req } as any);
      expect(res.status).not.toBe(429);
    }

    // The 61st request from the same IP must be rate-limited
    const req61 = buildRequest(API_URLS.VALIDATE_COUPON, 'POST')
      .withIP('10.1.2.3')
      .withCSRF()
      .withBody(body)
      .build();

    const res61 = await POST({ request: req61 } as any);
    expect(res61.status).toBe(429);

    const responseBody = await res61.json();
    expect(responseBody).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------

describe('Input validation', () => {
  it('INPUT-1: returns 400 for missing code field', async () => {
    const req = buildUnauthenticatedPost(API_URLS.VALIDATE_COUPON, {
      cartTotal: 50,
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('INPUT-2: returns 400 for empty body', async () => {
    const req = buildUnauthenticatedPost(API_URLS.VALIDATE_COUPON, {});

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Coupon validity tests
// ---------------------------------------------------------------------------

describe('Coupon validity', () => {
  it('COUPON-1: returns valid=false for non-existent or inactive coupon code', async () => {
    // No coupon seeded — query returns empty
    const req = buildUnauthenticatedPost(API_URLS.VALIDATE_COUPON, {
      code: 'GHOST999',
      cartTotal: 100,
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBeTruthy();
  });

  it('COUPON-2: returns valid=false for expired coupon (endDate in past)', async () => {
    seedCoupon('coupon-expired', {
      code: 'EXPIRED10',
      endDate: '2020-01-01T00:00:00.000Z', // well in the past
    });

    const req = buildUnauthenticatedPost(API_URLS.VALIDATE_COUPON, {
      code: 'EXPIRED10',
      cartTotal: 100,
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toMatch(/expir/i);
  });

  it('COUPON-3: returns valid=false when coupon not yet valid (startDate in future)', async () => {
    seedCoupon('coupon-future', {
      code: 'FUTURE20',
      startDate: '2099-12-31T00:00:00.000Z', // far in the future
    });

    const req = buildUnauthenticatedPost(API_URLS.VALIDATE_COUPON, {
      code: 'FUTURE20',
      cartTotal: 100,
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBeTruthy();
  });

  it('COUPON-4: returns valid=false when cartTotal < minPurchase', async () => {
    seedCoupon('coupon-minpurchase', {
      code: 'MIN50',
      minPurchase: 50,
    });

    const req = buildUnauthenticatedPost(API_URLS.VALIDATE_COUPON, {
      code: 'MIN50',
      cartTotal: 30, // below the 50 threshold
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBeTruthy();
  });

  it('COUPON-5: returns valid=false when maxUses reached', async () => {
    seedCoupon('coupon-maxuses', {
      code: 'MAXUSED',
      maxUses: 100,
      currentUses: 100, // limit already reached
    });

    const req = buildUnauthenticatedPost(API_URLS.VALIDATE_COUPON, {
      code: 'MAXUSED',
      cartTotal: 100,
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBeTruthy();
  });

  it('COUPON-6: returns valid=false when maxUsesPerUser reached for a specific user', async () => {
    const userId = USERS.USER.uid;

    seedCoupon('coupon-peruser', {
      code: 'PERUSER1',
      maxUsesPerUser: 1,
      currentUses: 1,
    });

    // Seed existing usage record for this user
    seedCouponUsage('coupon-peruser', userId);

    const req = buildUnauthenticatedPost(API_URLS.VALIDATE_COUPON, {
      code: 'PERUSER1',
      userId,
      cartTotal: 100,
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.error).toBeTruthy();
  });

  it('COUPON-7: returns valid=true with correct discount for a percentage coupon', async () => {
    seedCoupon('coupon-pct', {
      code: 'PCT20',
      type: 'percentage',
      value: 20, // 20%
    });

    const cartTotal = 100;
    const req = buildUnauthenticatedPost(API_URLS.VALIDATE_COUPON, {
      code: 'PCT20',
      cartTotal,
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.coupon).toBeDefined();
    // 20% of 100 = 20
    expect(body.coupon.discountAmount).toBe(20);
    expect(body.coupon.type).toBe('percentage');
    expect(body.coupon.value).toBe(20);
  });

  it('COUPON-8: returns valid=true with discount capped at maxDiscount', async () => {
    seedCoupon('coupon-maxdiscount', {
      code: 'CAP15',
      type: 'percentage',
      value: 50, // 50% — would be €50 on €100 cart
      maxDiscount: 15, // but capped at €15
    });

    const cartTotal = 100;
    const req = buildUnauthenticatedPost(API_URLS.VALIDATE_COUPON, {
      code: 'CAP15',
      cartTotal,
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.coupon).toBeDefined();
    // 50% of 100 = 50, but capped at maxDiscount = 15
    expect(body.coupon.discountAmount).toBe(15);
  });
});
