/**
 * Security integration tests for the addresses API endpoints:
 *
 *   GET    /api/addresses          — list authenticated user's addresses
 *   POST   /api/addresses          — create a new address
 *   PUT    /api/addresses/[id]     — update an existing address
 *   DELETE /api/addresses/[id]     — delete an existing address
 *
 * Covers:
 * - 401 when no Authorization header is present (GET, POST)
 * - Authenticated user can only access their own subcollection (IDOR)
 * - POST returns 201 on successful creation
 * - POST rejects bodies that include 'id' or 'userId' fields (400)
 * - PUT returns 404 for a non-existent address
 * - DELETE removes an existing address (200)
 * - DELETE returns 404 for a non-existent address
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
    delete: () => ({ __del: true }),
  },
  Timestamp: {
    fromMillis: (ms: number) => new Date(ms),
  },
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { GET, POST } from '../../../src/pages/api/addresses';
import { PUT, DELETE } from '../../../src/pages/api/addresses/[id]';
import { TOKENS, USERS } from '../../helpers/auth-factory';
import { buildRequest } from '../../helpers/request-builder';
import { API_URLS } from '../../helpers/constants';

// ---------------------------------------------------------------------------
// Typed reference to the mock database
// ---------------------------------------------------------------------------

function getMockDb() {
  return __firebase.db as {
    data: Record<string, Record<string, any>>;
    __clear: () => void;
    collection: (name: string) => any;
  };
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

const ADDR_ID = 'addr-1';
const ADDRESS_FIXTURE = {
  fullName: 'Ana García',
  line1: 'Calle 1',
  city: 'Madrid',
  country: 'ES',
} as const;

function seedAddress(uid: string, id: string, data: Record<string, unknown> = ADDRESS_FIXTURE): void {
  const db = getMockDb();
  const subcollectionKey = `users/${uid}/addresses`;
  db.data[subcollectionKey] = db.data[subcollectionKey] ?? {};
  db.data[subcollectionKey][id] = { ...data };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  getMockDb().__clear();
});

// ---------------------------------------------------------------------------
// AUTH-1: GET returns 401 without auth
// ---------------------------------------------------------------------------

describe('AUTH-1: GET /api/addresses — authentication enforcement', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const req = new Request(API_URLS.ADDRESSES);

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// AUTH-2: POST returns 401 without auth
// ---------------------------------------------------------------------------

describe('AUTH-2: POST /api/addresses — authentication enforcement', () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const req = buildRequest(API_URLS.ADDRESSES, 'POST')
      .withBody({ fullName: 'Test User', line1: 'Street 1', city: 'Madrid', country: 'ES' })
      .build();

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// LIST-1: GET returns only the authenticated user's addresses
// ---------------------------------------------------------------------------

describe('LIST-1: GET /api/addresses — returns authenticated user addresses', () => {
  it('returns 200 with only the authenticated user\'s addresses', async () => {
    seedAddress(USERS.USER.uid, ADDR_ID);
    // Seed a second address for another user — must NOT appear in the response
    seedAddress(USERS.OTHER.uid, 'addr-other-1', { fullName: 'Otro Usuario', line1: 'Otra Calle', city: 'Barcelona', country: 'ES' });

    const req = new Request(API_URLS.ADDRESSES, {
      headers: { Authorization: 'Bearer ' + TOKENS.VALID_USER },
    });

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    // The response must contain the user's own address
    const addresses: Array<{ id: string }> = Array.isArray(body) ? body : (body.addresses ?? []);
    const ids = addresses.map((a) => a.id);
    expect(ids).toContain(ADDR_ID);
    // Must not expose addresses belonging to other users
    expect(ids).not.toContain('addr-other-1');
  });
});

// ---------------------------------------------------------------------------
// IDOR-1: User A cannot see User B's addresses
// ---------------------------------------------------------------------------

describe('IDOR-1: Addresses are scoped to the authenticated user\'s uid', () => {
  it('user A receives an empty list when user B has addresses but user A has none', async () => {
    // Only seed addresses for OTHER user
    seedAddress(USERS.OTHER.uid, 'addr-other-1', { fullName: 'Otro Usuario', line1: 'Otra Calle', city: 'Barcelona', country: 'ES' });

    const req = new Request(API_URLS.ADDRESSES, {
      headers: { Authorization: 'Bearer ' + TOKENS.VALID_USER },
    });

    const res = await GET({ request: req } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    const addresses: Array<unknown> = Array.isArray(body) ? body : (body.addresses ?? []);
    // User A must not see User B's addresses — the list must be empty
    expect(addresses).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CREATE-1: POST creates address successfully (201)
// ---------------------------------------------------------------------------

describe('CREATE-1: POST /api/addresses — successful creation', () => {
  it('returns 201 when a valid address body is submitted', async () => {
    const req = buildRequest(API_URLS.ADDRESSES, 'POST')
      .withAuth(TOKENS.VALID_USER)
      .withBody({ fullName: 'María López', line1: 'Avenida Principal 42', city: 'Sevilla', country: 'ES' })
      .build();

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty('address');
    expect(body.address).toHaveProperty('id');
  });
});

// ---------------------------------------------------------------------------
// CREATE-2: POST rejects body with 'id' field (400)
// ---------------------------------------------------------------------------

describe('CREATE-2: POST /api/addresses — rejects client-controlled id', () => {
  it('returns 400 when the request body includes an "id" field', async () => {
    const req = buildRequest(API_URLS.ADDRESSES, 'POST')
      .withAuth(TOKENS.VALID_USER)
      .withBody({ id: 'custom-id', fullName: 'María López', line1: 'Avenida Principal 42', city: 'Sevilla', country: 'ES' })
      .build();

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// CREATE-3: POST rejects body with 'userId' field (400)
// ---------------------------------------------------------------------------

describe('CREATE-3: POST /api/addresses — rejects client-supplied userId', () => {
  it('returns 400 when the request body includes a "userId" field', async () => {
    const req = buildRequest(API_URLS.ADDRESSES, 'POST')
      .withAuth(TOKENS.VALID_USER)
      .withBody({ userId: 'injected-uid', fullName: 'María López', line1: 'Avenida Principal 42', city: 'Sevilla', country: 'ES' })
      .build();

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// UPDATE-1: PUT returns 404 for non-existent address
// ---------------------------------------------------------------------------

describe('UPDATE-1: PUT /api/addresses/[id] — 404 for non-existent address', () => {
  it('returns 404 when the address does not exist in the user\'s subcollection', async () => {
    // No address seeded — the document must not be found
    const req = buildRequest(API_URLS.ADDRESSES + '/addr-nonexistent', 'PUT')
      .withAuth(TOKENS.VALID_USER)
      .withBody({ fullName: 'Updated Name', line1: 'Nueva Calle 10', city: 'Valencia', country: 'ES' })
      .build();

    const res = await PUT({ params: { id: 'addr-nonexistent' }, request: req } as any);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// DELETE-1: DELETE removes an existing address successfully (200)
// ---------------------------------------------------------------------------

describe('DELETE-1: DELETE /api/addresses/[id] — successful deletion', () => {
  it('returns 200 after deleting an existing address', async () => {
    seedAddress(USERS.USER.uid, ADDR_ID);

    const req = new Request(API_URLS.ADDRESSES + '/' + ADDR_ID, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + TOKENS.VALID_USER },
    });

    const res = await DELETE({ params: { id: ADDR_ID }, request: req } as any);

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// DELETE-2: DELETE returns 404 for non-existent address
// ---------------------------------------------------------------------------

describe('DELETE-2: DELETE /api/addresses/[id] — 404 for non-existent address', () => {
  it('returns 404 when the address does not exist in the user\'s subcollection', async () => {
    const req = new Request(API_URLS.ADDRESSES + '/addr-nonexistent', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + TOKENS.VALID_USER },
    });

    const res = await DELETE({ params: { id: 'addr-nonexistent' }, request: req } as any);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});
