// src/lib/rate-limiter.ts
import { logger } from './logger';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// In-memory store for rate limiting (use Redis in production for multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Predefined rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  // Strict limits for expensive operations
  STRICT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  },
  // Standard limits for regular API calls
  STANDARD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
  // Generous limits for lightweight operations
  GENEROUS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120, // 120 requests per minute
  },
  // Very strict for sensitive operations (payment, auth)
  VERY_STRICT: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute
  },
} as const;

/**
 * Extract identifier from request (IP address or user ID from auth header)
 */
function getRequestIdentifier(request: Request): string {
  // Try to get user ID from Authorization header
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    // Use first 16 chars of token as identifier (don't need full token)
    return `user_${token.substring(0, 16)}`;
  }

  // Fallback to IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0].trim() || realIp || 'unknown';

  return `ip_${ip}`;
}

/**
 * Clean up expired entries from the store (prevent memory leak)
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  let removedCount = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    logger.debug(`[rate-limiter] Cleaned up ${removedCount} expired entries`);
  }
}

/**
 * Check if request should be rate limited
 * Returns { allowed: true } if request is allowed
 * Returns { allowed: false, retryAfter: number } if rate limited
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // seconds until retry is allowed
  remaining?: number; // requests remaining in current window
  limit?: number; // total requests allowed per window
  resetAt?: number; // timestamp when limit resets
}

export function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
  namespace: string = 'default'
): RateLimitResult {
  const identifier = getRequestIdentifier(request);
  const key = `${namespace}:${identifier}`;
  const now = Date.now();

  // Cleanup expired entries periodically (every 100 requests)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  // Get or create entry
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired one
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);

    logger.debug(`[rate-limiter] New window created for ${key}`);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      limit: config.maxRequests,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

    logger.warn(`[rate-limiter] Rate limit exceeded for ${key}`, {
      count: entry.count,
      limit: config.maxRequests,
      retryAfter,
    });

    return {
      allowed: false,
      retryAfter,
      remaining: 0,
      limit: config.maxRequests,
      resetAt: entry.resetAt,
    };
  }

  // Request allowed
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    limit: config.maxRequests,
    resetAt: entry.resetAt,
  };
}

/**
 * Create a rate limit response for when limit is exceeded
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter || 60),
        'X-RateLimit-Limit': String(result.limit || 0),
        'X-RateLimit-Remaining': String(result.remaining || 0),
        'X-RateLimit-Reset': String(result.resetAt || 0),
      },
    }
  );
}

/**
 * Middleware-style rate limiter that can be used in API routes
 */
export function withRateLimit(
  config: RateLimitConfig,
  namespace?: string
): (request: Request) => RateLimitResult {
  return (request: Request) => {
    return checkRateLimit(request, config, namespace);
  };
}

/**
 * Get current rate limit stats for a request (for debugging)
 */
export function getRateLimitStats(request: Request, namespace: string = 'default'): {
  identifier: string;
  entry?: RateLimitEntry;
} {
  const identifier = getRequestIdentifier(request);
  const key = `${namespace}:${identifier}`;
  const entry = rateLimitStore.get(key);

  return {
    identifier,
    entry,
  };
}

/**
 * Clear rate limit for a specific identifier (for testing or admin override)
 */
export function clearRateLimit(identifier: string, namespace: string = 'default'): void {
  const key = `${namespace}:${identifier}`;
  rateLimitStore.delete(key);
  logger.info(`[rate-limiter] Cleared rate limit for ${key}`);
}

/**
 * Clear all rate limits (for testing)
 */
export function clearAllRateLimits(): void {
  const size = rateLimitStore.size;
  rateLimitStore.clear();
  logger.info(`[rate-limiter] Cleared all rate limits (${size} entries)`);
}
