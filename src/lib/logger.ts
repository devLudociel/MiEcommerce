// src/lib/logger.ts

/**
 * Sistema de Logging Profesional
 *
 * Niveles:
 * - DEBUG: Información detallada para debugging (solo dev)
 * - INFO: Información general sobre el flujo de la app
 * - WARN: Advertencias que no rompen la funcionalidad
 * - ERROR: Errores que requieren atención
 *
 * Uso:
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * logger.debug('[Component] Loading data...', { userId: 123 });
 * logger.info('[API] Order created successfully', { orderId: 'abc' });
 * logger.warn('[Cart] localStorage quota exceeded', { size: '10MB' });
 * logger.error('[Payment] Stripe error', error);
 * ```
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4, // Deshabilitar todos los logs
}

/** Type for log data - accepts structured data or primitive values */
export type LogData =
  | Record<string, unknown>
  | Error
  | string
  | number
  | boolean
  | null
  | undefined;

/** Extended window interface for dev tools */
interface WindowWithLogger extends Window {
  __logger: typeof logger;
  __setLogLevel: typeof setLogLevel;
}

interface LoggerConfig {
  level: LogLevel;
  enableTimestamps: boolean;
  enableColors: boolean;
  prefix?: string;
}

// Configuración por ambiente
// Safe access to import.meta.env with fallback for server contexts
const getEnvMode = () => {
  try {
    return {
      isDev: import.meta.env?.DEV ?? false,
      isProd: import.meta.env?.PROD ?? true,
    };
  } catch {
    // Fallback for contexts where import.meta.env is not available
    return {
      isDev: process.env.NODE_ENV === 'development',
      isProd: process.env.NODE_ENV === 'production',
    };
  }
};

const { isDev: isDevelopment, isProd: isProduction } = getEnvMode();

// Nivel de log según ambiente
const defaultLogLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;

// Configuración global
let config: LoggerConfig = {
  level: defaultLogLevel,
  enableTimestamps: isDevelopment,
  enableColors: true,
  prefix: isDevelopment ? '[DEV]' : '[PROD]',
};

// Colores para la consola (solo en navegador con DevTools)
const colors = {
  debug: '#9CA3AF', // Gray
  info: '#3B82F6', // Blue
  warn: '#F59E0B', // Orange
  error: '#EF4444', // Red
  success: '#10B981', // Green
  reset: '#000000',
};

/**
 * Formatea el mensaje con timestamp y color
 */
function formatMessage(level: string, message: string, color: string): string {
  const timestamp = config.enableTimestamps ? `[${new Date().toLocaleTimeString('es-ES')}]` : '';

  const prefix = config.prefix ? `${config.prefix} ` : '';

  return `${prefix}${timestamp} ${message}`;
}

/**
 * Verifica si el nivel de log está habilitado
 */
function shouldLog(level: LogLevel): boolean {
  return level >= config.level;
}

/**
 * Logger principal
 */
