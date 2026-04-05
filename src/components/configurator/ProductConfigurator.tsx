import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Loader, AlertTriangle, ShoppingCart } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { db, storage } from '../../lib/firebase';
import { addToCart } from '../../store/cartStore';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { safeImageSrc } from '../../lib/placeholders';
import { normalizeConfigurator, getUnitPrice } from '../../lib/configurator';
import type {
  ConfigurableProduct,
  ConfiguratorStepId,
  ConfiguratorSelections,
  ConfiguratorPricing,
  OptionGroup,
  DesignMode,
  ProductConfiguratorAttribute,
} from '../../types/configurator';

import StepProgress from './ui/StepProgress';
import PriceDisplay from './ui/PriceDisplay';
import StepOption from './steps/StepOption';
import StepFreetext from './steps/StepFreetext';
import StepDesign from './steps/StepDesign';
import StepPlacement from './steps/StepPlacement';
import StepQuantity from './steps/StepQuantity';
import StepSummary from './steps/StepSummary';

interface ProductConfiguratorProps {
  productId: string;
}

const TEXT_BANNER_OPTION_ID = 'texto_banderin';
const TEXT_BANNER_PRICE_PER_LETTER = 0.9;
const TEXT_BANNER_GIFT_IMAGE_PENNANTS = 2;

// ============================================================================
// PRICING HELPERS
// ============================================================================

function getUnitsPerSheet(
  optionGroups: OptionGroup[],
  selectedOptions: Record<string, string>
): number | undefined {
  for (const group of optionGroups) {
    const valueId = selectedOptions[group.id];
    if (valueId) {
      const val = group.values.find((v) => v.id === valueId);
      if (val?.unitsPerSheet) return val.unitsPerSheet;
    }
  }
  return undefined;
}

function getPreviewImage(
  optionGroups: OptionGroup[],
  selectedOptions: Record<string, string>,
  fallback: string | undefined
): string | undefined {
  for (const group of optionGroups) {
    const valueId = selectedOptions[group.id];
    if (valueId) {
      const val = group.values.find((v) => v.id === valueId);
      if (val?.previewImage) return safeImageSrc(val.previewImage);
      if (group.type === 'image' && val?.value) return safeImageSrc(val.value);
    }
  }
  return fallback ? safeImageSrc(fallback) : undefined;
}

// ── Print-type–aware surcharge ────────────────────────────────────────────
// Reads print_type / print_colors from selections.options and dispatches:
//   dtf      → placement.surcharge
//   vinilo   → placement.vinylPerColorSurcharge × colors
//   bordado  → placement.embroideryFixedSurcharge

function getPrintSurcharge(
  product: ConfigurableProduct,
  selections: ConfiguratorSelections
): { surcharge: number; label: string } {
  if (!selections.placement || !product.configurator.placement)
    return { surcharge: 0, label: '' };

  const placementOpt = product.configurator.placement.options.find(
    (o) => o.id === selections.placement
  );
  if (!placementOpt) return { surcharge: 0, label: '' };

  const printType = selections.options['print_type'] ?? '';

  if (printType === 'vinilo') {
    const colors = Math.max(Number(selections.options['print_colors']) || 1, 1);
    const perColor = placementOpt.vinylPerColorSurcharge ?? 0;
    return {
      surcharge: perColor * colors,
      label: `Vinilo textil (${colors} ${colors === 1 ? 'color' : 'colores'})`,
    };
  }

  if (printType === 'bordado') {
    return {
      surcharge: placementOpt.embroideryFixedSurcharge ?? 0,
      label: 'Bordado',
    };
  }

  // DTF (default / explicit)
  return {
    surcharge: placementOpt.surcharge ?? 0,
    label: placementOpt.label,
  };
}

// ── Resolve active tiers (shared helper) ──────────────────────────────────

