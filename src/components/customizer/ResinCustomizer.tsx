import React, { useState, useRef, useEffect } from 'react';
import { Upload, Loader } from 'lucide-react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { uploadCustomImage, saveCustomization } from '../../lib/firebase';
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
  boxColor: string;
  personName: string;
  customImage: string | null;
  imageUrl: string | null;
  imagePath: string | null;
  attributes: ProductAttributeValue[];
}

const BOX_COLORS = {
  azul: { color: '#3B82F6', name: 'Azul' },
  rosa: { color: '#EC4899', name: 'Rosa' },
  dorado: { color: '#F59E0B', name: 'Dorado' },
  plata: { color: '#94A3B8', name: 'Plata' },
  negro: { color: '#1F2937', name: 'Negro' },
  blanco: { color: '#F3F4F6', name: 'Blanco' },
  verde: { color: '#10B981', name: 'Verde' },
  morado: { color: '#8B5CF6', name: 'Morado' }
};

export default function ResinCustomizer({ product }: Props) {
  const [config, setConfig] = useState<CustomConfig>({
    boxColor: 'azul',
    personName: '',
    customImage: null,
    imageUrl: null,
    imagePath: null,
    attributes: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [boxImages, setBoxImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableAttributes = product.subcategoryId 
    ? subcategoryAttributes
        .filter(sa => sa.subcategoryId === product.subcategoryId)
        .map(sa => attributes.find(attr => attr.id === sa.attributeId))
        .filter(Boolean)
    : [];

  // 🔄 FUNCIÓN ACTUALIZADA PARA CARGAR IMÁGENES DESDE variants/cajas/
  useEffect(() => {
    async function loadBoxImages() {
      setLoadingImages(true);
      const imageUrls: Record<string, string> = {};
      
      console.log('🎨 Cargando imágenes de cajas desde variants/cajas/...');
      
      for (const colorKey of Object.keys(BOX_COLORS)) {
        try {
          // 🔄 CAMBIO: productos/cajas/ → variants/cajas/
          const imageRef = ref(storage, `variants/cajas/${colorKey}/preview.jpg`);
          const url = await getDownloadURL(imageRef);
          imageUrls[colorKey] = url;
          console.log(`✅ Cargada imagen de caja ${colorKey}:`, url);
        } catch (error) {
          console.log(`⚠️ No se encontró imagen para caja ${colorKey} en variants/cajas/${colorKey}/preview.jpg`);
        }
      }
      
      setBoxImages(imageUrls);
      setLoadingImages(false);
      
      const loadedCount = Object.keys(imageUrls).length;
      console.log(`📊 Total de imágenes cargadas: ${loadedCount}/${Object.keys(BOX_COLORS).length}`);
    }

    loadBoxImages();

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

  const handleImageUpload = async (file: File) => {
    try {
      setError(null);
      setIsLoading(true);

      const validation = validateImageFile(file, { maxSizeMB: 10 });
      if (!validation.valid) {
        setError(validation.error || 'Error de validación');
        setIsLoading(false);
        return;
      }

      const base64 = await fileToBase64(file);
      setConfig(prev => ({ ...prev, customImage: base64 }));

      const compressedFile = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });

      const userId = 'guest';
      const { url, path } = await uploadCustomImage(compressedFile, userId, 'resina');

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
      total *= 1.15;
    }
    
    total *= cantidad;
    
    return Math.round(total * 100) / 100;
  };

  const handleAddToCart = async () => {
    try {
      setIsAddingToCart(true);
      setError(null);

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
        setError('Por favor sube una foto para la figura de resina');
        setIsAddingToCart(false);
        return;
      }

      if (!config.personName.trim()) {
        setError('Por favor añade un nombre personalizado');
        setIsAddingToCart(false);
        return;
      }

      const userId = 'guest';
      const cantidadAttr = config.attributes.find(attr => attr.attributeId === '13');
      const cantidad = cantidadAttr ? parseInt(cantidadAttr.value) || 1 : 1;

      const customizationData = {
        userId,
        productId: product.id,
        productName: product.name,
        productType: 'resina',
        boxColor: config.boxColor,
        personName: config.personName,
        customImageUrl: config.imageUrl,
        imagePath: config.imagePath || '',
        attributes: config.attributes,
        basePrice: product.basePrice,
        totalPrice: calculatePrice(),
        cantidad
      };

      const customizationId = await saveCustomization(customizationData);
      console.log('✅ Personalización guardada:', customizationId);

      const customDetails = [
        `Caja ${BOX_COLORS[config.boxColor as keyof typeof BOX_COLORS].name}`,
        `Nombre: ${config.personName}`
      ];
      config.attributes.forEach(attrValue => {
        const attribute = attributes.find(a => a.id === attrValue.attributeId);
        if (attribute) {
          customDetails.push(`${attribute.name}: ${attrValue.value}`);
        }
      });

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
          uploadedImage: config.customImage,
          text: config.personName,
          backgroundColor: BOX_COLORS[config.boxColor as keyof typeof BOX_COLORS].color,
          selectedColor: config.boxColor,
          position: { x: 50, y: 50 },
          rotation: 0,
          scale: 1,
          quantity: cantidad,
          productType: 'resina',
          boxColor: config.boxColor,
          personName: config.personName,
          imageUrl: config.imageUrl,
          imagePath: config.imagePath
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

  const currentBox = boxImages[config.boxColor] || null;

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
              <span className="text-gray-800 font-medium">Personalizar Figura</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-black text-gray-800 flex items-center gap-3">
              🎨 Personaliza tu {product.name}
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

      {/* 🆕 INDICADOR DE CARGA DE IMÁGENES */}
      {loadingImages && (
        <div className="container mx-auto px-6 mb-6">
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-3">
            <Loader className="animate-spin" size={20} />
            <span>Cargando imágenes de cajas desde Storage...</span>
          </div>
        </div>
      )}

      {/* 🆕 AVISO SI NO HAY IMÁGENES */}
      {!loadingImages && Object.keys(boxImages).length === 0 && (
        <div className="container mx-auto px-6 mb-6">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg">
            <strong>⚠️ Imágenes no encontradas:</strong> No se encontraron imágenes en <code className="bg-yellow-200 px-2 py-1 rounded">variants/cajas/</code>. 
            Por favor sube las imágenes usando el gestor de variantes en el panel de admin.
          </div>
        </div>
      )}

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
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Mockup de tu Caja</h2>
            
            <div className="aspect-square rounded-xl overflow-hidden relative"
                 style={{ backgroundColor: BOX_COLORS[config.boxColor as keyof typeof BOX_COLORS].color }}>
              
              {currentBox ? (
                <img 
                  src={currentBox} 
                  alt={`Caja ${config.boxColor}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="relative w-full h-full">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3/4 h-1/6 rounded-t-lg"
                         style={{ backgroundColor: BOX_COLORS[config.boxColor as keyof typeof BOX_COLORS].color, filter: 'brightness(1.2)' }} />
                    
                    <div className="absolute top-[15%] left-1/2 transform -translate-x-1/2 w-3/4 h-4/5 rounded-lg shadow-2xl flex flex-col items-center justify-center"
                         style={{ backgroundColor: BOX_COLORS[config.boxColor as keyof typeof BOX_COLORS].color }}>
                      
                      {config.customImage && (
                        <div className="w-2/3 h-1/2 mb-4 bg-white rounded-lg p-2 shadow-inner">
                          <img
                            src={config.customImage}
                            alt="Tu foto"
                            className="w-full h-full object-contain rounded"
                          />
                        </div>
                      )}
                      
                      {config.personName && (
                        <div className="bg-white bg-opacity-90 px-6 py-3 rounded-full shadow-lg">
                          <p className="text-xl font-bold text-gray-800">{config.personName}</p>
                        </div>
                      )}
                      
                      {!config.customImage && !config.personName && (
                        <div className="text-white text-center opacity-70">
                          <p className="text-lg font-semibold">Tu Caja Personalizada</p>
                          <p className="text-sm mt-2">Sube una foto y añade un nombre</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                  <Loader className="animate-spin text-white" size={48} />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Sube la Foto</h3>
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
                {isLoading ? 'Subiendo...' : '📤 Subir Foto'}
              </button>
              {config.customImage && (
                <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-xl p-3">
                  <p className="text-green-800 font-bold text-sm">✓ Foto cargada</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Color de la Caja</h3>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(BOX_COLORS).map(([key, { color, name }]) => {
                  const hasImage = !!boxImages[key];
                  
                  return (
                    <button
                      key={key}
                      onClick={() => setConfig(prev => ({ ...prev, boxColor: key }))}
                      className={`aspect-square rounded-xl border-4 transition-all hover:scale-105 flex flex-col items-center justify-center relative ${
                        config.boxColor === key ? 'border-purple-500 shadow-lg' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      <span className="text-white font-semibold text-xs mb-1">{name}</span>
                      {hasImage && (
                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">✓</span>
                      )}
                      {!hasImage && (
                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">✗</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">
                {Object.keys(boxImages).length} de {Object.keys(BOX_COLORS).length} imágenes cargadas
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Nombre Personalizado</h3>
              <input
                type="text"
                value={config.personName}
                onChange={(e) => setConfig(prev => ({ ...prev, personName: e.target.value }))}
                placeholder="Ej: María, Max, Luna..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 outline-none"
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-2">{config.personName.length}/20 caracteres</p>
            </div>

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
                    <span className="font-bold text-green-600">+15%</span>
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