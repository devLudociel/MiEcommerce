/**
 * CSRF Protection Unit Tests
 * Tests: src/lib/csrf.ts
 *
 * Validates CSRF defense layers:
 * - Safe method bypass (GET/HEAD/OPTIONS)
 * - Origin/Referer validation
 * - Custom header requirement (Content-Type or X-Requested-With)
 */

import { describe, it, expect } from 'vitest';
import { validateCSRF, validateOrigin, hasCustomHeader, createCSRFErrorResponse } from '../../src/lib/csrf';

function makeRequest(
  method: string,
  headers: Record<string, string> = {}
): Request {
  return new Request('http://localhost:4321/api/test', {
    method,
    headers,
  });
}

describe('CSRF Protection', () => {
  describe('validateCSRF', () => {
    it('allows GET requests regardless of origin', () => {
      const req = makeRequest('GET', {});
      const result = validateCSRF(req);
      expect(result.valid).toBe(true);
    });

    it('allows HEAD requests regardless of origin', () => {
      const req = makeRequest('HEAD', {});
      const result = validateCSRF(req);
      expect(result.valid).toBe(true);
    });

    it('allows OPTIONS requests regardless of origin', () => {
      const req = makeRequest('OPTIONS', {});
      const result = validateCSRF(req);
      expect(result.valid).toBe(true);
    });

    it('rejects POST with no Origin and no Referer', () => {
      const req = makeRequest('POST', {
        Host: 'localhost:4321',
        'Content-Type': 'application/json',
      });
      const result = validateCSRF(req);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('rejects POST with mismatched Origin (evil.com)', () => {
      const req = makeRequest('POST', {
        Origin: 'https://evil.com',
        Host: 'localhost:4321',
        'Content-Type': 'application/json',
      });
      const result = validateCSRF(req);
      expect(result.valid).toBe(false);
    });

    it('rejects POST with mismatched Referer', () => {
      const req = makeRequest('POST', {
        Referer: 'https://evil.com/steal-data',
        Host: 'localhost:4321',
        'Content-Type': 'application/json',
      });
      const result = validateCSRF(req);
      expect(result.valid).toBe(false);
    });

    it('rejects POST with valid Origin but no custom header (text/html)', () => {
      const req = makeRequest('POST', {
        Origin: 'http://localhost:4321',
        Host: 'localhost:4321',
        'Content-Type': 'text/html',
      });
      const result = validateCSRF(req);
      expect(result.valid).toBe(false);
    });

    it('rejects POST with valid Origin but Content-Type: application/x-www-form-urlencoded', () => {
      const req = makeRequest('POST', {
        Origin: 'http://localhost:4321',
        Host: 'localhost:4321',
        'Content-Type': 'application/x-www-form-urlencoded',
      });
      const result = validateCSRF(req);
      expect(result.valid).toBe(false);
    });

    it('accepts POST with matching Origin + Content-Type: application/json', () => {
      const req = makeRequest('POST', {
        Origin: 'http://localhost:4321',
        Host: 'localhost:4321',
        'Content-Type': 'application/json',
      });
      const result = validateCSRF(req);
      expect(result.valid).toBe(true);
    });

    it('accepts POST with matching Origin + X-Requested-With: XMLHttpRequest', () => {
      const req = makeRequest('POST', {
        Origin: 'http://localhost:4321',
        Host: 'localhost:4321',
        'X-Requested-With': 'XMLHttpRequest',
      });
      const result = validateCSRF(req);
      expect(result.valid).toBe(true);
    });

    it('rejects PUT with mismatched Origin', () => {
      const req = makeRequest('PUT', {
        Origin: 'https://attacker.com',
        Host: 'localhost:4321',
        'Content-Type': 'application/json',
      });
      const result = validateCSRF(req);
      expect(result.valid).toBe(false);
    });

    it('rejects DELETE with mismatched Origin', () => {
      const req = makeRequest('DELETE', {
        Origin: 'https://attacker.com',
        Host: 'localhost:4321',
        'Content-Type': 'application/json',
      });
      const result = validateCSRF(req);
      expect(result.valid).toBe(false);
    });

    it('accepts POST with matching Referer when Origin is absent', () => {
      const req = makeRequest('POST', {
        Referer: 'http://localhost:4321/checkout',
        Host: 'localhost:4321',
        'Content-Type': 'application/json',
      });
      const result = validateCSRF(req);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateOrigin', () => {
    it('returns true when Origin host matches Host header', () => {
      const req = makeRequest('POST', {
        Origin: 'http://localhost:4321',
        Host: 'localhost:4321',
      });
      expect(validateOrigin(req)).toBe(true);
    });

    it('returns false when Origin host does not match', () => {
      const req = makeRequest('POST', {
        Origin: 'https://evil.com',
        Host: 'localhost:4321',
      });
      expect(validateOrigin(req)).toBe(false);
    });

    it('handles malformed URL in Origin header gracefully', () => {
      const req = makeRequest('POST', {
        Origin: 'not-a-valid-url',
        Host: 'localhost:4321',
      });
      expect(validateOrigin(req)).toBe(false);
    });

    it('falls back to Referer when Origin is absent', () => {
      const req = makeRequest('POST', {
        Referer: 'http://localhost:4321/page',
        Host: 'localhost:4321',
      });
      expect(validateOrigin(req)).toBe(true);
    });

    it('allows GET when no Origin or Referer present', () => {
      const req = makeRequest('GET', { Host: 'localhost:4321' });
      expect(validateOrigin(req)).toBe(true);
    });

    it('rejects POST when no Origin or Referer present', () => {
      const req = makeRequest('POST', { Host: 'localhost:4321' });
      expect(validateOrigin(req)).toBe(false);
    });
  });

  describe('hasCustomHeader', () => {
    it('returns true with X-Requested-With: XMLHttpRequest', () => {
      const req = makeRequest('POST', {
        'X-Requested-With': 'XMLHttpRequest',
      });
      expect(hasCustomHeader(req)).toBe(true);
    });

    it('returns true with Content-Type: application/json', () => {
      const req = makeRequest('POST', {
        'Content-Type': 'application/json',
      });
      expect(hasCustomHeader(req)).toBe(true);
    });

    it('returns true with Content-Type: application/json; charset=utf-8', () => {
      const req = makeRequest('POST', {
        'Content-Type': 'application/json; charset=utf-8',
      });
      expect(hasCustomHeader(req)).toBe(true);
    });

    it('rejects text/html Content-Type', () => {
      const req = makeRequest('POST', {
        'Content-Type': 'text/html',
      });
      expect(hasCustomHeader(req)).toBe(false);
    });

    it('rejects form-urlencoded Content-Type', () => {
      const req = makeRequest('POST', {
        'Content-Type': 'application/x-www-form-urlencoded',
      });
      expect(hasCustomHeader(req)).toBe(false);
    });

    it('rejects when no relevant headers are present', () => {
      const req = makeRequest('POST', {});
      expect(hasCustomHeader(req)).toBe(false);
    });
  });

  describe('createCSRFErrorResponse', () => {
    it('returns 403 status', () => {
      const res = createCSRFErrorResponse();
      expect(res.status).toBe(403);
    });

    it('returns JSON body with error message', async () => {
      const res = createCSRFErrorResponse();
      const body = await res.json();
      expect(body.error).toBe('CSRF validation failed');
      expect(body.message).toBeDefined();
    });

    it('has Content-Type: application/json header', () => {
      const res = createCSRFErrorResponse();
      expect(res.headers.get('Content-Type')).toBe('application/json');
    });
  });
});
