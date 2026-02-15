/**
 * Rate Limiter Unit Tests
 * Tests: src/lib/rate-limiter.ts
 *
 * Validates rate limiting across all 4 tiers and edge cases
 *
 * Compatible with both sync (in-memory) and async (persistent) checkRateLimit
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock logger to suppress output
vi.mock('../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock firebase-admin to prevent credential initialization errors
vi.mock('../../src/lib/firebase-admin', () => ({
  getAdminDb: vi.fn(() => {
    throw new Error('No Firestore available in unit tests');
  }),
  getAdminAuth: vi.fn(() => {
    throw new Error('No Auth available in unit tests');
  }),
}));

// Mock rateLimitPersistent to prevent setInterval side effect and Firebase calls.
// Provides a controlled in-memory implementation so that tests pass regardless of
// whether the local checkRateLimit delegates to rateLimitPersistent or not.
const _persistentStore = new Map<string, { count: number; resetAt: number }>();

function _extractKey(request: Request, scope: string): string {
  const auth = request.headers.get('authorization') || request.headers.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return `${scope}:user_${auth.replace('Bearer ', '').trim().substring(0, 16)}`;
  }
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  return `${scope}:ip_${ip}`;
}

vi.mock('../../src/lib/rateLimitPersistent', () => ({
  rateLimitPersistent: vi.fn(
    async (request: Request, scope: string, opts: Record<string, number> = {}) => {
      const interval = opts.intervalMs ?? opts.windowMs ?? 60_000;
      const max = opts.max ?? opts.maxRequests ?? 30;
      const key = _extractKey(request, scope);
      const now = Date.now();

      const existing = _persistentStore.get(key);
      if (!existing || now > existing.resetAt) {
        const resetAt = now + interval;
        _persistentStore.set(key, { count: 1, resetAt });
        return { ok: true, remaining: max - 1, resetAt };
      }

      existing.count += 1;
      const ok = existing.count <= max;
      const remaining = Math.max(0, max - existing.count);
      return { ok, remaining, resetAt: existing.resetAt };
    }
  ),
  cleanupOldRateLimits: vi.fn(async () => 0),
}));

import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
  clearAllRateLimits,
  clearRateLimit,
  getRateLimitStats,
  type RateLimitResult,
} from '../../src/lib/rate-limiter';

/**
 * Helper: resolves checkRateLimit result for both sync and async versions.
 * Also normalises the 'ok' property (from rateLimitPersistent) → 'allowed'.
 */
