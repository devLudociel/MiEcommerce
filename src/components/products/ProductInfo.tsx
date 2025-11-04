import { memo, useMemo } from 'react';
import Icon from '../ui/Icon';

interface ProductVariant {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  color: string;
  colorName: string;
  stock: number;
  sku: string;
}

interface ProductInfoProps {
  productName: string;
  category: string;
  brand: string;
  variants: ProductVariant[];
  selectedVariant: number;
  onVariantChange: (index: number) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  averageRating: number;
  totalReviews: number;
  isInWishlist: boolean;
  onToggleWishlist: () => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  onCustomize?: () => void;
  onShare: () => void;
  isAddingToCart: boolean;
  customizable?: boolean;
  freeShipping?: boolean;
  warranty?: string;
  features?: string[];
}

/**
 * PERFORMANCE OPTIMIZED: Memoized product info component
 * Contains product details, price, variants, and action buttons
 */
export const ProductInfo = memo(function ProductInfo({
  productName,
  category,
  brand,
  variants,
  selectedVariant,
  onVariantChange,
  quantity,
  onQuantityChange,
  averageRating,
  totalReviews,
  isInWishlist,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
  onCustomize,
  onShare,
  isAddingToCart,
  customizable,
  freeShipping,
  warranty,
  features,
}: ProductInfoProps) {
  const currentVariant = variants[selectedVariant] || variants[0];

  const stockStatus = useMemo(() => {
    const stock = currentVariant.stock;
    if (stock === 0) {
      return { text: 'Agotado', color: 'text-red-500', bg: 'bg-red-100' };
    } else if (stock < 5) {
      return { text: `Solo ${stock} disponibles`, color: 'text-orange-500', bg: 'bg-orange-100' };
    } else if (stock < 10) {
      return { text: `Últimas ${stock} unidades`, color: 'text-yellow-600', bg: 'bg-yellow-100' };
    }
    return { text: 'En stock', color: 'text-green-500', bg: 'bg-green-100' };
  }, [currentVariant.stock]);

  const hasDiscount = currentVariant.originalPrice && currentVariant.originalPrice > currentVariant.price;
  const discountPercentage = hasDiscount
    ? Math.round(((currentVariant.originalPrice! - currentVariant.price) / currentVariant.originalPrice!) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <span className="px-3 py-1 bg-cyan-50 text-cyan-600 rounded-full font-medium">{category}</span>
          <span>•</span>
          <span>{brand}</span>
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          {productName}
        </h1>

        {/* Rating */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-5 h-5 ${star <= averageRating ? 'text-yellow-400' : 'text-gray-300'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-gray-700 font-medium">{averageRating.toFixed(1)}</span>
            <span className="text-gray-500">({totalReviews} reseñas)</span>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 border border-cyan-100">
        <div className="flex items-baseline gap-4 mb-2">
          <span className="text-5xl font-bold text-gray-900">€{currentVariant.price.toFixed(2)}</span>
          {hasDiscount && (
            <>
              <span className="text-2xl text-gray-400 line-through">
                €{currentVariant.originalPrice!.toFixed(2)}
              </span>
              <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
                -{discountPercentage}%
              </span>
            </>
          )}
        </div>
        <p className="text-gray-600">IVA incluido • Envío calculado al finalizar compra</p>
      </div>

      {/* Stock Status */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${stockStatus.bg}`}>
        <div className={`w-2 h-2 rounded-full ${stockStatus.color.replace('text-', 'bg-')}`} />
        <span className={`font-medium ${stockStatus.color}`}>{stockStatus.text}</span>
      </div>

      {/* Variant Selector */}
      {variants.length > 1 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Color: {currentVariant.colorName}
          </label>
          <div className="flex gap-3 flex-wrap">
            {variants.map((variant, idx) => (
              <button
                key={variant.id}
                onClick={() => onVariantChange(idx)}
                className={`w-12 h-12 rounded-full border-3 transition-all duration-300 hover:scale-110 ${
                  idx === selectedVariant
                    ? 'border-cyan-500 ring-4 ring-cyan-500/30 shadow-lg'
                    : 'border-gray-200 hover:border-cyan-300'
                }`}
                style={{ backgroundColor: variant.color }}
                title={variant.colorName}
                aria-label={`Seleccionar color ${variant.colorName}`}
              >
                {idx === selectedVariant && (
                  <svg className="w-6 h-6 text-white mx-auto drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity Selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Cantidad</label>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              className="px-5 py-3 text-gray-600 hover:bg-gray-50 transition-colors font-bold text-xl"
              disabled={quantity <= 1}
            >
              −
            </button>
            <input
              type="number"
              min="1"
              max={currentVariant.stock}
              value={quantity}
              onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 text-center font-semibold text-lg border-0 focus:outline-none"
            />
            <button
              onClick={() => onQuantityChange(Math.min(currentVariant.stock, quantity + 1))}
              className="px-5 py-3 text-gray-600 hover:bg-gray-50 transition-colors font-bold text-xl"
              disabled={quantity >= currentVariant.stock}
            >
              +
            </button>
          </div>
          <span className="text-gray-600">
            {currentVariant.stock > 0 ? `${currentVariant.stock} disponibles` : 'Sin stock'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={onAddToCart}
          disabled={currentVariant.stock === 0 || isAddingToCart}
          className="w-full btn btn-primary py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isAddingToCart ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Agregando...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Icon name="shopping-cart" className="w-5 h-5" />
              Agregar al carrito
            </span>
          )}
        </button>

        <button
          onClick={onBuyNow}
          disabled={currentVariant.stock === 0}
          className="w-full btn btn-secondary py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          Comprar ahora
        </button>

        {customizable && onCustomize && (
          <button
            onClick={onCustomize}
            className="w-full py-4 text-lg font-semibold rounded-xl border-2 border-purple-500 text-purple-600 hover:bg-purple-50 transform hover:scale-105 transition-all duration-300"
          >
            <span className="flex items-center justify-center gap-2">
              <Icon name="edit" className="w-5 h-5" />
              Personalizar producto
            </span>
          </button>
        )}
      </div>

      {/* Wishlist and Share */}
      <div className="flex gap-3">
        <button
          onClick={onToggleWishlist}
          className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all duration-300 ${
            isInWishlist
              ? 'border-red-500 bg-red-50 text-red-600'
              : 'border-gray-200 text-gray-600 hover:border-red-300'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <Icon name="heart" className="w-5 h-5" fill={isInWishlist ? 'currentColor' : 'none'} />
            {isInWishlist ? 'En favoritos' : 'Añadir a favoritos'}
          </span>
        </button>

        <button
          onClick={onShare}
          className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-600 hover:border-cyan-300 hover:bg-cyan-50 transition-all duration-300"
        >
          <Icon name="share" className="w-5 h-5" />
        </button>
      </div>

      {/* Features */}
      {features && features.length > 0 && (
        <div className="bg-gray-50 rounded-2xl p-6 space-y-3">
          <h3 className="font-semibold text-gray-900 mb-4">Características destacadas:</h3>
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-3 text-gray-700">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      )}

      {/* Shipping and Warranty */}
      <div className="border-t-2 border-gray-100 pt-6 space-y-4">
        {freeShipping && (
          <div className="flex items-center gap-3 text-green-600">
            <Icon name="truck" className="w-6 h-6" />
            <span className="font-medium">Envío gratis en pedidos superiores a €50</span>
          </div>
        )}
        {warranty && (
          <div className="flex items-center gap-3 text-blue-600">
            <Icon name="shield" className="w-6 h-6" />
            <span className="font-medium">{warranty}</span>
          </div>
        )}
      </div>
    </div>
  );
});
