import React, { useState, useRef, useEffect } from 'react';
import { Upload, Move, ZoomIn, ZoomOut, Loader, ShoppingCart } from 'lucide-react';
import { uploadCustomImage, saveCustomization, getProductImageUrl } from '../../lib/firebase';
import { compressImage, validateImageFile, fileToBase64 } from '../../utils/imageCompression';
import { addToCart } from '../../store/cartStore';
import { attributes, subcategoryAttributes } from '../../data/productAttributes';
import type { ProductAttributeValue } from '../../data/productAttributes';

interface FirebaseProduct {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  basePrice: number;
  images: string[];
  slug: string;
  [key: string]: any;
}

interface Props {
  product: FirebaseProduct;
}

interface CustomConfig {
  color: string;
  customImage: string | null;
  imageUrl: string | null;
  imagePath: string | null;
  position: { x: number; y: number };
  size: number;
  rotation: number;
  attributes: ProductAttributeValue[];
}

const SHIRT_COLORS = {
  blanco: { color: '#FFFFFF', name: 'Blanco' },
  negro: { color: '#1a1a1a', name: 'Negro' },
  amarillo: { color: '#FCD34D', name: 'Amarillo' },
  rojo: { color: '#EF4444', name: 'Rojo' },
  azul: { color: '#3B82F6', name: 'Azul' },
  verde: { color: '#10B981', name: 'Verde' },
  rosa: { color: '#EC4899', name: 'Rosa' },
  gris: { color: '#6B7280', name: 'Gris' }
};

