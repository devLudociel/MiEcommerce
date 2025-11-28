import { useState, useMemo } from 'react';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import { Download } from 'lucide-react';
import { ProductGridSkeleton } from '../ui/SkeletonLoader';
import ErrorMessage from '../errors/ErrorMessage';
import { useProducts } from '../../hooks/react-query/useProducts';

interface DigitalProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  slug: string;
  tags: string[];
  featured: boolean;
}

interface DigitalProductsHomeProps {
  maxItems?: number;
}

const DigitalProductsHome: React.FC<DigitalProductsHomeProps> = ({ maxItems = 4 }) => {
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);

  // Fetch digital products with React Query
  const { data: rawProducts = [], isLoading: loading, error: queryError } = useProducts({
    onlyDigital: true,
    limit: maxItems
  });

  const error = queryError ? (queryError as Error).message : null;

  // Transform products to UI format
  const products = useMemo(() => {
    return rawProducts.map((doc) => ({
      id: doc.id,
      name: doc.name || 'Producto Digital',
      description: doc.description || '',
      price: Number(doc.price) || 0,
      image: (doc.images && doc.images[0]) || FALLBACK_IMG_400x300,
      slug: doc.slug || doc.id,
      tags: (doc as any).tags || [],
      featured: doc.featured || false,
    })) as DigitalProduct[];
  }, [rawProducts]);

  // Don't render section if no products
  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-gradient-to-b from-cyan-50 to-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-block">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-bold uppercase tracking-wider rounded-full mb-4">
              <Download className="w-4 h-4" />
              Descarga Instantánea
            </span>
          </div>

          <h2 className="text-5xl md:text-7xl font-black mb-6">
            <span className="bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Productos Digitales
            </span>
          </h2>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-6">
            Descarga packs de imágenes, cliparts y recursos al instante. Acceso ilimitado y permanente.
          </p>

          <a
            href="/productos/digitales"
            className="inline-flex items-center gap-2 text-cyan-600 font-semibold hover:gap-3 transition-all"
          >
            Ver todos los productos digitales
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
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
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product, index) => (
              <a
                key={product.id}
                href={`/producto/${product.slug}`}
                className={`
                  group block relative bg-white rounded-3xl overflow-hidden shadow-lg
                  transform transition-all duration-500 hover:scale-105 hover:shadow-2xl
                  border-2 border-cyan-100 hover:border-cyan-400
                  ${hoveredProduct === product.id ? 'z-20' : 'z-10'}
                `}
                onMouseEnter={() => setHoveredProduct(product.id)}
                onMouseLeave={() => setHoveredProduct(null)}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              >
                {/* Digital Badge */}
                <div className="absolute top-4 left-4 z-30">
                  <span className="flex items-center gap-1 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full text-white bg-gradient-to-r from-cyan-600 to-blue-600 shadow-lg">
                    <Download className="w-3 h-3" />
                    Digital
                  </span>
                </div>

                {/* Featured Badge */}
                {product.featured && (
                  <div className="absolute top-4 right-4 z-30">
                    <span className="px-3 py-1 text-xs font-bold bg-yellow-500 text-white rounded-full shadow-lg">
                      ⭐ Destacado
                    </span>
                  </div>
                )}

                {/* Product Image */}
                <div className="relative h-64 overflow-hidden bg-gradient-to-br from-cyan-50 to-blue-50">
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
                      absolute inset-0 bg-gradient-to-t from-cyan-900/50 to-transparent
                      transition-opacity duration-300
                      ${hoveredProduct === product.id ? 'opacity-70' : 'opacity-0'}
                    `}
                  />

                  {/* Download Icon on Hover */}
                  <div
                    className={`
                      absolute inset-0 flex items-center justify-center
                      transition-all duration-300
                      ${hoveredProduct === product.id ? 'opacity-100' : 'opacity-0'}
                    `}
                  >
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl transform transition-transform duration-300 hover:scale-110">
                      <Download className="w-8 h-8 text-cyan-600" />
                    </div>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-6">
                  {/* Tags */}
                  {product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {product.tags.slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-cyan-50 text-cyan-700 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {product.tags.length > 2 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          +{product.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Name */}
                  <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-cyan-600 transition-colors line-clamp-2">
                    {product.name}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>

                  {/* Price and CTA */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-cyan-600">
                      €{product.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Descarga inmediata
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* View All Button */}
        {!loading && !error && products.length >= maxItems && (
          <div className="text-center mt-16">
            <a
              href="/productos/digitales"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              Ver Todos los Productos Digitales
              <Download className="w-5 h-5" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
};

export default DigitalProductsHome;
