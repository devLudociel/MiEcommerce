/**
 * Security integration tests for GET /api/get-wallet-balance
 *
 * Covers:
 * - AUTH-1: 401 when no Authorization header is present
 * - AUTH-2: 401 when token is invalid or expired
 * - IDOR-1: Authenticated user can access their own wallet balance (200)
 * - IDOR-2: Regular user cannot access another user's wallet (403)
 * - IDOR-3: Admin can access any user's wallet balance (200)
 * - BALANCE-1: Returns balance of 0 for a non-existent wallet (auto-creates)
 * - BALANCE-2: Returns the correct balance from a seeded wallet document
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

import { GET } from '../../../src/pages/api/get-wallet-balance';
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

function buildUrl(userId?: string): string {
  const url = new URL(API_URLS.GET_WALLET_BALANCE);
  if (userId !== undefined) {
    url.searchParams.set('userId', userId);
  }
  return url.toString();
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
    const req = new Request(API_URLS.GET_WALLET_BALANCE, { method: 'GET' });

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('AUTH-2: returns 401 when the token is invalid', async () => {
    const req = buildAuthenticatedGet(API_URLS.GET_WALLET_BALANCE, TOKENS.MALFORMED);

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('AUTH-2 (expired): returns 401 when the token is expired', async () => {
    const req = buildAuthenticatedGet(API_URLS.GET_WALLET_BALANCE, TOKENS.EXPIRED);

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
  it('IDOR-1: returns 200 and the balance when a user requests their own wallet', async () => {
    // Seed a wallet for the primary user
    getMockDb().data['wallets'][USERS.USER.uid] = {
      balance: 25.00,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const req = buildAuthenticatedGet(
      buildUrl(USERS.USER.uid),
      TOKENS.VALID_USER,
    );

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('balance', 25.00);
  });

  it('IDOR-2: returns 403 when a regular user requests another user\'s wallet', async () => {
    // Seed a wallet for OTHER user that USER must not be able to see
    getMockDb().data['wallets'][USERS.OTHER.uid] = {
      balance: 100.00,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // USER requests OTHER's wallet via ?userId=
    const req = buildAuthenticatedGet(
      buildUrl(USERS.OTHER.uid),
      TOKENS.VALID_USER,
    );

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('IDOR-3: returns 200 when an admin requests another user\'s wallet', async () => {
    // Seed a wallet for the primary user
    getMockDb().data['wallets'][USERS.USER.uid] = {
      balance: 75.50,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Admin requests USER's wallet via ?userId=
    const req = buildAuthenticatedGet(
      buildUrl(USERS.USER.uid),
      TOKENS.VALID_ADMIN,
    );

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('balance', 75.50);
  });
});

// ---------------------------------------------------------------------------
// BALANCE — Wallet balance accuracy
// ---------------------------------------------------------------------------

describe('Balance accuracy', () => {
  it('BALANCE-1: returns balance of 0 for a non-existent wallet and auto-creates it', async () => {
    // No wallet seeded for USERS.USER
    const req = buildAuthenticatedGet(
      buildUrl(USERS.USER.uid),
      TOKENS.VALID_USER,
    );

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('balance', 0);

    // The endpoint should have auto-created the wallet document
    const createdWallet = getMockDb().data['wallets'][USERS.USER.uid];
    expect(createdWallet).toBeDefined();
    expect(createdWallet.balance).toBe(0);
  });

  it('BALANCE-2: returns the correct balance from a seeded wallet', async () => {
    const expectedBalance = 42.50;

    getMockDb().data['wallets'][USERS.USER.uid] = {
      balance: expectedBalance,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const req = buildAuthenticatedGet(
      buildUrl(USERS.USER.uid),
      TOKENS.VALID_USER,
    );

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('balance', expectedBalance);
  });

  it('BALANCE-2 (default uid): returns own balance when no userId query param is provided', async () => {
    const expectedBalance = 15.75;

    getMockDb().data['wallets'][USERS.USER.uid] = {
      balance: expectedBalance,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // No ?userId param — endpoint must default to token's uid
    const req = buildAuthenticatedGet(API_URLS.GET_WALLET_BALANCE, TOKENS.VALID_USER);

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('balance', expectedBalance);
  });
});
