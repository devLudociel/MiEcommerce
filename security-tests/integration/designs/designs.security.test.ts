/**
 * Security integration tests for designs API endpoints:
 * - POST /api/designs/save
 * - GET /api/designs/get-user-designs
 *
 * Covers:
 * - Authentication enforcement (401 without Bearer token)
 * - Input validation via Zod schema
 * - userId integrity (set from token, not from request body)
 * - IDOR protection (users can only access their own designs)
 * - CSRF protection on mutating endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFirebase } from '../../helpers/mock-firebase';

// ---------------------------------------------------------------------------
// Module mocks — vi.mock calls are hoisted; instance must be created outside
// ---------------------------------------------------------------------------

const __firebase = createMockFirebase();

vi.mock('../../../src/lib/firebase-admin', () => ({
  getAdminDb: () => __firebase.db,
  getAdminAuth: () => __firebase.auth,
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => new Date(), increment: (n: number) => ({ __inc: n }) },
  Timestamp: { fromMillis: (ms: number) => new Date(ms) },
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

import { POST as SAVE_POST } from '../../../src/pages/api/designs/save';
import { GET as GET_DESIGNS } from '../../../src/pages/api/designs/get-user-designs';
import { validateCSRF } from '../../../src/lib/csrf';
import { resetRateLimits } from '../../helpers/rate-limit-reset';
import { TOKENS, USERS } from '../../helpers/auth-factory';
import { buildAuthenticatedPost, buildRequest } from '../../helpers/request-builder';
import { API_URLS } from '../../helpers/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid payload for POST /api/designs/save */
function buildValidDesignPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'My Test Design',
    productId: 'product-123',
    productName: 'Custom T-Shirt',
    categoryId: 'cat-shirts',
    designData: { layers: [], canvas: { width: 400, height: 400 } },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();

  // Re-enable CSRF validation by default; individual tests may override
  vi.mocked(validateCSRF).mockReturnValue({ valid: true });

  // Reset the in-memory DB and ensure the required collection exists
  __firebase.db.__clear();
  __firebase.db.data['saved_designs'] = {};
});

// ---------------------------------------------------------------------------
// Authentication tests
// ---------------------------------------------------------------------------

