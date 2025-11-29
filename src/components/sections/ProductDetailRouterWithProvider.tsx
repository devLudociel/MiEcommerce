// src/components/sections/ProductDetailRouterWithProvider.tsx

/**
 * ProductDetailRouter wrapper with QueryProvider
 *
 * This wrapper ensures that ProductDetailRouter has access to QueryClient
 * when used as an Astro island with client:load directive.
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/react-query/queryClient';
import ProductDetailRouter from './ProductDetailRouter';

export default function ProductDetailRouterWithProvider() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProductDetailRouter />
    </QueryClientProvider>
  );
}
