/**
 * Rate Limiter Unit Tests
 * Tests: src/lib/rate-limiter.ts
 *
 * Validates rate limiting across all 4 tiers and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
  clearAllRateLimits,
  clearRateLimit,
  getRateLimitStats,
} from '../../src/lib/rate-limiter';

// Mock logger to suppress output
vi.mock('../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:4321/api/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

describe('Rate Limiter', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  describe('VERY_STRICT tier (5 req/min)', () => {
    it('allows first 5 requests', () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-very-strict' });
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'payment');
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks 6th request with 429', () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-very-strict-2' });
      for (let i = 0; i < 5; i++) {
        checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'payment2');
      }
      const result = checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'payment2');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter!).toBeGreaterThan(0);
    });
  });

  describe('STRICT tier (10 req/min)', () => {
    it('allows first 10 requests', () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-strict' });
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(req, RATE_LIMIT_CONFIGS.STRICT, 'admin');
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks 11th request', () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-strict-2' });
      for (let i = 0; i < 10; i++) {
        checkRateLimit(req, RATE_LIMIT_CONFIGS.STRICT, 'admin2');
      }
      const result = checkRateLimit(req, RATE_LIMIT_CONFIGS.STRICT, 'admin2');
      expect(result.allowed).toBe(false);
    });
  });

  describe('STANDARD tier (60 req/min)', () => {
    it('allows first 60 requests', () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-standard' });
      for (let i = 0; i < 60; i++) {
        const result = checkRateLimit(req, RATE_LIMIT_CONFIGS.STANDARD, 'api');
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks 61st request', () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-standard-2' });
      for (let i = 0; i < 60; i++) {
        checkRateLimit(req, RATE_LIMIT_CONFIGS.STANDARD, 'api2');
      }
      const result = checkRateLimit(req, RATE_LIMIT_CONFIGS.STANDARD, 'api2');
      expect(result.allowed).toBe(false);
    });
  });

  describe('GENEROUS tier (120 req/min)', () => {
    it('allows first 120 requests', () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-generous' });
      for (let i = 0; i < 120; i++) {
        const result = checkRateLimit(req, RATE_LIMIT_CONFIGS.GENEROUS, 'read');
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks 121st request', () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-generous-2' });
      for (let i = 0; i < 120; i++) {
        checkRateLimit(req, RATE_LIMIT_CONFIGS.GENEROUS, 'read2');
      }
      const result = checkRateLimit(req, RATE_LIMIT_CONFIGS.GENEROUS, 'read2');
      expect(result.allowed).toBe(false);
    });
  });

  describe('Response headers', () => {
    it('returns Retry-After header when rate limited', () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-headers' });
      for (let i = 0; i < 5; i++) {
        checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'headers');
      }
      const result = checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'headers');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter!).toBeLessThanOrEqual(60);
    });

    it('returns remaining count correctly', () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-remaining' });
      const result = checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'remaining');
      expect(result.remaining).toBe(4); // 5 max - 1 used
      expect(result.limit).toBe(5);
    });

    it('returns resetAt timestamp', () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-reset' });
      const result = checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'reset');
      expect(result.resetAt).toBeDefined();
      expect(result.resetAt!).toBeGreaterThan(Date.now());
    });
  });

  describe('Namespace isolation', () => {
    it('different namespaces track independently', () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-namespace' });

      // Exhaust namespace A
      for (let i = 0; i < 5; i++) {
        checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'namespace-a');
      }
      const resultA = checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'namespace-a');
      expect(resultA.allowed).toBe(false);

      // Namespace B should still work
      const resultB = checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'namespace-b');
      expect(resultB.allowed).toBe(true);
    });
  });

  describe('Identifier isolation', () => {
    it('different users (Bearer tokens) track independently', () => {
      const req1 = makeRequest({ Authorization: 'Bearer user-aaaa-1234567890' });
      const req2 = makeRequest({ Authorization: 'Bearer user-bbbb-1234567890' });

      // Exhaust user A
      for (let i = 0; i < 5; i++) {
        checkRateLimit(req1, RATE_LIMIT_CONFIGS.VERY_STRICT, 'user-iso');
      }
      const result1 = checkRateLimit(req1, RATE_LIMIT_CONFIGS.VERY_STRICT, 'user-iso');
      expect(result1.allowed).toBe(false);

      // User B should still work
      const result2 = checkRateLimit(req2, RATE_LIMIT_CONFIGS.VERY_STRICT, 'user-iso');
      expect(result2.allowed).toBe(true);
    });

    it('falls back to X-Forwarded-For when no auth header', () => {
      const req = makeRequest({ 'X-Forwarded-For': '192.168.1.100' });
      const stats = getRateLimitStats(req, 'ip-test');
      expect(stats.identifier).toBe('ip_192.168.1.100');
    });

    it('uses first 16 chars of Bearer token as identifier', () => {
      const req = makeRequest({
        Authorization: 'Bearer abcdef1234567890xyz',
      });
      const stats = getRateLimitStats(req, 'token-test');
      expect(stats.identifier).toBe('user_abcdef1234567890');
    });
  });

  describe('clearAllRateLimits', () => {
    it('resets all counters', () => {
      const req = makeRequest({ Authorization: 'Bearer test-clear-all' });
      for (let i = 0; i < 5; i++) {
        checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'clear-all');
      }
      const blocked = checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'clear-all');
      expect(blocked.allowed).toBe(false);

      clearAllRateLimits();

      const allowed = checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'clear-all');
      expect(allowed.allowed).toBe(true);
    });
  });

  describe('clearRateLimit', () => {
    it('clears a specific identifier', () => {
      const req = makeRequest({ Authorization: 'Bearer test-clear-one' });
      for (let i = 0; i < 5; i++) {
        checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'clear-one');
      }
      const blocked = checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'clear-one');
      expect(blocked.allowed).toBe(false);

      clearRateLimit('user_test-clear-one', 'clear-one');

      const allowed = checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'clear-one');
      expect(allowed.allowed).toBe(true);
    });
  });

  describe('createRateLimitResponse', () => {
    it('returns 429 status', () => {
      const res = createRateLimitResponse({
        allowed: false,
        retryAfter: 30,
        remaining: 0,
        limit: 5,
        resetAt: Date.now() + 30000,
      });
      expect(res.status).toBe(429);
    });

    it('includes Retry-After header', () => {
      const res = createRateLimitResponse({
        allowed: false,
        retryAfter: 45,
        remaining: 0,
        limit: 5,
        resetAt: Date.now() + 45000,
      });
      expect(res.headers.get('Retry-After')).toBe('45');
    });

    it('includes X-RateLimit-Limit header', () => {
      const res = createRateLimitResponse({
        allowed: false,
        retryAfter: 30,
        remaining: 0,
        limit: 10,
        resetAt: Date.now() + 30000,
      });
      expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
    });

    it('includes X-RateLimit-Remaining header', () => {
      const res = createRateLimitResponse({
        allowed: false,
        retryAfter: 30,
        remaining: 0,
        limit: 5,
        resetAt: Date.now() + 30000,
      });
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('returns JSON body with error message', async () => {
      const res = createRateLimitResponse({
        allowed: false,
        retryAfter: 30,
        remaining: 0,
        limit: 5,
        resetAt: Date.now() + 30000,
      });
      const body = await res.json();
      expect(body.error).toBe('Too many requests');
      expect(body.retryAfter).toBe(30);
    });
  });
});
