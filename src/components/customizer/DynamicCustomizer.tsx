import React, { useState, useEffect } from 'react';
import { ShoppingCart, Loader, RotateCcw, Save, Palette, X } from 'lucide-react';
import type {
  CustomizationSchema,
  CustomizationField,
  CustomizationValue,
  CustomizationPricing,
  ColorSelectorConfig,
  CardSelectorConfig,
  TextInputConfig,
  CheckboxConfig,
  NumberInputConfig,
  DesignTemplate,
  Clipart,
  DesignLayer,
} from '../../types/customization';
import type { Theme, ThemeCategoryImage } from '../../lib/themes';
import { getThemesForCategory } from '../../lib/themes';
import ColorSelector from './fields/ColorSelector';
import SizeSelector from './fields/SizeSelector';
import DropdownField from './fields/DropdownField';
import ImageUploadField from './fields/ImageUploadField';
import ProductPreview from './ProductPreview';
import SplitProductPreview from './SplitProductPreview';
import TextileProductPreview from './TextileProductPreview';
import ShareDesignButton from './ShareDesignButton';
import SaveDesignButton from './SaveDesignButton';
import { addToCart } from '../../store/cartStore';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';
import { useAutoSaveDraft } from '../hooks/useAutoSaveDraft';

interface FirebaseProduct {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  basePrice: number;
  images: string[];
  slug: string;
  subcategoryId?: string;
  tags?: string[];
  [key: string]: string | string[] | number | boolean | undefined;
}

interface DynamicCustomizerProps {
  product: FirebaseProduct;
  schema: CustomizationSchema;
}

