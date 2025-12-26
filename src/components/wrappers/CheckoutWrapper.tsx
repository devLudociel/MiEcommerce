/**
 * PERFORMANCE OPTIMIZED: Wrapper with Suspense for lazy-loaded Checkout
 *
 * Code-splits the checkout flow to improve initial page load.
 * The checkout component is only loaded when the user navigates to /checkout.
 */

import { Suspense } from 'react';
import { LazyCheckoutWithStripe, LazyLoadingSkeleton } from '../lazy';

export default function CheckoutWrapper() {
  return (
    <Suspense fallback={<LazyLoadingSkeleton height="800px" />}>
      <LazyCheckoutWithStripe />
    </Suspense>
  );
}