function resolveActiveTiers(
  product: ConfigurableProduct,
  selections: ConfiguratorSelections
) {
  const { tiers, combinationPricing } = product.configurator.quantity;
  const optionGroups = product.configurator.options ?? [];
  let activeTiers = tiers;
  if (combinationPricing) {
    const valueIds = optionGroups
      .map((g) => selections.options[g.id])
      .filter((id): id is string => !!id);
    if (valueIds.length > 1) {
      const fullKey = valueIds.join('+');
      if (combinationPricing[fullKey]?.length) activeTiers = combinationPricing[fullKey];
    }
    if (activeTiers === tiers) {
      for (const id of valueIds) {
        if (combinationPricing[id]?.length) { activeTiers = combinationPricing[id]; break; }
      }
    }
  }
  return activeTiers;
}

function calculatePricing(
  product: ConfigurableProduct,
  selections: ConfiguratorSelections
): ConfiguratorPricing {
  const textBannerValue = selections.options[TEXT_BANNER_OPTION_ID];
  if (typeof textBannerValue === 'string') {
    const letterCount = textBannerValue.replace(/\s/g, '').length;
    if (letterCount > 0) {
      const subtotal = letterCount * TEXT_BANNER_PRICE_PER_LETTER;
      return {
        unitPrice: TEXT_BANNER_PRICE_PER_LETTER,
        designPrice: 0,
        subtotal,
        total: subtotal,
        letterCount,
        letterUnitPrice: TEXT_BANNER_PRICE_PER_LETTER,
        giftImagePennants: TEXT_BANNER_GIFT_IMAGE_PENNANTS,
      };
    }
  }

  const priceResult = getUnitPrice(
    product.configurator,
    selections.options,
    selections.quantity
  );
  const { sheetBased } = product.configurator.quantity;
  const designPrice =
    selections.designMode === 'need-design'
      ? product.configurator.design.designServicePrice
      : 0;

  // Sheet-based modes — no print surcharge applies
  if (priceResult.ok && priceResult.pricingMode === 'sheet-matrix') {
    const subtotal = priceResult.totalPrice ?? 0;
    const unitPrice = priceResult.effectiveUnitPrice ?? 0;
    return { unitPrice, designPrice, subtotal, total: subtotal + designPrice };
  }

  if (sheetBased) {
    const matchedTier = priceResult.appliedTier;
    const subtotal = matchedTier?.price ?? 0;
    const tierFrom = Math.max(matchedTier?.from ?? 1, 1);
    return {
      unitPrice: subtotal / tierFrom,
      designPrice,
      subtotal,
      total: subtotal + designPrice,
    };
  }

  // ── Standard per-unit mode ──────────────────────────────────────────────
  // basePrice  = engine unit price (size/variant tier, may include qty discount)
  // surcharge  = print-type–aware extra (DTF | vinilo | bordado)
  // unitPrice  = basePrice + surcharge

  const engineUnitPrice = priceResult.ok ? priceResult.unitPrice : 0;
  const { surcharge: printSurcharge, label: printSurchargeLabel } =
    getPrintSurcharge(product, selections);

  const basePrice = engineUnitPrice;
  const unitPrice = basePrice + printSurcharge;
  const subtotal = unitPrice * selections.quantity;

  // ── Attribute option surcharges ──────────────────────────────────────────
  const attributes = product.configurator.attributes ?? [];
  const attributeSurcharges: Array<{ label: string; amount: number; detail: string }> = [];
  let attributeSurchargeTotal = 0;

  for (const attr of attributes) {
    const selectedId = selections.options[attr.id];
    if (!selectedId) continue;
    const opt = attr.options.find((o) => o.id === selectedId);
    if (!opt?.surcharge || opt.surcharge <= 0) continue;

    const surchargeType = opt.surchargeType ?? 'per_unit';
    let amount: number;
    let detail: string;

    if (surchargeType === 'fixed') {
      amount = opt.surcharge;
      detail = `+${opt.surcharge.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`;
    } else {
      amount = opt.surcharge * selections.quantity;
      detail = `${selections.quantity} × ${opt.surcharge.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`;
    }

    attributeSurcharges.push({ label: opt.label, amount, detail });
    attributeSurchargeTotal += amount;
  }

  // Quantity discount: compare engine price against first-tier base
  const activeTiers = resolveActiveTiers(product, selections);
  let quantityDiscount: number | undefined;
  let unitPriceBeforeDiscount: number | undefined;

  if (activeTiers.length >= 2 && activeTiers[0]) {
    const baseTierPrice = activeTiers[0].price;
    if (baseTierPrice > 0 && engineUnitPrice < baseTierPrice) {
      const pct = Math.round((1 - engineUnitPrice / baseTierPrice) * 100);
      if (pct > 0) {
        quantityDiscount = pct;
        unitPriceBeforeDiscount = baseTierPrice + printSurcharge;
      }
    }
  }

  const total = subtotal + designPrice + attributeSurchargeTotal;

  return {
    unitPrice,
    designPrice,
    subtotal,
    total,
    ...(printSurcharge > 0
      ? { basePrice, printSurcharge, printSurchargeLabel }
      : {}),
    ...(quantityDiscount != null ? { quantityDiscount, unitPriceBeforeDiscount } : {}),
    ...(attributeSurcharges.length > 0 ? { attributeSurcharges } : {}),
  };
}

