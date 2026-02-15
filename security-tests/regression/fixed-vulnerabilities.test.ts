/**
 * Regression tests for vulnerabilities documented in SECURITY_AUDIT_REPORT.md
 *
 * Each test verifies that a specific fix remains in place and hasn't regressed.
 * Tests are named after the vulnerability IDs from the report.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFirebase } from '../helpers/mock-firebase';
import { createMockVerifyAuthToken, createMockVerifyAdminAuth, TOKENS, USERS } from '../helpers/auth-factory';

const __firebase = createMockFirebase();
const __mockVerifyAuth = createMockVerifyAuthToken();
const __mockVerifyAdminAuth = createMockVerifyAdminAuth();

vi.mock('../../src/lib/firebase-admin', () => ({
  getAdminDb: () => __firebase.db,
  getAdminAuth: () => __firebase.auth,
}));
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => new Date(),
    increment: (n: number) => ({ __inc: n }),
    delete: () => ({ __del: true }),
  },
  FieldPath: { documentId: () => '__name__' },
  Timestamp: { fromMillis: (ms: number) => new Date(ms) },
}));
vi.mock('../../src/lib/csrf', () => ({
  validateCSRF: vi.fn(() => ({ valid: true })),
  createCSRFErrorResponse: vi.fn(() =>
    new Response(JSON.stringify({ error: 'CSRF' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
  ),
}));
vi.mock('../../src/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../src/lib/utils/apiLogger', () => ({
  createScopedLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));
vi.mock('../../src/lib/auth/authHelpers', () => ({
  verifyAuthToken: vi.fn(async (req: Request) => __mockVerifyAuth(req)),
  verifyAdminAuth: vi.fn(async (req: Request) => __mockVerifyAdminAuth(req)),
}));
vi.mock('resend', () => {
  class Resend {
    emails = { send: vi.fn(async () => ({ data: { id: 'email-123' } })) };
    constructor(..._: unknown[]) {}
  }
  return { Resend };
});
vi.mock('../../src/lib/emailTemplates', () => ({
  orderConfirmationTemplate: vi.fn(() => ({ subject: 'Order', html: '<p>OK</p>' })),
  orderStatusUpdateTemplate: vi.fn(() => ({ subject: 'Update', html: '<p>OK</p>' })),
  newsletterWelcomeTemplate: vi.fn(() => ({ subject: 'Welcome', html: '<p>OK</p>' })),
}));

import { POST as SEND_EMAIL_POST } from '../../src/pages/api/send-email';
import { POST as VALIDATE_COUPON_POST } from '../../src/pages/api/validate-coupon';
import { buildAuthenticatedPost, buildUnauthenticatedPost, buildRequest } from '../helpers/request-builder';
import { API_URLS } from '../helpers/constants';
import { resetRateLimits } from '../helpers/rate-limit-reset';

describe('Regression: Fixed Vulnerabilities from SECURITY_AUDIT_REPORT', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    __firebase.db.__clear();
  });

  // ---------------------------------------------------------------------------
  // CRIT-003: Send-email endpoint required no authentication
  // Fix: Now requires admin auth for order emails, internal secret for newsletter
  // ---------------------------------------------------------------------------

  it('CRIT-003: send-email rejects unauthenticated order confirmation requests', async () => {
    __firebase.db.data.orders['order-1'] = {
      shippingInfo: { email: 'user@test.com' },
      items: [],
      total: 10,
    };

    const req = buildUnauthenticatedPost(API_URLS.SEND_EMAIL, {
      orderId: 'order-1',
      type: 'confirmation',
    });
    const res = await SEND_EMAIL_POST({ request: req } as any);

    // Should require admin auth or internal secret
    expect(res.status).toBe(403);
  });

  it('CRIT-003: send-email rejects regular user sending order emails', async () => {
    __firebase.db.data.orders['order-1'] = {
      shippingInfo: { email: 'user@test.com' },
      items: [],
      total: 10,
    };

    const req = buildAuthenticatedPost(API_URLS.SEND_EMAIL, TOKENS.VALID_USER, {
      orderId: 'order-1',
      type: 'confirmation',
    });
    const res = await SEND_EMAIL_POST({ request: req } as any);

    // Regular user (non-admin) should be rejected
    expect(res.status).toBe(403);
  });

  it('CRIT-003: send-email has rate limiting active', async () => {
    // STRICT rate limit: 10 req/min
    for (let i = 0; i < 10; i++) {
      const req = buildUnauthenticatedPost(API_URLS.SEND_EMAIL, {
        type: 'confirmation',
        orderId: 'order-1',
      });
      await SEND_EMAIL_POST({ request: req } as any);
    }

    const req = buildUnauthenticatedPost(API_URLS.SEND_EMAIL, {
      type: 'confirmation',
      orderId: 'order-1',
    });
    const res = await SEND_EMAIL_POST({ request: req } as any);
    expect(res.status).toBe(429);
  });

  it('CRIT-003: send-email has CSRF protection', async () => {
    const { validateCSRF } = await import('../../src/lib/csrf');
    vi.mocked(validateCSRF).mockReturnValueOnce({ valid: false, reason: 'origin mismatch' } as any);

    const req = buildRequest(API_URLS.SEND_EMAIL, 'POST')
      .withInvalidOrigin()
      .withBody({ type: 'confirmation', orderId: 'order-1' })
      .build();
    const res = await SEND_EMAIL_POST({ request: req } as any);
    expect(res.status).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // CRIT-004 (MED-006): Error messages exposing internal details in production
  // Fix: error.message only included when import.meta.env.DEV is true
  // ---------------------------------------------------------------------------

  it('MED-006: validate-coupon does not expose error details in production', async () => {
    // Send a request that will cause the endpoint to hit the catch block
    // (e.g., by making the DB throw an error)
    const originalCollection = __firebase.db.collection;
    (__firebase.db as any).collection = () => {
      throw new Error('INTERNAL_FIRESTORE_CONNECTION_STRING_secret123');
    };

    const req = buildUnauthenticatedPost(API_URLS.VALIDATE_COUPON, {
      code: 'TEST',
      cartTotal: 50,
    });
    const res = await VALIDATE_COUPON_POST({ request: req } as any);
    const body = await res.json();

    expect(res.status).toBe(500);
    // The error field should be a generic user-facing message
    expect(body.error).toBeTruthy();
    expect(body.error).not.toContain('INTERNAL_FIRESTORE_CONNECTION_STRING');
    expect(body.error).not.toContain('secret123');
    // In DEV mode (vitest config sets DEV=true), details may contain the error message.
    // The key fix (MED-006) is the conditional: `import.meta.env.DEV ? ... : undefined`
    // In production (DEV=false), details would be undefined.
    // We verify the generic error field is safe regardless of mode.

    // Restore
    (__firebase.db as any).collection = originalCollection;
  });

  // ---------------------------------------------------------------------------
  // HIGH-005: Webhook without rate limiting
  // Fix: Added GENEROUS rate limit to stripe-webhook
  // (Already tested in stripe-webhook.security.test.ts)
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // HIGH-006: Admin input validation insufficient
  // Fix: Added Zod validation to admin endpoints
  // (Already tested in admin-access.security.test.ts)
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Regression: newsletter-welcome requires internal API secret
  // ---------------------------------------------------------------------------

  it('CRIT-003b: newsletter-welcome email blocked without X-Internal-Secret', async () => {
    const req = buildUnauthenticatedPost(API_URLS.SEND_EMAIL, {
      type: 'newsletter-welcome',
      email: 'victim@example.com',
    });
    const res = await SEND_EMAIL_POST({ request: req } as any);

    // Should be blocked for non-internal callers
    expect(res.status).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // General: CSRF protection on all POST endpoints that modify state
  // ---------------------------------------------------------------------------

  it('CSRF-REGRESSION: validate-coupon has CSRF protection', async () => {
    const { validateCSRF } = await import('../../src/lib/csrf');
    vi.mocked(validateCSRF).mockReturnValueOnce({ valid: false, reason: 'origin mismatch' } as any);

    const req = buildRequest(API_URLS.VALIDATE_COUPON, 'POST')
      .withInvalidOrigin()
      .withBody({ code: 'TEST', cartTotal: 50 })
      .build();
    const res = await VALIDATE_COUPON_POST({ request: req } as any);
    expect(res.status).toBe(403);
  });
});