async function resolve(resultOrPromise: RateLimitResult | Promise<RateLimitResult>): Promise<{
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
  limit?: number;
  resetAt?: number;
}> {
  const r: Record<string, unknown> = await Promise.resolve(resultOrPromise);
  return {
    allowed: (r.allowed ?? r.ok ?? false) as boolean,
    retryAfter: r.retryAfter as number | undefined,
    remaining: r.remaining as number | undefined,
    limit: r.limit as number | undefined,
    resetAt: r.resetAt as number | undefined,
  };
}

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
    _persistentStore.clear();
  });

  describe('VERY_STRICT tier (5 req/min)', () => {
    it('allows first 5 requests', async () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-very-strict' });
      for (let i = 0; i < 5; i++) {
        const result = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'payment'));
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks 6th request with 429', async () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-very-strict-2' });
      for (let i = 0; i < 5; i++) {
        await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'payment2'));
      }
      const result = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'payment2'));
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter!).toBeGreaterThan(0);
    });
  });

  describe('STRICT tier (10 req/min)', () => {
    it('allows first 10 requests', async () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-strict' });
      for (let i = 0; i < 10; i++) {
        const result = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.STRICT, 'admin'));
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks 11th request', async () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-strict-2' });
      for (let i = 0; i < 10; i++) {
        await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.STRICT, 'admin2'));
      }
      const result = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.STRICT, 'admin2'));
      expect(result.allowed).toBe(false);
    });
  });

  describe('STANDARD tier (60 req/min)', () => {
    it('allows first 60 requests', async () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-standard' });
      for (let i = 0; i < 60; i++) {
        const result = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.STANDARD, 'api'));
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks 61st request', async () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-standard-2' });
      for (let i = 0; i < 60; i++) {
        await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.STANDARD, 'api2'));
      }
      const result = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.STANDARD, 'api2'));
      expect(result.allowed).toBe(false);
    });
  });

  describe('GENEROUS tier (120 req/min)', () => {
    it('allows first 120 requests', async () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-generous' });
      for (let i = 0; i < 120; i++) {
        const result = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.GENEROUS, 'read'));
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks 121st request', async () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-generous-2' });
      for (let i = 0; i < 120; i++) {
        await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.GENEROUS, 'read2'));
      }
      const result = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.GENEROUS, 'read2'));
      expect(result.allowed).toBe(false);
    });
  });

  describe('Response headers', () => {
    it('returns Retry-After header when rate limited', async () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-headers' });
      for (let i = 0; i < 5; i++) {
        await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'headers'));
      }
      const result = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'headers'));
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter!).toBeLessThanOrEqual(60);
    });

    it('returns remaining count correctly', async () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-remaining' });
      const result = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'remaining'));
      expect(result.remaining).toBe(4); // 5 max - 1 used
      expect(result.limit).toBe(5);
    });

    it('returns resetAt timestamp', async () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-reset' });
      const result = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'reset'));
      expect(result.resetAt).toBeDefined();
      expect(result.resetAt!).toBeGreaterThan(Date.now());
    });
  });

  describe('Namespace isolation', () => {
    it('different namespaces track independently', async () => {
      const req = makeRequest({ Authorization: 'Bearer test-token-namespace' });

      // Exhaust namespace A
      for (let i = 0; i < 5; i++) {
        await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'namespace-a'));
      }
      const resultA = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'namespace-a'));
      expect(resultA.allowed).toBe(false);

      // Namespace B should still work
      const resultB = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'namespace-b'));
      expect(resultB.allowed).toBe(true);
    });
  });

  describe('Identifier isolation', () => {
    it('different users (Bearer tokens) track independently', async () => {
      const req1 = makeRequest({ Authorization: 'Bearer user-aaaa-1234567890' });
      const req2 = makeRequest({ Authorization: 'Bearer user-bbbb-1234567890' });

      // Exhaust user A
      for (let i = 0; i < 5; i++) {
        await resolve(checkRateLimit(req1, RATE_LIMIT_CONFIGS.VERY_STRICT, 'user-iso'));
      }
      const result1 = await resolve(checkRateLimit(req1, RATE_LIMIT_CONFIGS.VERY_STRICT, 'user-iso'));
      expect(result1.allowed).toBe(false);

      // User B should still work
      const result2 = await resolve(checkRateLimit(req2, RATE_LIMIT_CONFIGS.VERY_STRICT, 'user-iso'));
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
    it('resets all counters', async () => {
      const req = makeRequest({ Authorization: 'Bearer test-clear-all' });
      for (let i = 0; i < 5; i++) {
        await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'clear-all'));
      }
      const blocked = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'clear-all'));
      expect(blocked.allowed).toBe(false);

      clearAllRateLimits();
      _persistentStore.clear();

      const allowed = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'clear-all'));
      expect(allowed.allowed).toBe(true);
    });
  });

  describe('clearRateLimit', () => {
    it('clears a specific identifier', async () => {
      const req = makeRequest({ Authorization: 'Bearer test-clear-one' });
      for (let i = 0; i < 5; i++) {
        await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'clear-one'));
      }
      const blocked = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'clear-one'));
      expect(blocked.allowed).toBe(false);

      clearRateLimit('user_test-clear-one', 'clear-one');
      // Also clear persistent store entry for this key
      for (const key of _persistentStore.keys()) {
        if (key.includes('clear-one')) _persistentStore.delete(key);
      }

      const allowed = await resolve(checkRateLimit(req, RATE_LIMIT_CONFIGS.VERY_STRICT, 'clear-one'));
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
