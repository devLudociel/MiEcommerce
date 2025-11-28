// src/components/providers/QueryProvider.tsx

/**
 * React Query Provider Component
 *
 * Wraps the application with QueryClientProvider to enable
 * React Query hooks throughout the app.
 *
 * Must be used with client:only="react" directive in Astro.
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/react-query/queryClient';

interface QueryProviderProps {
  children: React.ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
