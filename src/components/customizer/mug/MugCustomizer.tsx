// src/components/customizer/mug/MugCustomizer.tsx

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Sparkles } from 'lucide-react';
import MugCanvas3D from './MugCanvas3D';
import MugToolsPanel from './MugToolsPanel';
import MugOptionsPanel from './MugOptionsPanel';
import MugReviewScreen from './MugReviewScreen';
import type { MugCustomizationData, MugDesignElement, MugTool } from './types';
import { MUG_TEMPLATES } from './mugConfig';
import { addToCart } from '../../../store/cartStore';
import { logger } from '../../../lib/logger';
import { notify } from '../../../lib/notifications';

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

interface MugCustomizerProps {
  product: FirebaseProduct;
}

export default function MugCustomizer({ product }: MugCustomizerProps) {
  const [customization, setCustomization] = useState<MugCustomizationData>({
    material: 'standard',
    printArea: '360',
    color: 'black-white',
    mugColors: {
      body: '#ffffff',
      handle: '#ffffff',
      interior: '#ffffff',
    },
    elements: [],
    frontElements: [],
    backElements: [],
  });

  const [activeTool, setActiveTool] = useState<MugTool | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [nextElementId, setNextElementId] = useState(1);

  // Actualizar elementos según el tipo de impresión
  useEffect(() => {
    if (customization.printArea === '360') {
      // Modo 360: usar solo elements
      if (customization.frontElements?.length || customization.backElements?.length) {
        setCustomization((prev) => ({
          ...prev,
          elements: [...(prev.frontElements || []), ...(prev.backElements || [])],
          frontElements: [],
          backElements: [],
        }));
      }
    } else {
      // Modo doble cara: usar frontElements y backElements
      if (customization.elements?.length && !customization.frontElements?.length) {
        setCustomization((prev) => ({
          ...prev,
          frontElements: prev.elements || [],
          elements: [],
        }));
      }
    }
  }, [customization.printArea]);

  const handleAddElement = (element: Partial<MugDesignElement>) => {
    const newElement: MugDesignElement = {
      id: `element-${nextElementId}`,
      type: element.type || 'text',
      x: element.x || 50,
      y: element.y || 50,
      width: element.width || 30,
      height: element.height || 10,
      rotation: element.rotation || 0,
      zIndex: element.zIndex || 10,
      ...element,
    };

    setNextElementId((prev) => prev + 1);

    if (customization.printArea === '360') {
      setCustomization((prev) => ({
        ...prev,
        elements: [...(prev.elements || []), newElement],
      }));
    } else {
      // Agregar al lado frontal por defecto en modo doble cara
      setCustomization((prev) => ({
        ...prev,
        frontElements: [...(prev.frontElements || []), newElement],
      }));
    }

    setSelectedElementId(newElement.id);
    logger.info('[MugCustomizer] Element added', { elementId: newElement.id, type: newElement.type });
  };

  const handleUpdateElement = (elementId: string, updates: Partial<MugDesignElement>) => {
    if (customization.printArea === '360') {
      setCustomization((prev) => ({
        ...prev,
        elements: (prev.elements || []).map((el) =>
          el.id === elementId ? { ...el, ...updates } : el
        ),
      }));
    } else {
      setCustomization((prev) => ({
        ...prev,
        frontElements: (prev.frontElements || []).map((el) =>
          el.id === elementId ? { ...el, ...updates } : el
        ),
        backElements: (prev.backElements || []).map((el) =>
          el.id === elementId ? { ...el, ...updates } : el
        ),
      }));
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = MUG_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    // Generar IDs únicos para los elementos de la plantilla
    const templateElements = template.elements.map((el, index) => ({
      ...el,
      id: `template-${templateId}-${index}`,
    }));

    if (customization.printArea === '360') {
      setCustomization((prev) => ({
        ...prev,
        elements: templateElements,
        templateId,
      }));
    } else {
      setCustomization((prev) => ({
        ...prev,
        frontElements: templateElements,
        templateId,
      }));
    }

    notify.success(`Plantilla "${template.name}" aplicada`);
    logger.info('[MugCustomizer] Template applied', { templateId, template: template.name });
  };

  const handleUpdateCustomization = (updates: Partial<MugCustomizationData>) => {
    setCustomization((prev) => ({ ...prev, ...updates }));
  };

  const handleReviewConfirm = async () => {
    try {
      setIsAddingToCart(true);

      // Preparar datos de personalización para el carrito
      const customizationForCart = {
        material: customization.material,
        printArea: customization.printArea,
        color: customization.color,
        size: customization.size,
        elementsCount: (customization.elements?.length || 0) +
          (customization.frontElements?.length || 0) +
          (customization.backElements?.length || 0),
        templateId: customization.templateId,
      };

      // Agregar al carrito
      addToCart({
        id: product.id,
        name: product.name,
        price: product.basePrice,
        quantity: 1,
        image: product.images[0] || '/placeholder-mug.png',
        slug: product.slug,
        customization: {
          categoryId: product.categoryId,
          categoryName: 'Tazas Personalizadas',
          values: [
            {
              fieldId: 'mug_customization',
              fieldLabel: 'Personalización',
              value: JSON.stringify(customization),
              displayValue: 'Taza personalizada con diseño único',
            },
          ],
          totalPriceModifier: 0, // Calculado en el panel de opciones
        },
      });

      notify.success('Taza agregada al carrito');
      logger.info('[MugCustomizer] Product added to cart', {
        productId: product.id,
        customization: customizationForCart,
      });

      // Redirigir al carrito
      setTimeout(() => {
        window.location.href = '/cart';
      }, 500);
    } catch (error) {
      logger.error('[MugCustomizer] Error adding to cart', error);
      notify.error('Error al agregar al carrito. Intenta nuevamente.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleAddToCart = () => {
    // Validar que haya al menos un elemento de diseño
    const hasElements =
      (customization.elements?.length || 0) +
        (customization.frontElements?.length || 0) +
        (customization.backElements?.length || 0) >
      0;

    if (!hasElements) {
      notify.error('Agrega al menos un elemento a tu diseño');
      return;
    }

    // Mostrar pantalla de revisión
    setShowReview(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href={`/producto/${product.slug}`}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Volver
              </a>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  {product.name}
                </h1>
                <p className="text-sm text-gray-600">Personaliza tu taza a tu gusto</p>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <ShoppingCart className="w-5 h-5" />
              Añadir al carrito
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="max-w-screen-2xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Tools */}
          <div className="col-span-3 bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden h-[calc(100vh-180px)] sticky top-24">
            <MugToolsPanel
              activeTool={activeTool}
              onToolSelect={setActiveTool}
              onAddElement={handleAddElement}
              onTemplateSelect={handleTemplateSelect}
            />
          </div>

          {/* Center - Canvas */}
          <div className="col-span-6">
            <MugCanvas3D
              customization={customization}
              baseImage={product.images[0]}
              onElementSelect={setSelectedElementId}
              selectedElementId={selectedElementId}
              onUpdateElement={handleUpdateElement}
            />
          </div>

          {/* Right Sidebar - Options */}
          <div className="col-span-3 h-fit sticky top-24">
            <MugOptionsPanel
              customization={customization}
              onUpdate={handleUpdateCustomization}
              basePrice={product.basePrice}
            />
          </div>
        </div>
      </div>

      {/* Review Screen Modal */}
      {showReview && (
        <MugReviewScreen
          customization={customization}
          onConfirm={handleReviewConfirm}
          onBack={() => setShowReview(false)}
          productName={product.name}
        />
      )}
    </div>
  );
}
