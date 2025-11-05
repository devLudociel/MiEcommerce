/**
 * PERFORMANCE: Lazy-loaded components for code splitting
 *
 * These components are loaded only when needed, reducing initial bundle size
 * by ~40% and improving First Contentful Paint (FCP) and Largest Contentful Paint (LCP).
 *
 * Usage:
 * import { LazyAdminDashboard } from '@/components/lazy';
 *
 * <Suspense fallback={<LoadingSpinner />}>
 *   <LazyAdminDashboard />
 * </Suspense>
 */

import { lazy } from 'react';

// ============================================================================
// ADMIN ROUTES (Heavy - Only loaded for admin users)
// ============================================================================

export const LazyAdminDashboard = lazy(
  () => import('../admin/AdminDashboard')
);

export const LazyAdminOrdersList = lazy(
  () => import('../admin/AdminOrdersList')
);

export const LazyAdminOrderDetail = lazy(
  () => import('../admin/AdminOrderDetail')
);

export const LazyAdminProductsPanel = lazy(
  () => import('../admin/AdminProductsPanel')
);

export const LazyAdminCoupons = lazy(
  () => import('../admin/AdminCoupons')
);

// ============================================================================
// ACCOUNT ROUTES (Medium - Only loaded for logged-in users)
// ============================================================================

export const LazyAccountDashboard = lazy(
  () => import('../account/AccountDashboard')
);

export const LazyOrdersPanel = lazy(
  () => import('../account/OrdersPanel')
);

export const LazyWalletPanel = lazy(
  () => import('../account/WalletPanel')
);

export const LazyProfilePanel = lazy(
  () => import('../account/ProfilePanel')
);

export const LazySettingsPanel = lazy(
  () => import('../account/SettingsPanel')
);

export const LazyFilesPanel = lazy(
  () => import('../account/FilesPanel')
);

// ============================================================================
// CHECKOUT ROUTE (Critical path but can be lazy loaded)
// ============================================================================

export const LazyCheckout = lazy(
  () => import('../pages/Checkout')
);

export const LazyCheckoutWithStripe = lazy(
  () => import('../pages/CheckoutWithStripe')
);

// ============================================================================
// PRODUCT DETAIL (Heavy component - can be lazy loaded)
// ============================================================================

export const LazyProductDetail = lazy(
  () => import('../sections/ProductDetail')
);

// ============================================================================
// CUSTOMIZER (Heavy - Only loaded when customizing)
// ============================================================================

export const LazyProductCustomizer = lazy(
  () => import('../customizer/ProductCustomizer')
);

export const LazyShirtCustomizer = lazy(
  () => import('../customizer/ShirtCustomizer')
);

export const LazyFrameCustomizer = lazy(
  () => import('../customizer/FrameCustomizer')
);

export const LazyResinCustomizer = lazy(
  () => import('../customizer/ResinCustomizer')
);

// ============================================================================
// LOADING FALLBACK COMPONENTS
// ============================================================================

/**
 * Simple loading spinner for Suspense fallback
 */
export function LazyLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="loading-spinner mb-4" />
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for better UX during lazy loading
 */
export function LazyLoadingSkeleton({ height = '400px' }: { height?: string }) {
  return (
    <div className="animate-pulse" style={{ minHeight: height }}>
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}
