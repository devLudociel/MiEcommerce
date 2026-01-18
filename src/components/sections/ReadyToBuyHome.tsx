import { useMemo } from 'react';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import { useProducts } from '../../hooks/react-query/useProducts';
import { ProductGridSkeleton } from '../ui/Skeleton';
import ErrorMessage from '../errors/ErrorMessage';

interface ReadyProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  hasVariants: boolean;
  image: string;
  slug: string;
  featured: boolean;
}

interface ReadyToBuyHomeProps {
  maxItems?: number;
}

export default function ReadyToBuyHome({ maxItems = 6 }: ReadyToBuyHomeProps) {
  const {
    data: rawProducts = [],
    isLoading: loading,
    error: queryError,
  } = useProducts({
    readyMade: true,
    limit: maxItems,
  });

  const error = queryError ? (queryError as Error).message : null;

  const products = useMemo(() => {
    return rawProducts
      .filter((doc) => (doc as any).isDigital !== true)
      .map((doc) => {
      const variants = Array.isArray((doc as any).variants) ? (doc as any).variants : [];
      const variantPrices = variants
        .map((variant: Record<string, unknown>) => Number(variant.price))
        .filter((price: number) => Number.isFinite(price));
      const basePrice = Number((doc as any).basePrice || doc.price) || 0;
      const price = variantPrices.length ? Math.min(...variantPrices) : basePrice;
      return {
        id: doc.id,
        name: doc.name || 'Diseño listo',
        description: doc.description || '',
        price,
        hasVariants: variantPrices.length > 0,
        image: (doc.images && doc.images[0]) || FALLBACK_IMG_400x300,
        slug: doc.slug || doc.id,
        featured: doc.featured || false,
      } as ReadyProduct;
      });
  }, [rawProducts]);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-gradient-to-b from-amber-50 via-white to-white relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-6 left-10 w-72 h-72 bg-gradient-to-r from-amber-400/20 to-orange-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-rose-300/20 to-amber-300/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold uppercase tracking-wider rounded-full mb-4">
            Listos para comprar
          </div>
          <h2 className="text-5xl md:text-6xl font-black mb-5">
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Diseños listos
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-4">
            Elige un diseño terminado y cómpralo tal cual, sin personalizar.
          </p>
          <a
            href="/listos-para-comprar"
            className="inline-flex items-center gap-2 text-amber-600 font-semibold hover:gap-3 transition-all"
          >
            Ver toda la colección
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>

        {loading && <ProductGridSkeleton count={maxItems} />}

        {!loading && error && (
          <div className="max-w-2xl mx-auto">
            <ErrorMessage error={error} onRetry={() => window.location.reload()} variant="card" />
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <a
                key={product.id}
                href={`/producto/${product.slug}`}
                className="group block bg-white rounded-3xl overflow-hidden shadow-lg border border-amber-100 hover:border-amber-300 hover:shadow-2xl transition-all duration-300"
              >
                <div className="relative h-60 overflow-hidden bg-amber-50">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow">
                      Listo
                    </span>
                  </div>
                  {product.featured && (
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 text-xs font-bold bg-yellow-500 text-white rounded-full shadow">
                        ⭐ Destacado
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                  <div className="flex items-end justify-between">
                    <div className="text-2xl font-bold text-amber-600">
                      €{product.price.toFixed(2)}
                    </div>
                    {product.hasVariants && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        desde
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
