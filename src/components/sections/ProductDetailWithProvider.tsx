// src/components/sections/ProductDetailWithProvider.tsx

/**
 * ProductDetail wrapper with QueryProvider
 *
 * This wrapper ensures that ProductDetail has access to QueryClient
 * when used as an Astro island with client:load directive.
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/react-query/queryClient';
import ProductDetail from './ProductDetail';

interface ProductDetailWithProviderProps {
  id?: string;
  slug?: string;
}

export default function ProductDetailWithProvider({ id, slug }: ProductDetailWithProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ProductDetail id={id} slug={slug} />
    </QueryClientProvider>
  );
}
