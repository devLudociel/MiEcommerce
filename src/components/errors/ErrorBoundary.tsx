// src/components/errors/ErrorBoundary.tsx

/**
 * ErrorBoundary Component
 *
 * Captura errores de React y muestra UI de fallback.
 *
 * Uso:
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('[ErrorBoundary] Caught error', { error, errorInfo });

    this.setState({
      error,
      errorInfo,
    });

    // Callback personalizado
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: Enviar a Sentry en producción
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, {
    //     contexts: { react: { componentStack: errorInfo.componentStack } },
    //   });
    // }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Usar fallback personalizado si existe
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback por defecto
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Componente de fallback por defecto
 */
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset?: () => void;
}

export function ErrorFallback({ error, errorInfo, onReset }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8 border-2 border-red-200">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">¡Oops! Algo salió mal</h1>
          <p className="text-gray-600">Lo sentimos, ha ocurrido un error inesperado.</p>
        </div>

        {import.meta.env.DEV && error && (
          <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-200">
            <h3 className="font-bold text-red-900 mb-2">Detalles del Error (Solo Dev):</h3>
            <pre className="text-sm text-red-800 overflow-auto max-h-40">{error.toString()}</pre>
            {errorInfo && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-red-700 font-semibold">
                  Component Stack
                </summary>
                <pre className="text-xs text-red-700 mt-2 overflow-auto max-h-32">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          {onReset && (
            <button
              onClick={onReset}
              className="px-6 py-3 bg-gradient-rainbow text-white font-bold rounded-xl hover:scale-105 transition-transform"
            >
              Intentar de nuevo
            </button>
          )}
          <button
            onClick={() => (window.location.href = '/')}
            className="px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300 transition-colors"
          >
            Volver al inicio
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Si el problema persiste, por favor contacta a soporte.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