// ============================================================================
// STEP VALIDATION
// ============================================================================

function attributeToOptionGroup(attr: ProductConfiguratorAttribute): OptionGroup | null {
  if (attr.type === 'freetext') return null;
  return {
    id: attr.id,
    label: attr.label,
    type: attr.type === 'select' ? 'text' : attr.type,
    values: attr.options.map((o) => ({
      id: o.id,
      label: o.label,
      value: o.value ?? o.label,
      previewImage: o.previewImage,
      unitsPerSheet: o.unitsPerSheet,
    })),
  };
}

function getVisibleSteps(
  steps: ConfiguratorStepId[],
  attributes: ProductConfiguratorAttribute[] | undefined,
  selectedOptions: Record<string, string>
): ConfiguratorStepId[] {
  if (!attributes || attributes.length === 0) return steps;
  return steps.filter((stepId) => {
    // Manejar tanto 'attribute:' como 'option:' (normalizeConfigurator convierte attribute: -> option:)
    const attrId = stepId.startsWith('attribute:')
      ? stepId.slice(10)
      : stepId.startsWith('option:')
        ? stepId.slice(7)
        : null;

    if (!attrId) return true;

    const attr = attributes.find((a) => a.id === attrId);
    if (!attr?.visibleWhen) return true;

    return Object.entries(attr.visibleWhen).every(
      ([key, values]) => selectedOptions[key] != null && values.includes(selectedOptions[key])
    );
  });
}

