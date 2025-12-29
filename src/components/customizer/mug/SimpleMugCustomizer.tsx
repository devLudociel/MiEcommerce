// src/components/customizer/mug/SimpleMugCustomizer.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShoppingCart,
  Upload,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  Palette,
  Type,
  Eye,
  Check,
} from 'lucide-react';
import { addToCart } from '../../../store/cartStore';
import { logger } from '../../../lib/logger';
import { notify } from '../../../lib/notifications';
import InteractiveImageEditor from '../InteractiveImageEditor';
import type { ImageTransform } from '../../../types/customization';

interface FirebaseProduct {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  basePrice: number;
  onSale?: boolean;
  salePrice?: number;
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

// Pasos del wizard para movil
const WIZARD_STEPS = [
  { id: 'color', title: 'Color', shortTitle: 'Color', icon: Palette },
  { id: 'design', title: 'Tu Diseno', shortTitle: 'Diseno', icon: Upload },
  { id: 'text', title: 'Texto', shortTitle: 'Texto', icon: Type },
  { id: 'review', title: 'Confirmar', shortTitle: 'Confirmar', icon: Eye },
];

const getEffectiveBasePrice = (product: FirebaseProduct): number => {
  const basePrice = Number(product.basePrice) || 0;
  const salePrice = Number(product.salePrice ?? 0);
  if (product.onSale && Number.isFinite(salePrice) && salePrice > 0 && salePrice < basePrice) {
    return salePrice;
  }
  return basePrice;
};

export default function SimpleMugCustomizer({ product }: SimpleMugCustomizerProps) {
  const [selectedColor, setSelectedColor] = useState(MUG_COLORS[0]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [imageTransform, setImageTransform] = useState<ImageTransform>({
    x: 50,
    y: 50,
    scale: 0.6,
    rotation: 0,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar movil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calcular precio total
  const totalPrice = getEffectiveBasePrice(product) + selectedColor.price;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify.error('Por favor, sube solo archivos de imagen');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      notify.error('La imagen es demasiado grande. Maximo 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
      logger.info('[SimpleMugCustomizer] Image uploaded successfully');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setUploadedImage(null);
    setImageTransform({ x: 50, y: 50, scale: 0.6, rotation: 0 });
  }, []);

  const handleAddToCart = useCallback(async () => {
    if (!uploadedImage && !customText.trim()) {
      notify.error('Por favor, sube una imagen o escribe un texto para personalizar tu taza');
      return;
    }

    setIsAddingToCart(true);

    try {
      const customizationData = {
        uploadedImage: uploadedImage,
        text: customText.trim(),
        selectedColor: selectedColor.name,
        position: uploadedImage ? { x: imageTransform.x, y: imageTransform.y } : undefined,
        scale: uploadedImage ? imageTransform.scale : undefined,
        rotation: uploadedImage ? imageTransform.rotation : undefined,
        mugColor: selectedColor.name,
        mugColorHex: selectedColor.hex,
        mugColorPrice: selectedColor.price,
        hasImage: !!uploadedImage,
        hasText: !!customText.trim(),
      };

      const cartItem = {
        id: `${product.id}-${Date.now()}`,
        name: product.name,
        price: totalPrice,
        quantity: 1,
        image: product.images[0] || '/placeholder-product.jpg',
        customization: customizationData,
      };

      addToCart(cartItem);

      logger.info('[SimpleMugCustomizer] Added to cart', {
        productId: product.id,
        customization: {
          ...customizationData,
          uploadedImage: uploadedImage ? '[base64 image data]' : null,
        },
      });
      notify.success('Taza anadida al carrito!');

      setTimeout(() => {
        window.location.href = '/cart';
      }, 1500);
    } catch (error) {
      logger.error('[SimpleMugCustomizer] Error adding to cart', error);
      notify.error('Error al anadir al carrito. Intentalo de nuevo.');
    } finally {
      setIsAddingToCart(false);
    }
  }, [uploadedImage, customText, selectedColor, imageTransform, product, totalPrice]);

  const handleNextStep = useCallback(() => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback(
    (index: number) => {
      if (index <= currentStep + 1) {
        setCurrentStep(index);
      }
    },
    [currentStep]
  );

  const canProceed = uploadedImage || customText.trim();

  // Vista previa del producto
  const ProductPreview = () => (
    <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center relative overflow-hidden border-2 border-gray-200">
      <img
        src={product.images[0] || '/placeholder-mug.jpg'}
        alt={product.name}
        className="w-full h-full object-contain"
      />

      {uploadedImage && (
        <div
          className="absolute pointer-events-none transition-all duration-300"
          style={{
            left: `${imageTransform.x}%`,
            top: `${imageTransform.y}%`,
            transform: `translate(-50%, -50%) scale(${imageTransform.scale}) rotate(${imageTransform.rotation}deg)`,
          }}
        >
          <img
            src={uploadedImage}
            alt="Preview diseno"
            className="max-w-none"
            style={{
              width: '120px',
              height: 'auto',
              opacity: 0.85,
              border: '2px solid #a855f7',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
            }}
          />
        </div>
      )}

      <div
        className="absolute top-2 right-2 sm:top-4 sm:right-4 w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 sm:border-4 border-white shadow-lg"
        style={{ backgroundColor: selectedColor.hex }}
      />
    </div>
  );

  // Componente de seleccion de color
  const ColorSelector = () => (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {MUG_COLORS.map((color) => (
        <button
          key={color.id}
          onClick={() => setSelectedColor(color)}
          className={`relative p-2 sm:p-3 rounded-xl border-2 transition-all ${
            selectedColor.id === color.id
              ? 'border-purple-500 bg-purple-50 shadow-lg scale-105'
              : 'border-gray-300 hover:border-purple-300 hover:shadow-md'
          }`}
        >
          <div
            className="w-full aspect-square rounded-lg border-2 border-gray-200 shadow-inner mb-1 sm:mb-2"
            style={{ backgroundColor: color.hex }}
          />
          <p className="text-[10px] sm:text-xs font-medium text-gray-700 text-center truncate">
            {color.name}
          </p>
          {color.price > 0 && (
            <p className="text-[10px] sm:text-xs text-purple-600 font-semibold text-center">
              +{formatPrice(color.price)}
            </p>
          )}
          {selectedColor.id === color.id && (
            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  );

  // Componente de subida de imagen
  const ImageUploader = () => (
    <div>
      {!uploadedImage ? (
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="sr-only"
            aria-label="Seleccionar archivo de imagen"
            ref={fileInputRef}
          />
          <button
            type="button"
            className="block w-full cursor-pointer group text-left"
            aria-label="Subir imagen para personalizacion"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 text-center hover:border-purple-400 hover:bg-purple-50 transition-all group-focus-visible:ring-4 group-focus-visible:ring-purple-300 group-focus-visible:border-purple-500">
              <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3 group-hover:text-purple-500 transition-colors" />
              <p className="text-sm sm:text-base text-gray-600 font-medium mb-1">
                Toca para subir una imagen
              </p>
              <p className="text-xs sm:text-sm text-gray-500">PNG, JPG, GIF (max. 10MB)</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="relative">
          <img
            src={uploadedImage}
            alt="Preview"
            className="w-full h-32 sm:h-48 object-contain bg-gray-100 rounded-xl border-2 border-gray-200"
          />
          <button
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-red-500 text-white p-1.5 sm:p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
          >
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            Imagen cargada correctamente
          </div>

          {/* Editor Visual Interactivo */}
          <div className="mt-3 sm:mt-4">
            <InteractiveImageEditor
              image={uploadedImage}
              transform={imageTransform}
              onChange={setImageTransform}
              productImage={product.images[0]}
              disabled={false}
            />
          </div>
        </div>
      )}
    </div>
  );

  // Componente de texto
  const TextInput = () => (
    <div>
      <textarea
        value={customText}
        onChange={(e) => setCustomText(e.target.value)}
        placeholder="Escribe tu mensaje aqui..."
        className="w-full h-28 sm:h-32 px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all resize-none text-sm sm:text-base"
        maxLength={200}
      />
      <div className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2 text-right">
        {customText.length}/200 caracteres
      </div>
    </div>
  );

  // Resumen de precio
  const PriceSummary = ({ compact = false }: { compact?: boolean }) => (
    <div
      className={`bg-gradient-to-r from-purple-50 to-cyan-50 rounded-xl ${compact ? 'p-3' : 'p-4 sm:p-6'} border-2 border-purple-200`}
    >
      <div className="flex items-baseline justify-between">
        <span
          className={`text-gray-600 font-medium ${compact ? 'text-sm' : 'text-sm sm:text-base'}`}
        >
          Total:
        </span>
        <span
          className={`font-bold text-purple-600 ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'}`}
        >
          {formatPrice(totalPrice)}
        </span>
      </div>
      {!compact && selectedColor.price > 0 && (
        <div className="mt-3 pt-3 border-t border-purple-200 space-y-1 text-xs sm:text-sm">
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
  );

  // VISTA WIZARD (MOVIL)
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-cyan-50 py-4 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header compacto */}
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-gray-800">Personaliza tu Taza</h1>
            <p className="text-sm text-gray-600">{product.name}</p>
          </div>

          {/* Step Indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between max-w-sm mx-auto px-2">
              {WIZARD_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => goToStep(index)}
                      className={`flex flex-col items-center gap-1 transition-all ${
                        index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                      }`}
                      disabled={index > currentStep + 1}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          index < currentStep
                            ? 'bg-green-500 text-white'
                            : index === currentStep
                              ? 'bg-purple-600 text-white shadow-lg scale-110'
                              : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {index < currentStep ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-medium ${
                          index === currentStep ? 'text-purple-600' : 'text-gray-500'
                        }`}
                      >
                        {step.shortTitle}
                      </span>
                    </button>
                    {index < WIZARD_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-1 ${
                          index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Vista previa siempre visible */}
          <div className="bg-white rounded-xl shadow-lg p-3 mb-4">
            <ProductPreview />
          </div>

          {/* Contenido del paso */}
          <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
            <h2 className="text-lg font-bold text-gray-800 mb-3">
              {WIZARD_STEPS[currentStep].title}
            </h2>

            {currentStep === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Elige el color de tu taza:</p>
                <ColorSelector />
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Sube una imagen para tu taza (opcional):</p>
                <ImageUploader />
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Anade un texto personalizado (opcional):</p>
                <TextInput />
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                {/* Resumen de selecciones */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Color:</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: selectedColor.hex }}
                      />
                      <span className="font-medium">{selectedColor.name}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Imagen:</span>
                    <span className="font-medium">{uploadedImage ? 'Si' : 'No'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Texto:</span>
                    <span className="font-medium">{customText.trim() ? 'Si' : 'No'}</span>
                  </div>
                </div>

                <PriceSummary />

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800">
                      Te enviaremos una vista previa por email para que la apruebes antes de
                      producir.
                    </p>
                  </div>
                </div>

                {!canProceed && (
                  <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded-lg border border-orange-200">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p>Sube una imagen o escribe un texto para continuar</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navegacion */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className={`flex items-center gap-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                currentStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <PriceSummary compact />

            {currentStep < WIZARD_STEPS.length - 1 ? (
              <button
                onClick={handleNextStep}
                className="flex items-center gap-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-700 transition-all active:scale-95"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart || !canProceed}
                className={`flex items-center gap-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  isAddingToCart || !canProceed
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:shadow-lg active:scale-95'
                }`}
              >
                {isAddingToCart ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>Anadir</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // VISTA DESKTOP (ORIGINAL)
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-cyan-50 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
            Personaliza tu Taza
          </h1>
          <p className="text-base sm:text-lg text-gray-600">{product.name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Panel izquierdo: Vista previa */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border-2 border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
                Vista Previa
              </h2>
              <ProductPreview />
            </div>

            {/* Mensaje informativo */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 sm:p-4">
              <div className="flex items-start gap-2 sm:gap-3">
                <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-blue-900">
                  <p className="font-semibold mb-1">Vista previa por email</p>
                  <p>
                    Te enviaremos una vista previa del diseno final para que lo apruebes antes de
                    iniciar la produccion.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Panel derecho: Personalizacion */}
          <div className="space-y-4 sm:space-y-6">
            {/* Subir imagen */}
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border-2 border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                Subir Imagen (Opcional)
              </h3>
              <ImageUploader />
            </div>

            {/* Texto personalizado */}
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border-2 border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
                Texto Personalizado (Opcional)
              </h3>
              <TextInput />
            </div>

            {/* Selector de color */}
            <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border-2 border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">
                Color de la Taza
              </h3>
              <ColorSelector />
            </div>

            {/* Resumen de precio */}
            <PriceSummary />

            {/* Boton anadir al carrito */}
            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart || !canProceed}
              className={`w-full py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg transition-all shadow-lg ${
                isAddingToCart || !canProceed
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-700 hover:to-cyan-700 hover:shadow-xl hover:scale-105 active:scale-95'
              }`}
            >
              {isAddingToCart ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Anadiendo...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                  Anadir al Carrito
                </span>
              )}
            </button>

            {!canProceed && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-orange-600 bg-orange-50 p-2 sm:p-3 rounded-lg border border-orange-200">
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
