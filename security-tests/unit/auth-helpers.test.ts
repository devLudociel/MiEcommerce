/**
 * Auth Helpers Unit Tests
 * Tests: src/lib/auth/authHelpers.ts
 *
 * Validates authentication and authorization flows
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOKEN_MAP, TOKENS, USERS } from '../helpers/auth-factory';

// Mock firebase-admin with our auth factory
vi.mock('../../src/lib/firebase-admin', () => ({
  getAdminAuth: () => ({
    verifyIdToken: async (token: string) => {
      const user = TOKEN_MAP[token];
      if (!user) {
        throw new Error('Firebase ID token has been revoked or is invalid');
      }
      return {
        uid: user.uid,
        email: user.email,
        admin: user.admin,
      };
    },
  }),
}));

// Import after mocking
import { verifyAuthToken, verifyAdminAuth } from '../../src/lib/auth/authHelpers';

describe('Auth Helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('verifyAuthToken', () => {
    it('returns 401 when no Authorization header is present', async () => {
      const req = new Request('http://localhost:4321/api/test', {
        method: 'POST',
      });
      const result = await verifyAuthToken(req);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.status).toBe(401);
    });

    it('returns 401 when Authorization header lacks Bearer prefix', async () => {
      const req = new Request('http://localhost:4321/api/test', {
        method: 'POST',
        headers: { Authorization: 'Basic abc123' },
      });
      const result = await verifyAuthToken(req);
      expect(result.success).toBe(false);
      expect(result.error!.status).toBe(401);
    });

    it('returns 401 when token is empty string', async () => {
      const req = new Request('http://localhost:4321/api/test', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' },
      });
      const result = await verifyAuthToken(req);
      expect(result.success).toBe(false);
      expect(result.error!.status).toBe(401);
    });

    it('returns 401 when token is invalid/expired', async () => {
      const req = new Request('http://localhost:4321/api/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKENS.EXPIRED}` },
      });
      const result = await verifyAuthToken(req);
      expect(result.success).toBe(false);
      expect(result.error!.status).toBe(401);
    });

    it('returns 401 when token is malformed', async () => {
      const req = new Request('http://localhost:4321/api/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKENS.MALFORMED}` },
      });
      const result = await verifyAuthToken(req);
      expect(result.success).toBe(false);
      expect(result.error!.status).toBe(401);
    });

    it('returns success with uid, email, isAdmin for valid user token', async () => {
      const req = new Request('http://localhost:4321/api/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKENS.VALID_USER}` },
      });
      const result = await verifyAuthToken(req);
      expect(result.success).toBe(true);
      expect(result.uid).toBe(USERS.USER.uid);
      expect(result.email).toBe(USERS.USER.email);
      expect(result.isAdmin).toBe(false);
    });

    it('returns success with isAdmin=true for valid admin token', async () => {
      const req = new Request('http://localhost:4321/api/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKENS.VALID_ADMIN}` },
      });
      const result = await verifyAuthToken(req);
      expect(result.success).toBe(true);
      expect(result.uid).toBe(USERS.ADMIN.uid);
      expect(result.isAdmin).toBe(true);
    });

    it('error response body does not expose internal details', async () => {
      const req = new Request('http://localhost:4321/api/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKENS.EXPIRED}` },
      });
      const result = await verifyAuthToken(req);
      const body = await result.error!.json();
      expect(body.error).toBeDefined();
      expect(JSON.stringify(body)).not.toContain('stack');
      expect(JSON.stringify(body)).not.toContain('firebase-admin');
    });
  });

  describe('verifyAdminAuth', () => {
    it('returns 401 when no auth header present', async () => {
      const req = new Request('http://localhost:4321/api/admin/test', {
        method: 'POST',
      });
      const result = await verifyAdminAuth(req);
      expect(result.success).toBe(false);
      expect(result.error!.status).toBe(401);
    });

    it('returns 403 when authenticated user is not admin', async () => {
      const req = new Request('http://localhost:4321/api/admin/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKENS.VALID_USER}` },
      });
      const result = await verifyAdminAuth(req);
      expect(result.success).toBe(false);
      expect(result.error!.status).toBe(403);
    });

    it('returns success when user has admin custom claim', async () => {
      const req = new Request('http://localhost:4321/api/admin/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKENS.VALID_ADMIN}` },
      });
      const result = await verifyAdminAuth(req);
      expect(result.success).toBe(true);
      expect(result.isAdmin).toBe(true);
    });

    it('403 error message does not expose admin list', async () => {
      const req = new Request('http://localhost:4321/api/admin/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKENS.VALID_USER}` },
      });
      const result = await verifyAdminAuth(req);
      const body = await result.error!.json();
      expect(JSON.stringify(body)).not.toContain('admin@test.com');
      expect(JSON.stringify(body)).not.toContain('ADMIN_EMAILS');
    });
  });
});
