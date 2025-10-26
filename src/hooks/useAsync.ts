// src/hooks/useAsync.ts

/**
 * Hook useAsync
 *
 * Hook para manejar operaciones asíncronas con loading, error y data states.
 *
 * Uso:
 * ```typescript
 * const { execute, loading, error, data } = useAsync(async () => {
 *   return await fetchProducts();
 * });
 *
 * // En useEffect o handler
 * useEffect(() => {
 *   execute();
 * }, []);
 *
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 * return <ProductList products={data} />;
 * ```
 */

import { useState, useCallback } from 'react';
import { logger } from '../lib/logger';

export interface UseAsyncReturn<T> {
  execute: (...args: any[]) => Promise<T | undefined>;
  loading: boolean;
  error: Error | null;
  data: T | null;
  reset: () => void;
}

export interface UseAsyncOptions {
  /**
   * Ejecutar automáticamente al montar
   */
  immediate?: boolean;

  /**
   * Callback cuando la operación es exitosa
   */
  onSuccess?: (data: any) => void;

  /**
   * Callback cuando hay error
   */
  onError?: (error: Error) => void;

  /**
   * Nombre para logging
   */
  name?: string;
}

/**
 * Hook para manejar operaciones asíncronas
 */
export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions = {}
): UseAsyncReturn<T> {
  const { immediate = false, onSuccess, onError, name = 'AsyncOperation' } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (...args: any[]): Promise<T | undefined> => {
      setLoading(true);
      setError(null);

      logger.debug(`[useAsync] ${name} started`, { args });

      try {
        const result = await asyncFunction(...args);
        setData(result);
        logger.info(`[useAsync] ${name} succeeded`);

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        logger.error(`[useAsync] ${name} failed`, error);

        if (onError) {
          onError(error);
        }

        throw error;
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction, name, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
    logger.debug(`[useAsync] ${name} reset`);
  }, [name]);

  return { execute, loading, error, data, reset };
}

/**
 * Hook simplificado para fetch de datos
 */
export function useFetch<T>(
  fetchFunction: () => Promise<T>,
  options: UseAsyncOptions = {}
): UseAsyncReturn<T> {
  return useAsync(fetchFunction, { ...options, name: options.name || 'Fetch' });
}

export default useAsync;
