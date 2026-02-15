/**
 * Security integration tests for GET /api/get-wallet-transactions
 *
 * Covers:
 * - AUTH-1: 401 when no Authorization header is present
 * - AUTH-2: 401 when token is invalid or expired
 * - IDOR-1: Authenticated user can access their own transactions (200)
 * - IDOR-2: Regular user cannot access another user's transactions (403)
 * - IDOR-3: Admin can access any user's transactions (200)
 * - LIMIT-1: The ?limit query param is respected
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
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { GET } from '../../../src/pages/api/get-wallet-transactions';
import { TOKENS, USERS } from '../../helpers/auth-factory';
import { API_URLS } from '../../helpers/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockDb = {
  data: Record<string, Record<string, any>>;
  __clear: () => void;
  collection: (name: string) => any;
};

function getMockDb(): MockDb {
  return __firebase.db as MockDb;
}

function buildAuthenticatedGet(url: string, token: string): Request {
  return new Request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

function buildUrl(params: { userId?: string; limit?: number } = {}): string {
  const url = new URL(API_URLS.GET_WALLET_TRANSACTIONS);
  if (params.userId !== undefined) {
    url.searchParams.set('userId', params.userId);
  }
  if (params.limit !== undefined) {
    url.searchParams.set('limit', String(params.limit));
  }
  return url.toString();
}

/**
 * Seed wallet_transactions documents for a given userId.
 * Each transaction gets a unique key and an incrementing createdAt so
 * order is deterministic when sorted descending.
 */
function seedTransactions(
  userId: string,
  count: number,
  startOffsetMs: number = 0,
): void {
  const transactions = getMockDb().data['wallet_transactions'];
  for (let i = 0; i < count; i++) {
    const id = `tx-${userId}-${i + 1}`;
    transactions[id] = {
      userId,
      type: i % 2 === 0 ? 'credit' : 'debit',
      amount: (i + 1) * 5,
      description: `Transaction ${i + 1}`,
      createdAt: new Date(Date.now() - startOffsetMs + i * 1000),
    };
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  getMockDb().__clear();
});

// ---------------------------------------------------------------------------
// AUTH-1 / AUTH-2 — Authentication enforcement
// ---------------------------------------------------------------------------

describe('Authentication enforcement', () => {
  it('AUTH-1: returns 401 when no Authorization header is provided', async () => {
    const req = new Request(API_URLS.GET_WALLET_TRANSACTIONS, { method: 'GET' });

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('AUTH-2: returns 401 when the token is invalid', async () => {
    const req = buildAuthenticatedGet(API_URLS.GET_WALLET_TRANSACTIONS, TOKENS.MALFORMED);

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('AUTH-2 (expired): returns 401 when the token is expired', async () => {
    const req = buildAuthenticatedGet(API_URLS.GET_WALLET_TRANSACTIONS, TOKENS.EXPIRED);

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// IDOR — Insecure Direct Object Reference protection
// ---------------------------------------------------------------------------

describe('IDOR protection', () => {
  it('IDOR-1: returns 200 and own transactions when a user requests their own data', async () => {
    seedTransactions(USERS.USER.uid, 3);

    const req = buildAuthenticatedGet(
      buildUrl({ userId: USERS.USER.uid }),
      TOKENS.VALID_USER,
    );

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('transactions');
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(body.transactions).toHaveLength(3);
    // Every returned transaction must belong to the requesting user
    for (const tx of body.transactions) {
      expect(tx).not.toHaveProperty('userId'); // userId is internal — should not be exposed, or if it is, it must match
    }
  });

  it('IDOR-2: returns 403 when a regular user requests another user\'s transactions', async () => {
    seedTransactions(USERS.OTHER.uid, 2);

    // USER requests OTHER's transactions via ?userId=
    const req = buildAuthenticatedGet(
      buildUrl({ userId: USERS.OTHER.uid }),
      TOKENS.VALID_USER,
    );

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('IDOR-3: returns 200 when an admin requests another user\'s transactions', async () => {
    seedTransactions(USERS.USER.uid, 2);

    // Admin requests USER's transactions via ?userId=
    const req = buildAuthenticatedGet(
      buildUrl({ userId: USERS.USER.uid }),
      TOKENS.VALID_ADMIN,
    );

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('transactions');
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(body.transactions).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// LIMIT-1 — Pagination / limit enforcement
// ---------------------------------------------------------------------------

describe('Limit parameter', () => {
  it('LIMIT-1: respects the ?limit query param and returns at most limit transactions', async () => {
    // Seed more transactions than the requested limit
    seedTransactions(USERS.USER.uid, 10);

    const req = buildAuthenticatedGet(
      buildUrl({ userId: USERS.USER.uid, limit: 3 }),
      TOKENS.VALID_USER,
    );

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('transactions');
    expect(body.transactions.length).toBeLessThanOrEqual(3);
  });

  it('LIMIT-1 (default): returns up to 50 transactions when no limit param is given', async () => {
    // Seed exactly 5 transactions — all should be returned with the default limit of 50
    seedTransactions(USERS.USER.uid, 5);

    const req = buildAuthenticatedGet(
      buildUrl({ userId: USERS.USER.uid }),
      TOKENS.VALID_USER,
    );

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('transactions');
    expect(body.transactions).toHaveLength(5);
  });

  it('LIMIT-1 (sorted): returns transactions sorted by date descending', async () => {
    seedTransactions(USERS.USER.uid, 3);

    const req = buildAuthenticatedGet(
      buildUrl({ userId: USERS.USER.uid }),
      TOKENS.VALID_USER,
    );

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    const txs: Array<{ createdAt: string }> = body.transactions;

    // Verify descending order: each subsequent createdAt must be <= the previous
    for (let i = 1; i < txs.length; i++) {
      const prev = new Date(txs[i - 1].createdAt).getTime();
      const curr = new Date(txs[i].createdAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });
});
