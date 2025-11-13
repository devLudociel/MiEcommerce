/**
 * useFrameCustomizer Hook
 *
 * Maneja toda la lógica de negocio del FrameCustomizer:
 * - Estado de configuración (color de flores, atributos)
 * - Carga de imágenes de cuadros
 * - Cálculo de precios
 * - Validación y add to cart
 *
 * ARQUITECTURA: Hook reutilizable siguiendo el patrón establecido
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getProductImageUrl } from '../lib/firebase';
import { addToCart } from '../store/cartStore';
import { attributes, subcategoryAttributes } from '../data/productAttributes';
import type { ProductAttributeValue } from '../data/productAttributes';
import { logger } from '../lib/logger';

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

interface CustomConfig {
  flowerColor: string;
  attributes: ProductAttributeValue[];
}

export const FLOWER_COLORS = {
  rosa: {
    primary: '#EC4899',
    secondary: '#FCA5A5',
    name: 'Rosas',
  },
  rojo: {
    primary: '#DC2626',
    secondary: '#F87171',
    name: 'Rojas',
  },
  morado: {
    primary: '#9333EA',
    secondary: '#C084FC',
    name: 'Moradas',
  },
  amarillo: {
    primary: '#FACC15',
    secondary: '#FDE047',
    name: 'Amarillas',
  },
  blanco: {
    primary: '#F3F4F6',
    secondary: '#E5E7EB',
    name: 'Blancas',
  },
  azul: {
    primary: '#3B82F6',
    secondary: '#93C5FD',
    name: 'Azules',
  },
  naranja: {
    primary: '#F97316',
    secondary: '#FDBA74',
    name: 'Naranjas',
  },
};

export function useFrameCustomizer(product: FirebaseProduct) {
  // STATE
  const [config, setConfig] = useState<CustomConfig>({
    flowerColor: 'rosa',
    attributes: [],
  });

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [frameImages, setFrameImages] = useState<Record<string, string>>({});

  // COMPUTED VALUES
  const availableAttributes = useMemo(() => {
    if (!product.subcategoryId) return [];

    return subcategoryAttributes
      .filter((sa) => sa.subcategoryId === product.subcategoryId)
      .map((sa) => attributes.find((attr) => attr.id === sa.attributeId))
      .filter(Boolean);
  }, [product.subcategoryId]);

  // PRICE CALCULATION (memoized)
  const price = useMemo(() => {
    let total = Number(product.basePrice) || 0;

    config.attributes.forEach((attrValue) => {
      const attr = availableAttributes.find((a) => a?.id === attrValue.attributeId);
      if (!attr) return;

      if (attr.type === 'select' && attr.options) {
        const option = attr.options.find((opt) => opt.value === attrValue.value);
        if (option?.price) {
          total += Number(option.price);
        }
      }
    });

    return Math.round(total * 100) / 100;
  }, [config.attributes, product.basePrice, availableAttributes]);

  // LOAD FRAME IMAGES (on mount)
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
          logger.debug(`[useFrameCustomizer] No se encontró imagen para flores ${colorKey}`);
        }
      }

      setFrameImages(imageUrls);
    }

    loadFrameImages();
  }, []);

  // INITIALIZE DEFAULT ATTRIBUTES (on mount)
  useEffect(() => {
    if (product.subcategoryId && availableAttributes.length > 0) {
      const defaultAttrs = availableAttributes
        .map((attr) => {
          if (!attr) return null;
          let defaultValue = '';
          if (attr.type === 'select' && attr.options?.length) {
            defaultValue = attr.options[0].value;
          } else if (attr.type === 'number') {
            defaultValue = '1';
          }
          return { attributeId: attr.id, value: defaultValue };
        })
        .filter(Boolean) as ProductAttributeValue[];

      setConfig((prev) => ({ ...prev, attributes: defaultAttrs }));
    }
  }, [product.subcategoryId, availableAttributes]);

  // COLOR CHANGE
  const updateFlowerColor = useCallback((color: string) => {
    setConfig((prev) => ({ ...prev, flowerColor: color }));
  }, []);

  // ATTRIBUTE CHANGE
  const updateAttributeValue = useCallback((attributeId: string, value: string) => {
    setConfig((prev) => {
      const existingIndex = prev.attributes.findIndex((a) => a.attributeId === attributeId);

      if (existingIndex >= 0) {
        const newAttributes = [...prev.attributes];
        newAttributes[existingIndex] = { attributeId, value };
        return { ...prev, attributes: newAttributes };
      } else {
        return { ...prev, attributes: [...prev.attributes, { attributeId, value }] };
      }
    });
  }, []);

  // VALIDATION
  const validate = useCallback((): { valid: boolean; error?: string } => {
    const requiredAttributes = availableAttributes.filter((attr) => attr?.required);
    for (const reqAttr of requiredAttributes) {
      if (!reqAttr) continue;
      const hasValue = config.attributes.some(
        (a) => a.attributeId === reqAttr.id && a.value && a.value.trim() !== ''
      );
      if (!hasValue) {
        return { valid: false, error: `El campo "${reqAttr.name}" es obligatorio` };
      }
    }

    return { valid: true };
  }, [config.attributes, availableAttributes]);

  // ADD TO CART
  const handleAddToCart = useCallback(async () => {
    setError(null);

    const validation = validate();
    if (!validation.valid) {
      setError(validation.error || 'Validación fallida');
      return;
    }

    setIsAddingToCart(true);

    try {
      const customization: Record<string, any> = {
        customizationId: `frame-${Date.now()}`,
        flowerColor: config.flowerColor,
      };

      config.attributes.forEach((attr) => {
        const attribute = availableAttributes.find((a) => a?.id === attr.attributeId);
        if (attribute) {
          customization[attribute.name.toLowerCase().replace(/\s+/g, '_')] = attr.value;
        }
      });

      addToCart({
        id: product.id,
        name: product.name,
        price,
        quantity: 1,
        image: frameImages[config.flowerColor] || product.images[0] || '',
        customization,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      logger.error('[useFrameCustomizer] Error agregando al carrito', error);
      setError('Error al agregar al carrito. Intenta nuevamente.');
    } finally {
      setIsAddingToCart(false);
    }
  }, [validate, config, product, price, frameImages, availableAttributes]);

  return {
    // State
    config,
    isAddingToCart,
    error,
    success,
    frameImages,

    // Computed
    price,
    availableAttributes,

    // Handlers
    updateFlowerColor,
    updateAttributeValue,
    handleAddToCart,
    setError,
  };
}
