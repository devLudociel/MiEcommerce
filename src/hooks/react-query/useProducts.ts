// src/hooks/react-query/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, limit as firestoreLimit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { queryKeys } from '../../lib/react-query/queryClient';
import { logger } from '../../lib/logger';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  badge?: 'new' | 'sale' | 'hot' | 'limited';
  rating: number;
  reviews: number;
  inStock: boolean;
  colors?: string[];
  slug?: string;
  onSale: boolean;
  salePrice?: number;
  active: boolean;
  featured?: boolean;
  isDigital?: boolean;
  createdAt?: Date;
}

interface ProductFilters {
  category?: string;
  featured?: boolean;
  limit?: number;
  onlyPhysical?: boolean;
  onlyDigital?: boolean;
}

/**
 * Fetch products from Firestore with optional filters
 */
async function fetchProducts(filters: ProductFilters = {}): Promise<Product[]> {
  try {
    logger.debug('[useProducts] Fetching products', filters);

    let q = query(collection(db, 'products'), where('active', '==', true));

    // Filter by category
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }

    // Filter by featured
    if (filters.featured !== undefined) {
      q = query(q, where('featured', '==', filters.featured));
    }

    // Filter physical/digital
    if (filters.onlyPhysical) {
      q = query(q, where('isDigital', '==', false));
    } else if (filters.onlyDigital) {
      q = query(q, where('isDigital', '==', true));
    }

    // Apply limit
    if (filters.limit) {
      q = query(q, firestoreLimit(filters.limit));
    }

    const snapshot = await getDocs(q);

    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Product[];

    logger.debug('[useProducts] Fetched products', { count: products.length });

    return products;
  } catch (error) {
    logger.error('[useProducts] Error fetching products', error);
    throw error;
  }
}

/**
 * Fetch single product by ID or slug
 */
async function fetchProduct(identifier: string, bySlug: boolean = false): Promise<Product> {
  try {
    logger.debug('[useProduct] Fetching product', { identifier, bySlug });

    let snapshot;

    if (bySlug) {
      // Search by slug
      const q = query(collection(db, 'products'), where('slug', '==', identifier), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Try as ID fallback
        const docRef = doc(db, 'products', identifier);
        snapshot = await getDoc(docRef);
      } else {
        snapshot = querySnapshot.docs[0];
      }
    } else {
      // Search by ID
      const docRef = doc(db, 'products', identifier);
      snapshot = await getDoc(docRef);
    }

    if (!snapshot || !snapshot.exists()) {
      throw new Error(`Product not found: ${identifier}`);
    }

    const product = {
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate(),
    } as Product;

    logger.debug('[useProduct] Fetched product', { identifier, name: product.name });

    return product;
  } catch (error) {
    logger.error('[useProduct] Error fetching product', error);
    throw error;
  }
}

/**
 * Hook: Fetch list of products with caching
 *
 * Benefits:
 * - Automatic caching (5 minutes stale time)
 * - Background refetching
 * - Shared cache across components
 * - Reduced Firebase reads
 *
 * @example
 * const { data: products, isLoading, error } = useProducts({ limit: 10, featured: true });
 */
export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => fetchProducts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook: Fetch single product with caching
 *
 * Benefits:
 * - Automatic caching
 * - Deduplication (multiple components share same data)
 * - Background refetching
 * - Supports fetching by ID or slug
 *
 * @example
 * const { data: product, isLoading, error } = useProduct('product-id');
 * const { data: product, isLoading, error } = useProduct('my-product-slug', true);
 */
export function useProduct(identifier: string, bySlug: boolean = false) {
  return useQuery({
    queryKey: bySlug ? queryKeys.products.detail(`slug:${identifier}`) : queryKeys.products.detail(identifier),
    queryFn: () => fetchProduct(identifier, bySlug),
    enabled: !!identifier, // Only fetch if identifier exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook: Prefetch products (for route prefetching)
 *
 * Use this to prefetch data before navigation
 *
 * @example
 * const prefetchProducts = usePrefetchProducts();
 * prefetchProducts({ category: 'tech', limit: 10 });
 */
export function usePrefetchProducts() {
  const queryClient = useQueryClient();

  return (filters: ProductFilters = {}) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.products.list(filters),
      queryFn: () => fetchProducts(filters),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Hook: Invalidate products cache (for admin updates)
 *
 * Use this after creating/updating/deleting products
 *
 * @example
 * const invalidateProducts = useInvalidateProducts();
 * invalidateProducts(); // Refetch all product queries
 */
export function useInvalidateProducts() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.products.all,
    });
  };
}
