// src/components/products/ProductCard.tsx
import React, { useCallback } from 'react';
import CompareButton from './CompareButton';

// Placeholder de imagen - ajusta según tu ubicación real
const FALLBACK_IMG_400x300 = '/placeholder-product.jpg';

interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  images: string[];
  attributes: { attributeId: string; value: string }[];
  tags: string[];
  featured: boolean;
  slug: string;
  // Stock management
  trackInventory?: boolean;
  stock?: number;
  lowStockThreshold?: number;
  allowBackorder?: boolean;
}

interface ProductCardProps {
  product: Product;
  onClick?: () => void;
}

// PERFORMANCE: Memoize component to prevent unnecessary re-renders
const ProductCard: React.FC<ProductCardProps> = React.memo(({ product, onClick }) => {
  // PERFORMANCE: Wrap click handler in useCallback
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    } else {
      window.location.href = `/producto/${product.slug}`;
    }
  }, [onClick, product.slug]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    img.onerror = null;
    img.src = FALLBACK_IMG_400x300;
  }, []);

  const handleButtonClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    console.log('Añadir al carrito:', product.id);
  }, [product.id]);

  return (
    <article
      className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-200 hover:border-gray-300 transition-all duration-300 cursor-pointer hover:-translate-y-1 active:scale-[0.98]"
      onClick={handleClick}
    >
      {/* Imagen del producto - Responsive aspect ratio */}
      <div className="relative aspect-[4/3] sm:aspect-[3/2] overflow-hidden bg-gray-100">
        <img
          src={product.images[0] || FALLBACK_IMG_400x300}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={handleImageError}
        />

        {/* Badges container */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-1 items-end">
          {product.featured && (
            <div className="bg-cyan-600 text-white px-2 py-1 sm:px-3 sm:py-1 rounded text-[10px] sm:text-xs font-medium shadow-md">
              Destacado
            </div>
          )}

          {/* Stock status badge */}
          {product.trackInventory && product.stock === 0 && (
            <div className={`px-2 py-1 sm:px-3 sm:py-1 rounded text-[10px] sm:text-xs font-medium shadow-md ${
              product.allowBackorder
                ? 'bg-amber-500 text-white'
                : 'bg-red-600 text-white'
            }`}>
              {product.allowBackorder ? 'Bajo pedido' : 'Agotado'}
            </div>
          )}

          {product.trackInventory &&
           product.stock !== undefined &&
           product.stock > 0 &&
           product.stock <= (product.lowStockThreshold || 5) && (
            <div className="bg-amber-500 text-white px-2 py-1 sm:px-3 sm:py-1 rounded text-[10px] sm:text-xs font-medium shadow-md">
              ¡Últimas {product.stock}!
            </div>
          )}
        </div>

        {/* Compare button */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
          <CompareButton
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.basePrice,
              image: product.images[0],
              description: product.description,
              tags: product.tags,
            }}
            variant="icon"
            size="sm"
          />
        </div>
      </div>

      {/* Contenido del producto - Padding responsive */}
      <div className="p-3 sm:p-4">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800 leading-tight mb-1 sm:mb-2 line-clamp-2">
          {product.name}
        </h3>

        <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 leading-relaxed line-clamp-2 hidden sm:block">
          {product.description}
        </p>

        {/* Atributos destacados - Ocultos en móvil muy pequeño */}
        {product.attributes && product.attributes.length > 0 && (
          <div className="hidden sm:block mb-2 sm:mb-3">
            <div className="flex flex-wrap gap-1">
              {product.attributes.slice(0, 3).map((attr, index) => (
                <span
                  key={index}
                  className="text-[10px] sm:text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                >
                  {attr.value}
                </span>
              ))}
              {product.attributes.length > 3 && (
                <span className="text-[10px] sm:text-xs text-gray-500 px-1">
                  +{product.attributes.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tags - Solo en desktop */}
        {product.tags && product.tags.length > 0 && (
          <div className="hidden md:block mb-3">
            <div className="flex flex-wrap gap-1">
              {product.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full border border-cyan-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Precio y botón - Layout responsive */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1">
            <span className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
              €{product.basePrice.toFixed(2)}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-500">
              desde
            </span>
          </div>

          <button
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-2 py-1.5 sm:px-4 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap active:scale-95"
            onClick={handleButtonClick}
          >
            <span className="hidden sm:inline">Ver detalles</span>
            <span className="sm:hidden">Ver</span>
          </button>
        </div>
      </div>
    </article>
  );
});

// Add display name for debugging
ProductCard.displayName = 'ProductCard';

export default ProductCard;