export default function ShirtCustomizer({ product }: Props) {
  const [config, setConfig] = useState<CustomConfig>({
    color: 'blanco',
    customImage: null,
    imageUrl: null,
    imagePath: null,
    position: { x: 50, y: 40 },
    size: 30,
    rotation: 0,
    attributes: []
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar atributos disponibles
  const availableAttributes = product.subcategoryId 
    ? subcategoryAttributes
        .filter(sa => sa.subcategoryId === product.subcategoryId)
        .map(sa => attributes.find(attr => attr.id === sa.attributeId))
        .filter(Boolean)
    : [];

  // Cargar imágenes del producto desde Firebase Storage al montar
  useEffect(() => {
    async function loadProductImages() {
      const imageUrls: Record<string, string> = {};
      
      for (const colorKey of Object.keys(SHIRT_COLORS)) {
        try {
          const url = await getProductImageUrl('camisetas', colorKey);
          if (url) {
            imageUrls[colorKey] = url;
          }
        } catch (error) {
          console.log(`No se encontró imagen para color ${colorKey}`);
        }
      }
      
      setProductImages(imageUrls);
    }

    loadProductImages();

    // Inicializar atributos por defecto
    if (product.subcategoryId && availableAttributes.length > 0) {
      const defaultAttrs = availableAttributes.map(attr => {
        if (!attr) return null;
        let defaultValue = '';
        if (attr.type === 'select' && attr.options?.length) {
          defaultValue = attr.options[0].value;
        } else if (attr.type === 'number') {
          defaultValue = '1';
        }
        return { attributeId: attr.id, value: defaultValue };
      }).filter(Boolean) as ProductAttributeValue[];
      
      setConfig(prev => ({ ...prev, attributes: defaultAttrs }));
    }
  }, [product.subcategoryId]);

  // Manejar subida de imagen
  const handleImageUpload = async (file: File) => {
    try {
      setError(null);
      setIsLoading(true);

      // Validar
      const validation = validateImageFile(file, { maxSizeMB: 10 });
      if (!validation.valid) {
        setError(validation.error || 'Error de validación');
        setIsLoading(false);
        return;
      }

      // Convertir a base64 para preview inmediato
      const base64 = await fileToBase64(file);
      setConfig(prev => ({ ...prev, customImage: base64 }));

      // Comprimir
      const compressedFile = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });

      // Subir a Firebase Storage
      const userId = 'guest'; // Cambiar por auth.currentUser?.uid cuando tengas auth
      const { url, path } = await uploadCustomImage(compressedFile, userId, 'camiseta');

      setConfig(prev => ({ ...prev, imageUrl: url, imagePath: path }));
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error subiendo imagen:', err);
      setError('Error al subir la imagen. Intenta de nuevo.');
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && config.customImage) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      setConfig(prev => ({
        ...prev,
        position: {
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y))
        }
      }));
    }
  };

  const adjustImageSize = (increment: number) => {
    setConfig(prev => ({
      ...prev,
      size: Math.max(10, Math.min(80, prev.size + increment))
    }));
  };

  const updateAttributeValue = (attributeId: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      attributes: prev.attributes.map(attr => 
        attr.attributeId === attributeId ? { ...attr, value } : attr
      )
    }));
  };

  const calculatePrice = () => {
    let total = Number(product.basePrice) || 0;
    
    config.attributes.forEach(attrValue => {
      const attribute = attributes.find(attr => attr.id === attrValue.attributeId);
      if (attribute?.options) {
        const option = attribute.options.find(opt => opt.value === attrValue.value);
        if (option) {
          total += option.priceModifier;
        }
      }
    });
    
    const cantidadAttr = config.attributes.find(attr => attr.attributeId === '13');
    const cantidad = cantidadAttr ? parseInt(cantidadAttr.value) || 1 : 1;
    
    if (config.imageUrl) {
      total *= 1.1;
    }
    
    total *= cantidad;
    
    return Math.round(total * 100) / 100;
  };

  const handleAddToCart = async () => {
    try {
      setIsAddingToCart(true);
      setError(null);

      // Validar campos requeridos
      const requiredAttributes = availableAttributes.filter(attr => attr?.required);
      for (const reqAttr of requiredAttributes) {
        if (!reqAttr) continue;
        const hasValue = config.attributes.some(attr => 
          attr.attributeId === reqAttr.id && attr.value.trim() !== ''
        );
        if (!hasValue) {
          setError(`El campo "${reqAttr.name}" es obligatorio`);
          setIsAddingToCart(false);
          return;
        }
      }

      if (!config.imageUrl) {
        setError('Por favor sube un diseño para la camiseta');
        setIsAddingToCart(false);
        return;
      }

      const userId = 'guest';
      const cantidadAttr = config.attributes.find(attr => attr.attributeId === '13');
      const cantidad = cantidadAttr ? parseInt(cantidadAttr.value) || 1 : 1;

      // Guardar personalización en Firestore
      const customizationData = {
        userId,
        productId: product.id,
        productName: product.name,
        productType: 'camiseta',
        color: config.color,
        customImageUrl: config.imageUrl,
        imagePath: config.imagePath || '',
        imagePosition: config.position,
        imageSize: config.size,
        rotation: config.rotation,
        attributes: config.attributes,
        basePrice: product.basePrice,
        totalPrice: calculatePrice(),
        cantidad
      };

      const customizationId = await saveCustomization(customizationData);
      console.log('✅ Personalización guardada:', customizationId);

      // Añadir al carrito local
      const customDetails = config.attributes
        .map(attrValue => {
          const attribute = attributes.find(a => a.id === attrValue.attributeId);
          if (!attribute) return null;
          return `${attribute.name}: ${attrValue.value}`;
        })
        .filter(Boolean);

      addToCart({
        id: `${product.id}-custom-${Date.now()}`,
        name: `${product.name} (Personalizado)`,
        price: calculatePrice() / cantidad,
        quantity: cantidad,
        image: config.imageUrl || product.images?.[0] || '',
        variantId: 1,
        variantName: customDetails.join(' • '),
        customization: {
          customizationId,
          ...customizationData
        }
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error:', err);
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Obtener imagen del producto según el color seleccionado
  const currentProductImage = productImages[config.color] || product.images?.[0] || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 mt-32">
      <div className="container mx-auto px-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <a href="/" className="hover:text-cyan-500">Inicio</a>
              <span>›</span>
              <a href={`/producto/${product.slug || product.id}`} className="hover:text-cyan-500">{product.name}</a>
              <span>›</span>
              <span className="text-gray-800 font-medium">Personalizar Camiseta</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-black text-gray-800 flex items-center gap-3">
              👕 Personaliza tu {product.name}
            </h1>
          </div>
          <button
            onClick={() => window.location.href = `/producto/${product.slug || product.id}`}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="container mx-auto px-6 mb-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
          <span className="text-2xl">✓</span>
          <span className="font-bold">¡Añadido al carrito!</span>
        </div>
      )}

      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Vista Previa */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Vista Previa</h2>
            
            <div
              className="relative aspect-square rounded-xl overflow-hidden cursor-move select-none"
              style={{ backgroundColor: SHIRT_COLORS[config.color as keyof typeof SHIRT_COLORS].color }}
              onMouseDown={() => config.customImage && setIsDragging(true)}
              onMouseMove={handleMouseMove}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              {/* Imagen del producto real desde Firebase */}
              {currentProductImage && (
                <img
                  src={currentProductImage}
                  alt={`Camiseta ${config.color}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Simulación de camiseta si no hay imagen */}
              {!currentProductImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3/4 h-5/6 relative">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-8 rounded-b-full"
                         style={{ backgroundColor: SHIRT_COLORS[config.color as keyof typeof SHIRT_COLORS].color, filter: 'brightness(0.9)' }} />
                    <div className="absolute top-8 -left-8 w-24 h-32 rounded-l-full"
                         style={{ backgroundColor: SHIRT_COLORS[config.color as keyof typeof SHIRT_COLORS].color, filter: 'brightness(0.95)' }} />
                    <div className="absolute top-8 -right-8 w-24 h-32 rounded-r-full"
                         style={{ backgroundColor: SHIRT_COLORS[config.color as keyof typeof SHIRT_COLORS].color, filter: 'brightness(0.95)' }} />
                  </div>
                </div>
              )}

              {/* Diseño personalizado */}
              {config.customImage && (
                <img
                  src={config.customImage}
                  alt="Tu diseño"
                  className="absolute pointer-events-none"
                  style={{
                    left: `${config.position.x}%`,
                    top: `${config.position.y}%`,
                    transform: `translate(-50%, -50%) rotate(${config.rotation}deg)`,
                    width: `${config.size}%`,
                    height: 'auto',
                    maxHeight: `${config.size}%`,
                    objectFit: 'contain'
                  }}
                />
              )}

              {!config.customImage && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Upload size={48} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Sube tu diseño</p>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                  <Loader className="animate-spin text-white" size={48} />
                </div>
              )}
            </div>

            {/* Controles de ajuste */}
            {config.customImage && (
              <div className="mt-6 bg-gray-50 rounded-xl p-6 space-y-4">
                <h3 className="font-bold text-gray-800">Ajustar Diseño</h3>
                
                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                    <span>Tamaño</span>
                    <span className="text-purple-600">{config.size}%</span>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => adjustImageSize(-5)} className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg">
                      <ZoomOut size={20} className="mx-auto" />
                    </button>
                    <button onClick={() => adjustImageSize(5)} className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg">
                      <ZoomIn size={20} className="mx-auto" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                    <span>Rotación</span>
                    <span className="text-purple-600">{config.rotation}°</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={config.rotation}
                    onChange={(e) => setConfig(prev => ({ ...prev, rotation: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="space-y-6">
            {/* Selector de color */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Color de Camiseta</h3>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(SHIRT_COLORS).map(([key, { color, name }]) => (
                  <button
                    key={key}
                    onClick={() => setConfig(prev => ({ ...prev, color: key }))}
                    className={`aspect-square rounded-xl border-4 transition-all hover:scale-105 ${
                      config.color === key ? 'border-purple-500 shadow-lg' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={name}
                  />
                ))}
              </div>
            </div>

            {/* Subir imagen */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Subir Diseño</h3>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isLoading ? 'Subiendo...' : '📤 Subir Imagen'}
              </button>
            </div>

            {/* Atributos */}
            {availableAttributes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 max-h-96 overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Opciones</h3>
                {availableAttributes.map((attribute) => {
                  if (!attribute) return null;
                  const currentValue = config.attributes.find(attr => attr.attributeId === attribute.id);
                  
                  return (
                    <div key={attribute.id} className="mb-4">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        {attribute.name} {attribute.required && <span className="text-red-500">*</span>}
                      </label>
                      
                      {attribute.type === 'select' && attribute.options ? (
                        <select
                          value={currentValue?.value || ''}
                          onChange={(e) => updateAttributeValue(attribute.id, e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 outline-none"
                        >
                          <option value="">Seleccionar...</option>
                          {attribute.options.map((option) => (
                            <option key={option.id} value={option.value}>
                              {option.value} {option.priceModifier !== 0 && `(+€${option.priceModifier})`}
                            </option>
                          ))}
                        </select>
                      ) : attribute.type === 'number' ? (
                        <input
                          type="number"
                          min="1"
                          value={currentValue?.value || '1'}
                          onChange={(e) => updateAttributeValue(attribute.id, e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 outline-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={currentValue?.value || ''}
                          onChange={(e) => updateAttributeValue(attribute.id, e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 outline-none"
                          placeholder={`Ingresa ${attribute.name.toLowerCase()}...`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Resumen y botón */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow-lg p-6 border-2 border-purple-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Resumen</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Precio base</span>
                  <span className="font-bold">€{product.basePrice}</span>
                </div>
                {config.imageUrl && (
                  <div className="flex justify-between text-sm">
                    <span>Personalización</span>
                    <span className="font-bold text-green-600">+10%</span>
                  </div>
                )}
                <div className="border-t-2 pt-3 flex justify-between">
                  <span className="text-xl font-black">Total</span>
                  <span className="text-3xl font-black text-purple-600">€{calculatePrice()}</span>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isAddingToCart}
                className="w-full py-4 px-6 rounded-xl font-bold text-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
              >
                {isAddingToCart ? 'Agregando...' : `🛒 Añadir al Carrito - €${calculatePrice()}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}