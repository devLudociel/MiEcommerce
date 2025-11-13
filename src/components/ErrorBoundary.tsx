/**
 * Global Error Boundary
 *
 * Captura errores de React y muestra un UI de fallback amigable
 * en lugar de crashear toda la aplicación.
 *
 * FEATURES:
 * - Captura errores de renderizado de componentes
 * - Muestra UI de error informativo
 * - Log de errores para debugging
 * - Botón para recargar la página
 * - Previene crash completo de la app
 *
 * USAGE:
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../lib/logger';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    logger.error('[ErrorBoundary] Component error caught', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      errorInfo,
    });

    // TODO: Send to error tracking service (Sentry, etc.)
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    // }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Reload the page
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={40} />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-800 text-center mb-4">
              ¡Ups! Algo salió mal
            </h1>

            {/* Description */}
            <p className="text-gray-600 text-center mb-6">
              Ha ocurrido un error inesperado. No te preocupes, nuestro equipo ha sido notificado
              y estamos trabajando para solucionarlo.
            </p>

            {/* Error details (only in development) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-gray-100 rounded-xl p-4 mb-6 overflow-auto max-h-64">
                <h3 className="font-mono font-bold text-sm text-red-600 mb-2">
                  Error Details (DEV only):
                </h3>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo && (
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap mt-4">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-600 hover:to-blue-700 transform hover:scale-105 transition-all shadow-lg"
              >
                <RefreshCw size={20} />
                <span>Recargar Página</span>
              </button>

              <a
                href="/"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300 transform hover:scale-105 transition-all"
              >
                <span>Ir al Inicio</span>
              </a>
            </div>

            {/* Support link */}
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>
                Si el problema persiste, por favor{' '}
                <a href="/contacto" className="text-cyan-600 hover:underline font-medium">
                  contáctanos
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
