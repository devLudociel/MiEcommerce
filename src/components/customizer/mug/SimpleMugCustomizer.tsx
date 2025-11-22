// src/components/customizer/mug/SimpleMugCustomizer.tsx

import React, { useState } from 'react';
import { ShoppingCart, Upload, CheckCircle, AlertCircle, Info, Maximize2 } from 'lucide-react';
import { addToCart } from '../../../store/cartStore';
import { logger } from '../../../lib/logger';
import { notify } from '../../../lib/notifications';
import { MUG_POSITIONS, type MugPresetPosition } from '../../../constants/mugPositions';

interface FirebaseProduct {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  basePrice: number;
  images: string[];
  slug: string;
  [key: string]: any;
}

interface SimpleMugCustomizerProps {
  product: FirebaseProduct;
}

// Colores de taza disponibles
const MUG_COLORS = [
  { id: 'white', name: 'Blanco', hex: '#FFFFFF', price: 0 },
  { id: 'black', name: 'Negro', hex: '#000000', price: 1.5 },
  { id: 'red', name: 'Rojo', hex: '#DC2626', price: 1.5 },
  { id: 'blue', name: 'Azul', hex: '#2563EB', price: 1.5 },
  { id: 'green', name: 'Verde', hex: '#16A34A', price: 1.5 },
  { id: 'yellow', name: 'Amarillo', hex: '#EAB308', price: 1.5 },
  { id: 'pink', name: 'Rosa', hex: '#EC4899', price: 1.5 },
  { id: 'purple', name: 'Morado', hex: '#9333EA', price: 1.5 },
];

