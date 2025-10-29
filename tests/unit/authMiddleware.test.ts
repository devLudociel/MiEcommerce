import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyAuthToken, verifyAdminAuth, verifyOwnerOrAdmin } from '../../src/lib/authMiddleware';

// Mock Firebase Admin
vi.mock('../../src/lib/firebase-admin', () => ({
  getAdminAuth: vi.fn(() => ({
    verifyIdToken: vi.fn(),
  })),
}));

import { getAdminAuth } from '../../src/lib/firebase-admin';

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyAuthToken', () => {
    it('should return error if no authorization header', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
      });

      const result = await verifyAuthToken(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No se proporcionó token');
    });

    it('should return error if authorization header is not Bearer', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          Authorization: 'Basic abc123',
        },
      });

      const result = await verifyAuthToken(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Formato de token inválido');
    });

    it('should return error if token is empty', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ',
        },
      });

      const result = await verifyAuthToken(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token vacío');
    });

    it('should verify valid token successfully', async () => {
      const mockDecodedToken = {
        uid: 'user123',
        email: 'test@example.com',
        admin: false,
      };

      const mockVerifyIdToken = vi.fn().mockResolvedValue(mockDecodedToken);
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token-123',
        },
      });

      const result = await verifyAuthToken(request);

      expect(result.success).toBe(true);
      expect(result.decodedToken).toEqual(mockDecodedToken);
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token-123');
    });

    it('should handle expired token error', async () => {
      const error = new Error('Token expired');
      (error as any).code = 'auth/id-token-expired';

      const mockVerifyIdToken = vi.fn().mockRejectedValue(error);
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer expired-token',
        },
      });

      const result = await verifyAuthToken(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token expirado');
    });

    it('should handle invalid token error', async () => {
      const error = new Error('Invalid token');
      (error as any).code = 'auth/argument-error';

      const mockVerifyIdToken = vi.fn().mockRejectedValue(error);
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      const result = await verifyAuthToken(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Token inválido');
    });

    it('should accept case-insensitive Authorization header', async () => {
      const mockDecodedToken = {
        uid: 'user123',
        email: 'test@example.com',
        admin: false,
      };

      const mockVerifyIdToken = vi.fn().mockResolvedValue(mockDecodedToken);
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token-123', // lowercase
        },
      });

      const result = await verifyAuthToken(request);

      expect(result.success).toBe(true);
      expect(result.decodedToken).toEqual(mockDecodedToken);
    });
  });

  describe('verifyAdminAuth', () => {
    it('should return error if user is not admin', async () => {
      const mockDecodedToken = {
        uid: 'user123',
        email: 'user@example.com',
        admin: false, // Not admin
      };

      const mockVerifyIdToken = vi.fn().mockResolvedValue(mockDecodedToken);
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer user-token',
        },
      });

      const result = await verifyAdminAuth(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permisos de administrador');
    });

    it('should succeed if user is admin', async () => {
      const mockDecodedToken = {
        uid: 'admin123',
        email: 'admin@example.com',
        admin: true, // Is admin
      };

      const mockVerifyIdToken = vi.fn().mockResolvedValue(mockDecodedToken);
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer admin-token',
        },
      });

      const result = await verifyAdminAuth(request);

      expect(result.success).toBe(true);
      expect(result.decodedToken).toEqual(mockDecodedToken);
    });

    it('should handle missing token', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
      });

      const result = await verifyAdminAuth(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyOwnerOrAdmin', () => {
    it('should allow owner to access their own resource', async () => {
      const mockDecodedToken = {
        uid: 'user123',
        email: 'user@example.com',
        admin: false,
      };

      const mockVerifyIdToken = vi.fn().mockResolvedValue(mockDecodedToken);
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer user-token',
        },
      });

      const result = await verifyOwnerOrAdmin(request, 'user123');

      expect(result.success).toBe(true);
      expect(result.decodedToken?.uid).toBe('user123');
    });

    it('should deny non-owner non-admin from accessing resource', async () => {
      const mockDecodedToken = {
        uid: 'user123',
        email: 'user@example.com',
        admin: false,
      };

      const mockVerifyIdToken = vi.fn().mockResolvedValue(mockDecodedToken);
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer user-token',
        },
      });

      const result = await verifyOwnerOrAdmin(request, 'other-user-456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No tiene permisos');
    });

    it('should allow admin to access any resource', async () => {
      const mockDecodedToken = {
        uid: 'admin123',
        email: 'admin@example.com',
        admin: true,
      };

      const mockVerifyIdToken = vi.fn().mockResolvedValue(mockDecodedToken);
      vi.mocked(getAdminAuth).mockReturnValue({
        verifyIdToken: mockVerifyIdToken,
      } as any);

      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer admin-token',
        },
      });

      const result = await verifyOwnerOrAdmin(request, 'any-user-id');

      expect(result.success).toBe(true);
      expect(result.decodedToken?.admin).toBe(true);
    });
  });
});
