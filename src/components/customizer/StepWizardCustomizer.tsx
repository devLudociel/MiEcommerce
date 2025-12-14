import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShoppingCart,
  Loader,
  Sparkles,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  Save,
  Palette,
  Ruler,
  Upload,
  Move,
  Eye,
} from 'lucide-react';
import type {
  CustomizationSchema,
  CustomizationField,
  CustomizationValue,
  CustomizationPricing,
  ColorSelectorConfig,
  DesignTemplate,
  Clipart,
  DesignLayer,
  ImageTransform,
  SizeSelectorConfig,
  DropdownConfig,
  ImageUploadConfig,
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
  [key: string]: string | number | boolean | string[] | undefined | null | object;
}

interface StepWizardCustomizerProps {
  product: FirebaseProduct;
  schema: CustomizationSchema;
}

// Tipos de pasos del wizard
type StepType = 'options' | 'design' | 'position' | 'review';

interface WizardStep {
  id: StepType;
  title: string;
  shortTitle: string;
  icon: React.ReactNode;
  description: string;
}

export default function StepWizardCustomizer({ product, schema }: StepWizardCustomizerProps) {
  const [values, setValues] = useState<Record<string, CustomizationValue>>({});
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCliparts, setShowCliparts] = useState(false);
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [showDraftNotification, setShowDraftNotification] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Auto-save draft functionality
  const draftKey = `draft_${product.id}`;
  const {
    loadDraft,
    clearDraft,
    getLastSavedTime,
    hasDraft,
  } = useAutoSaveDraft(draftKey, { values, layers }, true, 30000);

  // Detectar tipos de producto
  const isResinProduct = useCallback((): boolean => {
    const categoryLower = product.categoryId?.toLowerCase() || '';
    const nameLower = product.name?.toLowerCase() || '';
    const subcategoryLower = product.subcategoryId?.toLowerCase() || '';
    const tags = product.tags?.map((t) => t.toLowerCase()) || [];

    return (
      categoryLower.includes('resina') ||
      categoryLower.includes('figura') ||
      subcategoryLower.includes('resina') ||
      subcategoryLower.includes('figura') ||
      nameLower.includes('resina') ||
      nameLower.includes('figura') ||
      tags.some((tag) => tag.includes('resina') || tag.includes('figura'))
    );
  }, [product]);

  const isTextileProduct = useCallback((): boolean => {
    const categoryLower = product.categoryId?.toLowerCase() || '';
    const nameLower = product.name?.toLowerCase() || '';
    const subcategoryLower = product.subcategoryId?.toLowerCase() || '';
    const tags = product.tags?.map((t) => t.toLowerCase()) || [];

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
      tags.some((tag) =>
        tag.includes('camiseta') ||
        tag.includes('sudadera') ||
        tag.includes('polo') ||
        tag.includes('textil') ||
        tag.includes('ropa')
      )
    );
  }, [product]);

  // Clasificar campos por tipo para los pasos
  const fieldsByStep = useMemo(() => {
    const optionFields: CustomizationField[] = [];
    const designFields: CustomizationField[] = [];

    schema.fields.forEach(field => {
      if (field.fieldType === 'color_selector' || field.fieldType === 'size_selector' || field.fieldType === 'dropdown') {
        optionFields.push(field);
      } else if (field.fieldType === 'image_upload') {
        designFields.push(field);
      }
    });

    return { optionFields, designFields };
  }, [schema.fields]);

  // Determinar pasos dinámicamente
  const steps = useMemo((): WizardStep[] => {
    const stepList: WizardStep[] = [];

    // Paso 1: Opciones (color, talla, etc.) - solo si hay campos de opciones
    if (fieldsByStep.optionFields.length > 0) {
      stepList.push({
        id: 'options',
        title: 'Elige tus opciones',
        shortTitle: 'Opciones',
        icon: <Palette className="w-5 h-5" />,
        description: 'Selecciona color, talla y otras opciones',
      });
    }

    // Paso 2: Diseño (subir imagen) - solo si hay campos de imagen
    if (fieldsByStep.designFields.length > 0) {
      stepList.push({
        id: 'design',
        title: 'Personaliza tu diseño',
        shortTitle: 'Diseño',
        icon: <Upload className="w-5 h-5" />,
        description: 'Sube tu imagen o elige una plantilla',
      });
    }

    // Paso 3: Posición - solo para productos que lo necesiten y tengan imagen
    const hasImageUpload = fieldsByStep.designFields.length > 0;
    const needsPositioning = !isResinProduct() && hasImageUpload;
    if (needsPositioning) {
      stepList.push({
        id: 'position',
        title: 'Ajusta la posición',
        shortTitle: 'Posición',
        icon: <Move className="w-5 h-5" />,
        description: 'Mueve y escala tu diseño',
      });
    }

    // Paso 4: Revisar - siempre presente
    stepList.push({
      id: 'review',
      title: 'Revisar y confirmar',
      shortTitle: 'Confirmar',
      icon: <Eye className="w-5 h-5" />,
      description: 'Revisa tu personalización antes de añadir al carrito',
    });

    return stepList;
  }, [fieldsByStep, isResinProduct]);

  // Check for reorder/shared design on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reorderMode = urlParams.get('reorder');
    const isShared = urlParams.get('shared');

    if (reorderMode) {
      const reorderKey = `reorder_${product.id}`;
      const reorderDataString = localStorage.getItem(reorderKey);

      if (reorderDataString) {
        try {
          const reorderData = JSON.parse(reorderDataString);
          if (reorderData.values) setValues(reorderData.values);
          if (reorderData.layers) setLayers(reorderData.layers);
          localStorage.removeItem(reorderKey);

          if (reorderMode === 'edit') {
            notify.success('Configuracion anterior cargada. Puedes editarla.');
          }
        } catch (error) {
          logger.error('[StepWizardCustomizer] Error loading reorder data', error);
        }
      }

      urlParams.delete('reorder');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }

    if (isShared === 'true') {
      const sharedKey = `shared_${product.id}`;
      const sharedDataString = localStorage.getItem(sharedKey);

      if (sharedDataString) {
        try {
          const sharedData = JSON.parse(sharedDataString);
          if (sharedData.values) setValues(sharedData.values);
          if (sharedData.layers) setLayers(sharedData.layers);
          localStorage.removeItem(sharedKey);
          notify.success('Diseno compartido cargado!');
        } catch (error) {
          logger.error('[StepWizardCustomizer] Error loading shared design', error);
        }
      }

      urlParams.delete('shared');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [product.id]);

  // Check for draft
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reorder')) return;

    const draft = loadDraft();
    if (draft && hasDraft()) {
      setShowDraftNotification(true);
      const timer = setTimeout(() => setShowDraftNotification(false), 15000);
      return () => clearTimeout(timer);
    }
  }, [product.id, loadDraft, hasDraft]);

  // Preload color images
  useEffect(() => {
    const colorField = schema.fields.find(f => f.fieldType === 'color_selector');
    if (colorField) {
      const colorConfig = colorField.config as ColorSelectorConfig;
      colorConfig.availableColors?.forEach(color => {
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

  // Helper function to detect if a field is a quantity multiplier
  const isQuantityField = useCallback((field: CustomizationField): boolean => {
    // Explicit configuration takes priority
    if (field.isQuantityMultiplier === true) return true;

    // Auto-detect by field id or label (common patterns)
    const idLower = field.id.toLowerCase();
    const labelLower = field.label.toLowerCase();
    const quantityKeywords = ['quantity', 'cantidad', 'unidades', 'units', 'qty'];

    return quantityKeywords.some(keyword =>
      idLower.includes(keyword) || labelLower.includes(keyword)
    );
  }, []);

  // Helper function to extract numeric quantity from a field value
  const extractQuantity = useCallback((value: CustomizationValue | undefined): number => {
    if (!value || value.value === undefined || value.value === null) return 1;

    const rawValue = value.value;

    // If it's already a number, use it directly
    if (typeof rawValue === 'number') return Math.max(1, rawValue);

    // If it's a string, extract the first number from it
    if (typeof rawValue === 'string') {
      const match = rawValue.match(/\d+/);
      if (match) {
        return Math.max(1, parseInt(match[0], 10));
      }
    }

    return 1;
  }, []);

  // Calculate pricing with quantity multiplication
  const pricing: CustomizationPricing = useMemo(() => {
    const basePrice = product.basePrice;
    const customizationPrice = Object.values(values).reduce(
      (sum, val) => sum + (val.priceModifier || 0),
      0
    );

    // Find quantity field and get the selected quantity
    const quantityField = schema.fields.find(f => isQuantityField(f));
    const quantity = quantityField
      ? extractQuantity(values[quantityField.id])
      : 1;

    const unitPrice = basePrice + customizationPrice;
    const totalPrice = unitPrice * quantity;

    const breakdown = Object.entries(values)
      .filter(([_, val]) => val.priceModifier && val.priceModifier > 0)
      .map(([fieldId, val]) => {
        const field = schema.fields.find((f) => f.id === fieldId);
        return {
          fieldLabel: field?.label || fieldId,
          price: val.priceModifier || 0,
        };
      });

    return { basePrice, customizationPrice, totalPrice, quantity, unitPrice, breakdown };
  }, [product.basePrice, values, schema.fields, isQuantityField, extractQuantity]);

  const handleFieldChange = useCallback((fieldId: string, value: CustomizationValue) => {
    const field = schema.fields.find((f) => f.id === fieldId);
    const fieldLabel = field?.label || fieldId;

    setValues((prev) => ({
      ...prev,
      [fieldId]: { ...value, fieldLabel },
    }));
    setError(null);
  }, [schema.fields]);

  const handleTextileTransformChange = useCallback((side: 'front' | 'back', transform: ImageTransform) => {
    let targetField = schema.fields.find(f =>
      f.fieldType === 'image_upload' && (
        side === 'front'
          ? (f.id.toLowerCase().includes('front') || f.id.toLowerCase().includes('frontal') || f.id.toLowerCase().includes('frente'))
          : (f.id.toLowerCase().includes('back') || f.id.toLowerCase().includes('trasera') || f.id.toLowerCase().includes('espalda'))
      )
    );

    if (!targetField) {
      targetField = schema.fields.find(f => {
        if (f.fieldType !== 'image_upload') return false;
        const idLower = f.id.toLowerCase();
        return !idLower.includes('front') && !idLower.includes('back') && !idLower.includes('frontal') && !idLower.includes('trasera');
      });
    }

    if (!targetField) return;

    setValues((prev) => ({
      ...prev,
      [targetField.id]: { ...prev[targetField.id], imageTransform: transform },
    }));
  }, [schema.fields]);

  const handleLoadTemplate = useCallback((template: DesignTemplate) => {
    const newValues: Record<string, CustomizationValue> = {};

    template.template.fields.forEach((templateField) => {
      const schemaField = schema.fields.find((f) => f.id === templateField.fieldId);
      if (!schemaField) return;

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
    notify.success(`Plantilla "${template.name}" cargada`);
  }, [schema.fields]);

  const handleSelectClipart = useCallback((clipart: Clipart) => {
    const newLayer: DesignLayer = {
      id: `layer_${Date.now()}`,
      type: 'clipart',
      source: clipart.imageUrl,
      transform: { x: 50, y: 50, scale: 0.5, rotation: 0 },
      zIndex: layers.length,
      locked: false,
      visible: true,
      opacity: 100,
    };

    setLayers((prev) => [...prev, newLayer]);
    setShowCliparts(false);
    notify.success(`Clipart "${clipart.name}" anadido`);
  }, [layers.length]);

  const validateCurrentStep = useCallback((): boolean => {
    const currentStepData = steps[currentStep];
    if (!currentStepData) return true;

    const fieldsToValidate = currentStepData.id === 'options'
      ? fieldsByStep.optionFields
      : currentStepData.id === 'design'
        ? fieldsByStep.designFields
        : [];

    for (const field of fieldsToValidate) {
      if (!field.required) continue;

      // Check condition
      if (field.condition) {
        const dependentValue = values[field.condition.dependsOn]?.value;
        const showWhen = Array.isArray(field.condition.showWhen)
          ? field.condition.showWhen
          : [field.condition.showWhen];

        if (!showWhen.includes(String(dependentValue))) continue;
      }

      const value = values[field.id];
      if (!value || !value.value || (typeof value.value === 'string' && !value.value.trim())) {
        setError(`El campo "${field.label}" es obligatorio`);
        return false;
      }
    }

    return true;
  }, [currentStep, steps, fieldsByStep, values]);

  const validateAllFields = useCallback((): boolean => {
    const requiredFields = schema.fields.filter((f) => f.required);

    for (const field of requiredFields) {
      if (field.condition) {
        const dependentValue = values[field.condition.dependsOn]?.value;
        const showWhen = Array.isArray(field.condition.showWhen)
          ? field.condition.showWhen
          : [field.condition.showWhen];

        if (!showWhen.includes(String(dependentValue))) continue;
      }

      const value = values[field.id];
      if (!value || !value.value || (typeof value.value === 'string' && !value.value.trim())) {
        setError(`El campo "${field.label}" es obligatorio`);
        return false;
      }
    }

    return true;
  }, [schema.fields, values]);

  const handleLoadDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      setValues(draft.values || {});
      setLayers(draft.layers || []);
      setShowDraftNotification(false);
      notify.success('Borrador restaurado');
    }
  }, [loadDraft]);

  const handleDismissDraft = useCallback(() => {
    setShowDraftNotification(false);
    clearDraft();
    notify.info('Borrador descartado');
  }, [clearDraft]);

  const handleNextStep = useCallback(() => {
    if (!validateCurrentStep()) return;
    setError(null);

    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length, validateCurrentStep]);

  const handlePrevStep = useCallback(() => {
    setError(null);
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((stepIndex: number) => {
    // Solo permitir ir a pasos anteriores o al siguiente si el actual es valido
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
      setError(null);
    } else if (stepIndex === currentStep + 1 && validateCurrentStep()) {
      setCurrentStep(stepIndex);
      setError(null);
    }
  }, [currentStep, validateCurrentStep]);

  const handleAddToCart = useCallback(async () => {
    setError(null);

    if (!validateAllFields()) return;

    setIsAddingToCart(true);

    try {
      const customizationData = {
        categoryId: product.categoryId,
        categoryName: product.name,
        values: Object.values(values),
        totalPriceModifier: pricing.customizationPrice,
      };

      // Add to cart - use unit price and selected quantity
      addToCart({
        id: product.id,
        name: product.name,
        price: pricing.unitPrice, // Price per unit
        quantity: pricing.quantity, // Selected quantity (e.g., 50 units)
        image: product.images[0] || '',
        customization: customizationData,
      });

      notify.success('Producto anadido al carrito!');
      clearDraft();
      setValues({});
      setCurrentStep(0);
    } catch (err) {
      logger.error('[StepWizardCustomizer] Error adding to cart', err);
      setError('Error al anadir al carrito. Intentalo de nuevo.');
    } finally {
      setIsAddingToCart(false);
    }
  }, [validateAllFields, product, values, pricing, clearDraft]);

  // Get preview images
  const getBaseImage = useCallback((): string => {
    const colorField = schema.fields.find(f => f.fieldType === 'color_selector');
    if (!colorField) return schema.previewImages?.default || product.images[0] || '';

    const colorValue = values[colorField.id];
    if (!colorValue) return schema.previewImages?.default || product.images[0] || '';

    const colorConfig = colorField.config as ColorSelectorConfig;
    const selectedColor = colorConfig.availableColors?.find(c => c.id === colorValue.value);

    if (selectedColor?.previewImages?.default) return selectedColor.previewImages.default;
    if (selectedColor?.previewImages?.front) return selectedColor.previewImages.front;
    if (selectedColor?.previewImage) return selectedColor.previewImage;

    return schema.previewImages?.default || product.images[0] || '';
  }, [schema, values, product.images]);

  const getUserImage = useCallback((): string | null => {
    const imageField = schema.fields.find(f => f.fieldType === 'image_upload');
    if (!imageField) return null;
    return (values[imageField.id]?.imageUrl as string) || null;
  }, [schema.fields, values]);

  const getImageTransform = useCallback(() => {
    const imageField = schema.fields.find(f => f.fieldType === 'image_upload');
    if (!imageField) return undefined;
    return values[imageField.id]?.imageTransform;
  }, [schema.fields, values]);

  // Textile-specific image getters
  const getTextileFrontImage = useCallback((): string | null => {
    const frontField = schema.fields.find(f =>
      f.fieldType === 'image_upload' && (
        f.id.toLowerCase().includes('front') || f.id.toLowerCase().includes('frontal') || f.id.toLowerCase().includes('frente')
      )
    );

    if (frontField && values[frontField.id]?.imageUrl) {
      return values[frontField.id].imageUrl as string;
    }

    const genericField = schema.fields.find(f => {
      if (f.fieldType !== 'image_upload') return false;
      const idLower = f.id.toLowerCase();
      return !idLower.includes('front') && !idLower.includes('back') && !idLower.includes('frontal') && !idLower.includes('trasera');
    });

    if (genericField && values[genericField.id]?.imageUrl) {
      return values[genericField.id].imageUrl as string;
    }

    return null;
  }, [schema.fields, values]);

  const getTextileBackImage = useCallback((): string | null => {
    const backField = schema.fields.find(f =>
      f.fieldType === 'image_upload' && (
        f.id.toLowerCase().includes('back') || f.id.toLowerCase().includes('trasera') || f.id.toLowerCase().includes('espalda')
      )
    );

    if (backField && values[backField.id]?.imageUrl) {
      return values[backField.id].imageUrl as string;
    }

    const genericField = schema.fields.find(f => {
      if (f.fieldType !== 'image_upload') return false;
      const idLower = f.id.toLowerCase();
      return !idLower.includes('front') && !idLower.includes('back') && !idLower.includes('frontal') && !idLower.includes('trasera');
    });

    if (genericField && values[genericField.id]?.imageUrl) {
      return values[genericField.id].imageUrl as string;
    }

    return null;
  }, [schema.fields, values]);

  const getTextileFrontTransform = useCallback(() => {
    const frontField = schema.fields.find(f =>
      f.fieldType === 'image_upload' && (
        f.id.toLowerCase().includes('front') || f.id.toLowerCase().includes('frontal')
      )
    );

    if (frontField && values[frontField.id]?.imageTransform) {
      return values[frontField.id].imageTransform;
    }

    const genericField = schema.fields.find(f => {
      if (f.fieldType !== 'image_upload') return false;
      const idLower = f.id.toLowerCase();
      return !idLower.includes('front') && !idLower.includes('back');
    });

    if (genericField && values[genericField.id]?.imageTransform) {
      return values[genericField.id].imageTransform;
    }

    return undefined;
  }, [schema.fields, values]);

  const getTextileBackTransform = useCallback(() => {
    const backField = schema.fields.find(f =>
      f.fieldType === 'image_upload' && (
        f.id.toLowerCase().includes('back') || f.id.toLowerCase().includes('trasera')
      )
    );

    if (backField && values[backField.id]?.imageTransform) {
      return values[backField.id].imageTransform;
    }

    return undefined;
  }, [schema.fields, values]);

  const getTextileBaseFrontImage = useCallback((): string => {
    const colorField = schema.fields.find(f => f.fieldType === 'color_selector');
    if (colorField) {
      const colorValue = values[colorField.id];
      if (colorValue) {
        const colorConfig = colorField.config as ColorSelectorConfig;
        const selectedColor = colorConfig.availableColors?.find(c => c.id === colorValue.value);
        if (selectedColor?.previewImages?.front) return selectedColor.previewImages.front;
        if (selectedColor?.previewImage) return selectedColor.previewImage;
      }
    }
    return schema.previewImages?.front || schema.previewImages?.default || product.images[0] || '';
  }, [schema, values, product.images]);

  const getTextileBaseBackImage = useCallback((): string => {
    const colorField = schema.fields.find(f => f.fieldType === 'color_selector');
    if (colorField) {
      const colorValue = values[colorField.id];
      if (colorValue) {
        const colorConfig = colorField.config as ColorSelectorConfig;
        const selectedColor = colorConfig.availableColors?.find(c => c.id === colorValue.value);
        if (selectedColor?.previewImages?.back) return selectedColor.previewImages.back;
      }
    }
    return schema.previewImages?.back || getTextileBaseFrontImage();
  }, [schema, values, getTextileBaseFrontImage]);

  // Render field component
  const renderField = useCallback((field: CustomizationField) => {
    if (field.condition) {
      const dependentValue = values[field.condition.dependsOn]?.value;
      const showWhen = Array.isArray(field.condition.showWhen)
        ? field.condition.showWhen
        : [field.condition.showWhen];

      if (!showWhen.includes(String(dependentValue))) return null;
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
            config={field.config as ColorSelectorConfig}
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
            config={field.config as SizeSelectorConfig}
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
            config={field.config as DropdownConfig}
            value={value}
            onChange={(val) => handleFieldChange(field.id, val)}
            helpText={field.helpText}
          />
        );

      case 'image_upload':
        if (isTextileProduct()) {
          const fieldIdLower = field.id.toLowerCase();
          const isFrontField = fieldIdLower.includes('front') || fieldIdLower.includes('frontal') || fieldIdLower.includes('frente');
          const isBackField = fieldIdLower.includes('back') || fieldIdLower.includes('trasera') || fieldIdLower.includes('espalda');

          if (isFrontField && activeSide !== 'front') return null;
          if (isBackField && activeSide !== 'back') return null;
        }

        return (
          <ImageUploadField
            key={field.id}
            fieldId={field.id}
            label={field.label}
            required={field.required}
            config={field.config as ImageUploadConfig}
            value={value}
            onChange={(val) => handleFieldChange(field.id, val)}
            helpText={field.helpText}
            productType={product.categoryId}
            categoryId={product.categoryId}
          />
        );

      default:
        return null;
    }
  }, [values, handleFieldChange, isTextileProduct, activeSide, product.categoryId]);

  // Render step content
  const renderStepContent = () => {
    const currentStepData = steps[currentStep];
    if (!currentStepData) return null;

    switch (currentStepData.id) {
      case 'options':
        return (
          <div className="space-y-6">
            {fieldsByStep.optionFields.map(field => renderField(field))}
          </div>
        );

      case 'design':
        return (
          <div className="space-y-6">
            {/* Template & Clipart buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowTemplates(true)}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 px-4 rounded-xl font-bold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Plantillas</span>
              </button>

              <button
                onClick={() => setShowCliparts(true)}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-4 rounded-xl font-bold text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Cliparts</span>
              </button>
            </div>

            {/* Textile side toggle */}
            {isTextileProduct() && (
              <div className="flex justify-center gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setActiveSide('front')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    activeSide === 'front'
                      ? 'bg-white shadow text-purple-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Frontal
                </button>
                <button
                  onClick={() => setActiveSide('back')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    activeSide === 'back'
                      ? 'bg-white shadow text-purple-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Trasera
                </button>
              </div>
            )}

            {/* Image upload fields */}
            {fieldsByStep.designFields.map(field => renderField(field))}

            {/* Cliparts info */}
            {layers.length > 0 && (
              <div className="p-3 bg-pink-50 border border-pink-200 rounded-lg">
                <p className="text-sm text-pink-800 font-medium">
                  {layers.length} clipart{layers.length > 1 ? 's' : ''} anadido{layers.length > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        );

      case 'position':
        return (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm text-center">
              Usa los controles de la vista previa para ajustar la posicion de tu diseno.
            </p>

            {isTextileProduct() && (
              <div className="flex justify-center gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setActiveSide('front')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    activeSide === 'front'
                      ? 'bg-white shadow text-purple-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Frontal
                </button>
                <button
                  onClick={() => setActiveSide('back')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    activeSide === 'back'
                      ? 'bg-white shadow text-purple-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Trasera
                </button>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <Move className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">
                Arrastra la imagen en la vista previa para moverla.
                Usa los deslizadores para escalar y rotar.
              </p>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            {/* Selected options summary */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-bold text-gray-800 mb-3">Tu seleccion:</h4>
              <div className="space-y-2">
                {Object.entries(values).map(([fieldId, val]) => {
                  const field = schema.fields.find(f => f.id === fieldId);
                  if (!field || !val.displayValue) return null;
                  return (
                    <div key={fieldId} className="flex justify-between text-sm">
                      <span className="text-gray-600">{field.label}:</span>
                      <span className="font-medium text-gray-800">{val.displayValue}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-gradient-to-r from-purple-50 to-cyan-50 rounded-xl p-4">
              <h4 className="font-bold text-gray-800 mb-3">Resumen de precio:</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Precio por unidad:</span>
                  <span className="font-medium">€{pricing.basePrice.toFixed(2)}</span>
                </div>
                {pricing.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.fieldLabel}:</span>
                    <span className="font-medium text-purple-600">+€{item.price.toFixed(2)}</span>
                  </div>
                ))}
                {pricing.customizationPrice > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Precio unitario total:</span>
                    <span className="font-medium">€{pricing.unitPrice.toFixed(2)}</span>
                  </div>
                )}
                {pricing.quantity > 1 && (
                  <div className="flex justify-between text-sm bg-purple-100 -mx-2 px-2 py-1 rounded">
                    <span className="text-gray-700">Cantidad:</span>
                    <span className="font-bold text-purple-700">{pricing.quantity} unidades</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-purple-600">
                      €{pricing.totalPrice.toFixed(2)}
                    </span>
                  </div>
                  {pricing.quantity > 1 && (
                    <p className="text-xs text-gray-500 text-right mt-1">
                      (€{pricing.unitPrice.toFixed(2)} × {pricing.quantity} unidades)
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Save & Share */}
            {Object.keys(values).length > 0 && (
              <div className="flex justify-center gap-3 flex-wrap">
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
          </div>
        );

      default:
        return null;
    }
  };

  // Render preview
  const renderPreview = () => {
    if (isResinProduct()) {
      return (
        <SplitProductPreview
          baseImage={getBaseImage()}
          userImage={getUserImage()}
          productName={product.name}
          baseImageLabel="Tu caja personalizada"
          userImageLabel="Foto de referencia"
        />
      );
    }

    if (isTextileProduct()) {
      return (
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
      );
    }

    return (
      <ProductPreview
        baseImage={getBaseImage()}
        userImage={getUserImage()}
        transform={getImageTransform()}
        productName={product.name}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-4 sm:py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header - mas compacto en movil */}
        <div className="mb-4 sm:mb-6 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            Personaliza tu {product.name}
          </h2>
          <p className="text-sm text-gray-600 hidden sm:block">{product.description}</p>
        </div>

        {/* Draft Notification */}
        {showDraftNotification && (
          <div className="mb-4 max-w-xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <Save className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-blue-800 font-medium">Borrador encontrado</p>
                  <p className="text-xs text-blue-600 mt-1">Tienes un diseno guardado automaticamente.</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleLoadDraft}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                    >
                      Restaurar
                    </button>
                    <button
                      onClick={handleDismissDraft}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-300"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step Indicator - horizontal en movil */}
        <div className="mb-6">
          <div className="flex items-center justify-between max-w-md mx-auto px-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => goToStep(index)}
                  className={`flex flex-col items-center gap-1 transition-all ${
                    index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                  }`}
                  disabled={index > currentStep + 1}
                >
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                      index < currentStep
                        ? 'bg-green-500 text-white'
                        : index === currentStep
                          ? 'bg-purple-600 text-white shadow-lg scale-110'
                          : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-medium text-center leading-tight ${
                      index === currentStep ? 'text-purple-600' : 'text-gray-500'
                    }`}
                  >
                    {step.shortTitle}
                  </span>
                </button>

                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 sm:mx-2 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Template Gallery Modal */}
        {showTemplates && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
            <div className="max-w-4xl w-full">
              <ClipartGallery
                onSelectClipart={handleSelectClipart}
                onClose={() => setShowCliparts(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content - stacked on mobile, side-by-side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Preview - arriba en movil */}
          <div className="order-1 lg:order-1">
            <div className="sticky top-4">
              {renderPreview()}
            </div>
          </div>

          {/* Step Content - abajo en movil */}
          <div className="order-2 lg:order-2">
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
              {/* Step Header */}
              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  {steps[currentStep]?.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {steps[currentStep]?.description}
                </p>
              </div>

              {/* Step Fields */}
              <div className="mb-6">
                {renderStepContent()}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handlePrevStep}
                  disabled={currentStep === 0}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    currentStep === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                {/* Price indicator */}
                <div className="text-center">
                  <div className="text-xs text-gray-500">
                    {pricing.quantity > 1 ? `Total (${pricing.quantity} uds)` : 'Total'}
                  </div>
                  <div className="text-lg sm:text-xl font-bold text-purple-600">
                    €{pricing.totalPrice.toFixed(2)}
                  </div>
                </div>

                {currentStep < steps.length - 1 ? (
                  <button
                    onClick={handleNextStep}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium text-sm hover:bg-purple-700 transition-all active:scale-95"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleAddToCart}
                    disabled={isAddingToCart}
                    className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50 active:scale-95"
                  >
                    {isAddingToCart ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Anadiendo...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>Anadir</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Help text */}
            <p className="text-center text-xs text-gray-500 mt-4">
              Dudas?{' '}
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