export default function SimpleMugCustomizer({ product }: SimpleMugCustomizerProps) {
  const [selectedColor, setSelectedColor] = useState(MUG_COLORS[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [imageTransform, setImageTransform] = useState({ x: 50, y: 50, scale: 0.6 });

  // Calcular precio total
  const totalPrice = product.basePrice + selectedColor.price;
  const originalPrice = totalPrice * 1.43; // Simular descuento

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      notify.error('Por favor, sube solo archivos de imagen');
      return;
    }

    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      notify.error('La imagen es demasiado grande. Máximo 10MB');
      return;
    }

    // Convertir a base64 para preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
      logger.info('[SimpleMugCustomizer] Image uploaded successfully');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImageTransform({ x: 50, y: 50, scale: 0.6 }); // Reset transform
  };

  const handleApplyPosition = (preset: MugPresetPosition) => {
    setImageTransform({
      x: preset.x,
      y: preset.y,
      scale: preset.scale,
    });
    logger.info('[SimpleMugCustomizer] Applied position preset:', preset.id);
  };

  const handleAddToCart = async () => {
    // Validar que al menos haya imagen o texto
    if (!uploadedImage && !customText.trim()) {
      notify.error('Por favor, sube una imagen o escribe un texto para personalizar tu taza');
      return;
    }

    setIsAddingToCart(true);

    try {
      const customizationData = {
        // Campos compatibles con CartItem
        uploadedImage: uploadedImage, // Imagen completa base64
        text: customText.trim(),
        selectedColor: selectedColor.name,
        position: uploadedImage ? { x: imageTransform.x, y: imageTransform.y } : undefined,
        scale: uploadedImage ? imageTransform.scale : undefined,

        // Campos específicos de taza
        mugColor: selectedColor.name,
        mugColorHex: selectedColor.hex,
        mugColorPrice: selectedColor.price,
        hasImage: !!uploadedImage,
        hasText: !!customText.trim(),
      };

      const cartItem = {
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        productImage: product.images[0] || '/placeholder-product.jpg',
        basePrice: product.basePrice,
        quantity: 1,
        customization: customizationData,
        totalPrice: totalPrice,
      };

      addToCart(cartItem);

      logger.info('[SimpleMugCustomizer] Added to cart', {
        productId: product.id,
        customization: {
          ...customizationData,
          uploadedImage: uploadedImage ? '[base64 image data]' : null, // Log sin imagen completa
        }
      });
      notify.success('¡Taza añadida al carrito! Recibirás una vista previa para aprobar.');

      // Redirigir al carrito después de un momento
      setTimeout(() => {
        window.location.href = '/cart';
      }, 1500);
    } catch (error) {
      logger.error('[SimpleMugCustomizer] Error adding to cart', error);
      notify.error('Error al añadir al carrito. Inténtalo de nuevo.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-cyan-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Personaliza tu Taza
          </h1>
          <p className="text-lg text-gray-600">
            {product.name}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel izquierdo: Opciones */}
          <div className="space-y-6">
            {/* Vista previa de producto */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Vista Previa
              </h2>
              <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center relative overflow-hidden border-2 border-gray-200">
                {/* Imagen del producto base */}
                <img
                  src={product.images[0] || '/placeholder-mug.jpg'}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />

                {/* Preview de posición de imagen (si hay imagen cargada) */}
                {uploadedImage && (
                  <div
                    className="absolute bg-purple-500/20 border-2 border-purple-500 rounded-lg transition-all duration-300"
                    style={{
                      left: `${imageTransform.x}%`,
                      top: `${imageTransform.y}%`,
                      width: `${30 * imageTransform.scale}%`,
                      height: `${30 * imageTransform.scale}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-xs font-bold text-purple-700 bg-white/80 px-2 py-1 rounded">
                        Diseño
                      </div>
                    </div>
                  </div>
                )}

                {/* Indicador de color seleccionado */}
                <div
                  className="absolute top-4 right-4 w-12 h-12 rounded-full border-4 border-white shadow-lg"
                  style={{ backgroundColor: selectedColor.hex }}
                />
              </div>
            </div>

            {/* Mensaje informativo */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">📧 Vista previa por email</p>
                  <p>
                    Te enviaremos una vista previa del diseño final para que lo apruebes
                    antes de iniciar la producción de tu taza personalizada.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Panel derecho: Personalización */}
          <div className="space-y-6">
            {/* Subir imagen */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Subir Imagen (Opcional)
              </h3>

              {!uploadedImage ? (
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 hover:bg-purple-50 transition-all">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium mb-1">
                      Haz clic para subir una imagen
                    </p>
                    <p className="text-sm text-gray-500">
                      PNG, JPG, GIF (máx. 10MB)
                    </p>
                  </div>
                </label>
              ) : (
                <div className="relative">
                  <img
                    src={uploadedImage}
                    alt="Preview"
                    className="w-full h-48 object-contain bg-gray-100 rounded-xl border-2 border-gray-200"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Imagen cargada correctamente
                  </div>

                  {/* Botones de posicionamiento rápido */}
                  <div className="mt-4 bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Maximize2 className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-bold text-purple-700">
                        ⚡ Posiciones Rápidas
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {MUG_POSITIONS.slice(0, 6).map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleApplyPosition(preset)}
                          className="px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-purple-100 hover:border-purple-400 hover:text-purple-900 transition-all active:scale-95"
                          title={preset.description}
                        >
                          {preset.labelShort}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-purple-600">
                      Posición actual: X:{imageTransform.x}% Y:{imageTransform.y}% Escala:{Math.round(imageTransform.scale * 100)}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Texto personalizado */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Texto Personalizado (Opcional)
              </h3>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                className="w-full h-32 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all resize-none"
                maxLength={200}
              />
              <div className="text-sm text-gray-500 mt-2 text-right">
                {customText.length}/200 caracteres
              </div>
            </div>

            {/* Selector de color */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Color de la Taza
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {MUG_COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color)}
                    className={`relative p-3 rounded-xl border-2 transition-all ${
                      selectedColor.id === color.id
                        ? 'border-purple-500 bg-purple-50 shadow-lg scale-105'
                        : 'border-gray-300 hover:border-purple-300 hover:shadow-md'
                    }`}
                  >
                    <div
                      className="w-full aspect-square rounded-lg border-2 border-gray-200 shadow-inner mb-2"
                      style={{ backgroundColor: color.hex }}
                    />
                    <p className="text-xs font-medium text-gray-700 text-center">
                      {color.name}
                    </p>
                    {color.price > 0 && (
                      <p className="text-xs text-purple-600 font-semibold text-center mt-1">
                        +{formatPrice(color.price)}
                      </p>
                    )}
                    {selectedColor.id === color.id && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Resumen de precio */}
            <div className="bg-gradient-to-r from-purple-50 to-cyan-50 rounded-2xl p-6 border-2 border-purple-200 shadow-xl">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-gray-600 font-medium">Precio total:</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-500 line-through text-lg">
                    {formatPrice(originalPrice)}
                  </span>
                  <span className="text-3xl font-bold text-purple-600">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-right">(IVA incl.)</div>

              {selectedColor.price > 0 && (
                <div className="mt-4 pt-4 border-t border-purple-200 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Precio base:</span>
                    <span>{formatPrice(product.basePrice)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Color {selectedColor.name}:</span>
                    <span>+{formatPrice(selectedColor.price)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Botón añadir al carrito */}
            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart || (!uploadedImage && !customText.trim())}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                isAddingToCart || (!uploadedImage && !customText.trim())
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-700 hover:to-cyan-700 hover:shadow-xl hover:scale-105'
              }`}
            >
              {isAddingToCart ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Añadiendo...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShoppingCart className="w-6 h-6" />
                  Añadir al Carrito
                </span>
              )}
            </button>

            {(!uploadedImage && !customText.trim()) && (
              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>Sube una imagen o escribe un texto para continuar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
