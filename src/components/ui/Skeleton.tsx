/**
 * Skeleton Component
 * Loading placeholders that match the shape of content for better perceived performance
 *
 * Based on best practices from:
 * - Material Design loading patterns
 * - WCAG 2.1 AA accessibility guidelines
 * - Modern UX research showing skeletons reduce perceived wait time by 30%
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`
        bg-gray-200
        ${variantClasses[variant]}
        ${animationClasses[animation]}
        ${className}
      `}
      style={style}
      role="status"
      aria-label="Cargando contenido"
      aria-live="polite"
    >
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

/**
 * Skeleton para tarjeta de producto
 */
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Imagen del producto */}
      <Skeleton variant="rectangular" height={256} className="w-full" />

      <div className="p-4 space-y-3">
        {/* Título */}
        <Skeleton variant="text" height={24} className="w-3/4" />

        {/* Precio */}
        <Skeleton variant="text" height={28} className="w-1/3" />

        {/* Descripción corta */}
        <div className="space-y-2">
          <Skeleton variant="text" height={16} className="w-full" />
          <Skeleton variant="text" height={16} className="w-5/6" />
        </div>

        {/* Botón */}
        <Skeleton variant="rounded" height={40} className="w-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton para lista de productos (grid)
 */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton para panel de personalización
 */
export function CustomizerPanelSkeleton() {
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" height={24} width={180} />
        <Skeleton variant="circular" width={40} height={40} />
      </div>

      {/* Campo de formulario 1 */}
      <div className="space-y-2">
        <Skeleton variant="text" height={20} width={120} />
        <Skeleton variant="rounded" height={48} className="w-full" />
      </div>

      {/* Campo de formulario 2 */}
      <div className="space-y-2">
        <Skeleton variant="text" height={20} width={140} />
        <Skeleton variant="rounded" height={48} className="w-full" />
      </div>

      {/* Preview area */}
      <div className="space-y-2">
        <Skeleton variant="text" height={20} width={100} />
        <Skeleton variant="rounded" height={200} className="w-full" />
      </div>

      {/* Controles */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton variant="rounded" height={44} />
        <Skeleton variant="rounded" height={44} />
      </div>
    </div>
  );
}

/**
 * Skeleton para imagen con texto
 */
export function ImageWithTextSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton variant="rounded" height={200} className="w-full" />
      <Skeleton variant="text" height={20} className="w-3/4" />
      <Skeleton variant="text" height={16} className="w-full" />
      <Skeleton variant="text" height={16} className="w-5/6" />
    </div>
  );
}

/**
 * Skeleton para tabla de admin
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-200">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="text" height={16} />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton variant="text" height={16} width={100} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Skeleton para formulario
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" height={20} width={120} />
          <Skeleton variant="rounded" height={48} className="w-full" />
        </div>
      ))}
      <Skeleton variant="rounded" height={48} width={200} />
    </div>
  );
}

/**
 * Skeleton para página de detalles de producto
 */
export function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Galería de imágenes */}
      <div className="space-y-4">
        <Skeleton variant="rounded" height={400} className="w-full" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={80} />
          ))}
        </div>
      </div>

      {/* Información del producto */}
      <div className="space-y-6">
        {/* Título y precio */}
        <div className="space-y-3">
          <Skeleton variant="text" height={32} className="w-3/4" />
          <Skeleton variant="text" height={36} className="w-1/3" />
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <Skeleton variant="text" height={16} className="w-full" />
          <Skeleton variant="text" height={16} className="w-full" />
          <Skeleton variant="text" height={16} className="w-4/5" />
        </div>

        {/* Opciones */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton variant="text" height={20} width={100} />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="circular" width={48} height={48} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton variant="text" height={20} width={80} />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rounded" width={60} height={40} />
              ))}
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="space-y-3">
          <Skeleton variant="rounded" height={56} className="w-full" />
          <Skeleton variant="rounded" height={48} className="w-full" />
        </div>
      </div>
    </div>
  );
}
