// src/components/ui/LoadingButton.tsx

/**
 * Componente LoadingButton
 *
 * Botón que muestra estado de carga automáticamente.
 *
 * Uso:
 * ```tsx
 * <LoadingButton
 *   onClick={handleSubmit}
 *   loading={isLoading}
 *   loadingText="Guardando..."
 * >
 *   Guardar
 * </LoadingButton>
 * ```
 */

import React from 'react';
import { InlineSpinner } from './LoadingSpinner';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-gradient-rainbow text-white hover:opacity-90',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  success: 'bg-green-600 text-white hover:bg-green-700',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export default function LoadingButton({
  loading = false,
  loadingText,
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
  children,
  ...props
}: LoadingButtonProps) {
  const isDisabled = loading || disabled;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        rounded-xl
        font-bold
        transition-all
        duration-200
        flex
        items-center
        justify-center
        gap-2
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        ${className}
      `}
    >
      {loading && <InlineSpinner className="text-current" />}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  );
}