function isStepValid(
  stepId: ConfiguratorStepId,
  product: ConfigurableProduct,
  selections: ConfiguratorSelections
): boolean {
  if (stepId.startsWith('option:') || stepId.startsWith('attribute:')) {
    const id = stepId.startsWith('option:') ? stepId.slice(7) : stepId.slice(10);
    const attr = product.configurator.attributes?.find((a) => a.id === id);
    if (attr && attr.required === false) return true;
    return !!selections.options[id];
  }
  switch (stepId) {
    case 'design':
      if (selections.designMode === 'ready') return !!selections.designFile;
      if (selections.designMode === 'need-design') return true;
      return false;
    case 'placement': {
      if (!selections.placement) return false;
      const cfg = product.configurator.placement;
      if (cfg?.allowSize && cfg.sizeOptions.length > 0) return !!selections.placementSize;
      return true;
    }
    case 'quantity':
      return selections.quantity >= product.configurator.quantity.min;
    case 'summary':
      return true;
    default:
      return true;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProductConfigurator({ productId }: ProductConfiguratorProps) {
  const [product, setProduct] = useState<ConfigurableProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const [selections, setSelections] = useState<ConfiguratorSelections>({
    options: {},
    designMode: null,
    quantity: 1,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchProduct() {
      try {
        const docRef = doc(db, 'products', productId);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
          if (!cancelled) setError('Producto no encontrado');
          return;
        }

        const data = snap.data();

        let configuratorRaw = data.configurator;
        if (!configuratorRaw && data.configuratorId) {
          const cfgSnap = await getDoc(doc(db, 'product_configurators', data.configuratorId));
          if (cfgSnap.exists()) configuratorRaw = cfgSnap.data().configurator;
        }

        if (!configuratorRaw) {
          if (!cancelled) setError('Este producto no tiene configurador');
          return;
        }

        const configurator = normalizeConfigurator(configuratorRaw);

        if (!cancelled) {
          const p: ConfigurableProduct = {
            id: snap.id,
            name: data.name,
            description: data.description || '',
            images: Array.isArray(data.images)
              ? data.images
                  .filter((img: unknown): img is string => typeof img === 'string')
                  .map((img) => safeImageSrc(img))
              : [],
            slug: data.slug || '',
            basePrice: data.basePrice || 0,
            configurator,
          };
          setProduct(p);
          setSelections((prev) => ({
            ...prev,
            quantity: configurator.quantity.min,
          }));
        }
      } catch (err) {
        logger.error('[Configurator] Error loading product', err);
        if (!cancelled) setError('Error al cargar el producto');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProduct();
    return () => { cancelled = true; };
  }, [productId]);

  const allSteps = product?.configurator.steps ?? [];
  const attributes = product?.configurator.attributes;
  const optionGroups = product?.configurator.options ?? [];

  const steps = useMemo(
    () => getVisibleSteps(allSteps, attributes, selections.options),
    [allSteps, attributes, selections.options]
  );

  // Clamp currentStep if visible steps shrink
  useEffect(() => {
    if (steps.length > 0 && currentStep >= steps.length) {
      setCurrentStep(steps.length - 1);
    }
  }, [steps.length, currentStep]);

  const currentStepId = steps[currentStep] as ConfiguratorStepId | undefined;

  const pricing = useMemo(
    () => (product ? calculatePricing(product, selections) : null),
    [product, selections]
  );

  // En productos por texto (banderín), la cantidad no define precio.
  // Forzamos cantidad mínima para evitar inconsistencias visuales y de carrito.
  useEffect(() => {
    if (!product || !pricing || pricing.letterCount == null) return;
    const fixedQuantity = product.configurator.quantity.min;
    if (selections.quantity !== fixedQuantity) {
      setSelections((prev) =>
        prev.quantity === fixedQuantity ? prev : { ...prev, quantity: fixedQuantity }
      );
    }
  }, [product, pricing?.letterCount, selections.quantity]);

  const canGoNext = currentStepId
    ? isStepValid(currentStepId, product!, selections)
    : false;
  const isLastStep = currentStep === steps.length - 1;

  const goNext = useCallback(() => {
    if (canGoNext && !isLastStep) setCurrentStep((s) => s + 1);
  }, [canGoNext, isLastStep]);

  const goBack = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const goToStep = useCallback(
    (index: number) => { if (index < currentStep) setCurrentStep(index); },
    [currentStep]
  );

  // Selection handlers
  const setOption = useCallback((groupId: string, valueId: string) => {
    setSelections((prev) => {
      const newOptions = { ...prev.options, [groupId]: valueId };
      // Limpiar selecciones de atributos que dependen de este
      const dependents = attributes?.filter(
        (a) => a.visibleWhen && groupId in a.visibleWhen,
      ) ?? [];
      for (const dep of dependents) {
        delete newOptions[dep.id];
      }

      // Auto-correct placement when switching to bordado
      let placement = prev.placement;
      if (groupId === 'print_type' && valueId === 'bordado' && product?.configurator.placement) {
        const allowed = product.configurator.placement.options.filter((o) => o.embroideryAllowed);
        const currentStillAllowed = allowed.some((o) => o.id === placement);
        if (!currentStillAllowed && allowed[0]) {
          placement = allowed[0].id;
        }
      }

      return { ...prev, options: newOptions, placement };
    });
  }, [attributes, product]);

  const setDesignMode = useCallback((mode: DesignMode) => {
    setSelections((prev) => ({
      ...prev,
      designMode: mode,
      designFile: mode === 'ready' ? prev.designFile : undefined,
      referenceFiles: mode === 'need-design' ? prev.referenceFiles : undefined,
      designNotes: mode === 'need-design' ? prev.designNotes : undefined,
    }));
  }, []);

  const setDesignFile = useCallback((file: File | undefined) => {
    setSelections((prev) => ({ ...prev, designFile: file }));
  }, []);

  const setReferenceFiles = useCallback((files: File[]) => {
    setSelections((prev) => ({ ...prev, referenceFiles: files }));
  }, []);

  const setDesignNotes = useCallback((notes: string) => {
    setSelections((prev) => ({ ...prev, designNotes: notes }));
  }, []);

  const setPlacement = useCallback((placement: string) => {
    setSelections((prev) => ({ ...prev, placement, placementSize: undefined }));
  }, []);

  const setPlacementSize = useCallback((placementSize: string) => {
    setSelections((prev) => ({ ...prev, placementSize }));
  }, []);

  const setQuantity = useCallback((quantity: number) => {
    setSelections((prev) => ({ ...prev, quantity }));
  }, []);

  // Add to cart
  const handleAddToCart = useCallback(async () => {
    if (!product || !pricing) return;

    const isTextBannerPricing = pricing.letterCount != null && pricing.letterUnitPrice != null;
    const priceValidation = getUnitPrice(
      product.configurator,
      selections.options,
      selections.quantity
    );
    if (!isTextBannerPricing && !priceValidation.ok) {
      notify.error(priceValidation.error?.message || 'No se pudo resolver el precio para esta configuración');
      return;
    }

    setIsAddingToCart(true);

    try {
      let uploadedDesignUrl: string | undefined;
      if (selections.designMode === 'ready' && selections.designFile) {
        const uid = getAuth().currentUser?.uid;
        const timestamp = Date.now();
        const fileName = `${timestamp}_${selections.designFile.name}`;
        const path = uid
          ? `personalizaciones/${uid}/${product.slug || product.id}/${fileName}`
          : `configurator-uploads/${product.id}/${fileName}`;
        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, selections.designFile);
        uploadedDesignUrl = await getDownloadURL(fileRef);
      }

      const customization: Record<string, unknown> = {
        configuratorId: product.id,
      };

      if (!isTextBannerPricing && priceValidation.pricingMode === 'sheet-matrix') {
        if (priceValidation.unitsPerSheet) customization.unitsPerSheet = priceValidation.unitsPerSheet;
        if (priceValidation.sheetsNeeded) customization.sheetsNeeded = priceValidation.sheetsNeeded;
      }

      if (isTextBannerPricing) {
        customization.letterCount = pricing.letterCount;
        customization.letterUnitPrice = pricing.letterUnitPrice;
        customization.giftImagePennants = pricing.giftImagePennants ?? TEXT_BANNER_GIFT_IMAGE_PENNANTS;
      }

      // All selected options
      for (const group of optionGroups) {
        const valueId = selections.options[group.id];
        if (valueId) {
          const val = group.values.find((v) => v.id === valueId);
          customization[`option_${group.id}`] = valueId;
          customization[`option_${group.id}_label`] = val?.label;
        }
      }

      if (selections.designMode === 'ready') {
        customization.designMode = 'ready';
        customization.uploadedImage = uploadedDesignUrl || null;
      }
      if (selections.designMode === 'need-design') {
        customization.designMode = 'need-design';
        customization.designNotes = selections.designNotes || '';
        customization.designServicePrice = pricing.designPrice;
      }
      if (selections.placement) {
        const placementOpt = product.configurator.placement?.options.find(
          (o) => o.id === selections.placement
        );
        customization.placement = selections.placement;
        customization.placementLabel = placementOpt?.label;
        if (selections.placementSize) customization.placementSize = selections.placementSize;
      }

      // Quantity: for sheetBased, store sheets and convert to units for cart
      const isSheetBased = product.configurator.quantity.sheetBased;
      const unitsPerSheet = getUnitsPerSheet(optionGroups, selections.options);
      const cartQuantity = isTextBannerPricing
        ? product.configurator.quantity.min
        : isSheetBased && unitsPerSheet
          ? selections.quantity * unitsPerSheet
          : selections.quantity;
      if (!isTextBannerPricing && isSheetBased) customization.sheets = selections.quantity;

      addToCart({
        id: product.id,
        name: product.name,
        price: pricing.total / Math.max(cartQuantity, 1),
        quantity: cartQuantity,
        image: safeImageSrc(product.images[0]),
        customization: customization as any,
      });

      setAddedToCart(true);
      logger.info('[Configurator] Added to cart', {
        productId: product.id,
        quantity: cartQuantity,
        total: pricing.total,
      });
    } catch (err) {
      logger.error('[Configurator] Error adding to cart', err);
      notify.error('Error al añadir al carrito. Inténtalo de nuevo.');
    } finally {
      setIsAddingToCart(false);
    }
  }, [product, pricing, selections, optionGroups]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">{error || 'Producto no disponible'}</h2>
        <p className="text-gray-500 mb-6">No pudimos cargar este producto.</p>
        <a href="/" className="text-indigo-600 font-medium hover:underline">Volver al inicio</a>
      </div>
    );
  }

  if (addedToCart) {
    const isSheetBased = product.configurator.quantity.sheetBased;
    const uph = getUnitsPerSheet(optionGroups, selections.options);
    const qtyLabel = isSheetBased
      ? `${selections.quantity} ${selections.quantity === 1 ? 'hoja' : 'hojas'}${uph ? ` (${selections.quantity * uph} uds.)` : ''}`
      : String(selections.quantity);

    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Producto añadido al carrito</h2>
        <p className="text-gray-500 mb-8">{product.name} &times; {qtyLabel}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/cart" className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
            Ver carrito
          </a>
          <a href="/" className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
            Seguir comprando
          </a>
        </div>
      </div>
    );
  }

  const previewImage = getPreviewImage(optionGroups, selections.options, product.images[0]);
  const unitsPerSheet = getUnitsPerSheet(optionGroups, selections.options);
  const isSheetBased = product.configurator.quantity.sheetBased;

  return (
    <div className="max-w-5xl mx-auto px-4 py-2 sm:py-8 overflow-x-hidden">
      {/* Header */}
      <div className="mb-3">
        <a
          href={product.slug ? `/producto/${product.slug}` : '/'}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al producto
        </a>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{product.name}</h1>
      </div>

      {/* Step progress */}
      <div className="mb-3">
        <StepProgress
          steps={steps}
          currentStep={currentStep}
          optionGroups={optionGroups}
          attributes={attributes}
          onStepClick={goToStep}
        />
      </div>

      {/* Content: block on mobile, grid on desktop */}
      <div className="lg:grid lg:grid-cols-5 lg:gap-8">
        {/* Step content */}
        <div className="lg:col-span-3 pb-[80px] sm:pb-0 min-w-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-7">

            {/* Option / Attribute steps */}
            {(currentStepId?.startsWith('option:') || currentStepId?.startsWith('attribute:')) && (() => {
              const id = currentStepId!.startsWith('option:')
                ? currentStepId!.slice(7)
                : currentStepId!.slice(10);

              // Check V2 attributes first (freetext needs special rendering)
              const attr = attributes?.find((a) => a.id === id);
              if (attr?.type === 'freetext') {
                return (
                  <StepFreetext
                    attribute={attr}
                    value={selections.options[id] ?? ''}
                    onChange={(val) => setOption(id, val)}
                  />
                );
              }

              // Standard option group (legacy or V2 non-freetext)
              const group = attr
                ? attributeToOptionGroup(attr)
                : optionGroups.find((g) => g.id === id) ?? null;
              if (!group) return null;
              return (
                <StepOption
                  group={group}
                  selected={selections.options[id]}
                  onSelect={(valueId) => setOption(id, valueId)}
                />
              );
            })()}

            {currentStepId === 'design' && (
              <StepDesign
                config={product.configurator.design}
                designMode={selections.designMode}
                designFile={selections.designFile}
                referenceFiles={selections.referenceFiles || []}
                designNotes={selections.designNotes || ''}
                onDesignModeChange={setDesignMode}
                onDesignFileChange={setDesignFile}
                onReferenceFilesChange={setReferenceFiles}
                onDesignNotesChange={setDesignNotes}
              />
            )}

            {currentStepId === 'placement' && product.configurator.placement && (
              <StepPlacement
                config={product.configurator.placement}
                selected={selections.placement}
                selectedSize={selections.placementSize}
                printType={selections.options['print_type']}
                onSelect={setPlacement}
                onSizeSelect={setPlacementSize}
              />
            )}

            {currentStepId === 'quantity' && (
              <StepQuantity
                config={product.configurator.quantity}
                quantity={selections.quantity}
                optionGroups={optionGroups}
                selectedOptions={selections.options}
                unitsPerSheet={unitsPerSheet}
                pricing={pricing}
                onQuantityChange={setQuantity}
              />
            )}

            {currentStepId === 'summary' && pricing && (
              <StepSummary
                product={product}
                selections={selections}
                pricing={pricing}
                isAddingToCart={isAddingToCart}
                onAddToCart={handleAddToCart}
              />
            )}
          </div>

          {/* Desktop nav buttons */}
          {currentStepId !== 'summary' && (
            <div className="hidden sm:flex justify-between mt-6">
              <button
                type="button"
                onClick={goBack}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-0 disabled:pointer-events-none transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Mobile sticky bottom bar */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-3">
            {currentStepId === 'summary' ? (
              <>
                <div className="flex-1 min-w-0">
                  {pricing && (
                    <>
                      <p className="text-base font-bold text-gray-900 leading-tight">
                        {pricing.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                      </p>
                      <p className="text-xs text-gray-400 leading-tight">total</p>
                    </>
                  )}
                </div>
                <button type="button" onClick={goBack} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-sm shrink-0"
                >
                  {isAddingToCart ? <Loader className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                  Añadir
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  {pricing ? (
                    <>
                      <p className="text-base font-bold text-gray-900 leading-tight">
                        {pricing.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                      </p>
                      <p className="text-xs text-gray-400 leading-tight">total</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">Calculando…</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={goBack}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-0 disabled:pointer-events-none transition-all shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-sm shrink-0"
                >
                  Siguiente
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sidebar — desktop only */}
        <div className="hidden lg:block lg:col-span-2 space-y-6">
          {previewImage && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <img
                src={previewImage}
                alt={product.name}
                className="w-full aspect-square object-contain rounded-xl"
              />
            </div>
          )}
          {pricing && currentStepId !== 'summary' && (
            <PriceDisplay pricing={pricing} quantity={selections.quantity} sheetBased={isSheetBased} />
          )}
        </div>
      </div>
    </div>
  );
}
