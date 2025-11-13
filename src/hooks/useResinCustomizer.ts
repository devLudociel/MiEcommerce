/**
 * useResinCustomizer Hook
 *
 * Maneja toda la lógica de negocio del ResinCustomizer:
 * - Estado de configuración (color de caja, nombre, imagen, atributos)
 * - Upload y procesamiento de imágenes
 * - Cálculo de precios (cantidad + personalización +15%)
 * - Validación y add to cart
 *
 * ARQUITECTURA: Hook reutilizable siguiendo el patrón establecido
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage, auth, uploadCustomImage, saveCustomization } from '../lib/firebase';
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
  boxColor: string;
  personName: string;
  customImage: string | null;
  imageUrl: string | null;
  imagePath: string | null;
  attributes: ProductAttributeValue[];
}

export const BOX_COLORS = {
  azul: { color: '#3B82F6', name: 'Azul' },
  rosa: { color: '#EC4899', name: 'Rosa' },
  dorado: { color: '#F59E0B', name: 'Dorado' },
  plata: { color: '#94A3B8', name: 'Plata' },
  negro: { color: '#1F2937', name: 'Negro' },
  blanco: { color: '#F3F4F6', name: 'Blanco' },
  verde: { color: '#10B981', name: 'Verde' },
  morado: { color: '#8B5CF6', name: 'Morado' },
};

export function useResinCustomizer(product: FirebaseProduct) {
  // STATE
  const [config, setConfig] = useState<CustomConfig>({
    boxColor: 'azul',
    personName: '',
    customImage: null,
    imageUrl: null,
    imagePath: null,
    attributes: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [boxImages, setBoxImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);

  // COMPUTED VALUES
  const availableAttributes = useMemo(() => {
    if (!product.subcategoryId) return [];

    return subcategoryAttributes
      .filter((sa) => sa.subcategoryId === product.subcategoryId)
      .map((sa) => attributes.find((attr) => attr.id === sa.attributeId))
      .filter(Boolean);
  }, [product.subcategoryId]);

  // PRICE CALCULATION (memoized) - Incluye cantidad y +15% personalización
  const price = useMemo(() => {
    let total = Number(product.basePrice) || 0;

    // Add attribute price modifiers
    config.attributes.forEach((attrValue) => {
      const attr = availableAttributes.find((a) => a?.id === attrValue.attributeId);
      if (!attr) return;

      if (attr.type === 'select' && attr.options) {
        const option = attr.options.find((opt) => opt.value === attrValue.value);
        if (option?.priceModifier) {
          total += Number(option.priceModifier);
        }
      }
    });

    // Get quantity from attributes (ID 13)
    const cantidadAttr = config.attributes.find((attr) => attr.attributeId === '13');
    const cantidad = cantidadAttr ? parseInt(cantidadAttr.value) || 1 : 1;

    // +15% for custom image
    if (config.imageUrl) {
      total *= 1.15;
    }

    // Multiply by quantity
    total *= cantidad;

    return Math.round(total * 100) / 100;
  }, [config.attributes, config.imageUrl, product.basePrice, availableAttributes]);

  // LOAD BOX IMAGES (on mount)
  useEffect(() => {
    async function loadBoxImages() {
      setLoadingImages(true);

      try {
        const imageUrls: Record<string, string> = {};

        logger.debug('[useResinCustomizer] Cargando imágenes de cajas...');

        for (const colorKey of Object.keys(BOX_COLORS)) {
          try {
            const imageRef = ref(storage, `variants/cajas/${colorKey}/preview.jpg`);
            const url = await getDownloadURL(imageRef);
            imageUrls[colorKey] = url;
            logger.debug(`[useResinCustomizer] Cargada imagen de caja ${colorKey}`);
          } catch (error) {
            logger.debug(`[useResinCustomizer] No se encontró imagen para caja ${colorKey}`);
          }
        }

        setBoxImages(imageUrls);
      } finally {
        setLoadingImages(false);
      }
    }

    loadBoxImages();
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
      const { url, path } = await uploadCustomImage(compressedFile, user.uid, 'resina');

      setConfig((prev) => ({ ...prev, imageUrl: url, imagePath: path }));
    } catch (error: unknown) {
      logger.error('[useResinCustomizer] Error subiendo imagen', error);
      setError('Error al subir la imagen. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // BOX COLOR CHANGE
  const updateBoxColor = useCallback((color: string) => {
    setConfig((prev) => ({ ...prev, boxColor: color }));
  }, []);

  // PERSON NAME CHANGE
  const updatePersonName = useCallback((name: string) => {
    setConfig((prev) => ({ ...prev, personName: name }));
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
    if (!config.imageUrl) {
      return { valid: false, error: 'Por favor sube una foto para la figura de resina' };
    }

    if (!config.personName.trim()) {
      return { valid: false, error: 'Por favor añade un nombre personalizado' };
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
  }, [config.imageUrl, config.personName, config.attributes, availableAttributes]);

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
      const user = auth.currentUser;
      const userId = user?.uid || 'guest';
      const cantidadAttr = config.attributes.find((attr) => attr.attributeId === '13');
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
        totalPrice: price,
        cantidad,
      };

      const customizationId = await saveCustomization(customizationData);

      const customDetails = [
        `Caja ${BOX_COLORS[config.boxColor as keyof typeof BOX_COLORS].name}`,
        `Nombre: ${config.personName}`,
      ];
      config.attributes.forEach((attrValue) => {
        const attribute = availableAttributes.find((a) => a?.id === attrValue.attributeId);
        if (attribute) {
          customDetails.push(`${attribute.name}: ${attrValue.value}`);
        }
      });

      addToCart({
        id: `${product.id}-custom-${Date.now()}`,
        name: `${product.name} (Personalizado)`,
        price: price / cantidad,
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
          imagePath: config.imagePath,
        },
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: unknown) {
      logger.error('[useResinCustomizer] Error al guardar personalización', error);
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setIsAddingToCart(false);
    }
  }, [validate, config, product, price, availableAttributes]);

  return {
    // State
    config,
    isLoading,
    isAddingToCart,
    error,
    success,
    boxImages,
    loadingImages,

    // Computed
    price,
    availableAttributes,

    // Handlers
    handleImageUpload,
    updateBoxColor,
    updatePersonName,
    updateAttributeValue,
    handleAddToCart,
    setError,
  };
}
