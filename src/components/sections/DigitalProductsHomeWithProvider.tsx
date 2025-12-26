// src/components/sections/DigitalProductsHomeWithProvider.tsx

/**
 * DigitalProductsHome wrapper with QueryProvider
 *
 * This wrapper ensures that DigitalProductsHome has access to QueryClient
 * when used as an Astro island with client:visible directive.
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/react-query/queryClient';
import DigitalProductsHome from './DigitalProductsHome';

interface DigitalProductsHomeWithProviderProps {
  maxItems?: number;
}

export default function DigitalProductsHomeWithProvider({
  maxItems = 4,
}: DigitalProductsHomeWithProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <DigitalProductsHome maxItems={maxItems} />
    </QueryClientProvider>
  );
}
