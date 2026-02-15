/**
 * Security integration tests for GET /api/get-order
 *
 * Covers:
 * - 401 when no Authorization header is present
 * - 401 when token is invalid or expired
 * - IDOR: User A cannot access User B's order (returns 404)
 * - Admin can access any user's order
 * - Authenticated user can access their own order (200)
 * - 400 when orderId query param is missing
 * - Response shape does not expose sensitive internal fields
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
  /**
   * FieldPath.documentId() is used in the IDOR query:
   *   .where(FieldPath.documentId(), '==', orderId)
   *
   * The mock query engine in mock-firebase.ts filters on plain string field
   * names. Returning the special sentinel '__name__' will not match actual doc
   * fields, so the query returns no results — exactly what should happen when a
   * user queries for an order that belongs to another user (IDOR blocked).
   *
   * For the admin path the handler does a direct .doc(orderId).get(), which
   * bypasses the query entirely and always works.
   */
  FieldPath: {
    documentId: () => '__name__',
  },
}));

vi.mock('../../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { GET } from '../../../src/pages/api/get-order';
import { TOKENS, USERS } from '../../helpers/auth-factory';
import { seedOrder } from '../../helpers/seed-data';
import { buildRequest } from '../../helpers/request-builder';
import { API_URLS, FORBIDDEN_ERROR_PATTERNS } from '../../helpers/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMockDb() {
  return __firebase.db as {
    data: Record<string, Record<string, any>>;
    __clear: () => void;
    collection: (name: string) => any;
  };
}

/**
 * Build a GET request to /api/get-order with an optional orderId query param
 * and optional Bearer token.
 */
function buildGetOrderRequest(orderId: string | null, token?: string): Request {
  const url = new URL(API_URLS.GET_ORDER);
  if (orderId !== null) {
    url.searchParams.set('orderId', orderId);
  }

  const builder = buildRequest(url.toString(), 'GET');
  if (token) {
    builder.withAuth(token);
  }
  return builder.build();
}

// Stable order IDs used across tests
const USER_ORDER_ID = 'order-user-001';
const OTHER_ORDER_ID = 'order-other-001';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  const db = getMockDb();
  db.__clear();

  // Seed one order for the primary user
  seedOrder(db, USER_ORDER_ID, { userId: USERS.USER.uid });

  // Seed one order for a different user (used in IDOR tests)
  seedOrder(db, OTHER_ORDER_ID, { userId: USERS.OTHER.uid });
});

// ---------------------------------------------------------------------------
// Authentication tests
// ---------------------------------------------------------------------------

