import React, { useState, useEffect } from 'react';
import { ShoppingCart, Loader, Sparkles, Image as ImageIcon } from 'lucide-react';
import type {
  CustomizationSchema,
  CustomizationField,
  CustomizationValue,
  CustomizationPricing,
  ColorSelectorConfig,
  DesignTemplate,
  Clipart,
  DesignLayer,
} from '../../types/customization';
import ColorSelector from './fields/ColorSelector';
import SizeSelector from './fields/SizeSelector';
import DropdownField from './fields/DropdownField';
import ImageUploadField from './fields/ImageUploadField';
import ProductPreview from './ProductPreview';
import TemplateGallery from './TemplateGallery';
import ClipartGallery from './ClipartGallery';
import ShareDesignButton from './ShareDesignButton';
import SaveDesignButton from './SaveDesignButton';
import { addToCart } from '../../store/cartStore';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';

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

interface DynamicCustomizerProps {
  product: FirebaseProduct;
  schema: CustomizationSchema;
}

export default function DynamicCustomizer({ product, schema }: DynamicCustomizerProps) {
  const [values, setValues] = useState<Record<string, CustomizationValue>>({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCliparts, setShowCliparts] = useState(false);
  const [layers, setLayers] = useState<DesignLayer[]>([]);

  // Calculate pricing
  const pricing: CustomizationPricing = {
    basePrice: product.basePrice,
    customizationPrice: Object.values(values).reduce(
      (sum, val) => sum + (val.priceModifier || 0),
      0
    ),
    totalPrice: 0,
    breakdown: [],
  };
  pricing.totalPrice = pricing.basePrice + pricing.customizationPrice;

  // Build breakdown
  pricing.breakdown = Object.entries(values)
    .filter(([_, val]) => val.priceModifier && val.priceModifier > 0)
    .map(([fieldId, val]) => {
      const field = schema.fields.find((f) => f.id === fieldId);
      return {
        fieldLabel: field?.label || fieldId,
        price: val.priceModifier || 0,
      };
    });

  const handleFieldChange = (fieldId: string, value: CustomizationValue) => {
    // Get field label from schema
    const field = schema.fields.find((f) => f.id === fieldId);
    const fieldLabel = field?.label || fieldId;

    setValues((prev) => ({
      ...prev,
      [fieldId]: {
        ...value,
        fieldLabel, // Include field label for cart display
      },
    }));
    setError(null);
  };

  const handleLoadTemplate = (template: DesignTemplate) => {
    logger.info('[DynamicCustomizer] Loading template:', template.name);

    // Convert template fields to values format
    const newValues: Record<string, CustomizationValue> = {};

    template.template.fields.forEach((templateField) => {
      // Find matching field in schema
      const schemaField = schema.fields.find((f) => f.id === templateField.fieldId);
      if (!schemaField) {
        logger.warn(`[DynamicCustomizer] Field ${templateField.fieldId} not found in schema`);
        return;
      }

      newValues[templateField.fieldId] = {
        fieldId: templateField.fieldId,
        fieldLabel: schemaField.label,
        value: templateField.value,
        displayValue: templateField.displayValue,
        imageUrl: templateField.imageUrl,
        imageTransform: templateField.imageTransform,
        priceModifier: schemaField.priceModifier,
      };
    });

    setValues(newValues);
    setShowTemplates(false);
    notify.success(`Plantilla "${template.name}" cargada correctamente`);
  };

  const handleSelectClipart = (clipart: Clipart) => {
    logger.info('[DynamicCustomizer] Adding clipart:', clipart.name);

    // Create new layer for the clipart
    const newLayer: DesignLayer = {
      id: `layer_${Date.now()}`,
      type: 'clipart',
      source: clipart.imageUrl,
      transform: {
        x: 50, // Center
        y: 50, // Center
        scale: 0.5, // 50% initial size
        rotation: 0,
      },
      zIndex: layers.length,
      locked: false,
      visible: true,
      opacity: 100,
    };

    setLayers((prev) => [...prev, newLayer]);
    setShowCliparts(false);
    notify.success(`Clipart "${clipart.name}" añadido`);
  };

  const validateFields = (): boolean => {
    const requiredFields = schema.fields.filter((f) => f.required);

    for (const field of requiredFields) {
      const value = values[field.id];

      // Check if field should be visible (condition check)
      if (field.condition) {
        const dependentValue = values[field.condition.dependsOn]?.value;
        const showWhen = Array.isArray(field.condition.showWhen)
          ? field.condition.showWhen
          : [field.condition.showWhen];

        if (!showWhen.includes(String(dependentValue))) {
          // Field is hidden, skip validation
          continue;
        }
      }

      if (!value || !value.value || (typeof value.value === 'string' && !value.value.trim())) {
        setError(`El campo "${field.label}" es obligatorio`);
        return false;
      }
    }

    return true;
  };

  const handleAddToCart = async () => {
    setError(null);

    // Validate
    if (!validateFields()) {
      return;
    }

    setIsAddingToCart(true);

    try {
      // Build customization data
      const customizationData = {
        categoryId: product.categoryId,
        categoryName: product.name,
        values: Object.values(values),
        totalPriceModifier: pricing.customizationPrice,
      };

      // Add to cart
      addToCart({
        productId: product.id,
        name: product.name,
        price: pricing.totalPrice,
        quantity: 1,
        image: product.images[0] || '',
        customization: customizationData,
      });

      notify.success('¡Producto añadido al carrito!');
      logger.info('[DynamicCustomizer] Product added to cart', {
        productId: product.id,
        customization: customizationData,
      });

      // Reset form
      setValues({});
    } catch (err) {
      logger.error('[DynamicCustomizer] Error adding to cart', err);
      setError('Error al añadir al carrito. Por favor, inténtalo de nuevo.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const renderField = (field: CustomizationField) => {
    // Check if field should be visible
    if (field.condition) {
      const dependentValue = values[field.condition.dependsOn]?.value;
      const showWhen = Array.isArray(field.condition.showWhen)
        ? field.condition.showWhen
        : [field.condition.showWhen];

      if (!showWhen.includes(String(dependentValue))) {
        return null; // Field is hidden
      }
    }

    const value = values[field.id];

    switch (field.fieldType) {
      case 'color_selector':
        return (
          <ColorSelector
            key={field.id}
            fieldId={field.id}
            label={field.label}
            required={field.required}
            config={field.config as any}
            value={value}
            onChange={(val) => handleFieldChange(field.id, val)}
            helpText={field.helpText}
          />
        );

      case 'size_selector':
        return (
          <SizeSelector
            key={field.id}
            fieldId={field.id}
            label={field.label}
            required={field.required}
            config={field.config as any}
            value={value}
            onChange={(val) => handleFieldChange(field.id, val)}
            helpText={field.helpText}
          />
        );

      case 'dropdown':
        return (
          <DropdownField
            key={field.id}
            fieldId={field.id}
            label={field.label}
            required={field.required}
            config={field.config as any}
            value={value}
            onChange={(val) => handleFieldChange(field.id, val)}
            helpText={field.helpText}
          />
        );

      case 'image_upload':
        return (
          <ImageUploadField
            key={field.id}
            fieldId={field.id}
            label={field.label}
            required={field.required}
            config={field.config as any}
            value={value}
            onChange={(val) => handleFieldChange(field.id, val)}
            helpText={field.helpText}
            productType={product.categoryId}
          />
        );

      default:
        return (
          <div key={field.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Tipo de campo no soportado: <code>{field.fieldType}</code>
            </p>
          </div>
        );
    }
  };

  // Sort fields by order
  const sortedFields = [...schema.fields].sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    return orderA - orderB;
  });

  // Get base image for preview based on selected color
  const getBaseImage = (): string => {
    // Find color selector field
    const colorField = schema.fields.find(f => f.fieldType === 'color_selector');
    if (!colorField) {
      // No color selector, use default image from schema
      return schema.previewImages?.default || product.images[0] || '';
    }

    const colorValue = values[colorField.id];
    if (!colorValue) {
      // No color selected yet, use default
      return schema.previewImages?.default || product.images[0] || '';
    }

    // Get the selected color's preview image
    const colorConfig = colorField.config as ColorSelectorConfig;
    const selectedColor = colorConfig.availableColors?.find(c => c.id === colorValue.value);

    if (selectedColor?.previewImage) {
      return selectedColor.previewImage;
    }

    // Fallback to default
    return schema.previewImages?.default || product.images[0] || '';
  };

  // Get user uploaded image
  const getUserImage = (): string | null => {
    const imageField = schema.fields.find(f => f.fieldType === 'image_upload');
    if (!imageField) return null;

    const imageValue = values[imageField.id];
    return (imageValue?.imageUrl as string) || null;
  };

  // Get image transform
  const getImageTransform = () => {
    const imageField = schema.fields.find(f => f.fieldType === 'image_upload');
    if (!imageField) return undefined;

    const imageValue = values[imageField.id];
    return imageValue?.imageTransform;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">Personaliza tu {product.name}</h2>
          <p className="text-gray-600">{product.description}</p>
        </div>

        {/* Template Gallery Modal */}
        {showTemplates && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <TemplateGallery
                categoryId={product.categoryId}
                onSelectTemplate={handleLoadTemplate}
                onClose={() => setShowTemplates(false)}
              />
            </div>
          </div>
        )}

        {/* Clipart Gallery Modal */}
        {showCliparts && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-6xl w-full">
              <ClipartGallery
                onSelectClipart={handleSelectClipart}
                onClose={() => setShowCliparts(false)}
              />
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Preview */}
          <div className="order-2 lg:order-1">
            <ProductPreview
              baseImage={getBaseImage()}
              userImage={getUserImage()}
              transform={getImageTransform()}
              productName={product.name}
            />

            {/* Info about cliparts */}
            {layers.length > 0 && (
              <div className="mt-4 p-4 bg-pink-50 border-2 border-pink-200 rounded-lg">
                <p className="text-sm text-pink-800 font-medium mb-2">
                  🎨 {layers.length} clipart{layers.length > 1 ? 's' : ''} añadido{layers.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-pink-600">
                  Los cliparts se agregarán sobre tu diseño. Puedes añadir múltiples elementos.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Fields */}
          <div className="order-1 lg:order-2">
            {/* Template & Clipart Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setShowTemplates(true)}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 px-6 rounded-xl font-bold text-base hover:shadow-xl transition-all flex items-center justify-center gap-3 group"
              >
                <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                Plantillas
              </button>

              <button
                onClick={() => setShowCliparts(true)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-xl font-bold text-base hover:shadow-xl transition-all flex items-center justify-center gap-3 group"
              >
                <ImageIcon className="w-5 h-5 group-hover:animate-pulse" />
                Cliparts
              </button>
            </div>

            <div className="space-y-6 mb-8">
              {sortedFields.map((field) => renderField(field))}
            </div>

            {/* Pricing Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-cyan-50 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-lg mb-4">Resumen de Precio</h3>

              <div className="space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Precio base:</span>
                  <span className="font-medium">€{pricing.basePrice.toFixed(2)}</span>
                </div>

                {pricing.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-gray-700">
                    <span>{item.fieldLabel}:</span>
                    <span className="font-medium text-purple-600">+€{item.price.toFixed(2)}</span>
                  </div>
                ))}

                <div className="border-t-2 border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-purple-600">
                      €{pricing.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                ❌ {error}
              </div>
            )}

            {/* Add to Cart button */}
            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isAddingToCart ? (
                <>
                  <Loader className="w-6 h-6 animate-spin" />
                  Añadiendo...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-6 h-6" />
                  Añadir al Carrito
                </>
              )}
            </button>

            {/* Save & Share Buttons */}
            {Object.keys(values).length > 0 && (
              <div className="mt-4 flex justify-center gap-3 flex-wrap">
                <SaveDesignButton
                  productId={product.id}
                  productName={product.name}
                  categoryId={product.categoryId}
                  designData={{
                    categoryId: product.categoryId,
                    categoryName: product.name,
                    values: Object.values(values),
                    totalPriceModifier: pricing.customizationPrice,
                  }}
                  previewImage={getUserImage() || getBaseImage()}
                />
                <ShareDesignButton
                  productId={product.id}
                  productName={product.name}
                  designData={{
                    categoryId: product.categoryId,
                    categoryName: product.name,
                    values: Object.values(values),
                    totalPriceModifier: pricing.customizationPrice,
                  }}
                  previewImage={getUserImage() || getBaseImage()}
                />
              </div>
            )}

            {/* Help text */}
            <p className="text-center text-sm text-gray-500 mt-4">
              ¿Tienes dudas? Contáctanos en{' '}
              <a href="mailto:soporte@tutienda.com" className="text-purple-600 hover:underline">
                soporte@tutienda.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