export const logger = {
  /**
   * DEBUG: Información detallada para debugging (solo desarrollo)
   */
  debug(message: string, data?: LogData): void {
    if (!shouldLog(LogLevel.DEBUG)) return;

    const formattedMessage = formatMessage('DEBUG', message, colors.debug);

    if (config.enableColors && typeof window !== 'undefined') {
      console.log(`%c${formattedMessage}`, `color: ${colors.debug}`, data ?? '');
    } else {
      console.log(formattedMessage, data ?? '');
    }
  },

  /**
   * INFO: Información general sobre el flujo de la app
   */
  info(message: string, data?: LogData): void {
    if (!shouldLog(LogLevel.INFO)) return;

    const formattedMessage = formatMessage('INFO', message, colors.info);

    if (config.enableColors && typeof window !== 'undefined') {
      console.log(`%c${formattedMessage}`, `color: ${colors.info}`, data ?? '');
    } else {
      console.log(formattedMessage, data ?? '');
    }
  },

  /**
   * WARN: Advertencias que no rompen la funcionalidad
   */
  warn(message: string, data?: LogData): void {
    if (!shouldLog(LogLevel.WARN)) return;

    const formattedMessage = formatMessage('WARN', message, colors.warn);

    if (config.enableColors && typeof window !== 'undefined') {
      console.warn(`%c${formattedMessage}`, `color: ${colors.warn}`, data ?? '');
    } else {
      console.warn(formattedMessage, data ?? '');
    }
  },

  /**
   * ERROR: Errores que requieren atención
   */
  error(message: string, error?: unknown): void {
    if (!shouldLog(LogLevel.ERROR)) return;

    const formattedMessage = formatMessage('ERROR', message, colors.error);

    if (config.enableColors && typeof window !== 'undefined') {
      console.error(`%c${formattedMessage}`, `color: ${colors.error}`);
    } else {
      console.error(formattedMessage);
    }

    // Siempre mostrar el error completo
    if (error) {
      console.error(error);
    }

    // TODO: Enviar a Sentry en producción
    // if (isProduction && error) {
    //   Sentry.captureException(error);
    // }
  },

  /**
   * SUCCESS: Operaciones exitosas importantes
   */
  success(message: string, data?: LogData): void {
    if (!shouldLog(LogLevel.INFO)) return;

    const formattedMessage = formatMessage('SUCCESS', message, colors.success);

    if (config.enableColors && typeof window !== 'undefined') {
      console.log(`%c${formattedMessage}`, `color: ${colors.success}`, data ?? '');
    } else {
      console.log(formattedMessage, data ?? '');
    }
  },

  /**
   * Agrupa logs relacionados
   */
  group(label: string, callback: () => void): void {
    if (!shouldLog(LogLevel.DEBUG)) return;

    console.group(label);
    callback();
    console.groupEnd();
  },

  /**
   * Agrupa logs colapsados por defecto
   */
  groupCollapsed(label: string, callback: () => void): void {
    if (!shouldLog(LogLevel.DEBUG)) return;

    console.groupCollapsed(label);
    callback();
    console.groupEnd();
  },

  /**
   * Mide el tiempo de ejecución de una operación
   */
  time(label: string): void {
    if (!shouldLog(LogLevel.DEBUG)) return;
    console.time(label);
  },

  /**
   * Finaliza la medición de tiempo
   */
  timeEnd(label: string): void {
    if (!shouldLog(LogLevel.DEBUG)) return;
    console.timeEnd(label);
  },

  /**
   * Muestra una tabla (útil para arrays de objetos)
   */
  table(data: readonly object[] | Record<string, unknown>): void {
    if (!shouldLog(LogLevel.DEBUG)) return;
    console.table(data);
  },

  /**
   * Muestra un trace del stack
   */
  trace(message?: string): void {
    if (!shouldLog(LogLevel.DEBUG)) return;
    if (message) {
      console.log(message);
    }
    console.trace();
  },
};

/**
 * Configurar el logger
 */
export function configureLogger(newConfig: Partial<LoggerConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Establecer nivel de log dinámicamente
 */
export function setLogLevel(level: LogLevel): void {
  config.level = level;
  logger.info('[Logger] Log level changed', { level: LogLevel[level] });
}

/**
 * Helpers para debugging
 */
export const debug = {
  /**
   * Log solo en desarrollo
   */
  log(...args: unknown[]): void {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Verifica si estamos en desarrollo
   */
  isDev(): boolean {
    return isDevelopment;
  },

  /**
   * Verifica si estamos en producción
   */
  isProd(): boolean {
    return isProduction;
  },
};

// Exponer logger en window para debugging (solo dev)
if (isDevelopment && typeof window !== 'undefined') {
  const windowWithLogger = window as WindowWithLogger;
  windowWithLogger.__logger = logger;
  windowWithLogger.__setLogLevel = setLogLevel;

  console.log(
    '%c🔍 Logger disponible en window.__logger',
    'color: #10B981; font-weight: bold; font-size: 12px;'
  );
  console.log(
    '%c📊 Cambiar nivel: window.__setLogLevel(LogLevel.INFO)',
    'color: #3B82F6; font-size: 11px;'
  );
}

export default logger;
