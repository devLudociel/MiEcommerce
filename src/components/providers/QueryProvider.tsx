// src/components/providers/QueryProvider.tsx

/**
 * React Query Provider Component
 *
 * Wraps the application with QueryClientProvider to enable
 * React Query hooks throughout the app.
 *
 * IMPORTANT: This component creates a singleton QueryClient instance
 * that is shared across all React islands in Astro. Each component
 * that uses React Query hooks MUST be wrapped with this provider.
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/react-query/queryClient';
import type { ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * QueryProvider wrapper for React Query
 *
 * Usage in Astro components:
 * ```astro
 * import QueryProvider from './providers/QueryProvider.tsx';
 * import MyComponent from './MyComponent.tsx';
 *
 * <QueryProvider client:load>
 *   <MyComponent />
 * </QueryProvider>
 * ```
 */
export default function QueryProvider({ children }: QueryProviderProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
