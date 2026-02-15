/**
 * Rate limit reset helper for security tests
 * Wraps clearAllRateLimits() from the rate-limiter module
 */

import { clearAllRateLimits } from '../../src/lib/rate-limiter';

/**
 * Reset all rate limits between tests to ensure isolation
 * Must be called in beforeEach() for any test that exercises rate-limited endpoints
 */
export function resetRateLimits(): void {
  clearAllRateLimits();
}
