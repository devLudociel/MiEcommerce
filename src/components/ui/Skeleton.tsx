// src/components/ui/Skeleton.tsx
import React from 'react';

/**
 * Base Skeleton component for loading states
 * Provides a shimmer animation for better UX during lazy loading
 */
interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'shimmer',
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200';

  const variantClasses = {
    rectangular: 'rounded',
    circular: 'rounded-full',
    text: 'rounded h-4',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    shimmer:
      'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : '100%'),
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
}

/**
 * Dashboard Chart Skeleton
 * Used while Recharts is loading
 */
export function DashboardChartSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
      {/* Title */}
      <Skeleton width="40%" height={24} className="mb-4" />

      {/* Chart area */}
      <div className="relative h-64 bg-gray-50 rounded-lg overflow-hidden">
        <Skeleton height="100%" animation="shimmer" />

        {/* Simulated chart bars */}
        <div className="absolute inset-0 flex items-end justify-around p-4 gap-2">
          {[60, 80, 45, 90, 70, 55, 85].map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-300 rounded-t animate-pulse"
              style={{ height: `${height}%`, animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 justify-center">
        <Skeleton width={100} height={16} />
        <Skeleton width={100} height={16} />
      </div>
    </div>
  );
}

/**
 * Product Grid Skeleton
 * Used while product listings are loading
 */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Image */}
          <div className="aspect-square bg-gray-200 relative overflow-hidden">
            <Skeleton height="100%" animation="shimmer" />
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Title */}
            <Skeleton width="75%" height={20} />

            {/* Description */}
            <Skeleton width="100%" height={16} />
            <Skeleton width="60%" height={16} />

            {/* Price */}
            <Skeleton width="40%" height={24} className="mt-4" />

            {/* Button */}
            <Skeleton height={40} className="rounded-lg mt-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Product Card Skeleton (single card)
 */
export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="aspect-square bg-gray-200 relative overflow-hidden">
        <Skeleton height="100%" animation="shimmer" />
      </div>
      <div className="p-4 space-y-3">
        <Skeleton width="75%" height={20} />
        <Skeleton width="100%" height={16} />
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={24} className="mt-4" />
        <Skeleton height={40} className="rounded-lg mt-4" />
      </div>
    </div>
  );
}

/**
 * Table Skeleton
 * Used for data tables (orders, products, etc.)
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {[...Array(columns)].map((_, i) => (
            <Skeleton key={i} width="80%" height={20} />
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {[...Array(rows)].map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {[...Array(columns)].map((_, colIndex) => (
                <Skeleton key={colIndex} width="70%" height={16} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * KPI Card Skeleton
 * Used for dashboard metric cards
 */
export function KPICardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <Skeleton width={100} height={16} />
        <Skeleton variant="circular" width={40} height={40} />
      </div>
      <Skeleton width="60%" height={32} className="mb-2" />
      <Skeleton width="40%" height={16} />
    </div>
  );
}

/**
 * Dashboard Stats Grid Skeleton
 * Complete skeleton for dashboard overview
 */
export function DashboardStatsGridSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardChartSkeleton />
        <DashboardChartSkeleton />
      </div>

      {/* Table */}
      <TableSkeleton rows={5} columns={4} />
    </div>
  );
}

/**
 * Order Detail Skeleton
 * Used while loading order details
 */
export function OrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <Skeleton width="50%" height={32} className="mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton width="40%" height={16} className="mb-2" />
            <Skeleton width="80%" height={20} />
          </div>
          <div>
            <Skeleton width="40%" height={16} className="mb-2" />
            <Skeleton width="80%" height={20} />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <Skeleton width="30%" height={24} className="mb-4" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 items-center pb-4 border-b border-gray-200">
            <Skeleton variant="rectangular" width={100} height={100} />
            <div className="flex-1 space-y-2">
              <Skeleton width="60%" height={20} />
              <Skeleton width="40%" height={16} />
              <Skeleton width="30%" height={24} />
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <Skeleton width="30%" height={24} className="mb-4" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton width="40%" height={16} />
              <Skeleton width="20%" height={16} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Form Skeleton
 * Used while loading forms
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <Skeleton width="40%" height={28} className="mb-6" />

      {[...Array(fields)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width="30%" height={16} />
          <Skeleton height={40} className="rounded-lg" />
        </div>
      ))}

      <div className="flex gap-4 mt-8">
        <Skeleton width={120} height={44} className="rounded-lg" />
        <Skeleton width={120} height={44} className="rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Image Gallery Skeleton
 * Used for image galleries and customizer
 */
export function ImageGallerySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
          <Skeleton height="100%" animation="shimmer" />
        </div>
      ))}
    </div>
  );
}

/**
 * Customizer Preview Skeleton
 * Used while customizer is loading
 */
export function CustomizerPreviewSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Preview area */}
      <div className="flex-1 bg-white rounded-xl shadow-lg p-6">
        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
          <Skeleton height="100%" animation="shimmer" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton variant="circular" width={120} height={120} />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full lg:w-96 bg-white rounded-xl shadow-lg p-6 space-y-6">
        <Skeleton width="60%" height={28} className="mb-6" />

        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton width="40%" height={16} />
            <Skeleton height={40} className="rounded-lg" />
          </div>
        ))}

        <Skeleton height={48} className="rounded-lg mt-8" />
      </div>
    </div>
  );
}

export default Skeleton;
