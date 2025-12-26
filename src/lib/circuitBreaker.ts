// src/lib/circuitBreaker.ts
import { logger } from './logger';

/**
 * Circuit Breaker States
 *
 * CLOSED: Normal operation, all requests pass through
 * OPEN: Too many failures detected, requests fail immediately
 * HALF_OPEN: Testing if service recovered, allows limited requests
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  /** Name for logging/identification */
  name: string;
  /** Number of consecutive failures before opening circuit */
  failureThreshold?: number;
  /** Time in ms to wait before attempting HALF_OPEN (default: 60s) */
  resetTimeout?: number;
  /** Max requests allowed in HALF_OPEN state (default: 3) */
  halfOpenMaxAttempts?: number;
  /** Custom function to determine if error should count as failure */
  shouldCountFailure?: (error: unknown) => boolean;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalAttempts: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
}

export class CircuitBreakerError extends Error {
  constructor(
    public circuitName: string,
    public state: CircuitState
  ) {
    super(`Circuit breaker '${circuitName}' is ${state}. Request rejected.`);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by failing fast when a service is unavailable.
 * Automatically recovers and retries when service might be available again.
 *
 * Usage:
 * ```typescript
 * const breaker = createCircuitBreaker({
 *   name: 'stripe-api',
 *   failureThreshold: 5,
 *   resetTimeout: 60000
 * });
 *
 * const result = await breaker.execute(() => stripe.createPaymentIntent(...));
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalAttempts = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private halfOpenAttempts = 0;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      name: config.name,
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 60000, // 60 seconds
      halfOpenMaxAttempts: config.halfOpenMaxAttempts ?? 3,
      shouldCountFailure: config.shouldCountFailure ?? this.defaultShouldCountFailure,
    };

    logger.info(`[CircuitBreaker] Initialized '${this.config.name}'`, {
      failureThreshold: this.config.failureThreshold,
      resetTimeout: this.config.resetTimeout,
    });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalAttempts++;

    // Check if circuit is OPEN
    if (this.state === CircuitState.OPEN) {
      // Check if enough time has passed to try HALF_OPEN
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        logger.warn(`[CircuitBreaker] '${this.config.name}' is OPEN, rejecting request`, {
          failureCount: this.failureCount,
          timeSinceLastFailure: this.lastFailureTime ? Date.now() - this.lastFailureTime : null,
        });
        throw new CircuitBreakerError(this.config.name, this.state);
      }
    }

    // Check if we've exceeded HALF_OPEN attempts
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        logger.warn(
          `[CircuitBreaker] '${this.config.name}' exceeded HALF_OPEN attempts, reopening`,
          {
            halfOpenAttempts: this.halfOpenAttempts,
            max: this.config.halfOpenMaxAttempts,
          }
        );
        this.transitionToOpen();
        throw new CircuitBreakerError(this.config.name, this.state);
      }
      this.halfOpenAttempts++;
    }

    // Execute the function
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalAttempts: this.totalAttempts,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
    };
  }

  /**
   * Manually reset circuit breaker (for testing/admin)
   */
  reset(): void {
    logger.info(`[CircuitBreaker] Manual reset of '${this.config.name}'`);
    this.transitionToClosed();
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = null;
  }

  // Private methods

  private onSuccess(): void {
    this.successCount++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      logger.info(`[CircuitBreaker] '${this.config.name}' HALF_OPEN test succeeded, closing`, {
        halfOpenAttempts: this.halfOpenAttempts,
      });
      this.transitionToClosed();
      this.failureCount = 0;
      this.halfOpenAttempts = 0;
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in CLOSED state
      if (this.failureCount > 0) {
        logger.debug(`[CircuitBreaker] '${this.config.name}' recovered, resetting failure count`);
        this.failureCount = 0;
      }
    }
  }

  private onFailure(error: unknown): void {
    if (!this.config.shouldCountFailure(error)) {
      logger.debug(`[CircuitBreaker] '${this.config.name}' error not counted as failure`, {
        error,
      });
      return;
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn(`[CircuitBreaker] '${this.config.name}' failure detected`, {
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
      error: error instanceof Error ? error.message : String(error),
    });

    if (this.state === CircuitState.HALF_OPEN) {
      logger.warn(`[CircuitBreaker] '${this.config.name}' HALF_OPEN test failed, reopening`);
      this.transitionToOpen();
      this.halfOpenAttempts = 0;
    } else if (
      this.state === CircuitState.CLOSED &&
      this.failureCount >= this.config.failureThreshold
    ) {
      logger.error(`[CircuitBreaker] '${this.config.name}' threshold exceeded, opening circuit`, {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
      });
      this.transitionToOpen();
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    const timeSinceFailure = Date.now() - this.lastFailureTime;
    return timeSinceFailure >= this.config.resetTimeout;
  }

  private transitionToClosed(): void {
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    if (previousState !== CircuitState.CLOSED) {
      logger.info(`[CircuitBreaker] '${this.config.name}' transitioned to CLOSED`, {
        previousState,
        successCount: this.successCount,
      });
    }
    this.clearResetTimer();
  }

  private transitionToOpen(): void {
    const previousState = this.state;
    this.state = CircuitState.OPEN;
    if (previousState !== CircuitState.OPEN) {
      logger.error(`[CircuitBreaker] '${this.config.name}' transitioned to OPEN`, {
        previousState,
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
      });
    }
    this.scheduleReset();
  }

  private transitionToHalfOpen(): void {
    const previousState = this.state;
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenAttempts = 0;
    logger.info(`[CircuitBreaker] '${this.config.name}' transitioned to HALF_OPEN`, {
      previousState,
      maxAttempts: this.config.halfOpenMaxAttempts,
    });
  }

  private scheduleReset(): void {
    this.clearResetTimer();
    // Note: We don't actually schedule a timer here because we check
    // shouldAttemptReset() on each execute() call. This is more efficient
    // and doesn't require timer cleanup.
  }

  private clearResetTimer(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  private defaultShouldCountFailure(error: unknown): boolean {
    // Network errors and 5xx errors should count
    if (error instanceof Error) {
      // Network/fetch errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return true;
      }
    }

    // HTTP status codes
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      // 5xx errors should count, 4xx generally shouldn't (client errors)
      return status >= 500 && status < 600;
    }

    // Default: count as failure
    return true;
  }
}

/**
 * Factory function to create a circuit breaker
 */
export function createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
  return new CircuitBreaker(config);
}

/**
 * Global registry of circuit breakers for monitoring
 */
export class CircuitBreakerRegistry {
  private static breakers = new Map<string, CircuitBreaker>();

  static register(name: string, breaker: CircuitBreaker): void {
    this.breakers.set(name, breaker);
  }

  static get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  static getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }

  static resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
  }
}
