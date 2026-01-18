import { useState, useEffect } from 'react';
import { db, batchGetProductReviewStats } from '../../lib/firebase';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { ProductGridSkeleton } from '../ui/SkeletonLoader';
import ErrorMessage from '../errors/ErrorMessage';
import { logger } from '../../lib/logger';

interface Product {
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
}

interface ProductsGridProps {
  title?: string;
  subtitle?: string;
  products?: Product[];
  maxItems?: number;
  showFilters?: boolean;
}

const ProductsGrid: React.FC<ProductsGridProps> = ({
  title = 'Productos Destacados',
  subtitle = 'Descubre nuestra selección premium con la mejor calidad y diseño',
  maxItems = 8,
  showFilters = false,
}) => {
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price' | 'name' | 'rating'>('name');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    let filtered = products.slice();

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((product) => product.category === selectedCategory);
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'rating':
          return b.rating - a.rating;
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredProducts(filtered.slice(0, maxItems));
  }, [selectedCategory, sortBy, maxItems, products]);

  const getBadgeClasses = (badge: string) => {
    const badgeClasses = {
      new: 'badge-new bg-gradient-to-r from-green-500 to-green-600',
      sale: 'badge-sale bg-gradient-to-r from-magenta-500 to-magenta-600',
      hot: 'badge-hot bg-gradient-to-r from-orange-500 to-orange-600',
      limited: 'badge-limited bg-gradient-to-r from-purple-500 to-purple-600',
    };
    return badgeClasses[badge as keyof typeof badgeClasses] || '';
  };

  const categories = [
    { value: 'all', label: 'Todos' },
    { value: 'tech', label: 'Tecnología' },
    { value: 'fashion', label: 'Moda' },
    { value: 'photography', label: 'Fotografía' },
  ];

  // Cargar productos de Firestore (SOLO FÍSICOS, excluir digitales)
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        logger.debug('[ProductGrid] Loading physical products only', { maxItems });

        const q = query(
          collection(db, 'products'),
          where('active', '==', true),
          limit(maxItems * 2)
        ); // Load more to compensate for filtering
        const snap = await getDocs(q);

        // Filter out digital products
        const physicalDocs = snap.docs
          .filter((d) => {
            const data = d.data();
            return !data.isDigital && data.readyMade !== true; // Exclude digital + ready-made
          })
          .slice(0, maxItems); // Limit to maxItems after filtering

        logger.info(
          `[ProductGrid] Filtered ${physicalDocs.length} physical products from ${snap.docs.length} total`
        );

        // PERFORMANCE: Batch get all review stats in a single query instead of N queries
        const productIds = physicalDocs.map((d) => d.id);
        const reviewStatsMap = await batchGetProductReviewStats(productIds);

        // Map products with their review stats
        const list: Product[] = physicalDocs.map((d: QueryDocumentSnapshot<DocumentData>) => {
          const data = d.data() || {};
          const reviewStats = reviewStatsMap.get(d.id) || {
            averageRating: 0,
            totalReviews: 0,
          };

          const onSale = !!data.onSale;
          const salePrice = data.salePrice ? Number(data.salePrice) : undefined;

          return {
            id: d.id,
            name: data.name || 'Producto',
            description: data.description || '',
            price: Number(data.basePrice) || 0,
            originalPrice: undefined,
            image: (data.images && data.images[0]) || FALLBACK_IMG_400x300,
            images: data.images || [],
            category: data.category || 'general',
            badge: onSale ? 'sale' : data.featured ? 'hot' : undefined,
            rating: reviewStats.averageRating,
            reviews: reviewStats.totalReviews,
            inStock: !!data.active,
            colors: [],
            slug: data.slug || d.id,
            onSale,
            salePrice,
          } as Product;
        });
        setProducts(list);
        setFilteredProducts(list);
        logger.info('[ProductGrid] Physical products loaded successfully', { count: list.length });
      } catch (e: unknown) {
        logger.error('[ProductGrid] Error loading products', e);
        setError(e instanceof Error ? e.message : 'Error cargando productos');
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [maxItems]);

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-cyan-500/10 to-magenta-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-yellow-500/10 to-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-block">
            <span className="inline-block px-4 py-2 bg-gradient-rainbow text-white text-sm font-bold uppercase tracking-wider rounded-full mb-4">
              Productos Premium
            </span>
          </div>

          <h2 className="text-5xl md:text-7xl font-black mb-6">
            <span className="text-gradient-rainbow">{title}</span>
          </h2>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">{subtitle}</p>

          {/* Filters */}
          {showFilters && (
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-12">
              {/* Category Filter */}
              <div className="flex flex-wrap items-center gap-3">
                {categories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-all
                      ${
                        selectedCategory === category.value
                          ? 'bg-gradient-primary text-white shadow-cyan'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }
                    `}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              {/* Sort Filter */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'price' | 'name' | 'rating')}
                className="px-4 py-2 rounded-full border-2 border-gray-200 focus:border-cyan-500 outline-none"
              >
                <option value="name">Ordenar por Nombre</option>
                <option value="price">Ordenar por Precio</option>
                <option value="rating">Ordenar por Rating</option>
              </select>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && <ProductGridSkeleton count={maxItems} />}

        {/* Error State */}
        {!loading && error && (
          <div className="max-w-2xl mx-auto">
            <ErrorMessage error={error} onRetry={() => window.location.reload()} variant="card" />
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product, index) => (
              <a
                key={product.id}
                href={`/producto?${product.slug ? 'slug=' + product.slug : 'id=' + product.id}`}
                className={`
                group block relative bg-white rounded-3xl overflow-hidden shadow-lg
                transform transition-all duration-500 hover:scale-105 hover:shadow-2xl
                ${hoveredProduct === product.id ? 'z-20' : 'z-10'}
              `}
                onMouseEnter={() => setHoveredProduct(product.id)}
                onMouseLeave={() => setHoveredProduct(null)}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
                aria-label={`Ver detalle de ${product.name}`}
              >
                {/* Badge */}
                {product.badge && (
                  <div className="absolute top-4 left-4 z-30">
                    <span
                      className={`
                    px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full
                    text-white shadow-lg ${getBadgeClasses(product.badge)}
                  `}
                    >
                      {product.badge === 'new'
                        ? 'Nuevo'
                        : product.badge === 'sale' && product.onSale && product.salePrice
                          ? `-${Math.round((1 - product.salePrice / product.price) * 100)}%`
                          : product.badge === 'sale'
                            ? 'Oferta'
                            : product.badge === 'hot'
                              ? 'Popular'
                              : 'Limitado'}
                    </span>
                  </div>
                )}

                {/* Stock Status */}
                {!product.inStock && (
                  <div className="absolute top-4 right-4 z-30">
                    <span className="px-3 py-1 text-xs font-bold bg-red-500 text-white rounded-full">
                      Agotado
                    </span>
                  </div>
                )}

                {/* Product Image */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className={`
                    w-full h-full object-cover transition-all duration-700
                    ${hoveredProduct === product.id ? 'scale-110 rotate-2' : 'scale-100'}
                  `}
                  />

                  {/* Gradient Overlay */}
                  <div
                    className={`
                  absolute inset-0 bg-gradient-to-t from-black/50 to-transparent
                  transition-opacity duration-300
                  ${hoveredProduct === product.id ? 'opacity-70' : 'opacity-0'}
                `}
                  />

                  {/* Quick Actions Overlay eliminado para evitar iconos superpuestos */}

                  {/* Color Options */}
                  {product.colors && product.colors.length > 0 && (
                    <div
                      className={`
                    absolute bottom-4 left-4 flex gap-2
                    transition-all duration-300
                    ${
                      hoveredProduct === product.id
                        ? 'opacity-100 translate-y-0'
                        : 'opacity-0 translate-y-4'
                    }
                  `}
                    >
                      {product.colors.slice(0, 3).map((color, colorIndex) => (
                        <div
                          key={colorIndex}
                          className="w-6 h-6 rounded-full border-2 border-white/50 shadow-md cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      {product.colors.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            +{product.colors.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-6">
                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
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
                    </div>
                    {product.rating > 0 ? (
                      <span className="text-sm text-gray-500">
                        {product.rating.toFixed(1)} ({product.reviews})
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Sin reseñas aún</span>
                    )}
                  </div>

                  {/* Category */}
                  <p className="text-sm text-gray-500 uppercase tracking-wider font-medium mb-2">
                    {product.category}
                  </p>

                  {/* Name */}
                  <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-cyan-600 transition-colors">
                    {product.name}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>

                  {/* Price */}
                  <div className="flex items-center gap-3 mb-4">
                    {product.onSale && product.salePrice ? (
                      <>
                        <span className="text-2xl font-bold text-red-600">
                          €{product.salePrice.toFixed(2)}
                        </span>
                        <span className="text-lg text-gray-400 line-through">
                          €{product.price.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-cyan-600">
                          €{product.price.toFixed(2)}
                        </span>
                        {product.originalPrice && (
                          <>
                            <span className="text-lg text-gray-400 line-through">
                              €{product.originalPrice.toFixed(2)}
                            </span>
                            <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-600 rounded">
                              -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {/* Se elimina el botón de carrito para que toda la card sea clickeable */}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!loading && !error && filteredProducts.length >= maxItems && (
          <div className="text-center mt-16">
            <button className="btn btn-lg bg-gradient-rainbow text-white px-12 py-4 shadow-lg hover:shadow-xl transform hover:scale-105">
              Ver Más Productos
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductsGrid;
