/**
 * FrameCustomizer - Refactored version
 *
 * ARQUITECTURA:
 * - Lógica extraída a useFrameCustomizer hook
 * - Componente enfocado solo en UI/renderizado
 * - 280 líneas vs 590 líneas originales (-52%)
 *
 * PERFORMANCE:
 * - useMemo para precio y atributos
 * - useCallback para handlers
 */

import React from 'react';
import { ShoppingCart, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useFrameCustomizer, FLOWER_COLORS } from '../../hooks/useFrameCustomizer';

interface FirebaseProduct {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  basePrice: number;
  images: string[];
  slug: string;
  [key: string]: string | number | boolean | string[] | null | undefined;
}

interface Props {
  product: FirebaseProduct;
}

export default function FrameCustomizer({ product }: Props) {
  const {
    config,
    isAddingToCart,
    error,
    success,
    frameImages,
    price,
    availableAttributes,
    updateFlowerColor,
    updateAttributeValue,
    handleAddToCart,
    setError,
  } = useFrameCustomizer(product);

  const currentFrame = frameImages[config.flowerColor] || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 mt-32">
      {/* Header */}
      <div className="container mx-auto px-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <a href="/" className="hover:text-cyan-500">Inicio</a>
              <span>›</span>
              <a href={`/producto/${product.slug || product.id}`} className="hover:text-cyan-500">
                {product.name}
              </a>
              <span>›</span>
              <span className="text-gray-800 font-medium">Personalizar Cuadro</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-black text-gray-800 flex items-center gap-3">
              🖼️ Personaliza tu {product.name}
            </h1>
          </div>
          <button
            onClick={() => (window.location.href = `/producto/${product.slug || product.id}`)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            aria-label="Volver a la página del producto"
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="container mx-auto px-6 mb-6">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-bold text-red-800 mb-1">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="container mx-auto px-6 mb-6">
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="text-green-500" size={20} />
            <p className="text-green-800 font-medium">¡Producto agregado al carrito con éxito!</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Preview Section */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Vista Previa del Cuadro</h2>
            <div className="aspect-square rounded-xl overflow-hidden shadow-inner bg-gray-50 p-4">
              <div
                className="w-full h-full border-8 rounded-lg relative overflow-hidden"
                style={{
                  borderColor: '#92400E',
                  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2), 0 4px 6px rgba(0,0,0,0.1)',
                }}
              >
                {currentFrame ? (
                  <img
                    src={currentFrame}
                    alt={`Cuadro de flores ${FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS]?.name || config.flowerColor}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <p>Vista previa generándose...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Section */}
          <div className="space-y-6">
            {/* Color Selection */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Color de las Flores</h3>
              <p className="text-sm text-gray-600 mb-4">Cada color muestra un diseño único</p>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(FLOWER_COLORS).map(([key, { primary, secondary, name }]) => (
                  <button
                    key={key}
                    onClick={() => updateFlowerColor(key)}
                    className={`aspect-square rounded-xl border-4 transition-all hover:scale-105 flex flex-col items-center justify-center ${
                      config.flowerColor === key ? 'border-purple-500 shadow-lg' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: primary }}
                    aria-label={`Seleccionar flores ${name}`}
                    aria-pressed={config.flowerColor === key}
                  >
                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: secondary }}></div>
                    <span className="text-xs mt-2 text-white font-semibold">{name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Attributes */}
            {availableAttributes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 max-h-96 overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Opciones del Cuadro</h3>
                {availableAttributes.map((attribute) => {
                  if (!attribute) return null;
                  const currentValue = config.attributes.find((attr) => attr.attributeId === attribute.id);

                  return (
                    <div key={attribute.id} className="mb-4">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {attribute.name}
                        {attribute.required && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {attribute.type === 'select' && attribute.options ? (
                        <select
                          value={currentValue?.value || ''}
                          onChange={(e) => updateAttributeValue(attribute.id, e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                          required={attribute.required}
                        >
                          <option value="">Seleccionar...</option>
                          {attribute.options.map((option) => (
                            <option key={option.id} value={option.value}>
                              {option.value}
                              {option.price && option.price !== 0 && ` (+€${option.price})`}
                            </option>
                          ))}
                        </select>
                      ) : attribute.type === 'number' ? (
                        <input
                          type="number"
                          min="1"
                          value={currentValue?.value || '1'}
                          onChange={(e) => updateAttributeValue(attribute.id, e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                          required={attribute.required}
                        />
                      ) : (
                        <input
                          type="text"
                          value={currentValue?.value || ''}
                          onChange={(e) => updateAttributeValue(attribute.id, e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                          placeholder={`Ingresa ${attribute.name.toLowerCase()}...`}
                          required={attribute.required}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary & Add to Cart */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow-lg p-6 border-2 border-purple-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Resumen</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Precio base</span>
                  <span className="font-bold">€{product.basePrice}</span>
                </div>
                <div className="border-t-2 pt-3 flex justify-between">
                  <span className="text-xl font-black">Total</span>
                  <span className="text-3xl font-black text-purple-600">€{price.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="w-full py-4 px-6 rounded-xl font-bold text-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isAddingToCart ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    <span>Agregando...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    <span>Añadir al Carrito - €{price.toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