describe('Authentication enforcement', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const req = buildGetOrderRequest(USER_ORDER_ID);
    const res = await GET({ url: new URL(req.url), request: req } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/unauthorized|authentication/i);
  });

  it('returns 401 when Authorization header is not a Bearer token', async () => {
    const url = new URL(`${API_URLS.GET_ORDER}?orderId=${USER_ORDER_ID}`);
    const req = new Request(url.toString(), {
      method: 'GET',
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });

    const res = await GET({ url, request: req } as any);

    expect(res.status).toBe(401);
  });

  it('returns 401 when the token is expired', async () => {
    const req = buildGetOrderRequest(USER_ORDER_ID, TOKENS.EXPIRED);
    const res = await GET({ url: new URL(req.url), request: req } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized|invalid token/i);
  });

  it('returns 401 when the token is malformed', async () => {
    const req = buildGetOrderRequest(USER_ORDER_ID, TOKENS.MALFORMED);
    const res = await GET({ url: new URL(req.url), request: req } as any);

    expect(res.status).toBe(401);
  });

  it('returns 401 when Bearer token value is an empty string', async () => {
    const url = new URL(`${API_URLS.GET_ORDER}?orderId=${USER_ORDER_ID}`);
    const req = new Request(url.toString(), {
      method: 'GET',
      headers: { Authorization: 'Bearer ' },
    });

    const res = await GET({ url, request: req } as any);

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// IDOR (Insecure Direct Object Reference) tests
// ---------------------------------------------------------------------------

describe('IDOR protection', () => {
  it('returns 404 when a regular user requests another user\'s order', async () => {
    // USER tries to access OTHER's order
    const req = buildGetOrderRequest(OTHER_ORDER_ID, TOKENS.VALID_USER);
    const res = await GET({ url: new URL(req.url), request: req } as any);

    // Must not return 200 — the order exists but does not belong to this user
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it('does NOT leak the existence of another user\'s order (returns 404, not 403)', async () => {
    // Returning 403 would confirm the order exists; 404 is the correct response
    // to prevent enumeration of other users' orders.
    const req = buildGetOrderRequest(OTHER_ORDER_ID, TOKENS.VALID_USER);
    const res = await GET({ url: new URL(req.url), request: req } as any);

    expect(res.status).toBe(404);
  });

  it('returns 404 for a non-existent orderId (authenticated user)', async () => {
    const req = buildGetOrderRequest('order-does-not-exist-xyz', TOKENS.VALID_USER);
    const res = await GET({ url: new URL(req.url), request: req } as any);

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Authorised access tests
// ---------------------------------------------------------------------------

describe('Authorised access', () => {
  it('returns 200 when an authenticated user requests their own order', async () => {
    const req = buildGetOrderRequest(USER_ORDER_ID, TOKENS.VALID_USER);
    const res = await GET({ url: new URL(req.url), request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(USER_ORDER_ID);
  });

  it('returns correct order fields for an authenticated user', async () => {
    const req = buildGetOrderRequest(USER_ORDER_ID, TOKENS.VALID_USER);
    const res = await GET({ url: new URL(req.url), request: req } as any);

    const body = await res.json();
    // Verify the expected public-facing shape
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('shippingInfo');
  });

  it('allows admin to access any user\'s order', async () => {
    // Admin requests ORDER that belongs to OTHER user — should succeed
    const req = buildGetOrderRequest(OTHER_ORDER_ID, TOKENS.VALID_ADMIN);
    const res = await GET({ url: new URL(req.url), request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(OTHER_ORDER_ID);
  });

  it('allows admin to access the primary user\'s order too', async () => {
    const req = buildGetOrderRequest(USER_ORDER_ID, TOKENS.VALID_ADMIN);
    const res = await GET({ url: new URL(req.url), request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(USER_ORDER_ID);
  });
});

// ---------------------------------------------------------------------------
// Query parameter validation tests
// ---------------------------------------------------------------------------

describe('Query parameter validation', () => {
  it('returns 400 when orderId is missing from query params', async () => {
    const req = buildGetOrderRequest(null, TOKENS.VALID_USER);
    const res = await GET({ url: new URL(req.url), request: req } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/order id|required/i);
  });

  it('returns 404 (not 500) when orderId consists only of whitespace', async () => {
    // An orderId that is blank after trimming should never find a real document
    const url = new URL(API_URLS.GET_ORDER);
    url.searchParams.set('orderId', '   ');
    const req = buildRequest(url.toString(), 'GET').withAuth(TOKENS.VALID_USER).build();

    const res = await GET({ url, request: req } as any);

    // The handler reads the raw query param; blank IDs won't match any doc
    expect([400, 404]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// Response safety tests
// ---------------------------------------------------------------------------

describe('Response does not expose internal details', () => {
  it('does not include sensitive internal fields in the order response', async () => {
    const req = buildGetOrderRequest(USER_ORDER_ID, TOKENS.VALID_USER);
    const res = await GET({ url: new URL(req.url), request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    const bodyStr = JSON.stringify(body);

    // These fields must never appear in the client-facing response
    expect(body).not.toHaveProperty('orderAccessTokenHash');
    expect(body).not.toHaveProperty('paymentIntentId');
    expect(body).not.toHaveProperty('stockReservedItems');

    // Must not leak environment variables, stack traces, or internal paths
    for (const pattern of FORBIDDEN_ERROR_PATTERNS) {
      expect(bodyStr).not.toMatch(pattern);
    }
  });

  it('includes cache-control headers to prevent caching of sensitive data', async () => {
    const req = buildGetOrderRequest(USER_ORDER_ID, TOKENS.VALID_USER);
    const res = await GET({ url: new URL(req.url), request: req } as any);

    expect(res.status).toBe(200);
    const cacheControl = res.headers.get('Cache-Control');
    // Must explicitly prohibit caching for order data
    expect(cacheControl).toMatch(/no-store/i);
  });
});
