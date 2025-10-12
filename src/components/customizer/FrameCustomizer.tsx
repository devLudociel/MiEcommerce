import React, { useState, useEffect } from 'react';
import { ShoppingCart, Loader } from 'lucide-react';
import { saveCustomization, getProductImageUrl } from '../../lib/firebase';
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
  flowerColor: string;
  attributes: ProductAttributeValue[];
}

const FLOWER_COLORS = {
  rosa: { 
    primary: '#EC4899', 
    secondary: '#FCA5A5',
    name: 'Rosas'
  },
  rojo: { 
    primary: '#DC2626', 
    secondary: '#F87171',
    name: 'Rojas'
  },
  morado: { 
    primary: '#9333EA', 
    secondary: '#C084FC',
    name: 'Moradas'
  },
  amarillo: { 
    primary: '#FACC15', 
    secondary: '#FDE047',
    name: 'Amarillas'
  },
  blanco: { 
    primary: '#F3F4F6', 
    secondary: '#E5E7EB',
    name: 'Blancas'
  },
  azul: { 
    primary: '#3B82F6', 
    secondary: '#93C5FD',
    name: 'Azules'
  },
  naranja: { 
    primary: '#F97316', 
    secondary: '#FDBA74',
    name: 'Naranjas'
  }
};

export default function FrameCustomizer({ product }: Props) {
  const [config, setConfig] = useState<CustomConfig>({
    flowerColor: 'rosa',
    attributes: []
  });

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [frameImages, setFrameImages] = useState<Record<string, string>>({});

  const availableAttributes = product.subcategoryId 
    ? subcategoryAttributes
        .filter(sa => sa.subcategoryId === product.subcategoryId)
        .map(sa => attributes.find(attr => attr.id === sa.attributeId))
        .filter(Boolean)
    : [];

  // Cargar imágenes de cuadros desde Firebase Storage
  useEffect(() => {
    async function loadFrameImages() {
      const imageUrls: Record<string, string> = {};
      
      for (const colorKey of Object.keys(FLOWER_COLORS)) {
        try {
          const url = await getProductImageUrl('cuadros', `flores-${colorKey}`);
          if (url) {
            imageUrls[colorKey] = url;
          }
        } catch (error) {
          console.log(`No se encontró imagen para flores ${colorKey}`);
        }
      }
      
      setFrameImages(imageUrls);
    }

    loadFrameImages();

    // Inicializar atributos
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

      const userId = 'guest';
      const cantidadAttr = config.attributes.find(attr => attr.attributeId === '13');
      const cantidad = cantidadAttr ? parseInt(cantidadAttr.value) || 1 : 1;

      // Guardar en Firestore
      const customizationData = {
        userId,
        productId: product.id,
        productName: product.name,
        productType: 'cuadro',
        flowerColor: config.flowerColor,
        attributes: config.attributes,
        basePrice: product.basePrice,
        totalPrice: calculatePrice(),
        cantidad
      };

      const customizationId = await saveCustomization(customizationData);
      console.log('✅ Personalización guardada:', customizationId);

      // Añadir al carrito
      const customDetails = [`Flores ${FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].name}`];
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
        image: frameImages[config.flowerColor] || product.images?.[0] || '',
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

  const currentFrame = frameImages[config.flowerColor] || null;

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
              <span className="text-gray-800 font-medium">Personalizar Cuadro</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-black text-gray-800 flex items-center gap-3">
              🖼️ Personaliza tu {product.name}
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
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Vista Previa del Cuadro</h2>
            
            <div className="aspect-square rounded-xl overflow-hidden shadow-inner bg-gray-50 p-4">
              {/* Marco */}
              <div className="w-full h-full border-8 rounded-lg relative overflow-hidden"
                   style={{ 
                     borderColor: '#92400E',
                     boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2), 0 4px 6px rgba(0,0,0,0.1)'
                   }}>
                
                {/* Si hay imagen real desde Firebase, mostrarla */}
                {currentFrame ? (
                  <img 
                    src={currentFrame} 
                    alt={`Cuadro de flores ${config.flowerColor}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // Si no, mostrar diseño SVG generado
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100">
                    <div className="absolute inset-0 p-8">
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        {/* Flor grande 1 */}
                        <g>
                          <circle cx="60" cy="60" r="15" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].primary} />
                          <circle cx="50" cy="50" r="8" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].secondary} />
                          <circle cx="70" cy="50" r="8" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].secondary} />
                          <circle cx="50" cy="70" r="8" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].secondary} />
                          <circle cx="70" cy="70" r="8" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].secondary} />
                          <circle cx="60" cy="60" r="6" fill="#FCD34D" />
                        </g>
                        
                        {/* Flor grande 2 */}
                        <g>
                          <circle cx="140" cy="80" r="18" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].primary} />
                          <circle cx="128" cy="68" r="10" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].secondary} />
                          <circle cx="152" cy="68" r="10" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].secondary} />
                          <circle cx="128" cy="92" r="10" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].secondary} />
                          <circle cx="152" cy="92" r="10" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].secondary} />
                          <circle cx="140" cy="80" r="7" fill="#FCD34D" />
                        </g>
                        
                        {/* Flor grande 3 */}
                        <g>
                          <circle cx="100" cy="140" r="20" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].primary} />
                          <circle cx="86" cy="126" r="11" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].secondary} />
                          <circle cx="114" cy="126" r="11" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].secondary} />
                          <circle cx="86" cy="154" r="11" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].secondary} />
                          <circle cx="114" cy="154" r="11" fill={FLOWER_COLORS[config.flowerColor as keyof typeof FLOWER_COLORS].secondary} />
                          <circle cx="100" cy="140" r="8" fill="#FCD34D" />
                        </g>

                        {/* Tallos */}
                        <rect x="58" y="75" width="4" height="40" fill="#22C55E" rx="2" />
                        <rect x="138" y="98" width="4" height="35" fill="#22C55E" rx="2" />
                        <rect x="98" y="160" width="4" height="30" fill="#22C55E" rx="2" />
                        
                        {/* Hojas */}
                        <ellipse cx="55" cy="95" rx="8" ry="12" fill="#16A34A" transform="rotate(-30 55 95)" />
                        <ellipse cx="145" cy="115" rx="8" ry="12" fill="#16A34A" transform="rotate(20 145 115)" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="space-y-6">
            {/* Selector de color de flores */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Color de las Flores</h3>
              <p className="text-sm text-gray-600 mb-4">Cada color muestra un diseño único</p>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(FLOWER_COLORS).map(([key, { primary, secondary, name }]) => (
                  <button
                    key={key}
                    onClick={() => setConfig(prev => ({ ...prev, flowerColor: key }))}
                    className={`aspect-square rounded-xl border-4 transition-all hover:scale-105 flex flex-col items-center justify-center ${
                      config.flowerColor === key ? 'border-purple-500 shadow-lg' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: primary }}
                  >
                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: secondary }}></div>
                    <span className="text-xs mt-2 text-white font-semibold">{name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Atributos */}
            {availableAttributes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 max-h-96 overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Opciones del Cuadro</h3>
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

            {/* Resumen */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow-lg p-6 border-2 border-purple-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Resumen</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Precio base</span>
                  <span className="font-bold">€{product.basePrice}</span>
                </div>
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