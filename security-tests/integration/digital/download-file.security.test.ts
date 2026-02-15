/**
 * Security integration tests for POST /api/digital/download-file
 *
 * Covers:
 * - AUTH-1: 401 when no Authorization header is present
 * - INPUT-1: 400 when digitalAccessId is missing
 * - INPUT-2: 400 when fileId is missing
 * - IDOR-1: 403 when accessing another user's digital access record
 * - TRAVERSAL-1: 403 for classic path traversal attempt (../../etc/passwd)
 * - TRAVERSAL-2: 403 for a storage path outside the allowed prefixes
 * - ACCESS-1: 200 with file content for a valid, authorised request
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockFirebase } from '../../helpers/mock-firebase';

// ---------------------------------------------------------------------------
// Module mocks — vi.mock factories are hoisted; all references must be lazy
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

vi.mock('../../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({
    bucket: () => ({
      file: (_path: string) => ({
        download: vi.fn(async () => [Buffer.from('fake-file-content')]),
      }),
    }),
  }),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { POST } from '../../../src/pages/api/digital/download-file';
import { TOKENS, USERS } from '../../helpers/auth-factory';
import { API_URLS } from '../../helpers/constants';
import { buildAuthenticatedPost, buildRequest } from '../../helpers/request-builder';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockDb = ReturnType<typeof createMockFirebase>['db'];

function getMockDb(): MockDb {
  return __firebase.db;
}

/** Seed the digital_access collection with a canonical record for USERS.USER */
function seedDigitalAccess(db: MockDb): void {
  db.data['digital_access'] = {};
  db.data['digital_access']['da-1'] = {
    userId: USERS.USER.uid,
    files: [
      {
        id: 'file-1',
        name: 'ebook.pdf',
        storagePath: 'digital-products/ebook.pdf',
        fileType: 'application/pdf',
      },
    ],
  };
  // A second record owned by OTHER user — used for IDOR tests
  db.data['digital_access']['da-other'] = {
    userId: USERS.OTHER.uid,
    files: [
      {
        id: 'file-other',
        name: 'other.pdf',
        storagePath: 'digital-products/other.pdf',
        fileType: 'application/pdf',
      },
    ],
  };
}

/** Minimal valid body for download-file */
const VALID_BODY = { digitalAccessId: 'da-1', fileId: 'file-1' };

function postRequest(token: string, body: unknown): Request {
  return buildAuthenticatedPost(API_URLS.DIGITAL_DOWNLOAD_FILE, token, body);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  const db = getMockDb();
  db.__clear();
  seedDigitalAccess(db);
});

// ---------------------------------------------------------------------------
// Authentication tests
// ---------------------------------------------------------------------------

describe('AUTH — authentication enforcement', () => {
  it('AUTH-1: returns 401 when no Authorization header is present', async () => {
    const req = buildRequest(API_URLS.DIGITAL_DOWNLOAD_FILE, 'POST')
      .withCSRF()
      .withBody(VALID_BODY)
      .build();

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Input validation tests
// ---------------------------------------------------------------------------

describe('INPUT — request body validation', () => {
  it('INPUT-1: returns 400 when digitalAccessId is missing from the body', async () => {
    const req = postRequest(TOKENS.VALID_USER, { fileId: 'file-1' });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('INPUT-2: returns 400 when fileId is missing from the body', async () => {
    const req = postRequest(TOKENS.VALID_USER, { digitalAccessId: 'da-1' });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// IDOR tests
// ---------------------------------------------------------------------------

describe('IDOR — insecure direct object reference protection', () => {
  it('IDOR-1: returns 403 when a user attempts to access another user\'s digital access record', async () => {
    // USERS.USER tries to download a file from da-other (owned by USERS.OTHER)
    const req = postRequest(TOKENS.VALID_USER, {
      digitalAccessId: 'da-other',
      fileId: 'file-other',
    });

    const res = await POST({ request: req } as any);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Path traversal tests
// ---------------------------------------------------------------------------

describe('TRAVERSAL — path traversal protection', () => {
  it('TRAVERSAL-1: returns 403 for a storagePath containing path traversal sequences', async () => {
    // Inject a malicious storagePath directly into the seeded access record
    getMockDb().data['digital_access']['da-1'].files = [
      {
        id: 'file-1',
        name: 'malicious',
        storagePath: '../../etc/passwd',
        fileType: 'text/plain',
      },
    ];

    const req = postRequest(TOKENS.VALID_USER, VALID_BODY);
    const res = await POST({ request: req } as any);

    // After stripping '..' the path becomes 'etc/passwd' which is outside ALLOWED_PREFIXES
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  it('TRAVERSAL-2: returns 403 for a storagePath that is outside the allowed prefixes', async () => {
    getMockDb().data['digital_access']['da-1'].files = [
      {
        id: 'file-1',
        name: 'secret',
        storagePath: 'private/internal/secret.key',
        fileType: 'application/octet-stream',
      },
    ];

    const req = postRequest(TOKENS.VALID_USER, VALID_BODY);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// Authorised access tests
// ---------------------------------------------------------------------------

describe('ACCESS — authorised file download', () => {
  it('ACCESS-1: returns 200 with file content for a valid, authorised request', async () => {
    const req = postRequest(TOKENS.VALID_USER, VALID_BODY);
    const res = await POST({ request: req } as any);

    expect(res.status).toBe(200);

    // The response body must contain the mocked file bytes
    const buffer = await res.arrayBuffer();
    expect(Buffer.from(buffer).toString()).toBe('fake-file-content');

    // Content-Disposition must be set and reference the filename
    const disposition = res.headers.get('Content-Disposition');
    expect(disposition).toMatch(/attachment/i);
    expect(disposition).toContain('ebook.pdf');

    // Content-Type must match the file's MIME type
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });
});
