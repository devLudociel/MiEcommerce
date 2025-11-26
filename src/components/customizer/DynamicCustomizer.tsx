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
import SplitProductPreview from './SplitProductPreview';
import TextileProductPreview from './TextileProductPreview';
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
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');

  // Preload color preview images for faster switching
  useEffect(() => {
    const colorField = schema.fields.find(f => f.fieldType === 'color_selector');
    if (colorField) {
      const colorConfig = colorField.config as ColorSelectorConfig;
      colorConfig.availableColors?.forEach(color => {
        // Preload images in order of priority
        const imagesToPreload: string[] = [];

        if (color.previewImages?.default) imagesToPreload.push(color.previewImages.default);
        if (color.previewImages?.front) imagesToPreload.push(color.previewImages.front);
        if (color.previewImages?.back) imagesToPreload.push(color.previewImages.back);
        if (color.previewImage) imagesToPreload.push(color.previewImage);

        imagesToPreload.forEach(url => {
          const img = new Image();
          img.src = url;
        });
      });
    }
  }, [schema]);

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

  // Handler para actualizar transformaciones de imágenes en textiles
  const handleTextileTransformChange = (side: 'front' | 'back', transform: any) => {
    // PRIORIDAD 1: Buscar campo específico del lado activo
    let targetField = schema.fields.find(f =>
      f.fieldType === 'image_upload' && (
        side === 'front'
          ? (
            f.id.toLowerCase().includes('front') ||
            f.id.toLowerCase().includes('frontal') ||
            f.id.toLowerCase().includes('frente') ||
            f.label.toLowerCase().includes('front') ||
            f.label.toLowerCase().includes('frontal') ||
            f.label.toLowerCase().includes('frente')
          )
          : (
            f.id.toLowerCase().includes('back') ||
            f.id.toLowerCase().includes('trasera') ||
            f.id.toLowerCase().includes('espalda') ||
            f.label.toLowerCase().includes('back') ||
            f.label.toLowerCase().includes('trasera') ||
            f.label.toLowerCase().includes('espalda')
          )
      )
    );

    // PRIORIDAD 2: Si no hay campo específico, buscar campo genérico
    if (!targetField) {
      targetField = schema.fields.find(f => {
        if (f.fieldType !== 'image_upload') return false;
        const idLower = f.id.toLowerCase();
        const labelLower = f.label.toLowerCase();
        // Es genérico si NO contiene front ni back
        const isGeneric =
          !idLower.includes('front') && !idLower.includes('frontal') && !idLower.includes('frente') &&
          !idLower.includes('back') && !idLower.includes('trasera') && !idLower.includes('espalda') &&
          !labelLower.includes('front') && !labelLower.includes('frontal') && !labelLower.includes('frente') &&
          !labelLower.includes('back') && !labelLower.includes('trasera') && !labelLower.includes('espalda');
        return isGeneric;
      });
    }

    if (!targetField) {
      console.warn('[TextileTransformChange] No field found for side:', side);
      return;
    }

    console.log('[TextileTransformChange] Updating transform for field:', targetField.id, 'side:', side);

    // Actualizar solo el imageTransform, manteniendo el resto de los datos
    setValues((prev) => ({
      ...prev,
      [targetField.id]: {
        ...prev[targetField.id],
        imageTransform: transform,
      },
    }));
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
        id: product.id,
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

      case 'image_upload': {
        // Para productos textiles, filtrar campos de imagen según la vista activa
        if (isTextileProduct()) {
          const fieldIdLower = field.id.toLowerCase();
          const fieldLabelLower = field.label.toLowerCase();

          // Detectar si es campo frontal
          const isFrontField =
            fieldIdLower.includes('front') ||
            fieldIdLower.includes('frontal') ||
            fieldIdLower.includes('frente') ||
            fieldLabelLower.includes('front') ||
            fieldLabelLower.includes('frontal') ||
            fieldLabelLower.includes('frente');

          // Detectar si es campo trasero
          const isBackField =
            fieldIdLower.includes('back') ||
            fieldIdLower.includes('trasera') ||
            fieldIdLower.includes('espalda') ||
            fieldLabelLower.includes('back') ||
            fieldLabelLower.includes('trasera') ||
            fieldLabelLower.includes('espalda');

          // Si es campo frontal, solo mostrar en vista frontal
          if (isFrontField && activeSide !== 'front') {
            return null;
          }

          // Si es campo trasero, solo mostrar en vista trasera
          if (isBackField && activeSide !== 'back') {
            return null;
          }

          // Si no es ni frontal ni trasero, mostrar siempre (campo genérico)
        }

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
      }

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
      console.log('[getBaseImage] No color field found, using default');
      return schema.previewImages?.default || product.images[0] || '';
    }

    const colorValue = values[colorField.id];
    console.log('[getBaseImage] Color value:', colorValue);

    if (!colorValue) {
      // No color selected yet, use default
      console.log('[getBaseImage] No color selected, using default');
      return schema.previewImages?.default || product.images[0] || '';
    }

    // Get the selected color's preview image
    const colorConfig = colorField.config as ColorSelectorConfig;
    const selectedColor = colorConfig.availableColors?.find(c => c.id === colorValue.value);

    console.log('[getBaseImage] Selected color:', selectedColor);
    console.log('[getBaseImage] previewImages object:', selectedColor?.previewImages);
    console.log('[getBaseImage] previewImages keys:', selectedColor?.previewImages ? Object.keys(selectedColor.previewImages) : 'N/A');

    // NUEVO: Soportar múltiples formatos de imagen
    let previewImage: string | undefined;

    // Formato 1: previewImages.default (preferido para productos simples)
    if (selectedColor?.previewImages?.default) {
      previewImage = selectedColor.previewImages.default;
      console.log('[getBaseImage] ✅ Using previewImages.default:', previewImage);
    }
    // Formato 2: previewImages.front (para productos con frente/espalda o cuadros)
    else if (selectedColor?.previewImages?.front) {
      previewImage = selectedColor.previewImages.front;
      console.log('[getBaseImage] ✅ Using previewImages.front:', previewImage);
    }
    // Formato 3: previewImage (string directo, legacy)
    else if (selectedColor?.previewImage) {
      previewImage = selectedColor.previewImage;
      console.log('[getBaseImage] ✅ Using previewImage (legacy):', previewImage);
    }
    else {
      console.log('[getBaseImage] ❌ No valid preview image found in color config');
    }

    if (previewImage) {
      return previewImage;
    }

    // Fallback to default
    console.log('[getBaseImage] No preview image in color, using fallback');
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

  // Detectar si es producto tipo resina (la imagen es solo referencia, no se imprime en la caja)
  const isResinProduct = (): boolean => {
    const categoryLower = product.categoryId?.toLowerCase() || '';
    const nameLower = product.name?.toLowerCase() || '';
    const subcategoryLower = (product as any).subcategoryId?.toLowerCase() || '';
    const tags = (product as any).tags?.map((t: string) => t.toLowerCase()) || [];

    return (
      categoryLower.includes('resina') ||
      categoryLower.includes('figura') ||
      subcategoryLower.includes('resina') ||
      subcategoryLower.includes('figura') ||
      nameLower.includes('resina') ||
      nameLower.includes('figura') ||
      tags.some((tag: string) => tag.includes('resina') || tag.includes('figura'))
    );
  };

  // Detectar si es producto textil (camiseta, sudadera, polo - con frente y espalda)
  const isTextileProduct = (): boolean => {
    const categoryLower = product.categoryId?.toLowerCase() || '';
    const nameLower = product.name?.toLowerCase() || '';
    const subcategoryLower = (product as any).subcategoryId?.toLowerCase() || '';
    const tags = (product as any).tags?.map((t: string) => t.toLowerCase()) || [];

    return (
      categoryLower.includes('camiseta') ||
      categoryLower.includes('sudadera') ||
      categoryLower.includes('polo') ||
      categoryLower.includes('textil') ||
      categoryLower.includes('ropa') ||
      subcategoryLower.includes('camiseta') ||
      subcategoryLower.includes('sudadera') ||
      subcategoryLower.includes('polo') ||
      subcategoryLower.includes('textil') ||
      subcategoryLower.includes('ropa') ||
      nameLower.includes('camiseta') ||
      nameLower.includes('sudadera') ||
      nameLower.includes('polo') ||
      tags.some((tag: string) =>
        tag.includes('camiseta') ||
        tag.includes('sudadera') ||
        tag.includes('polo') ||
        tag.includes('textil') ||
        tag.includes('ropa')
      )
    );
  };

  // Obtener imagen frontal para textiles
  const getTextileFrontImage = (): string | null => {
    // PRIORIDAD 1: Buscar campo frontal específico
    const frontField = schema.fields.find(f =>
      f.fieldType === 'image_upload' && (
        f.id.toLowerCase().includes('front') ||
        f.id.toLowerCase().includes('frontal') ||
        f.id.toLowerCase().includes('frente') ||
        f.label.toLowerCase().includes('front') ||
        f.label.toLowerCase().includes('frontal') ||
        f.label.toLowerCase().includes('frente')
      )
    );

    if (frontField) {
      const imageValue = values[frontField.id];
      if (imageValue?.imageUrl) {
        console.log('[TextileFrontUserImage] Using front field:', frontField.id);
        return imageValue.imageUrl as string;
      }
    }

    // PRIORIDAD 2: Buscar campo genérico (sin front/back en nombre) para compatibilidad
    // Esto permite que schemas con un solo campo genérico funcionen en ambas vistas
    const genericField = schema.fields.find(f => {
      if (f.fieldType !== 'image_upload') return false;
      const idLower = f.id.toLowerCase();
      const labelLower = f.label.toLowerCase();
      // Es genérico si NO contiene front ni back
      const isGeneric =
        !idLower.includes('front') && !idLower.includes('frontal') && !idLower.includes('frente') &&
        !idLower.includes('back') && !idLower.includes('trasera') && !idLower.includes('espalda') &&
        !labelLower.includes('front') && !labelLower.includes('frontal') && !labelLower.includes('frente') &&
        !labelLower.includes('back') && !labelLower.includes('trasera') && !labelLower.includes('espalda');
      return isGeneric;
    });

    if (genericField) {
      const imageValue = values[genericField.id];
      if (imageValue?.imageUrl) {
        console.log('[TextileFrontUserImage] Using generic field:', genericField.id);
        return imageValue.imageUrl as string;
      }
    }

    // NO usar campo back para front - deben ser independientes
    return null;
  };

  const getTextileBackImage = (): string | null => {
    // PRIORIDAD 1: Buscar campo trasero específico
    const backField = schema.fields.find(f =>
      f.fieldType === 'image_upload' && (
        f.id.toLowerCase().includes('back') ||
        f.id.toLowerCase().includes('trasera') ||
        f.id.toLowerCase().includes('espalda') ||
        f.label.toLowerCase().includes('back') ||
        f.label.toLowerCase().includes('trasera') ||
        f.label.toLowerCase().includes('espalda')
      )
    );

    if (backField) {
      const imageValue = values[backField.id];
      if (imageValue?.imageUrl) {
        console.log('[TextileBackUserImage] Using back field:', backField.id);
        return imageValue.imageUrl as string;
      }
    }

    // PRIORIDAD 2: Buscar campo genérico (sin front/back en nombre)
    const genericField = schema.fields.find(f => {
      if (f.fieldType !== 'image_upload') return false;
      const idLower = f.id.toLowerCase();
      const labelLower = f.label.toLowerCase();
      // Es genérico si NO contiene front ni back
      const isGeneric =
        !idLower.includes('front') && !idLower.includes('frontal') && !idLower.includes('frente') &&
        !idLower.includes('back') && !idLower.includes('trasera') && !idLower.includes('espalda') &&
        !labelLower.includes('front') && !labelLower.includes('frontal') && !labelLower.includes('frente') &&
        !labelLower.includes('back') && !labelLower.includes('trasera') && !labelLower.includes('espalda');
      return isGeneric;
    });

    if (genericField) {
      const imageValue = values[genericField.id];
      if (imageValue?.imageUrl) {
        console.log('[TextileBackUserImage] Using generic field:', genericField.id);
        return imageValue.imageUrl as string;
      }
    }

    // NO usar campo front para back - deben ser independientes
    return null;
  };

  const getTextileFrontTransform = () => {
    // PRIORIDAD 1: Buscar transform de campo frontal específico
    const frontField = schema.fields.find(f =>
      f.fieldType === 'image_upload' && (
        f.id.toLowerCase().includes('front') ||
        f.id.toLowerCase().includes('frontal') ||
        f.id.toLowerCase().includes('frente') ||
        f.label.toLowerCase().includes('front') ||
        f.label.toLowerCase().includes('frontal') ||
        f.label.toLowerCase().includes('frente')
      )
    );

    if (frontField) {
      const imageValue = values[frontField.id];
      if (imageValue?.imageTransform) {
        return imageValue.imageTransform;
      }
    }

    // PRIORIDAD 2: Buscar transform de campo genérico
    const genericField = schema.fields.find(f => {
      if (f.fieldType !== 'image_upload') return false;
      const idLower = f.id.toLowerCase();
      const labelLower = f.label.toLowerCase();
      const isGeneric =
        !idLower.includes('front') && !idLower.includes('frontal') && !idLower.includes('frente') &&
        !idLower.includes('back') && !idLower.includes('trasera') && !idLower.includes('espalda') &&
        !labelLower.includes('front') && !labelLower.includes('frontal') && !labelLower.includes('frente') &&
        !labelLower.includes('back') && !labelLower.includes('trasera') && !labelLower.includes('espalda');
      return isGeneric;
    });

    if (genericField) {
      const imageValue = values[genericField.id];
      if (imageValue?.imageTransform) {
        return imageValue.imageTransform;
      }
    }

    return undefined;
  };

  const getTextileBackTransform = () => {
    // PRIORIDAD 1: Buscar transform de campo trasero específico
    const backField = schema.fields.find(f =>
      f.fieldType === 'image_upload' && (
        f.id.toLowerCase().includes('back') ||
        f.id.toLowerCase().includes('trasera') ||
        f.id.toLowerCase().includes('espalda') ||
        f.label.toLowerCase().includes('back') ||
        f.label.toLowerCase().includes('trasera') ||
        f.label.toLowerCase().includes('espalda')
      )
    );

    if (backField) {
      const imageValue = values[backField.id];
      if (imageValue?.imageTransform) {
        return imageValue.imageTransform;
      }
    }

    // PRIORIDAD 2: Buscar transform de campo genérico
    const genericField = schema.fields.find(f => {
      if (f.fieldType !== 'image_upload') return false;
      const idLower = f.id.toLowerCase();
      const labelLower = f.label.toLowerCase();
      const isGeneric =
        !idLower.includes('front') && !idLower.includes('frontal') && !idLower.includes('frente') &&
        !idLower.includes('back') && !idLower.includes('trasera') && !idLower.includes('espalda') &&
        !labelLower.includes('front') && !labelLower.includes('frontal') && !labelLower.includes('frente') &&
        !labelLower.includes('back') && !labelLower.includes('trasera') && !labelLower.includes('espalda');
      return isGeneric;
    });

    if (genericField) {
      const imageValue = values[genericField.id];
      if (imageValue?.imageTransform) {
        return imageValue.imageTransform;
      }
    }

    return undefined;
  };

  // Obtener imagen base frontal y trasera del producto
  const getTextileBaseFrontImage = (): string => {
    // PRIORIDAD 1: Buscar color selector y obtener su imagen frontal específica
    const colorField = schema.fields.find(f => f.fieldType === 'color_selector');
    if (colorField) {
      const colorValue = values[colorField.id];
      if (colorValue) {
        const colorConfig = colorField.config as ColorSelectorConfig;
        const selectedColor = colorConfig.availableColors?.find(c => c.id === colorValue.value);

        // Si el color tiene imagen frontal específica, usarla
        if (selectedColor?.previewImages?.front) {
          console.log('[TextileFront] Using color-specific front image:', selectedColor.previewImages.front);
          return selectedColor.previewImages.front;
        }

        // Fallback a previewImage antigua (deprecated)
        if (selectedColor?.previewImage) {
          console.log('[TextileFront] Using color previewImage (deprecated):', selectedColor.previewImage);
          return selectedColor.previewImage;
        }
      }
    }

    // PRIORIDAD 2: Si no hay color seleccionado o el color no tiene imagen, usar imagen del schema
    if (schema.previewImages?.front) {
      console.log('[TextileFront] Using schema front image:', schema.previewImages.front);
      return schema.previewImages.front;
    }

    // PRIORIDAD 3: Fallback final a imagen default o primera imagen del producto
    const fallback = schema.previewImages?.default || product.images[0] || '';
    console.log('[TextileFront] Using fallback image:', fallback);
    return fallback;
  };

  const getTextileBaseBackImage = (): string => {
    // PRIORIDAD 1: Buscar color selector y obtener su imagen trasera específica
    const colorField = schema.fields.find(f => f.fieldType === 'color_selector');
    if (colorField) {
      const colorValue = values[colorField.id];
      if (colorValue) {
        const colorConfig = colorField.config as ColorSelectorConfig;
        const selectedColor = colorConfig.availableColors?.find(c => c.id === colorValue.value);

        // Si el color tiene imagen trasera específica, usarla
        if (selectedColor?.previewImages?.back) {
          console.log('[TextileBack] Using color-specific back image:', selectedColor.previewImages.back);
          return selectedColor.previewImages.back;
        }
      }
    }

    // PRIORIDAD 2: Si no hay color seleccionado o el color no tiene imagen trasera, usar imagen del schema
    if (schema.previewImages?.back) {
      console.log('[TextileBack] Using schema back image:', schema.previewImages.back);
      return schema.previewImages.back;
    }

    // PRIORIDAD 3: Fallback final a imagen frontal (mejor que nada)
    console.log('[TextileBack] Using front image as fallback');
    return getTextileBaseFrontImage();
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
            {/* Usar SplitProductPreview para productos de resina (imagen es solo referencia) */}
            {isResinProduct() ? (
              <SplitProductPreview
                baseImage={getBaseImage()}
                userImage={getUserImage()}
                productName={product.name}
                baseImageLabel="Tu caja personalizada"
                userImageLabel="Foto de referencia"
              />
            ) : isTextileProduct() ? (
              /* Usar TextileProductPreview para textiles (frente y espalda) */
              <TextileProductPreview
                frontImage={getTextileBaseFrontImage()}
                backImage={getTextileBaseBackImage()}
                userFrontImage={getTextileFrontImage()}
                userBackImage={getTextileBackImage()}
                frontTransform={getTextileFrontTransform()}
                backTransform={getTextileBackTransform()}
                productName={product.name}
                activeSide={activeSide}
                onActiveSideChange={setActiveSide}
                onTransformChange={handleTextileTransformChange}
              />
            ) : (
              /* ProductPreview normal para otros productos */
              <ProductPreview
                baseImage={getBaseImage()}
                userImage={getUserImage()}
                transform={getImageTransform()}
                productName={product.name}
              />
            )}

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
