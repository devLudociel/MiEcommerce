/**
 * Security integration tests for POST /api/send-email
 *
 * Covers:
 * - Rate limiting (STRICT: 10 req/min)
 * - CSRF protection
 * - Newsletter-welcome requires X-Internal-Secret header (403 without it)
 * - Order emails require admin auth OR internal secret (403 without either)
 * - Input validation via Zod schema
 * - Admin can successfully send order confirmation email
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFirebase } from '../../helpers/mock-firebase';
import { createMockVerifyAdminAuth } from '../../helpers/auth-factory';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports of the mocked modules
// ---------------------------------------------------------------------------

const __firebase = createMockFirebase();
const __mockVerifyAdminAuth = createMockVerifyAdminAuth();

vi.mock('../../../src/lib/firebase-admin', () => ({
  getAdminDb: () => __firebase.db,
  getAdminAuth: () => __firebase.auth,
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => new Date(),
    increment: (n: number) => ({ __inc: n }),
  },
}));

vi.mock('../../../src/lib/csrf', () => ({
  validateCSRF: vi.fn(() => ({ valid: true })),
  createCSRFErrorResponse: vi.fn(
    () =>
      new Response(JSON.stringify({ error: 'CSRF' }), {
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

vi.mock('../../../src/lib/auth/authHelpers', () => ({
  verifyAuthToken: vi.fn(),
  verifyAdminAuth: vi.fn(async (req: Request) => __mockVerifyAdminAuth(req)),
}));

vi.mock('resend', () => {
  class Resend {
    emails = { send: vi.fn(async () => ({ data: { id: 'email-123' } })) };
    constructor(..._: unknown[]) {}
  }
  return { Resend };
});

vi.mock('../../../src/lib/emailTemplates', () => ({
  orderConfirmationTemplate: vi.fn(() => ({
    subject: 'Order Confirmed',
    html: '<p>Confirmed</p>',
  })),
  orderStatusUpdateTemplate: vi.fn(() => ({
    subject: 'Status Update',
    html: '<p>Updated</p>',
  })),
  newsletterWelcomeTemplate: vi.fn(() => ({
    subject: 'Welcome',
    html: '<p>Welcome</p>',
  })),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { POST } from '../../../src/pages/api/send-email';
import { validateCSRF, createCSRFErrorResponse } from '../../../src/lib/csrf';
import { resetRateLimits } from '../../helpers/rate-limit-reset';
import { TOKENS } from '../../helpers/auth-factory';
import {
  buildRequest,
  buildAuthenticatedPost,
  buildUnauthenticatedPost,
} from '../../helpers/request-builder';
import { API_URLS } from '../../helpers/constants';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_INTERNAL_SECRET = 'test-internal-secret-value';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a POST request that includes the internal API secret header,
 * bypassing admin auth for newsletter-welcome type emails.
 */
function buildInternalPost(body: unknown): Request {
  return buildRequest(API_URLS.SEND_EMAIL, 'POST')
    .withCSRF()
    .withHeader('X-Internal-Secret', VALID_INTERNAL_SECRET)
    .withBody(body)
    .build();
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();

  // Re-enable CSRF by default; individual tests override as needed
  vi.mocked(validateCSRF).mockReturnValue({ valid: true });

  // Reset Firestore in-memory state
  __firebase.db.__clear();

  // Set the internal secret env variable so the endpoint accepts it
  // The endpoint reads: import.meta.env.INTERNAL_API_SECRET
  // We patch the global import.meta.env equivalent used in tests via Vite's define
  // Since we cannot set import.meta.env directly here, we rely on the mock returning
  // 403 for missing/mismatched secrets and use a non-matching secret for negative tests.
});

// ---------------------------------------------------------------------------
// RATE-1: Rate limiting (STRICT — 10 req/min)
// ---------------------------------------------------------------------------