describe('Authentication', () => {
  it('AUTH-1: POST /designs/save returns 401 without auth token', async () => {
    const req = buildRequest(API_URLS.DESIGNS_SAVE, 'POST')
      .withCSRF()
      .withBody(buildValidDesignPayload())
      .build();

    const res = await SAVE_POST({ request: req } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('AUTH-2: GET /designs/get-user-designs returns 401 without auth token', async () => {
    const req = new Request(API_URLS.DESIGNS_GET);

    const res = await GET_DESIGNS({ request: req } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------

describe('Input validation', () => {
  it('INPUT-1: POST /designs/save returns 400 for invalid or missing required fields', async () => {
    const invalidPayloads = [
      // Empty body
      {},
      // Missing name
      { productId: 'p1', productName: 'Shirt', categoryId: 'cat-1', designData: {} },
      // name too short (empty string, min is 1)
      { name: '', productId: 'p1', productName: 'Shirt', categoryId: 'cat-1', designData: {} },
      // name too long (over 100 chars)
      { name: 'x'.repeat(101), productId: 'p1', productName: 'Shirt', categoryId: 'cat-1', designData: {} },
      // Missing productId
      { name: 'Design A', productName: 'Shirt', categoryId: 'cat-1', designData: {} },
      // Missing productName
      { name: 'Design A', productId: 'p1', categoryId: 'cat-1', designData: {} },
      // Missing categoryId
      { name: 'Design A', productId: 'p1', productName: 'Shirt', designData: {} },
      // NOTE: Missing designData is valid because schema uses z.any() which accepts undefined
      // previewImage present but not a valid URL
      {
        name: 'Design A',
        productId: 'p1',
        productName: 'Shirt',
        categoryId: 'cat-1',
        designData: {},
        previewImage: 'not-a-url',
      },
    ];

    for (const payload of invalidPayloads) {
      const req = buildAuthenticatedPost(API_URLS.DESIGNS_SAVE, TOKENS.VALID_USER, payload);
      const res = await SAVE_POST({ request: req } as any);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty('error');
    }
  });
});

// ---------------------------------------------------------------------------
// Save design tests
// ---------------------------------------------------------------------------

describe('Save design', () => {
  it('SAVE-1: POST /designs/save sets userId from the auth token, not from the request body', async () => {
    const ATTACKER_FAKE_UID = 'injected-fake-uid';
    const payload = buildValidDesignPayload({ userId: ATTACKER_FAKE_UID });

    const req = buildAuthenticatedPost(API_URLS.DESIGNS_SAVE, TOKENS.VALID_USER, payload);
    const res = await SAVE_POST({ request: req } as any);

    expect(res.status).toBe(200);

    // Inspect what was persisted in saved_designs
    const savedDocs = Object.values(__firebase.db.data['saved_designs'] ?? {});
    expect(savedDocs.length).toBeGreaterThan(0);

    const savedDoc = savedDocs[0] as Record<string, unknown>;
    expect(savedDoc['userId']).toBe(USERS.USER.uid);
    expect(savedDoc['userId']).not.toBe(ATTACKER_FAKE_UID);
  });

  it('SAVE-2: POST /designs/save returns designId on success', async () => {
    const payload = buildValidDesignPayload({
      previewImage: 'https://cdn.example.com/preview.png',
      tags: ['summer', 'custom'],
    });

    const req = buildAuthenticatedPost(API_URLS.DESIGNS_SAVE, TOKENS.VALID_USER, payload);
    const res = await SAVE_POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('designId');
    expect(typeof body.designId).toBe('string');
    expect(body.designId.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// IDOR tests
// ---------------------------------------------------------------------------

describe('IDOR protection', () => {
  it('IDOR-1: GET /designs/get-user-designs returns only designs belonging to the authenticated user', async () => {
    // Seed designs owned by different users
    __firebase.db.data['saved_designs'] = {
      d1: { userId: USERS.USER.uid, name: 'Design A', createdAt: new Date() },
      d2: { userId: USERS.OTHER.uid, name: 'Design B', createdAt: new Date() },
    };

    const req = new Request(API_URLS.DESIGNS_GET, {
      headers: { Authorization: `Bearer ${TOKENS.VALID_USER}` },
    });

    const res = await GET_DESIGNS({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('designs');
    expect(Array.isArray(body.designs)).toBe(true);

    // Every returned design must belong to the requesting user
    for (const design of body.designs as Array<Record<string, unknown>>) {
      expect(design['userId']).toBe(USERS.USER.uid);
    }

    // Design B (owned by OTHER user) must not appear
    const names = (body.designs as Array<Record<string, unknown>>).map((d) => d['name']);
    expect(names).not.toContain('Design B');
  });

  it('IDOR-2: User A cannot see User B\'s designs', async () => {
    // Seed designs owned exclusively by OTHER user
    __firebase.db.data['saved_designs'] = {
      d1: { userId: USERS.OTHER.uid, name: 'User B Private Design', createdAt: new Date() },
      d2: { userId: USERS.OTHER.uid, name: 'Another B Design', createdAt: new Date() },
    };

    // Authenticate as VALID_USER (User A), who owns none of the seeded designs
    const req = new Request(API_URLS.DESIGNS_GET, {
      headers: { Authorization: `Bearer ${TOKENS.VALID_USER}` },
    });

    const res = await GET_DESIGNS({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('designs');

    // User A must receive an empty list — they own no designs
    expect((body.designs as unknown[]).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CSRF protection tests
// ---------------------------------------------------------------------------

describe('CSRF protection', () => {
  it('CSRF-1: POST /designs/save rejects requests that fail CSRF validation (403)', async () => {
    vi.mocked(validateCSRF).mockReturnValueOnce({ valid: false, reason: 'origin mismatch' } as any);

    const req = buildRequest(API_URLS.DESIGNS_SAVE, 'POST')
      .withAuth(TOKENS.VALID_USER)
      .withInvalidOrigin('https://evil.com')
      .withBody(buildValidDesignPayload())
      .build();

    const res = await SAVE_POST({ request: req } as any);

    expect(validateCSRF).toHaveBeenCalledOnce();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});
