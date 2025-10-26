// src/components/ui/SkeletonLoader.tsx

/**
 * Skeleton Loaders
 *
 * Placeholders animados para contenido en carga.
 *
 * Uso:
 * ```tsx
 * <ProductCardSkeleton />
 * <ProductGridSkeleton count={6} />
 * ```
 */

import React from 'react';

/**
 * Skeleton base genérico
 */
interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const roundedClasses = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Skeleton({
  className = '',
  width = 'w-full',
  height = 'h-4',
  rounded = 'md',
}: SkeletonProps) {
  return (
    <div
      className={`
        ${width}
        ${height}
        ${roundedClasses[rounded]}
        bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200
        animate-pulse
        ${className}
      `}
      style={{
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

/**
 * Skeleton para Product Card
 */
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
      {/* Imagen */}
      <Skeleton height="h-64" rounded="lg" className="mb-4" />

      <div className="p-6 space-y-3">
        {/* Nombre del producto */}
        <Skeleton height="h-6" width="w-3/4" />

        {/* Precio */}
        <Skeleton height="h-8" width="w-1/2" />

        {/* Rating */}
        <div className="flex items-center gap-2">
          <Skeleton height="h-4" width="w-24" />
          <Skeleton height="h-4" width="w-16" />
        </div>

        {/* Botones */}
        <div className="flex gap-2 pt-4">
          <Skeleton height="h-12" width="w-full" rounded="lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Grid de Skeleton Products
 */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton para Order Item
 */
export function OrderItemSkeleton() {
  return (
    <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
      <Skeleton height="h-20" width="w-20" rounded="lg" />
      <div className="flex-1 space-y-2">
        <Skeleton height="h-5" width="w-2/3" />
        <Skeleton height="h-4" width="w-1/3" />
        <Skeleton height="h-4" width="w-1/4" />
      </div>
    </div>
  );
}

/**
 * Skeleton para Dashboard Card
 */
export function DashboardCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <div className="space-y-4">
        <Skeleton height="h-4" width="w-1/3" />
        <Skeleton height="h-10" width="w-1/2" />
        <Skeleton height="h-3" width="w-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton para Table Row
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-200">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton height="h-4" width="w-full" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton para Profile
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Avatar y nombre */}
      <div className="flex items-center gap-4">
        <Skeleton height="h-20" width="w-20" rounded="full" />
        <div className="space-y-2 flex-1">
          <Skeleton height="h-6" width="w-1/3" />
          <Skeleton height="h-4" width="w-1/4" />
        </div>
      </div>

      {/* Campos de formulario */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton height="h-4" width="w-1/4" />
          <Skeleton height="h-12" width="w-full" rounded="lg" />
        </div>
      ))}
    </div>
  );
}

// Agregar animación de shimmer al CSS global
export const shimmerStyles = `
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;
