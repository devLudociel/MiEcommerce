// src/components/sections/BestSellersWithProvider.tsx

/**
 * BestSellers wrapper with QueryProvider
 *
 * This wrapper ensures that BestSellers has access to QueryClient
 * when used as an Astro island with client:visible directive.
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/react-query/queryClient';
import BestSellers from './BestSellers';

export default function BestSellersWithProvider() {
  return (
    <QueryClientProvider client={queryClient}>
      <BestSellers />
    </QueryClientProvider>
  );
}
