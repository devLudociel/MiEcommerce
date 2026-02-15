/**
 * Security integration tests for POST /api/share/create
 *
 * Covers:
 * - Input validation via Zod schema (missing productId, missing productName)
 * - Successful share creation returns shareId
 * - Share document is persisted to Firestore shared_designs collection
 * - Rate limiting (STANDARD: 60 req/min)
 *
 * This is a public endpoint — no authentication or CSRF token is required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFirebase } from '../../helpers/mock-firebase';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports of the mocked modules
// ---------------------------------------------------------------------------

const __firebase = createMockFirebase();

vi.mock('../../../src/lib/firebase-admin', () => ({
  getAdminDb: () => __firebase.db,
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => new Date(),
    increment: (n: number) => ({ __inc: n }),
  },
}));

vi.mock('../../../src/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('nanoid', () => ({
  customAlphabet: () => () => 'test1234',
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { POST } from '../../../src/pages/api/share/create';
import { resetRateLimits } from '../../helpers/rate-limit-reset';
import { buildRequest, buildUnauthenticatedPost } from '../../helpers/request-builder';
import { API_URLS } from '../../helpers/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid payload for share creation. */
const VALID_SHARE_PAYLOAD = {
  productId: 'product-abc',
  productName: 'Custom T-Shirt',
  designData: { color: 'red', size: 'M', text: 'Hello World' },
} as const;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();

  // Reset Firestore in-memory state and initialize shared_designs collection
  __firebase.db.__clear();
  __firebase.db.data['shared_designs'] = {};
});

// ---------------------------------------------------------------------------
// INPUT-1: Missing productId
// ---------------------------------------------------------------------------

describe('Input validation', () => {
  it('INPUT-1: returns 400 for missing productId', async () => {
    const req = buildUnauthenticatedPost(API_URLS.SHARE_CREATE, {
      // productId intentionally omitted
      productName: 'Custom T-Shirt',
      designData: { color: 'blue' },
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('INPUT-2: returns 400 for missing productName', async () => {
    const req = buildUnauthenticatedPost(API_URLS.SHARE_CREATE, {
      productId: 'product-abc',
      // productName intentionally omitted
      designData: { color: 'blue' },
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('INPUT-1b: returns 400 for empty productId string', async () => {
    const req = buildUnauthenticatedPost(API_URLS.SHARE_CREATE, {
      productId: '',
      productName: 'Custom T-Shirt',
      designData: { color: 'blue' },
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
  });

  it('INPUT-2b: returns 400 for empty productName string', async () => {
    const req = buildUnauthenticatedPost(API_URLS.SHARE_CREATE, {
      productId: 'product-abc',
      productName: '',
      designData: { color: 'blue' },
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// CREATE-1: Successful share creation
// ---------------------------------------------------------------------------

describe('Share creation', () => {
  it('CREATE-1: returns shareId on successful share creation (200)', async () => {
    const req = buildUnauthenticatedPost(API_URLS.SHARE_CREATE, VALID_SHARE_PAYLOAD);

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('shareId');
    expect(typeof body.shareId).toBe('string');
    expect(body.shareId.length).toBeGreaterThan(0);
  });

  it('CREATE-1b: returned shareId matches the mocked nanoid value', async () => {
    const req = buildUnauthenticatedPost(API_URLS.SHARE_CREATE, VALID_SHARE_PAYLOAD);

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    // nanoid is mocked to always return 'test1234'
    expect(body.shareId).toBe('test1234');
  });

  it('CREATE-2: saves the shared design document to Firestore', async () => {
    const req = buildUnauthenticatedPost(API_URLS.SHARE_CREATE, VALID_SHARE_PAYLOAD);

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);

    // The document should have been written to the shared_designs collection
    // using the shareId returned by nanoid ('test1234')
    const savedDoc = __firebase.db.data['shared_designs']['test1234'];
    expect(savedDoc).toBeDefined();
    expect(savedDoc.productId).toBe(VALID_SHARE_PAYLOAD.productId);
    expect(savedDoc.productName).toBe(VALID_SHARE_PAYLOAD.productName);
    expect(savedDoc.designData).toEqual(VALID_SHARE_PAYLOAD.designData);
  });

  it('CREATE-2b: saved document contains expected metadata fields', async () => {
    const req = buildUnauthenticatedPost(API_URLS.SHARE_CREATE, VALID_SHARE_PAYLOAD);

    await POST({ request: req } as any);

    const savedDoc = __firebase.db.data['shared_designs']['test1234'];
    expect(savedDoc).toBeDefined();

    // Verify the share document contains analytics counters initialized to 0
    expect(savedDoc.shareCount).toBe(0);
    expect(savedDoc.viewCount).toBe(0);
    expect(savedDoc.clickCount).toBe(0);
    expect(savedDoc.conversionCount).toBe(0);

    // Verify platform counters are present
    expect(savedDoc.platform).toBeDefined();
    expect(savedDoc.platform.whatsapp).toBe(0);
    expect(savedDoc.platform.facebook).toBe(0);

    // Verify expiration date is set
    expect(savedDoc.expiresAt).toBeDefined();
  });

  it('CREATE-1c: accepts optional previewImage URL and stores it', async () => {
    const payload = {
      ...VALID_SHARE_PAYLOAD,
      previewImage: 'https://example.com/preview.png',
    };

    const req = buildUnauthenticatedPost(API_URLS.SHARE_CREATE, payload);

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const savedDoc = __firebase.db.data['shared_designs']['test1234'];
    expect(savedDoc).toBeDefined();
    // Public URL should be stored in imageUrl (not redacted as private path)
    expect(savedDoc.imageUrl).toBe('https://example.com/preview.png');
  });
});

// ---------------------------------------------------------------------------
// RATE-1: Rate limiting (STANDARD — 60 req/min)
// ---------------------------------------------------------------------------

describe('Rate limiting (STANDARD — 60 req/min)', () => {
  it('RATE-1: blocks the 61st request from the same IP with 429', async () => {
    const ip = '10.2.2.2';

    // Send 60 requests — all should pass the rate-limit gate
    for (let i = 0; i < 60; i++) {
      // Reset the shared_designs collection to avoid duplicate key issues
      // The nanoid mock always returns 'test1234', so we clear between calls
      __firebase.db.data['shared_designs'] = {};

      const req = buildRequest(API_URLS.SHARE_CREATE, 'POST')
        .withIP(ip)
        .withCSRF()
        .withBody(VALID_SHARE_PAYLOAD)
        .build();
      const res = await POST({ request: req } as any);
      expect(res.status).not.toBe(429);
    }

    // The 61st request must be rate-limited
    const req61 = buildRequest(API_URLS.SHARE_CREATE, 'POST')
      .withIP(ip)
      .withCSRF()
      .withBody(VALID_SHARE_PAYLOAD)
      .build();

    const res61 = await POST({ request: req61 } as any);
    expect(res61.status).toBe(429);

    const body = await res61.json();
    expect(body).toHaveProperty('error');
  });
});
