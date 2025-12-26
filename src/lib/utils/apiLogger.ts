/**
 * API Logger Utility
 *
 * Centralized logging for API routes and server-side code.
 * This avoids import issues with the main logger in API contexts.
 *
 * Usage:
 * import { apiLogger } from '@/lib/utils/apiLogger';
 * apiLogger.info('Payment intent created', { orderId });
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogData {
  [key: string]: any;
}

/**
 * Format log message with data
 */
function formatLog(level: LogLevel, message: string, data?: LogData): string {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase();
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${levelUpper}] ${message}${dataStr}`;
}

/**
 * API Logger instance
 */
export const apiLogger = {
  /**
   * Log informational message
   */
  info: (message: string, data?: LogData): void => {
    console.log(formatLog('info', message, data));
  },

  /**
   * Log warning message
   */
  warn: (message: string, data?: LogData): void => {
    console.warn(formatLog('warn', message, data));
  },

  /**
   * Log error message
   */
  error: (message: string, error?: unknown): void => {
    const errorData =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { error: String(error) };
    console.error(formatLog('error', message, errorData));
  },

  /**
   * Log debug message (only in development)
   */
  debug: (message: string, data?: LogData): void => {
    if (import.meta.env.DEV) {
      console.log(formatLog('debug', message, data));
    }
  },
};

/**
 * Create a scoped logger with a prefix
 *
 * @example
 * const logger = createScopedLogger('create-payment-intent');
 * logger.info('Processing payment', { orderId: '123' });
 * // Output: [2024-01-01T12:00:00.000Z] [INFO] [create-payment-intent] Processing payment {"orderId":"123"}
 */
export function createScopedLogger(scope: string) {
  return {
    info: (message: string, data?: LogData) => apiLogger.info(`[${scope}] ${message}`, data),
    warn: (message: string, data?: LogData) => apiLogger.warn(`[${scope}] ${message}`, data),
    error: (message: string, error?: unknown) => apiLogger.error(`[${scope}] ${message}`, error),
    debug: (message: string, data?: LogData) => apiLogger.debug(`[${scope}] ${message}`, data),
  };
}
