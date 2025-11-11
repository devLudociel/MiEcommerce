/**
 * RESILIENCE: Retry logic and error handling utilities
 *
 * Features:
 * - Exponential backoff retry strategy
 * - Configurable retry conditions
 * - Timeout support
 * - Integrated logging
 *
 * Usage:
 * ```typescript
 * import { withRetry, RetryConfig } from '@/lib/resilience';
 *
 * const result = await withRetry(
 *   () => fetch('/api/orders'),
 *   { maxAttempts: 3, backoffMs: 1000 }
 * );
 * ```
 */

import { logger } from './logger';

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial backoff delay in milliseconds (default: 1000) */
  backoffMs?: number;
  /** Backoff multiplier for exponential growth (default: 2) */
  backoffMultiplier?: number;
  /** Maximum backoff delay in milliseconds (default: 30000) */
  maxBackoffMs?: number;
  /** Timeout for each attempt in milliseconds (default: 10000) */
  timeoutMs?: number;
  /** Function to determine if error is retryable (default: retries all) */
  shouldRetry?: (error: unknown) => boolean;
  /** Optional context for logging */
  context?: string;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
}

/**
 * Default retry condition: retry on network errors and 5xx status codes
 */
export function defaultShouldRetry(error: unknown): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // HTTP errors
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    // Retry on 5xx server errors and 429 (rate limit)
    return status >= 500 || status === 429;
  }

  // Firebase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    const retryableCodes = [
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'aborted',
      'internal',
    ];
    return retryableCodes.some(c => code.includes(c));
  }

  return false;
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(
  attempt: number,
  initialBackoff: number,
  multiplier: number,
  maxBackoff: number
): number {
  const delay = initialBackoff * Math.pow(multiplier, attempt - 1);
  return Math.min(delay, maxBackoff);
}

/**
 * Execute function with timeout
 */
async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  context: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${context} timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    backoffMs = 1000,
    backoffMultiplier = 2,
    maxBackoffMs = 30000,
    timeoutMs = 10000,
    shouldRetry = defaultShouldRetry,
    context = 'Operation',
  } = config;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(`[Resilience] ${context} attempt ${attempt}/${maxAttempts}`);

      const result = await withTimeout(fn, timeoutMs, context);

      if (attempt > 1) {
        logger.info(`[Resilience] ${context} succeeded after ${attempt} attempts`);
      }

      return result;
    } catch (error) {
      lastError = error;

      const isRetryable = shouldRetry(error);
      const hasAttemptsLeft = attempt < maxAttempts;

      logger.warn(`[Resilience] ${context} failed on attempt ${attempt}/${maxAttempts}`, {
        error,
        retryable: isRetryable,
        hasAttemptsLeft,
      });

      if (!isRetryable || !hasAttemptsLeft) {
        logger.error(`[Resilience] ${context} failed permanently after ${attempt} attempts`, error);
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = calculateBackoff(attempt, backoffMs, backoffMultiplier, maxBackoffMs);
      logger.debug(`[Resilience] ${context} retrying in ${delay}ms`);
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Batch retry wrapper for multiple operations
 */
export async function withRetryBatch<T>(
  operations: Array<() => Promise<T>>,
  config: RetryConfig = {}
): Promise<RetryResult<T>[]> {
  const results = await Promise.allSettled(
    operations.map(op => withRetry(op, config))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return {
        success: true,
        data: result.value,
        attempts: 1, // We don't track individual attempts in batch
      };
    } else {
      return {
        success: false,
        error: result.reason,
        attempts: config.maxAttempts || 3,
      };
    }
  });
}

/**
 * Create a retryable version of a function
 */
export function makeRetryable<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  config: RetryConfig = {}
): (...args: T) => Promise<R> {
  return async (...args: T) => {
    return withRetry(() => fn(...args), config);
  };
}
