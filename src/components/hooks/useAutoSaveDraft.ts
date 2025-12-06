import { useEffect, useRef } from 'react';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';

/**
 * Hook para auto-guardar borradores en localStorage cada 30 segundos
 *
 * Previene pérdida de datos cuando el usuario:
 * - Cierra la pestaña accidentalmente
 * - Navega a otra página sin guardar
 * - Pierde conexión a internet
 * - Tiene un error del navegador
 *
 * @param key - Clave única de localStorage para este borrador
 * @param data - Datos a guardar (se guardará cuando cambien)
 * @param enabled - Si está habilitado el auto-guardado (default: true)
 * @param intervalMs - Intervalo de guardado en milisegundos (default: 30000 = 30s)
 */
export function useAutoSaveDraft<T>(
  key: string,
  data: T,
  enabled: boolean = true,
  intervalMs: number = 30000
) {
  const lastSavedData = useRef<string>('');
  const isSaving = useRef(false);
  const hasShownNotification = useRef(false);

  // Auto-save effect con debounce
  useEffect(() => {
    if (!enabled || !key) return;

    const saveDraft = () => {
      try {
        const currentData = JSON.stringify(data);

        // No guardar si los datos no han cambiado
        if (currentData === lastSavedData.current) {
          return;
        }

        // Evitar guardados simultáneos
        if (isSaving.current) {
          return;
        }

        isSaving.current = true;

        // Guardar en localStorage
        localStorage.setItem(key, currentData);
        localStorage.setItem(`${key}_timestamp`, new Date().toISOString());

        lastSavedData.current = currentData;
        isSaving.current = false;

        // Mostrar notificación solo la primera vez
        if (!hasShownNotification.current && currentData !== '{}') {
          logger.info('[AutoSaveDraft] Auto-guardado habilitado', { key });
          hasShownNotification.current = true;
        }
      } catch (error) {
        logger.error('[AutoSaveDraft] Error saving draft', { key, error });
        isSaving.current = false;
      }
    };

    // Guardar inmediatamente al montar
    saveDraft();

    // Configurar intervalo para auto-guardado
    const intervalId = setInterval(saveDraft, intervalMs);

    // Limpiar intervalo al desmontar
    return () => {
      clearInterval(intervalId);
    };
  }, [key, data, enabled, intervalMs]);

  // Guardar antes de cerrar la pestaña
  useEffect(() => {
    if (!enabled || !key) return;

    const handleBeforeUnload = () => {
      try {
        const currentData = JSON.stringify(data);
        localStorage.setItem(key, currentData);
        localStorage.setItem(`${key}_timestamp`, new Date().toISOString());
        logger.info('[AutoSaveDraft] Saved on page unload', { key });
      } catch (error) {
        logger.error('[AutoSaveDraft] Error saving on unload', { key, error });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [key, data, enabled]);

  return {
    /**
     * Carga un borrador guardado de localStorage
     * @returns Los datos guardados o null si no existe borrador
     */
    loadDraft: (): T | null => {
      try {
        const saved = localStorage.getItem(key);
        if (!saved) return null;

        const parsed = JSON.parse(saved) as T;
        logger.info('[AutoSaveDraft] Draft loaded', { key });
        return parsed;
      } catch (error) {
        logger.error('[AutoSaveDraft] Error loading draft', { key, error });
        return null;
      }
    },

    /**
     * Elimina el borrador guardado
     */
    clearDraft: () => {
      try {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_timestamp`);
        lastSavedData.current = '';
        logger.info('[AutoSaveDraft] Draft cleared', { key });
      } catch (error) {
        logger.error('[AutoSaveDraft] Error clearing draft', { key, error });
      }
    },

    /**
     * Obtiene la fecha del último guardado
     * @returns Fecha ISO string o null si no hay borrador
     */
    getLastSavedTime: (): string | null => {
      try {
        return localStorage.getItem(`${key}_timestamp`);
      } catch {
        // Intentional: localStorage may be unavailable - return null
        return null;
      }
    },

    /**
     * Verifica si existe un borrador guardado
     * @returns true si existe un borrador
     */
    hasDraft: (): boolean => {
      try {
        return localStorage.getItem(key) !== null;
      } catch {
        // Intentional: localStorage may be unavailable - return false
        return false;
      }
    },
  };
}
