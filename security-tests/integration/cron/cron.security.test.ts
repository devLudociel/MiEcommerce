/**
 * Security integration tests for GET /api/cron/cleanup-reservations
 * and its POST alias.
 *
 * Covers:
 * - AUTH-1: 401 when the Authorization header is absent
 * - AUTH-2: 401 when the Authorization header carries the wrong secret
 * - AUTH-3: 200 when the correct CRON_SECRET is supplied
 * - POST-1: POST delegates to the same handler and returns 200 with the correct secret
 *
 * The CRON_SECRET value is defined in vitest.security.config.ts as
 * `import.meta.env.CRON_SECRET === 'test-cron-secret'`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFirebase } from '../../helpers/mock-firebase';

// ---------------------------------------------------------------------------
// Module mocks — vi.mock factories are hoisted; all references must be lazy
// ---------------------------------------------------------------------------

const __firebase = createMockFirebase();

vi.mock('../../../src/lib/firebase-admin', () => ({
  getAdminDb: () => __firebase.db,
}));

vi.mock('../../../src/lib/orders/stock', () => ({
  cleanupExpiredReservations: vi.fn(async () => 3),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { GET, POST } from '../../../src/pages/api/cron/cleanup-reservations';
import { cleanupExpiredReservations } from '../../../src/lib/orders/stock';
import { API_URLS } from '../../helpers/constants';
import { buildRequest } from '../../helpers/request-builder';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Must match the value defined in vitest.security.config.ts `define` block:
 *   'import.meta.env.CRON_SECRET': JSON.stringify('test-cron-secret')
 */
const CORRECT_SECRET = 'test-cron-secret';
const WRONG_SECRET = 'wrong-secret-xyz';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCronGet(authorizationHeader?: string): Request {
  const builder = buildRequest(API_URLS.CRON_CLEANUP, 'GET');
  if (authorizationHeader !== undefined) {
    builder.withHeader('authorization', authorizationHeader);
  }
  return builder.build();
}

function buildCronPost(authorizationHeader?: string): Request {
  const builder = buildRequest(API_URLS.CRON_CLEANUP, 'POST');
  if (authorizationHeader !== undefined) {
    builder.withHeader('authorization', authorizationHeader);
  }
  return builder.build();
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  __firebase.db.__clear();
});

// ---------------------------------------------------------------------------
// Authentication tests
// ---------------------------------------------------------------------------

describe('AUTH — cron secret enforcement', () => {
  it('AUTH-1: returns 401 when no Authorization header is present', async () => {
    const req = buildCronGet();

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    // cleanupExpiredReservations must NOT have been called
    expect(cleanupExpiredReservations).not.toHaveBeenCalled();
  });

  it('AUTH-2: returns 401 when the Authorization header carries the wrong secret', async () => {
    const req = buildCronGet(`Bearer ${WRONG_SECRET}`);

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(cleanupExpiredReservations).not.toHaveBeenCalled();
  });

  it('AUTH-3: returns 200 and processes reservations when the correct CRON_SECRET is supplied', async () => {
    const req = buildCronGet(`Bearer ${CORRECT_SECRET}`);

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    // The mock returns 3 as the processed count
    expect(body).toHaveProperty('processed', 3);
    expect(cleanupExpiredReservations).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// POST alias tests
// ---------------------------------------------------------------------------

describe('POST — delegates to GET handler', () => {
  it('POST-1: returns 200 via POST with the correct CRON_SECRET', async () => {
    const req = buildCronPost(`Bearer ${CORRECT_SECRET}`);

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('processed', 3);
    expect(cleanupExpiredReservations).toHaveBeenCalledOnce();
  });
});
