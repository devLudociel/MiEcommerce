import { useState, useEffect, useCallback } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import FilterPanel, { type FilterOptions } from './FilterPanel';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import { logger } from '../../lib/logger';

interface Product {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  slug?: string;
  categoryId: string; // Cambio: category → categoryId
  categoryName?: string; // Para mostrar el nombre
  rating: number;
  reviews: number;
  inStock: boolean;
  colors?: string[];
  sizes?: string[];
  onSale: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function ProductsWithFilters() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>({
    categories: [],
    priceRange: { min: 0, max: 200 },
    colors: [],
    sizes: [],
    minRating: 0,
    inStock: false,
    sortBy: 'newest',
  });

  // Load categories from Firestore
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'categories'));
        const cats = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        setCategories(cats);
        logger.debug('[ProductsWithFilters] Categories loaded', { count: cats.length });
      } catch (error) {
        logger.error('[ProductsWithFilters] Error loading categories', error);
      }
    };

    loadCategories();
  }, []);

  // Read URL params on client-side only (avoid SSR error)
  useEffect(() => {
    if (typeof window !== 'undefined' && categories.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const categorySlug = urlParams.get('category');

      if (categorySlug) {
        // Find category by slug and use its ID for filtering
        const category = categories.find((c) => c.slug === categorySlug);
        if (category) {
          setCurrentFilters((prev) => ({
            ...prev,
            categories: [category.id],
          }));
          logger.debug('[ProductsWithFilters] Category filter applied', { slug: categorySlug, id: category.id });
        }
      }
    }
  }, [categories]);

  // Load products from Firestore
  useEffect(() => {
    const loadProducts = async () => {
      if (categories.length === 0) return; // Wait for categories to load first

      try {
        setLoading(true);
        logger.debug('[ProductsWithFilters] Loading products');

        const q = query(
          collection(db, 'products'),
          where('active', '==', true),
          limit(100)
        );

        const snapshot = await getDocs(q);
        const items: Product[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          const categoryId = data.categoryId || 'otros';
          const category = categories.find((c) => c.id === categoryId);

          return {
            id: doc.id,
            name: data.name || 'Producto',
            price: Number(data.basePrice) || 0,
            salePrice: data.salePrice ? Number(data.salePrice) : undefined,
            image: (data.images && data.images[0]) || FALLBACK_IMG_400x300,
            slug: data.slug || doc.id,
            categoryId: categoryId,
            categoryName: category?.name || 'Otros',
            rating: data.rating || 0,
            reviews: data.reviewCount || 0,
            inStock: !!data.active,
            colors: data.colors || [],
            sizes: data.sizes || [],
            onSale: !!data.onSale,
          };
        });

        setProducts(items);
        setFilteredProducts(items);
        logger.info('[ProductsWithFilters] Products loaded', { count: items.length });
      } catch (error) {
        logger.error('[ProductsWithFilters] Error loading products', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [categories]);

  // Apply filters
  useEffect(() => {
    let filtered = [...products];

    // Category filter (using categoryId instead of category)
    if (currentFilters.categories.length > 0) {
      filtered = filtered.filter((p) => currentFilters.categories.includes(p.categoryId));
    }

    // Price filter
    filtered = filtered.filter(
      (p) =>
        (p.salePrice || p.price) >= currentFilters.priceRange.min &&
        (p.salePrice || p.price) <= currentFilters.priceRange.max
    );

    // Color filter
    if (currentFilters.colors.length > 0) {
      filtered = filtered.filter((p) =>
        p.colors?.some((color) => currentFilters.colors.includes(color))
      );
    }

    // Size filter
    if (currentFilters.sizes.length > 0) {
      filtered = filtered.filter((p) =>
        p.sizes?.some((size) => currentFilters.sizes.includes(size))
      );
    }

    // Rating filter
    if (currentFilters.minRating > 0) {
      filtered = filtered.filter((p) => p.rating >= currentFilters.minRating);
    }

    // Stock filter
    if (currentFilters.inStock) {
      filtered = filtered.filter((p) => p.inStock);
    }

    // Sorting
    switch (currentFilters.sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
        break;
      case 'price-desc':
        filtered.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
      default:
        // Keep default order (newest first from Firestore)
        break;
    }

    setFilteredProducts(filtered);
  }, [currentFilters, products]);

  const handleFilterChange = useCallback((filters: FilterOptions) => {
    setCurrentFilters(filters);
  }, []);

  if (loading) {
    return (
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Filter Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-gray-200 rounded-lg h-96 animate-pulse"></div>
            </div>

            {/* Products Skeleton */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="bg-gray-200 rounded-lg h-96 animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <FilterPanel
              onFilterChange={handleFilterChange}
              totalResults={filteredProducts.length}
              allProducts={products}
              currentFilters={currentFilters}
            />
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  No se encontraron productos
                </h3>
                <p className="text-gray-600 mb-6">
                  Intenta ajustar los filtros para ver más resultados
                </p>
                <button
                  onClick={() => handleFilterChange({
                    categories: [],
                    priceRange: { min: 0, max: 200 },
                    colors: [],
                    sizes: [],
                    minRating: 0,
                    inStock: false,
                    sortBy: 'newest',
                  })}
                  className="px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <a
                    key={product.id}
                    href={`/producto/${product.slug}`}
                    className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
                  >
                    {/* Image */}
                    <div className="relative h-64 overflow-hidden bg-gray-100">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />

                      {/* Badges */}
                      {product.onSale && product.salePrice && (
                        <div className="absolute top-3 right-3">
                          <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                            -{Math.round((1 - product.salePrice / product.price) * 100)}%
                          </span>
                        </div>
                      )}

                      {!product.inStock && (
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 bg-gray-800 text-white text-xs font-bold rounded-full">
                            Agotado
                          </span>
                        </div>
                      )}

                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      {/* Rating */}
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        {product.rating > 0 && (
                          <span className="text-sm text-gray-500 ml-1">
                            ({product.reviews})
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-cyan-600 transition-colors">
                        {product.name}
                      </h3>

                      {/* Category */}
                      <p className="text-sm text-gray-500 mb-3 capitalize">{product.categoryName}</p>

                      {/* Price */}
                      <div className="flex items-center gap-2">
                        {product.onSale && product.salePrice ? (
                          <>
                            <span className="text-2xl font-bold text-red-600">
                              €{product.salePrice.toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-400 line-through">
                              €{product.price.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="text-2xl font-bold text-cyan-600">
                            €{product.price.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Stock indicator */}
                      {product.inStock && (
                        <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="font-medium">En stock</span>
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
