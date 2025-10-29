import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit, getRateLimitStats, clearRateLimits } from '../../src/lib/rateLimit';

describe('rateLimit', () => {
  beforeEach(() => {
    clearRateLimits();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearRateLimits();
  });

  describe('Basic rate limiting', () => {
    it('should allow requests under the limit', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      // Make 5 requests (limit is 30 by default)
      for (let i = 0; i < 5; i++) {
        const result = await rateLimit(request, 'test-endpoint');
        expect(result.ok).toBe(true);
        expect(result.remaining).toBe(25 - i);
      }
    });

    it('should block requests over the limit', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.2',
        },
      });

      const max = 10;

      // Make requests up to the limit
      for (let i = 0; i < max; i++) {
        const result = await rateLimit(request, 'test-endpoint-2', { max });
        expect(result.ok).toBe(true);
      }

      // Next request should be blocked
      const blocked = await rateLimit(request, 'test-endpoint-2', { max });
      expect(blocked.ok).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('should use different buckets for different scopes', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.3',
        },
      });

      // Exhaust limit for scope1
      for (let i = 0; i < 10; i++) {
        await rateLimit(request, 'scope1', { max: 10 });
      }

      // Should be blocked for scope1
      const blocked = await rateLimit(request, 'scope1', { max: 10 });
      expect(blocked.ok).toBe(false);

      // But should still work for scope2
      const allowed = await rateLimit(request, 'scope2', { max: 10 });
      expect(allowed.ok).toBe(true);
    });

    it('should use different buckets for different IPs', async () => {
      const request1 = new Request('http://localhost/test', {
        method: 'GET',
        headers: { 'x-forwarded-for': '192.168.1.1' },
      });

      const request2 = new Request('http://localhost/test', {
        method: 'GET',
        headers: { 'x-forwarded-for': '192.168.1.2' },
      });

      // Exhaust limit for IP1
      for (let i = 0; i < 10; i++) {
        await rateLimit(request1, 'test', { max: 10 });
      }

      // Should be blocked for IP1
      const blocked = await rateLimit(request1, 'test', { max: 10 });
      expect(blocked.ok).toBe(false);

      // But should still work for IP2
      const allowed = await rateLimit(request2, 'test', { max: 10 });
      expect(allowed.ok).toBe(true);
    });
  });

  describe('IP detection', () => {
    it('should detect IP from x-forwarded-for', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: { 'x-forwarded-for': '1.2.3.4' },
      });

      await rateLimit(request, 'test');
      const stats = getRateLimitStats();

      expect(stats.buckets.some(b => b.key.includes('1.2.3.4'))).toBe(true);
    });

    it('should detect IP from cf-connecting-ip (Cloudflare)', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: { 'cf-connecting-ip': '5.6.7.8' },
      });

      await rateLimit(request, 'test');
      const stats = getRateLimitStats();

      expect(stats.buckets.some(b => b.key.includes('5.6.7.8'))).toBe(true);
    });

    it('should detect IP from x-real-ip (Nginx)', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: { 'x-real-ip': '9.10.11.12' },
      });

      await rateLimit(request, 'test');
      const stats = getRateLimitStats();

      expect(stats.buckets.some(b => b.key.includes('9.10.11.12'))).toBe(true);
    });

    it('should use first IP from x-forwarded-for chain', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: { 'x-forwarded-for': '100.1.1.1, 200.2.2.2, 300.3.3.3' },
      });

      await rateLimit(request, 'test');
      const stats = getRateLimitStats();

      expect(stats.buckets.some(b => b.key.includes('100.1.1.1'))).toBe(true);
      expect(stats.buckets.some(b => b.key.includes('200.2.2.2'))).toBe(false);
    });

    it('should use unknown if no IP headers present', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
      });

      await rateLimit(request, 'test');
      const stats = getRateLimitStats();

      expect(stats.buckets.some(b => b.key.includes('unknown'))).toBe(true);
    });
  });

  describe('Abuse blocking', () => {
    it('should temporarily block IP after exceeding 3x limit', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: { 'x-forwarded-for': '192.168.100.1' },
      });

      const max = 10;
      const abusiveCount = max * 3 + 1; // 31 requests

      // Make abusive number of requests
      for (let i = 0; i < abusiveCount; i++) {
        await rateLimit(request, 'abuse-test', { max, blockDuration: 1000 });
      }

      // Should be blocked
      const result = await rateLimit(request, 'abuse-test', { max });
      expect(result.ok).toBe(false);
      expect(result.blocked).toBe(true);
    });

    it('should unblock IP after block duration expires', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: { 'x-forwarded-for': '192.168.100.2' },
      });

      const max = 5;
      const blockDuration = 100; // 100ms

      // Trigger block
      for (let i = 0; i < max * 3 + 1; i++) {
        await rateLimit(request, 'unblock-test', { max, blockDuration });
      }

      // Should be blocked
      const blocked = await rateLimit(request, 'unblock-test', { max, blockDuration });
      expect(blocked.blocked).toBe(true);

      // Wait for block to expire
      await new Promise(resolve => setTimeout(resolve, blockDuration + 50));

      // Should be unblocked now
      const unblocked = await rateLimit(request, 'unblock-test', { max, blockDuration });
      expect(unblocked.ok).toBe(true);
      expect(unblocked.blocked).toBeFalsy();
    });
  });

  describe('Window reset', () => {
    it('should reset count after interval expires', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
        headers: { 'x-forwarded-for': '192.168.2.1' },
      });

      const intervalMs = 100; // 100ms interval
      const max = 5;

      // Exhaust limit
      for (let i = 0; i < max; i++) {
        await rateLimit(request, 'reset-test', { intervalMs, max });
      }

      // Should be at limit
      const atLimit = await rateLimit(request, 'reset-test', { intervalMs, max });
      expect(atLimit.ok).toBe(false);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, intervalMs + 50));

      // Should be reset
      const afterReset = await rateLimit(request, 'reset-test', { intervalMs, max });
      expect(afterReset.ok).toBe(true);
      expect(afterReset.remaining).toBe(max - 1);
    });
  });

  describe('Utility functions', () => {
    it('getRateLimitStats should return current state', async () => {
      const request1 = new Request('http://localhost/test', {
        headers: { 'x-forwarded-for': '10.0.0.1' },
      });
      const request2 = new Request('http://localhost/test', {
        headers: { 'x-forwarded-for': '10.0.0.2' },
      });

      await rateLimit(request1, 'scope1');
      await rateLimit(request2, 'scope2');

      const stats = getRateLimitStats();

      expect(stats.totalKeys).toBeGreaterThanOrEqual(2);
      expect(stats.buckets).toBeInstanceOf(Array);
      expect(stats.buckets.length).toBeGreaterThanOrEqual(2);

      // Check structure
      const bucket = stats.buckets[0];
      expect(bucket).toHaveProperty('key');
      expect(bucket).toHaveProperty('count');
      expect(bucket).toHaveProperty('resetAt');
      expect(bucket).toHaveProperty('blocked');
    });

    it('clearRateLimits should clear all buckets', async () => {
      const request = new Request('http://localhost/test', {
        headers: { 'x-forwarded-for': '10.0.0.3' },
      });

      // Add some data
      await rateLimit(request, 'test1');
      await rateLimit(request, 'test2');

      let stats = getRateLimitStats();
      expect(stats.totalKeys).toBeGreaterThan(0);

      // Clear
      clearRateLimits();

      stats = getRateLimitStats();
      expect(stats.totalKeys).toBe(0);
      expect(stats.buckets).toHaveLength(0);
    });
  });

  describe('Custom intervals and limits', () => {
    it('should respect custom interval', async () => {
      const request = new Request('http://localhost/test', {
        headers: { 'x-forwarded-for': '192.168.3.1' },
      });

      const intervalMs = 200;
      const max = 3;

      // Use up requests
      for (let i = 0; i < max; i++) {
        await rateLimit(request, 'custom-interval', { intervalMs, max });
      }

      // Should be blocked
      const blocked = await rateLimit(request, 'custom-interval', { intervalMs, max });
      expect(blocked.ok).toBe(false);

      // Wait for interval
      await new Promise(resolve => setTimeout(resolve, intervalMs + 50));

      // Should work again
      const allowed = await rateLimit(request, 'custom-interval', { intervalMs, max });
      expect(allowed.ok).toBe(true);
    });

    it('should respect custom max limit', async () => {
      const request = new Request('http://localhost/test', {
        headers: { 'x-forwarded-for': '192.168.3.2' },
      });

      const max = 2; // Very low limit

      // Should allow first 2
      const first = await rateLimit(request, 'custom-max', { max });
      expect(first.ok).toBe(true);

      const second = await rateLimit(request, 'custom-max', { max });
      expect(second.ok).toBe(true);

      // Should block third
      const third = await rateLimit(request, 'custom-max', { max });
      expect(third.ok).toBe(false);
    });

    it('should respect custom block duration', async () => {
      const request = new Request('http://localhost/test', {
        headers: { 'x-forwarded-for': '192.168.3.3' },
      });

      const max = 3;
      const blockDuration = 150; // 150ms

      // Trigger block
      for (let i = 0; i < max * 3 + 1; i++) {
        await rateLimit(request, 'custom-block', { max, blockDuration });
      }

      // Should be blocked
      const blocked = await rateLimit(request, 'custom-block', { max, blockDuration });
      expect(blocked.blocked).toBe(true);

      // Wait less than block duration
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should still be blocked
      const stillBlocked = await rateLimit(request, 'custom-block', { max, blockDuration });
      expect(stillBlocked.blocked).toBe(true);

      // Wait for full block duration
      await new Promise(resolve => setTimeout(resolve, blockDuration + 50));

      // Should be unblocked
      const unblocked = await rateLimit(request, 'custom-block', { max, blockDuration });
      expect(unblocked.ok).toBe(true);
    });
  });
});
