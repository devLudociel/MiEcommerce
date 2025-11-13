/**
 * useShirtCustomizer Hook
 *
 * Maneja toda la lógica de negocio del ShirtCustomizer:
 * - Estado de configuración (color, imagen, posición, atributos)
 * - Upload y procesamiento de imágenes
 * - Drag & drop optimizado con useRef
 * - Cálculo de precios
 * - Validación y add to cart
 *
 * PERFORMANCE: Usa useCallback y useMemo para evitar re-renders innecesarios
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { uploadCustomImage, saveCustomization, getProductImageUrl, auth } from '../lib/firebase';
import { compressImage, validateImageFile, fileToBase64 } from '../utils/imageCompression';
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
  gris: { color: '#6B7280', name: 'Gris' },
};

export function useShirtCustomizer(product: FirebaseProduct) {
  // STATE
  const [config, setConfig] = useState<CustomConfig>({
    color: 'blanco',
    customImage: null,
    imageUrl: null,
    imagePath: null,
    position: { x: 50, y: 40 },
    size: 30,
    rotation: 0,
    attributes: [],
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [productImages, setProductImages] = useState<Record<string, string>>({});

  // REFS for drag & drop optimization
  const dragStartPos = useRef({ x: 0, y: 0 });
  const tempPosition = useRef(config.position);
  const imageRef = useRef<HTMLDivElement>(null);

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

    // +10% for custom image
    if (config.imageUrl) {
      total *= 1.1;
    }

    return Math.round(total * 100) / 100;
  }, [config.attributes, config.imageUrl, product.basePrice, availableAttributes]);

  // LOAD PRODUCT IMAGES (on mount)
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
          logger.debug(`[useShirtCustomizer] No se encontró imagen para color ${colorKey}`);
        }
      }

      setProductImages(imageUrls);
    }

    loadProductImages();
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

  // IMAGE UPLOAD HANDLER
  const handleImageUpload = useCallback(async (file: File) => {
    setError(null);
    setIsLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Debes estar autenticado para subir imágenes');
        return;
      }

      const validation = validateImageFile(file, { maxSizeMB: 10 });
      if (!validation.valid) {
        setError(validation.error || 'Error de validación');
        return;
      }

      const base64 = await fileToBase64(file);
      setConfig((prev) => ({ ...prev, customImage: base64 }));

      const compressedFile = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
      const { url, path } = await uploadCustomImage(compressedFile, user.uid, 'camiseta');

      setConfig((prev) => ({ ...prev, imageUrl: url, imagePath: path }));
    } catch (error: unknown) {
      logger.error('[useShirtCustomizer] Error subiendo imagen', error);
      setError('Error al subir la imagen. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // COLOR CHANGE
  const updateColor = useCallback((color: string) => {
    setConfig((prev) => ({ ...prev, color }));
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

  // IMAGE SIZE ADJUSTMENT
  const adjustImageSize = useCallback((delta: number) => {
    setConfig((prev) => ({
      ...prev,
      size: Math.max(10, Math.min(100, prev.size + delta)),
    }));
  }, []);

  // IMAGE ROTATION
  const updateRotation = useCallback((rotation: number) => {
    setConfig((prev) => ({ ...prev, rotation }));
  }, []);

  // OPTIMIZED DRAG & DROP (60 FPS)
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!config.customImage) return;

    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
    };
    tempPosition.current = config.position;
  }, [config.customImage, config.position]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !config.customImage || !imageRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    tempPosition.current = { x: clampedX, y: clampedY };

    // PERFORMANCE: Update visual only, not state
    requestAnimationFrame(() => {
      if (imageRef.current) {
        imageRef.current.style.left = `${clampedX}%`;
        imageRef.current.style.top = `${clampedY}%`;
      }
    });
  }, [isDragging, config.customImage]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // Update state only once after drag ends
      setConfig((prev) => ({ ...prev, position: tempPosition.current }));
    }
  }, [isDragging]);

  // VALIDATION
  const validate = useCallback((): { valid: boolean; error?: string } => {
    if (!config.imageUrl && !config.customImage) {
      return { valid: false, error: 'Debes subir un diseño para tu camiseta' };
    }

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
  }, [config.imageUrl, config.customImage, config.attributes, availableAttributes]);

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
      const customization = {
        customizationId: `shirt-${Date.now()}`,
        uploadedImage: config.imageUrl,
        uploadedImagePath: config.imagePath,
        selectedColor: config.color,
        position: config.position,
        size: config.size,
        rotation: config.rotation,
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
        image: productImages[config.color] || product.images[0] || '',
        customization,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      logger.error('[useShirtCustomizer] Error agregando al carrito', error);
      setError('Error al agregar al carrito. Intenta nuevamente.');
    } finally {
      setIsAddingToCart(false);
    }
  }, [validate, config, product, price, productImages, availableAttributes]);

  return {
    // State
    config,
    isDragging,
    isLoading,
    isAddingToCart,
    error,
    success,
    productImages,

    // Computed
    price,
    availableAttributes,
    SHIRT_COLORS,

    // Handlers
    handleImageUpload,
    updateColor,
    updateAttributeValue,
    adjustImageSize,
    updateRotation,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleAddToCart,
    setError,

    // Refs
    imageRef,
  };
}
