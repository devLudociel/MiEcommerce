/**
 * PERFORMANCE OPTIMIZED: Wrapper with Suspense for lazy-loaded AdminDashboard
 *
 * This component uses React.lazy() and Suspense to code-split the AdminDashboard,
 * reducing the initial bundle size and improving page load performance.
 *
 * Usage in Astro pages:
 * ---
 * import AdminDashboardWrapper from '@/components/wrappers/AdminDashboardWrapper';
 * ---
 * <AdminDashboardWrapper client:load />
 */

import { Suspense } from 'react';
import { LazyAdminDashboard, LazyLoadingSkeleton } from '../lazy';

export default function AdminDashboardWrapper() {
  return (
    <Suspense fallback={<LazyLoadingSkeleton height="600px" />}>
      <LazyAdminDashboard />
    </Suspense>
  );
}
