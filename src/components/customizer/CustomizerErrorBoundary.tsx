import React, { Component } from 'react';
import { logger } from '../../lib/logger';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class CustomizerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('[CustomizerErrorBoundary] Error caught:', error);
    logger.error('[CustomizerErrorBoundary] Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
            <div className="text-6xl mb-4 text-center">💥</div>
            <h2 className="text-2xl font-bold text-red-900 mb-4 text-center">
              Error al Cargar el Customizer
            </h2>
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-mono text-sm">
                {this.state.error?.message || 'Error desconocido'}
              </p>
              {this.state.error?.stack && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-red-700 text-sm font-semibold">
                    Ver stack trace
                  </summary>
                  <pre className="mt-2 text-xs text-red-700 overflow-auto max-h-48">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
              >
                🔄 Recargar Página
              </button>
              <a
                href="/"
                className="block w-full px-6 py-3 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition-colors text-center"
              >
                ← Volver al Inicio
              </a>
            </div>
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>💡 Tip:</strong> Abre la consola del navegador (F12) para ver más detalles
                del error.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
