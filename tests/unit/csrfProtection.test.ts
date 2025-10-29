/**
 * Tests para CSRF Protection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateCsrfToken,
  generateCsrfToken,
  csrfErrorResponse,
} from '../../src/lib/csrfProtection';

describe('csrfProtection', () => {
  describe('generateCsrfToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('validateCsrfToken', () => {
    describe('Safe methods (GET, HEAD, OPTIONS)', () => {
      it('should allow GET requests without validation', () => {
        const request = new Request('http://localhost/api/test', { method: 'GET' });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(true);
      });

      it('should allow HEAD requests without validation', () => {
        const request = new Request('http://localhost/api/test', { method: 'HEAD' });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(true);
      });

      it('should allow OPTIONS requests without validation', () => {
        const request = new Request('http://localhost/api/test', { method: 'OPTIONS' });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(true);
      });
    });

    describe('Exempt paths', () => {
      it('should allow webhook without CSRF validation', () => {
        const request = new Request('http://localhost/api/stripe-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(true);
      });
    });

    describe('Same-Origin validation', () => {
      it('should accept POST with matching Origin header', () => {
        const request = new Request('http://localhost:3000/api/save-order', {
          method: 'POST',
          headers: {
            'origin': 'http://localhost:3000',
          },
        });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(true);
      });

      it('should accept POST with matching Referer header', () => {
        const request = new Request('http://localhost:3000/api/save-order', {
          method: 'POST',
          headers: {
            'referer': 'http://localhost:3000/checkout',
          },
        });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(true);
      });

      it('should reject POST with mismatching Origin', () => {
        const request = new Request('http://localhost:3000/api/save-order', {
          method: 'POST',
          headers: {
            'origin': 'http://evil.com',
          },
        });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid origin');
      });

      it('should reject POST with mismatching Referer', () => {
        const request = new Request('http://localhost:3000/api/save-order', {
          method: 'POST',
          headers: {
            'referer': 'http://evil.com/attack',
          },
        });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid referer');
      });

      it('should reject POST without Origin or Referer headers', () => {
        const request = new Request('http://localhost:3000/api/save-order', {
          method: 'POST',
        });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Missing origin/referer');
      });
    });

    describe('CSRF Token validation', () => {
      it('should accept request with matching token and cookie', () => {
        const token = generateCsrfToken();
        const request = new Request('http://localhost:3000/api/save-order', {
          method: 'POST',
          headers: {
            'origin': 'http://localhost:3000',
            'x-csrf-token': token,
            'cookie': `csrf-token=${token}; other-cookie=value`,
          },
        });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(true);
      });

      it('should reject request with token but no cookie', () => {
        const token = generateCsrfToken();
        const request = new Request('http://localhost:3000/api/save-order', {
          method: 'POST',
          headers: {
            'origin': 'http://localhost:3000',
            'x-csrf-token': token,
          },
        });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('no cookies');
      });

      it('should reject request with mismatching token and cookie', () => {
        const token1 = generateCsrfToken();
        const token2 = generateCsrfToken();
        const request = new Request('http://localhost:3000/api/save-order', {
          method: 'POST',
          headers: {
            'origin': 'http://localhost:3000',
            'x-csrf-token': token1,
            'cookie': `csrf-token=${token2}`,
          },
        });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Token mismatch');
      });

      it('should reject request with token but no csrf-token cookie', () => {
        const token = generateCsrfToken();
        const request = new Request('http://localhost:3000/api/save-order', {
          method: 'POST',
          headers: {
            'origin': 'http://localhost:3000',
            'x-csrf-token': token,
            'cookie': 'other-cookie=value',
          },
        });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('no CSRF cookie');
      });
    });

    describe('Protected methods', () => {
      it('should validate POST requests', () => {
        const request = new Request('http://localhost:3000/api/save-order', {
          method: 'POST',
        });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(false);
      });

      it('should validate PUT requests', () => {
        const request = new Request('http://localhost:3000/api/update', {
          method: 'PUT',
        });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(false);
      });

      it('should validate DELETE requests', () => {
        const request = new Request('http://localhost:3000/api/delete', {
          method: 'DELETE',
        });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(false);
      });

      it('should validate PATCH requests', () => {
        const request = new Request('http://localhost:3000/api/patch', {
          method: 'PATCH',
        });
        const result = validateCsrfToken(request);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('csrfErrorResponse', () => {
    it('should create 403 response', async () => {
      const response = csrfErrorResponse();
      expect(response.status).toBe(403);
    });

    it('should include error message in body', async () => {
      const response = csrfErrorResponse('Custom error message');
      const body = await response.json();
      expect(body.error).toBe('Custom error message');
      expect(body.code).toBe('CSRF_VALIDATION_FAILED');
    });

    it('should have JSON content type', () => {
      const response = csrfErrorResponse();
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });
});
