// src/lib/notifications.ts

/**
 * Sistema de Notificaciones
 *
 * Notificaciones toast elegantes para feedback al usuario.
 *
 * Uso:
 * ```typescript
 * import { notify } from '@/lib/notifications';
 *
 * notify.success('¡Producto agregado al carrito!');
 * notify.error('Error al procesar el pago');
 * notify.warning('Stock bajo en este producto');
 * notify.info('Tu pedido está en camino');
 * notify.promise(
 *   saveOrder(),
 *   {
 *     loading: 'Guardando pedido...',
 *     success: '¡Pedido guardado!',
 *     error: 'Error al guardar'
 *   }
 * );
 * ```
 */

import toast, { Toaster } from 'react-hot-toast';
import { logger } from './logger';

// Configuración de estilos
const toastConfig = {
  duration: 4000,
  position: 'top-right' as const,

  // Estilos personalizados
  style: {
    borderRadius: '12px',
    background: '#fff',
    color: '#1f2937',
    padding: '16px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    maxWidth: '500px',
  },

  // Iconos personalizados
  success: {
    duration: 3000,
    iconTheme: {
      primary: '#10b981',
      secondary: '#fff',
    },
  },

  error: {
    duration: 5000,
    iconTheme: {
      primary: '#ef4444',
      secondary: '#fff',
    },
  },

  loading: {
    iconTheme: {
      primary: '#3b82f6',
      secondary: '#fff',
    },
  },
};

/**
 * Sistema de notificaciones
 */
export const notify = {
  /**
   * Notificación de éxito
   */
  success(message: string, options?: any): string {
    logger.info('[Notify] Success toast', { message });
    return toast.success(message, {
      ...toastConfig,
      ...toastConfig.success,
      ...options,
    });
  },

  /**
   * Notificación de error
   */
  error(message: string, options?: any): string {
    logger.error('[Notify] Error toast', { message });
    return toast.error(message, {
      ...toastConfig,
      ...toastConfig.error,
      ...options,
    });
  },

  /**
   * Notificación de advertencia
   */
  warning(message: string, options?: any): string {
    logger.warn('[Notify] Warning toast', { message });
    return toast(message, {
      ...toastConfig,
      icon: '⚠️',
      ...options,
      style: {
        ...toastConfig.style,
        borderLeft: '4px solid #f59e0b',
      },
    });
  },

  /**
   * Notificación informativa
   */
  info(message: string, options?: any): string {
    logger.info('[Notify] Info toast', { message });
    return toast(message, {
      ...toastConfig,
      icon: 'ℹ️',
      ...options,
      style: {
        ...toastConfig.style,
        borderLeft: '4px solid #3b82f6',
      },
    });
  },

  /**
   * Notificación con loading automático
   */
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    options?: any
  ): Promise<T> {
    logger.debug('[Notify] Promise toast', { messages });
    return toast.promise(promise, messages, {
      ...toastConfig,
      ...options,
    });
  },

  /**
   * Notificación personalizada con JSX
   */
  custom(content: React.ReactNode, options?: any): string {
    return toast.custom(content, {
      ...toastConfig,
      ...options,
    });
  },

  /**
   * Cerrar notificación específica
   */
  dismiss(toastId?: string): void {
    toast.dismiss(toastId);
  },

  /**
   * Cerrar todas las notificaciones
   */
  dismissAll(): void {
    toast.dismiss();
  },

  /**
   * Remover notificación específica
   */
  remove(toastId: string): void {
    toast.remove(toastId);
  },
};

/**
 * Componente Toaster para agregar al layout
 */
export { Toaster };

/**
 * Configuración global del Toaster
 */
export const toasterConfig = {
  position: 'top-right' as const,
  reverseOrder: false,
  gutter: 8,
  containerClassName: '',
  containerStyle: {},
  toastOptions: {
    ...toastConfig,
  },
};

export default notify;
