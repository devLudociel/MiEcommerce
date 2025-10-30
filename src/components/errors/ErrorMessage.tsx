// src/components/errors/ErrorMessage.tsx

/**
 * ErrorMessage Component
 *
 * Componente para mostrar mensajes de error inline.
 *
 * Uso:
 * ```tsx
 * {error && <ErrorMessage error={error} />}
 * <ErrorMessage message="No se pudo cargar los productos" />
 * <ErrorMessage
 *   message="Error en el servidor"
 *   onRetry={handleRetry}
 * />
 * ```
 */

import React from 'react';

interface ErrorMessageProps {
  error?: Error | string | null;
  message?: string;
  onRetry?: () => void;
  className?: string;
  variant?: 'inline' | 'card' | 'banner';
}

export default function ErrorMessage({
  error,
  message,
  onRetry,
  className = '',
  variant = 'card',
}: ErrorMessageProps) {
  const errorMessage =
    message || (error instanceof Error ? error.message : String(error || 'Ha ocurrido un error'));

  if (variant === 'inline') {
    return <div className={`text-red-600 text-sm ${className}`}>⚠️ {errorMessage}</div>;
  }

  if (variant === 'banner') {
    return (
      <div
        className={`
          bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg
          ${className}
        `}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0 text-2xl mr-3">⚠️</div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 text-sm text-red-700 font-semibold hover:text-red-800 underline"
              >
                Intentar de nuevo
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Variant: card (default)
  return (
    <div
      className={`
        bg-white border-2 border-red-200 rounded-2xl p-6
        shadow-lg
        ${className}
      `}
    >
      <div className="text-center">
        <div className="text-5xl mb-3">😕</div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">¡Ups! Algo salió mal</h3>
        <p className="text-gray-600 mb-4">{errorMessage}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-gradient-rainbow text-white font-bold rounded-xl hover:scale-105 transition-transform"
          >
            Intentar de nuevo
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Empty State Component
 */
interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon = '📦',
  title,
  message,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      {message && <p className="text-gray-600 mb-6 max-w-md mx-auto">{message}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-gradient-rainbow text-white font-bold rounded-xl hover:scale-105 transition-transform"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
