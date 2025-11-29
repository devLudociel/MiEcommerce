// src/lib/react-query/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query (React Query) configuration
 *
 * Provides intelligent caching and data synchronization for:
 * - Product listings
 * - Product details
 * - Order data
 * - User profile
 *
 * Benefits:
 * - Automatic background refetching
 * - Cache deduplication (multiple components share same data)
 * - Optimistic updates
 * - Reduced Firebase reads (cost savings)
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache products for 5 minutes (they don't change often)
      staleTime: 5 * 60 * 1000, // 5 minutes

      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)

      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,

      // Retry failed requests 3 times
      retry: 3,

      // Exponential backoff between retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations only once
      retry: 1,
    },
  },
});

/**
 * Query Keys
 * Centralized query key factory for type safety and consistency
 */
export const queryKeys = {
  // Products
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters?: { category?: string; featured?: boolean; limit?: number }) =>
      [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
    related: (categoryId: string, excludeId: string) =>
      [...queryKeys.products.all, 'related', categoryId, excludeId] as const,
  },

  // Orders
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (userId?: string) => [...queryKeys.orders.lists(), userId] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
  },

  // User
  user: {
    all: ['user'] as const,
    profile: (userId: string) => [...queryKeys.user.all, 'profile', userId] as const,
    designs: (userId: string) => [...queryKeys.user.all, 'designs', userId] as const,
    wallet: (userId: string) => [...queryKeys.user.all, 'wallet', userId] as const,
  },

  // Categories
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
  },

  // Digital Products
  digitalProducts: {
    all: ['digitalProducts'] as const,
    lists: () => [...queryKeys.digitalProducts.all, 'list'] as const,
    list: (filters?: { category?: string; type?: string }) =>
      [...queryKeys.digitalProducts.lists(), filters] as const,
  },
};