export default function DynamicCustomizer({ product, schema }: DynamicCustomizerProps) {
  const [values, setValues] = useState<Record<string, CustomizationValue>>({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showThemes, setShowThemes] = useState(false);
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [showDraftNotification, setShowDraftNotification] = useState(false);

  // Centralized themes state
  const [centralizedThemes, setCentralizedThemes] = useState<Theme[]>([]);
  const [selectedCentralizedTheme, setSelectedCentralizedTheme] = useState<Theme | null>(null);
  const [loadingThemes, setLoadingThemes] = useState(true);

  // Auto-save draft functionality
  const draftKey = `draft_${product.id}`;
  const {
    loadDraft,
    clearDraft,
    getLastSavedTime,
    hasDraft,
  } = useAutoSaveDraft(draftKey, { values, layers }, true, 30000); // Auto-save every 30 seconds

  // Check for reorder query parameter first
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reorderMode = urlParams.get('reorder');

    if (reorderMode) {
      const reorderKey = `reorder_${product.id}`;
      const reorderDataString = localStorage.getItem(reorderKey);

      if (reorderDataString) {
        try {
          const reorderData = JSON.parse(reorderDataString);

          // Load values and layers from previous order
          if (reorderData.values) {
            setValues(reorderData.values);
            logger.info('[DynamicCustomizer] Reorder values loaded', {
              productId: product.id,
              mode: reorderMode,
            });
          }

          if (reorderData.layers) {
            setLayers(reorderData.layers);
          }

          // If auto mode, add to cart immediately
          if (reorderMode === 'auto' && reorderData.autoAddToCart) {
            logger.info('[DynamicCustomizer] Auto-adding to cart from reorder');

            // Give React time to update state before adding to cart
            setTimeout(() => {
              const addButton = document.querySelector('[data-add-to-cart]') as HTMLButtonElement;
              if (addButton) {
                addButton.click();
              }
            }, 500);
          }

          // Clear reorder data after loading
          localStorage.removeItem(reorderKey);

          // Show success notification
          if (reorderMode === 'edit') {
            notify.success('Configuración anterior cargada. Puedes editarla antes de agregar al carrito.');
          } else {
            notify.success('Reordenando producto con la configuración anterior...');
          }
        } catch (error) {
          logger.error('[DynamicCustomizer] Error loading reorder data', error);
          notify.error('Error al cargar la configuración anterior');
        }
      }

      // Clean up URL
      urlParams.delete('reorder');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [product.id]);

  // Check for shared design parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isShared = urlParams.get('shared');

    if (isShared === 'true') {
      const sharedKey = `shared_${product.id}`;
      const sharedDataString = localStorage.getItem(sharedKey);

      if (sharedDataString) {
        try {
          const sharedData = JSON.parse(sharedDataString);

          // Load values and layers from shared design
          if (sharedData.values) {
            setValues(sharedData.values);
            logger.info('[DynamicCustomizer] Shared design values loaded', {
              productId: product.id,
            });
          }

          if (sharedData.layers) {
            setLayers(sharedData.layers);
          }

          // Clear shared data after loading
          localStorage.removeItem(sharedKey);

          // Show success notification
          notify.success('¡Diseño compartido cargado! Puedes personalizarlo antes de agregar al carrito.');
        } catch (error) {
          logger.error('[DynamicCustomizer] Error loading shared design', error);
          notify.error('Error al cargar el diseño compartido');
        }
      }

      // Clean up URL
      urlParams.delete('shared');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [product.id]);

  // Load centralized themes for this product's category
  useEffect(() => {
    const loadCentralizedThemes = async () => {
      setLoadingThemes(true);
      try {
        // Try loading themes for both categoryId and subcategoryId
        const categoryIds = [product.categoryId, product.subcategoryId].filter(Boolean) as string[];

        let themes: Theme[] = [];
        for (const catId of categoryIds) {
          const catThemes = await getThemesForCategory(catId);
          themes = [...themes, ...catThemes];
        }

        // Remove duplicates (same theme might match both category and subcategory)
        const uniqueThemes = themes.filter(
          (theme, index, self) => index === self.findIndex(t => t.id === theme.id)
        );

        setCentralizedThemes(uniqueThemes);
        logger.info('[DynamicCustomizer] Centralized themes loaded:', uniqueThemes.length);
      } catch (error) {
        logger.error('[DynamicCustomizer] Error loading centralized themes:', error);
      } finally {
        setLoadingThemes(false);
      }
    };

    loadCentralizedThemes();
  }, [product.categoryId, product.subcategoryId]);

  // Check for existing draft on mount (only if not reordering)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reorderMode = urlParams.get('reorder');

    // Skip draft loading if we're in reorder mode
    if (reorderMode) return;

    const draft = loadDraft();
    const lastSavedTime = getLastSavedTime();

    if (draft && hasDraft()) {
      const timeSinceLastSave = lastSavedTime
        ? Math.floor((Date.now() - new Date(lastSavedTime).getTime()) / 1000 / 60)
        : null;

      const timeText = timeSinceLastSave !== null
        ? timeSinceLastSave < 1
          ? 'hace menos de 1 minuto'
          : `hace ${timeSinceLastSave} minuto${timeSinceLastSave > 1 ? 's' : ''}`
        : '';

      logger.info('[DynamicCustomizer] Draft found', { productId: product.id, lastSavedTime });
      setShowDraftNotification(true);

      // Auto-close notification after 15 seconds if user doesn't interact
      const timer = setTimeout(() => {
        setShowDraftNotification(false);
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [product.id]);

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
  interface ImageTransform {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  }

  const handleTextileTransformChange = (side: 'front' | 'back', transform: ImageTransform) => {
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

  const handleLoadDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setValues(draft.values || {});
      setLayers(draft.layers || []);
      setShowDraftNotification(false);
      notify.success('Borrador restaurado correctamente');
      logger.info('[DynamicCustomizer] Draft loaded successfully', { productId: product.id });
    }
  };

  const handleDismissDraft = () => {
    setShowDraftNotification(false);
    clearDraft();
    notify.info('Borrador descartado');
    logger.info('[DynamicCustomizer] Draft dismissed', { productId: product.id });
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

      // Clear draft after successful add to cart
      clearDraft();

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
            categoryId={product.categoryId}
          />
        );
      }

      case 'card_selector': {
        const cardConfig = field.config as CardSelectorConfig;
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.helpText && (
              <p className="text-sm text-gray-500 mb-3">{field.helpText}</p>
            )}
            <div className={`grid gap-3 ${
              cardConfig.layout === 'horizontal'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : cardConfig.layout === 'vertical'
                ? 'grid-cols-1'
                : 'grid-cols-1 sm:grid-cols-2'
            }`}>
              {cardConfig.options.map((option) => {
                const isSelected = value?.value === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleFieldChange(field.id, {
                      fieldId: field.id,
                      value: option.value,
                      displayValue: option.label,
                      priceModifier: option.priceModifier || field.priceModifier || 0,
                    })}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
                    }`}
                  >
                    {option.badge && (
                      <span className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        {option.badge}
                      </span>
                    )}
                    {option.imageUrl && (
                      <img
                        src={option.imageUrl}
                        alt={option.label}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                    )}
                    {option.icon && !option.imageUrl && (
                      <span className="text-3xl mb-2 block">{option.icon}</span>
                    )}
                    <h4 className={`font-bold ${isSelected ? 'text-purple-700' : 'text-gray-800'}`}>
                      {option.label}
                    </h4>
                    {option.subtitle && (
                      <p className="text-sm text-gray-500 mt-1">{option.subtitle}</p>
                    )}
                    {option.description && (
                      <p className="text-sm text-gray-600 mt-2">{option.description}</p>
                    )}
                    {option.features && option.features.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {option.features.map((feature, idx) => (
                          <li key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="text-green-500">✓</span> {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    {option.priceModifier && option.priceModifier > 0 && (
                      <p className="text-sm font-semibold text-purple-600 mt-2">
                        +€{option.priceModifier.toFixed(2)}
                      </p>
                    )}
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case 'text_input': {
        const textConfig = field.config as TextInputConfig;
        const textValue = (value?.value as string) || '';
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.helpText && (
              <p className="text-sm text-gray-500 mb-2">{field.helpText}</p>
            )}
            <input
              type="text"
              value={textValue}
              onChange={(e) => handleFieldChange(field.id, {
                fieldId: field.id,
                value: e.target.value,
                displayValue: e.target.value,
                priceModifier: field.priceModifier || 0,
              })}
              placeholder={textConfig.placeholder || ''}
              maxLength={textConfig.maxLength}
              minLength={textConfig.minLength}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
            />
            {textConfig.showCharCounter && textConfig.maxLength && (
              <p className="text-xs text-gray-400 mt-1 text-right">
                {textValue.length}/{textConfig.maxLength}
              </p>
            )}
          </div>
        );
      }

      case 'checkbox': {
        const checkboxConfig = field.config as CheckboxConfig;
        const isChecked = value?.value === true;
        return (
          <div key={field.id} className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => handleFieldChange(field.id, {
                  fieldId: field.id,
                  value: e.target.checked,
                  displayValue: e.target.checked ? 'Sí' : 'No',
                  priceModifier: e.target.checked ? (field.priceModifier || 0) : 0,
                })}
                className="mt-1 w-5 h-5 rounded border-2 border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <div>
                <span className="font-semibold text-gray-700 group-hover:text-purple-600 transition-colors">
                  {checkboxConfig.icon && <span className="mr-2">{checkboxConfig.icon}</span>}
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </span>
                {checkboxConfig.description && (
                  <p className="text-sm text-gray-500 mt-1">{checkboxConfig.description}</p>
                )}
                {field.priceModifier && field.priceModifier > 0 && (
                  <p className="text-sm text-purple-600 font-medium mt-1">
                    +€{field.priceModifier.toFixed(2)}
                  </p>
                )}
              </div>
            </label>
            {field.helpText && (
              <p className="text-sm text-gray-400 mt-2 ml-8">{field.helpText}</p>
            )}
          </div>
        );
      }

      case 'number_input': {
        const numberConfig = field.config as NumberInputConfig;
        const numberValue = (value?.value as number) || numberConfig.min || 0;
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.helpText && (
              <p className="text-sm text-gray-500 mb-2">{field.helpText}</p>
            )}
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={numberValue}
                onChange={(e) => handleFieldChange(field.id, {
                  fieldId: field.id,
                  value: parseFloat(e.target.value) || 0,
                  displayValue: `${e.target.value}${numberConfig.unit ? ` ${numberConfig.unit}` : ''}`,
                  priceModifier: field.priceModifier || 0,
                })}
                min={numberConfig.min}
                max={numberConfig.max}
                step={numberConfig.step || 1}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
              />
              {numberConfig.unit && (
                <span className="text-gray-500 font-medium">{numberConfig.unit}</span>
              )}
            </div>
          </div>
        );
      }

      case 'radio_group': {
        const radioConfig = field.config as any; // RadioGroupConfig
        return (
          <div key={field.id} className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.helpText && (
              <p className="text-sm text-gray-500 mb-3">{field.helpText}</p>
            )}
            <div className={`space-y-2 ${radioConfig.layout === 'horizontal' ? 'flex flex-wrap gap-4' : ''}`}>
              {radioConfig.options?.map((option: any) => {
                const isSelected = value?.value === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={field.id}
                      value={option.value}
                      checked={isSelected}
                      onChange={() => handleFieldChange(field.id, {
                        fieldId: field.id,
                        value: option.value,
                        displayValue: option.label,
                        priceModifier: option.priceModifier || field.priceModifier || 0,
                      })}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-medium text-gray-700">{option.label}</span>
                    {option.priceModifier && option.priceModifier > 0 && (
                      <span className="text-sm text-purple-600">+€{option.priceModifier.toFixed(2)}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
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

  // Get card_selector field if exists (for legacy theme gallery)
  const getCardSelectorField = (): CustomizationField | null => {
    return schema.fields.find(f => f.fieldType === 'card_selector') || null;
  };

  const cardSelectorField = getCardSelectorField();
  const cardSelectorConfig = cardSelectorField?.config as CardSelectorConfig | undefined;

  // Check if there are themes available (centralized OR from card_selector)
  const hasCentralizedThemes = centralizedThemes.length > 0;
  const hasLegacyThemes = cardSelectorConfig?.options && cardSelectorConfig.options.length > 0;
  const hasThemes = hasCentralizedThemes || hasLegacyThemes;

  // Get category image from centralized theme for current product category
  const getThemeCategoryImage = (theme: Theme): ThemeCategoryImage | null => {
    const categoryIds = [product.categoryId, product.subcategoryId].filter(Boolean);
    for (const catId of categoryIds) {
      const catImage = theme.categoryImages?.find(ci => ci.categoryId === catId);
      if (catImage) return catImage;
    }
    return null;
  };

  // Handle theme selection from modal (supports both centralized and legacy)
  const handleSelectTheme = (option: { value: string; label: string; priceModifier?: number }) => {
    // Check if it's a centralized theme
    const centralizedTheme = centralizedThemes.find(t => t.id === option.value);
    if (centralizedTheme) {
      setSelectedCentralizedTheme(centralizedTheme);
      setShowThemes(false);
      notify.success(`Temática "${option.label}" seleccionada`);
      return;
    }

    // Legacy card_selector support
    if (cardSelectorField) {
      handleFieldChange(cardSelectorField.id, {
        fieldId: cardSelectorField.id,
        value: option.value,
        displayValue: option.label,
        priceModifier: option.priceModifier || cardSelectorField.priceModifier || 0,
      });
    }

    setShowThemes(false);
    notify.success(`Temática "${option.label}" seleccionada`);
  };

  // Get currently selected theme info (supports both centralized and legacy)
  const getSelectedThemeInfo = (): { value: string; label: string; previewImage?: string } | null => {
    // Priority 1: Centralized theme
    if (selectedCentralizedTheme) {
      const catImage = getThemeCategoryImage(selectedCentralizedTheme);
      return {
        value: selectedCentralizedTheme.id,
        label: selectedCentralizedTheme.name,
        previewImage: catImage?.previewImage,
      };
    }

    // Priority 2: Legacy card_selector
    if (cardSelectorField) {
      const cardValue = values[cardSelectorField.id];
      if (cardValue) {
        const selectedOption = cardSelectorConfig?.options?.find(o => o.value === cardValue.value);
        if (selectedOption) {
          return {
            value: selectedOption.value,
            label: selectedOption.label,
            previewImage: selectedOption.previewImage,
          };
        }
      }
    }

    return null;
  };

  // Alias for backwards compatibility
  const getSelectedTheme = getSelectedThemeInfo;

  // Sort fields by order
  const sortedFields = [...schema.fields].sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    return orderA - orderB;
  });

  // Get base image for preview based on selected theme, color, or default
  const getBaseImage = (): string => {
    // PRIORIDAD 1: Temática centralizada seleccionada
    if (selectedCentralizedTheme) {
      const catImage = getThemeCategoryImage(selectedCentralizedTheme);
      if (catImage?.previewImage) {
        console.log('[getBaseImage] ✅ Using centralized theme previewImage:', catImage.previewImage);
        return catImage.previewImage;
      }
    }

    // PRIORIDAD 2: Buscar card_selector con previewImage (temáticas legacy)
    const cardField = schema.fields.find(f => f.fieldType === 'card_selector');
    if (cardField) {
      const cardValue = values[cardField.id];
      if (cardValue) {
        const cardConfig = cardField.config as CardSelectorConfig;
        const selectedCard = cardConfig.options?.find(c => c.value === cardValue.value);

        if (selectedCard?.previewImage) {
          console.log('[getBaseImage] ✅ Using card_selector previewImage:', selectedCard.previewImage);
          return selectedCard.previewImage;
        }
      }
    }

    // PRIORIDAD 3: Buscar color_selector con previewImage
    const colorField = schema.fields.find(f => f.fieldType === 'color_selector');
    if (colorField) {
      const colorValue = values[colorField.id];
      if (colorValue) {
        const colorConfig = colorField.config as ColorSelectorConfig;
        const selectedColor = colorConfig.availableColors?.find(c => c.id === colorValue.value);

        // Soportar múltiples formatos de imagen
        if (selectedColor?.previewImages?.default) {
          console.log('[getBaseImage] ✅ Using color previewImages.default');
          return selectedColor.previewImages.default;
        }
        if (selectedColor?.previewImages?.front) {
          console.log('[getBaseImage] ✅ Using color previewImages.front');
          return selectedColor.previewImages.front;
        }
        if (selectedColor?.previewImage) {
          console.log('[getBaseImage] ✅ Using color previewImage (legacy)');
          return selectedColor.previewImage;
        }
      }
    }

    // PRIORIDAD 4: Fallback a imagen por defecto
    console.log('[getBaseImage] Using fallback default image');
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

        {/* Draft Recovery Notification */}
        {showDraftNotification && (
          <div className="mb-6 max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Save className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900 text-lg mb-1">
                    Borrador Encontrado
                  </h3>
                  <p className="text-blue-700 text-sm mb-3">
                    Encontramos un diseño guardado automáticamente. ¿Quieres continuar donde lo dejaste?
                  </p>
                  {getLastSavedTime() && (
                    <p className="text-blue-600 text-xs mb-3">
                      Última modificación: {(() => {
                        const lastSaved = getLastSavedTime();
                        if (!lastSaved) return '';
                        const mins = Math.floor((Date.now() - new Date(lastSaved).getTime()) / 1000 / 60);
                        return mins < 1
                          ? 'hace menos de 1 minuto'
                          : `hace ${mins} minuto${mins > 1 ? 's' : ''}`;
                      })()}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleLoadDraft}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center gap-2 text-sm"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restaurar Borrador
                    </button>
                    <button
                      onClick={handleDismissDraft}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all text-sm"
                    >
                      Empezar de Nuevo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Preview */}
          <div className="order-2 lg:order-1">
            {/* Theme/Design Selection Button */}
            {hasThemes && (
              <div className="mb-4">
                <button
                  onClick={() => setShowThemes(true)}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-xl transition-all"
                >
                  <Palette className="w-6 h-6" />
                  <span>Elegir Temática / Diseño</span>
                  {getSelectedTheme() && (
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {getSelectedTheme()?.label}
                    </span>
                  )}
                </button>
                {getSelectedTheme()?.previewImage && (
                  <p className="text-center text-sm text-gray-500 mt-2">
                    Temática actual: <span className="font-semibold text-purple-600">{getSelectedTheme()?.label}</span>
                  </p>
                )}
              </div>
            )}

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
              data-add-to-cart="true"
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

        {/* Theme Selection Modal */}
        {showThemes && hasThemes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Palette className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">
                    Elige una Temática
                  </h3>
                </div>
                <button
                  onClick={() => setShowThemes(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <p className="text-gray-600 mb-6">
                  Selecciona una temática para tu producto. La imagen de vista previa se actualizará automáticamente.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Centralized Themes (Priority) */}
                  {centralizedThemes.map((theme) => {
                    const catImage = getThemeCategoryImage(theme);
                    const isSelected = selectedCentralizedTheme?.id === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => handleSelectTheme({ value: theme.id, label: theme.name, priceModifier: theme.priceModifier })}
                        className={`relative rounded-xl overflow-hidden border-3 transition-all hover:shadow-lg ${
                          isSelected
                            ? 'border-purple-500 ring-4 ring-purple-200 shadow-lg'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {/* Theme Image */}
                        <div className="aspect-square bg-gray-100 relative">
                          {catImage?.imageUrl ? (
                            <img
                              src={catImage.imageUrl}
                              alt={theme.name}
                              className="w-full h-full object-cover"
                            />
                          ) : catImage?.previewImage ? (
                            <img
                              src={catImage.previewImage}
                              alt={theme.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Palette className="w-12 h-12" />
                            </div>
                          )}

                          {/* Badge */}
                          {theme.badge && (
                            <span className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                              {theme.badge}
                            </span>
                          )}

                          {/* Selected indicator */}
                          {isSelected && (
                            <div className="absolute top-2 left-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Theme Info */}
                        <div className={`p-3 ${isSelected ? 'bg-purple-50' : 'bg-white'}`}>
                          <h4 className={`font-bold text-sm ${isSelected ? 'text-purple-700' : 'text-gray-800'}`}>
                            {theme.name}
                          </h4>
                          {theme.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {theme.description}
                            </p>
                          )}
                          {theme.priceModifier && theme.priceModifier > 0 && (
                            <p className="text-sm font-semibold text-purple-600 mt-1">
                              +€{theme.priceModifier.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {/* Legacy Card Selector Options (if no centralized themes) */}
                  {!hasCentralizedThemes && cardSelectorConfig?.options?.map((option) => {
                    const isSelected = getSelectedTheme()?.value === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleSelectTheme(option)}
                        className={`relative rounded-xl overflow-hidden border-3 transition-all hover:shadow-lg ${
                          isSelected
                            ? 'border-purple-500 ring-4 ring-purple-200 shadow-lg'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        {/* Theme Image */}
                        <div className="aspect-square bg-gray-100 relative">
                          {option.imageUrl ? (
                            <img
                              src={option.imageUrl}
                              alt={option.label}
                              className="w-full h-full object-cover"
                            />
                          ) : option.previewImage ? (
                            <img
                              src={option.previewImage}
                              alt={option.label}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Palette className="w-12 h-12" />
                            </div>
                          )}

                          {/* Badge */}
                          {option.badge && (
                            <span className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                              {option.badge}
                            </span>
                          )}

                          {/* Selected indicator */}
                          {isSelected && (
                            <div className="absolute top-2 left-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Theme Info */}
                        <div className={`p-3 ${isSelected ? 'bg-purple-50' : 'bg-white'}`}>
                          <h4 className={`font-bold text-sm ${isSelected ? 'text-purple-700' : 'text-gray-800'}`}>
                            {option.label}
                          </h4>
                          {option.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {option.description}
                            </p>
                          )}
                          {option.priceModifier && option.priceModifier > 0 && (
                            <p className="text-sm font-semibold text-purple-600 mt-1">
                              +€{option.priceModifier.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {hasCentralizedThemes
                    ? `${centralizedThemes.length} temáticas disponibles`
                    : `${cardSelectorConfig?.options?.length || 0} temáticas disponibles`
                  }
                </p>
                <button
                  onClick={() => setShowThemes(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