describe('Rate limiting (STRICT — 10 req/min)', () => {
  it('RATE-1: blocks the 11th request from the same IP with 429', async () => {
    const ip = '10.1.1.1';

    // Send 10 requests — all should pass the rate-limit gate
    for (let i = 0; i < 10; i++) {
      const req = buildRequest(API_URLS.SEND_EMAIL, 'POST')
        .withIP(ip)
        .withCSRF()
        .withBody({ type: 'invalid-type-to-get-400-not-500' })
        .build();
      const res = await POST({ request: req } as any);
      // Any response except 429 is acceptable for the warmup requests
      expect(res.status).not.toBe(429);
    }

    // The 11th request must be rate-limited
    const req11 = buildRequest(API_URLS.SEND_EMAIL, 'POST')
      .withIP(ip)
      .withCSRF()
      .withBody({ type: 'confirmation', orderId: 'order-1' })
      .build();

    const res11 = await POST({ request: req11 } as any);
    expect(res11.status).toBe(429);

    const body = await res11.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// AUTH-1: Newsletter-welcome requires internal secret
// ---------------------------------------------------------------------------

describe('Newsletter-welcome authorization', () => {
  it('AUTH-1: returns 403 when newsletter-welcome is requested without X-Internal-Secret', async () => {
    const req = buildUnauthenticatedPost(API_URLS.SEND_EMAIL, {
      type: 'newsletter-welcome',
      email: 'subscriber@test.com',
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('AUTH-1b: returns 403 when newsletter-welcome is sent with wrong internal secret', async () => {
    const req = buildRequest(API_URLS.SEND_EMAIL, 'POST')
      .withCSRF()
      .withHeader('X-Internal-Secret', 'wrong-secret-value')
      .withBody({
        type: 'newsletter-welcome',
        email: 'subscriber@test.com',
      })
      .build();

    const res = await POST({ request: req } as any);

    // Without a matching secret the endpoint treats this as an unauthorized call
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// AUTH-2: Order emails require admin auth
// ---------------------------------------------------------------------------

describe('Order email authorization', () => {
  it('AUTH-2: returns 403 for order confirmation without admin auth', async () => {
    const req = buildUnauthenticatedPost(API_URLS.SEND_EMAIL, {
      type: 'confirmation',
      orderId: 'order-1',
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('AUTH-2b: returns 403 for order status-update without admin auth', async () => {
    const req = buildUnauthenticatedPost(API_URLS.SEND_EMAIL, {
      type: 'status-update',
      orderId: 'order-1',
      newStatus: 'processing',
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(403);
  });

  it('AUTH-2c: returns 403 when a regular (non-admin) user attempts to send order email', async () => {
    const req = buildAuthenticatedPost(API_URLS.SEND_EMAIL, TOKENS.VALID_USER, {
      type: 'confirmation',
      orderId: 'order-1',
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// AUTH-3: Admin can send order confirmation
// ---------------------------------------------------------------------------

describe('Admin order email', () => {
  it('AUTH-3: admin can send order confirmation email (200)', async () => {
    // Seed an order into the mock Firestore
    __firebase.db.data['orders'] = __firebase.db.data['orders'] ?? {};
    __firebase.db.data['orders']['order-1'] = {
      shippingInfo: { email: 'user@test.com', fullName: 'Test User' },
      items: [],
      total: 10,
    };

    const req = buildAuthenticatedPost(API_URLS.SEND_EMAIL, TOKENS.VALID_ADMIN, {
      type: 'confirmation',
      orderId: 'order-1',
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// INPUT-1: Invalid email type
// ---------------------------------------------------------------------------

describe('Input validation', () => {
  it('INPUT-1: returns 400 for an invalid email type', async () => {
    const req = buildAuthenticatedPost(API_URLS.SEND_EMAIL, TOKENS.VALID_ADMIN, {
      type: 'unknown-email-type',
      orderId: 'order-1',
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('INPUT-2: returns 400 for missing orderId on order email types', async () => {
    // Seed an admin-accessible order so the only failure is the missing orderId
    __firebase.db.data['orders'] = __firebase.db.data['orders'] ?? {};

    const req = buildAuthenticatedPost(API_URLS.SEND_EMAIL, TOKENS.VALID_ADMIN, {
      type: 'confirmation',
      // orderId intentionally omitted
    });

    const res = await POST({ request: req } as any);

    // The endpoint requires orderId for order email types; without it the Zod
    // schema passes (orderId is optional) but the logic returns 400 ("Datos incompletos")
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// CSRF-1: CSRF protection
// ---------------------------------------------------------------------------

describe('CSRF protection', () => {
  it('CSRF-1: returns 403 when CSRF validation fails', async () => {
    vi.mocked(validateCSRF).mockReturnValue({
      valid: false,
      reason: 'Origin mismatch',
    });

    const req = buildRequest(API_URLS.SEND_EMAIL, 'POST')
      .withInvalidOrigin('https://evil.com')
      .withBody({ type: 'confirmation', orderId: 'order-1' })
      .build();

    const res = await POST({ request: req } as any);

    expect(validateCSRF).toHaveBeenCalledOnce();
    expect(createCSRFErrorResponse).toHaveBeenCalledOnce();
    expect(res.status).toBe(403);
  });
});
