import React, { useState, useEffect } from 'react';
import { ShoppingCart, Loader } from 'lucide-react';
import type {
  CustomizationSchema,
  CustomizationField,
  CustomizationValue,
  CustomizationPricing,
} from '../../types/customization';
import ColorSelector from './fields/ColorSelector';
import SizeSelector from './fields/SizeSelector';
import DropdownField from './fields/DropdownField';
import ImageUploadField from './fields/ImageUploadField';
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
    setValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
    setError(null);
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Personaliza tu {product.name}</h2>
        <p className="text-gray-600">{product.description}</p>
      </div>

      {/* Fields */}
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

      {/* Help text */}
      <p className="text-center text-sm text-gray-500 mt-4">
        ¿Tienes dudas? Contáctanos en{' '}
        <a href="mailto:soporte@tutienda.com" className="text-purple-600 hover:underline">
          soporte@tutienda.com
        </a>
      </p>
    </div>
  );
}
