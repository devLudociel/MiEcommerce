import { memo } from 'react';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';

interface RelatedProduct {
  id: string;
  name: string;
  slug?: string;
  basePrice: number;
  onSale?: boolean;
  salePrice?: number;
  images: Array<{ url: string; alt: string }>;
}

interface RelatedProductsProps {
  products: RelatedProduct[];
}

/**
 * PERFORMANCE OPTIMIZED: Memoized related products component
 * Only re-renders when products array changes
 */
export const RelatedProducts = memo(function RelatedProducts({ products }: RelatedProductsProps) {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 pt-12 border-t-2 border-gray-100">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Productos relacionados</h2>
        <p className="text-gray-600">También te pueden interesar estos productos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => {
          const currentPrice =
            product.onSale && product.salePrice ? product.salePrice : product.basePrice;
          const hasDiscount =
            product.onSale && product.salePrice && product.salePrice < product.basePrice;
          const discountPercentage = hasDiscount
            ? Math.round(((product.basePrice - product.salePrice!) / product.basePrice) * 100)
            : 0;

          const productUrl = `/producto/${product.slug || product.id}`;
          const imageUrl = product.images[0]?.url || FALLBACK_IMG_400x300;

          return (
            <a
              key={product.id}
              href={productUrl}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:scale-105"
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <img
                  src={imageUrl}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.onerror = null;
                    img.src = FALLBACK_IMG_400x300;
                  }}
                />

                {/* Discount Badge */}
                {hasDiscount && (
                  <div className="absolute top-3 right-3 px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full shadow-lg">
                    -{discountPercentage}%
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-cyan-600 transition-colors">
                  {product.name}
                </h3>

                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-gray-900">
                    €{currentPrice.toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-gray-400 line-through">
                      €{product.basePrice.toFixed(2)}
                    </span>
                  )}
                </div>

                <button className="mt-4 w-full py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors">
                  Ver producto
                </button>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
});
