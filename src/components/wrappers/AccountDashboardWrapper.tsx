/**
 * PERFORMANCE OPTIMIZED: Wrapper with Suspense for lazy-loaded AccountDashboard
 *
 * Code-splits the account dashboard to improve initial page load.
 */

import { Suspense } from 'react';
import { LazyAccountDashboard, LazyLoadingSkeleton } from '../lazy';

export default function AccountDashboardWrapper() {
  return (
    <Suspense fallback={<LazyLoadingSkeleton height="600px" />}>
      <LazyAccountDashboard />
    </Suspense>
  );
}
