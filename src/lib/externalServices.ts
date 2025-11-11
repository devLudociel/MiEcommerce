// src/lib/externalServices.ts
import { createCircuitBreaker, CircuitBreakerRegistry } from './circuitBreaker';
import { logger } from './logger';

/**
 * Circuit Breaker for Stripe API
 *
 * Protects against Stripe API failures by failing fast when Stripe is down.
 * Opens circuit after 5 consecutive failures, waits 60s before retrying.
 */
export const stripeCircuitBreaker = createCircuitBreaker({
  name: 'stripe-api',
  failureThreshold: 5,
  resetTimeout: 60000, // 60 seconds
  halfOpenMaxAttempts: 3,
  shouldCountFailure: (error: unknown) => {
    // Only count actual API failures, not validation errors
    if (error && typeof error === 'object') {
      // Stripe errors have a 'type' property
      if ('type' in error) {
        const stripeError = error as { type: string; statusCode?: number };
        // Don't count invalid_request_error (client errors)
        if (stripeError.type === 'StripeInvalidRequestError') {
          return false;
        }
        // Count API errors and connection errors
        if (
          stripeError.type === 'StripeAPIError' ||
          stripeError.type === 'StripeConnectionError' ||
          stripeError.type === 'StripeRateLimitError'
        ) {
          return true;
        }
        // Count 5xx errors
        if (stripeError.statusCode && stripeError.statusCode >= 500) {
          return true;
        }
      }
    }
    // Default: don't count unknown errors for Stripe
    return false;
  },
});

/**
 * Circuit Breaker for Resend Email API
 *
 * Protects against Resend API failures.
 * Opens circuit after 5 consecutive failures, waits 30s before retrying (shorter for email).
 */
export const resendCircuitBreaker = createCircuitBreaker({
  name: 'resend-api',
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds (shorter for email service)
  halfOpenMaxAttempts: 2,
  shouldCountFailure: (error: unknown) => {
    // Count most errors for Resend
    if (error && typeof error === 'object') {
      // Resend errors have statusCode
      if ('statusCode' in error) {
        const resendError = error as { statusCode: number };
        // Don't count 4xx client errors (except 429 rate limit)
        if (resendError.statusCode >= 400 && resendError.statusCode < 500) {
          return resendError.statusCode === 429; // Only count rate limits
        }
        // Count 5xx server errors
        return resendError.statusCode >= 500;
      }
    }
    // Default: count as failure
    return true;
  },
});

/**
 * Circuit Breaker for Firebase Storage uploads
 *
 * Protects against Firebase Storage failures.
 */
export const storageCircuitBreaker = createCircuitBreaker({
  name: 'firebase-storage',
  failureThreshold: 5,
  resetTimeout: 45000, // 45 seconds
  halfOpenMaxAttempts: 3,
  shouldCountFailure: (error: unknown) => {
    // Firebase storage errors have a 'code' property
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string };
      // Don't count permission denied or invalid file errors
      if (
        firebaseError.code === 'storage/unauthorized' ||
        firebaseError.code === 'storage/object-not-found' ||
        firebaseError.code === 'storage/invalid-argument'
      ) {
        return false;
      }
      // Count network and quota errors
      if (
        firebaseError.code === 'storage/retry-limit-exceeded' ||
        firebaseError.code === 'storage/quota-exceeded' ||
        firebaseError.code === 'storage/unauthenticated' ||
        firebaseError.code === 'storage/server-file-wrong-size'
      ) {
        return true;
      }
    }
    // Default: count as failure
    return true;
  },
});

// Register all circuit breakers for monitoring
CircuitBreakerRegistry.register('stripe-api', stripeCircuitBreaker);
CircuitBreakerRegistry.register('resend-api', resendCircuitBreaker);
CircuitBreakerRegistry.register('firebase-storage', storageCircuitBreaker);

logger.info('[ExternalServices] Circuit breakers initialized', {
  breakers: ['stripe-api', 'resend-api', 'firebase-storage'],
});

/**
 * Helper: Execute Stripe operation with circuit breaker protection
 */
export async function executeStripeOperation<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await stripeCircuitBreaker.execute(operation);
  } catch (error) {
    logger.error('[ExternalServices] Stripe operation failed', {
      context,
      error,
      stats: stripeCircuitBreaker.getStats(),
    });
    throw error;
  }
}

/**
 * Helper: Execute Resend operation with circuit breaker protection
 */
export async function executeResendOperation<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await resendCircuitBreaker.execute(operation);
  } catch (error) {
    logger.error('[ExternalServices] Resend operation failed', {
      context,
      error,
      stats: resendCircuitBreaker.getStats(),
    });
    throw error;
  }
}

/**
 * Helper: Execute Firebase Storage operation with circuit breaker protection
 */
export async function executeStorageOperation<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await storageCircuitBreaker.execute(operation);
  } catch (error) {
    logger.error('[ExternalServices] Firebase Storage operation failed', {
      context,
      error,
      stats: storageCircuitBreaker.getStats(),
    });
    throw error;
  }
}
