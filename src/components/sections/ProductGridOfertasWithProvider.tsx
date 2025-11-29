// src/components/sections/ProductGridOfertasWithProvider.tsx

/**
 * ProductGridOfertas wrapper with QueryProvider
 *
 * This wrapper ensures that ProductGridOfertas has access to QueryClient
 * when used as an Astro island with client:load directive.
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/react-query/queryClient';
import ProductGridOfertas from './ProductGridOfertas';

export default function ProductGridOfertasWithProvider() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProductGridOfertas />
    </QueryClientProvider>
  );
}
