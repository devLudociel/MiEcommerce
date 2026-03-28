import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Loader, AlertTriangle, ShoppingCart } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { db, storage } from '../../lib/firebase';
import { addToCart } from '../../store/cartStore';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import type {
  ConfigurableProduct,
  ConfiguratorStepId,
  ConfiguratorSelections,
  ConfiguratorPricing,
  PricingTier,
  DesignMode,
} from '../../types/configurator';

import StepProgress from './ui/StepProgress';
import PriceDisplay from './ui/PriceDisplay';
import StepVariant from './steps/StepVariant';
import StepSize from './steps/StepSize';
import StepDesign from './steps/StepDesign';
import StepPlacement from './steps/StepPlacement';
import StepQuantity from './steps/StepQuantity';
import StepSummary from './steps/StepSummary';

interface ProductConfiguratorProps {
  productId: string;
}

// ============================================================================
// PRICING HELPERS
// ============================================================================

function getTierPrice(tiers: PricingTier[], qty: number): number {
  if (tiers.length === 0) return 0;
  let match: PricingTier = tiers[0];
  for (const tier of tiers) {
    if (qty >= tier.from) match = tier;
  }
  return match.price;
}

function calculatePricing(
  product: ConfigurableProduct,
  selections: ConfiguratorSelections
): ConfiguratorPricing {
  const unitPrice = getTierPrice(product.configurator.quantity.tiers, selections.quantity);
  const designPrice =
    selections.designMode === 'need-design'
      ? product.configurator.design.designServicePrice
      : 0;
  const subtotal = unitPrice * selections.quantity;
  const total = subtotal + designPrice;

  return { unitPrice, designPrice, subtotal, total };
}

// ============================================================================
// STEP VALIDATION
// ============================================================================

function isStepValid(
  stepId: ConfiguratorStepId,
  product: ConfigurableProduct,
  selections: ConfiguratorSelections
): boolean {
  switch (stepId) {
    case 'variant':
      return !!selections.variant;
    case 'size':
      return !!selections.size;
    case 'design':
      if (selections.designMode === 'ready') return !!selections.designFile;
      if (selections.designMode === 'need-design') return true;
      return false;
    case 'placement': {
      if (!selections.placement) return false;
      const placementCfg = product.configurator.placement;
      if (placementCfg?.allowSize && placementCfg.sizeOptions.length > 0) {
        return !!selections.placementSize;
      }
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
    designMode: null,
    quantity: 1,
  });

  // Fetch product from Firebase
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

        // Load configurator: either inline (legacy) or from product_configurators collection
        let configurator = data.configurator;
        if (!configurator && data.configuratorId) {
          const cfgSnap = await getDoc(doc(db, 'product_configurators', data.configuratorId));
          if (cfgSnap.exists()) {
            configurator = cfgSnap.data().configurator;
          }
        }

        if (!configurator) {
          if (!cancelled) setError('Este producto no tiene configurador');
          return;
        }

        if (!cancelled) {
          const p: ConfigurableProduct = {
            id: snap.id,
            name: data.name,
            description: data.description || '',
            images: data.images || [],
            slug: data.slug || '',
            basePrice: data.basePrice || 0,
            configurator,
          };
          setProduct(p);
          setSelections((prev: ConfiguratorSelections) => ({
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
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Derived state
  const steps = product?.configurator.steps ?? [];
  const currentStepId = steps[currentStep] as ConfiguratorStepId | undefined;
  const pricing = useMemo(
    () => (product ? calculatePricing(product, selections) : null),
    [product, selections]
  );

  const canGoNext = currentStepId
    ? isStepValid(currentStepId, product!, selections)
    : false;

  const isLastStep = currentStep === steps.length - 1;

  // Navigation
  const goNext = useCallback(() => {
    if (canGoNext && !isLastStep) setCurrentStep((s: number) => s + 1);
  }, [canGoNext, isLastStep]);

  const goBack = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s: number) => s - 1);
  }, [currentStep]);

  const goToStep = useCallback(
    (index: number) => {
      if (index < currentStep) setCurrentStep(index);
    },
    [currentStep]
  );

  // Selection handlers
  const setVariant = useCallback((id: string) => {
    setSelections((prev: ConfiguratorSelections) => ({ ...prev, variant: id }));
  }, []);

  const setSize = useCallback((size: string) => {
    setSelections((prev: ConfiguratorSelections) => ({ ...prev, size }));
  }, []);

  const setDesignMode = useCallback((mode: DesignMode) => {
    setSelections((prev: ConfiguratorSelections) => ({
      ...prev,
      designMode: mode,
      // Clear file when switching modes
      designFile: mode === 'ready' ? prev.designFile : undefined,
      referenceFiles: mode === 'need-design' ? prev.referenceFiles : undefined,
      designNotes: mode === 'need-design' ? prev.designNotes : undefined,
    }));
  }, []);

  const setDesignFile = useCallback((file: File | undefined) => {
    setSelections((prev: ConfiguratorSelections) => ({ ...prev, designFile: file }));
  }, []);

  const setReferenceFiles = useCallback((files: File[]) => {
    setSelections((prev: ConfiguratorSelections) => ({ ...prev, referenceFiles: files }));
  }, []);

  const setDesignNotes = useCallback((notes: string) => {
    setSelections((prev: ConfiguratorSelections) => ({ ...prev, designNotes: notes }));
  }, []);

  const setPlacement = useCallback((placement: string) => {
    setSelections((prev: ConfiguratorSelections) => ({ ...prev, placement, placementSize: undefined }));
  }, []);

  const setPlacementSize = useCallback((placementSize: string) => {
    setSelections((prev: ConfiguratorSelections) => ({ ...prev, placementSize }));
  }, []);

  const setQuantity = useCallback((quantity: number) => {
    setSelections((prev: ConfiguratorSelections) => ({ ...prev, quantity }));
  }, []);

  // Add to cart
  const handleAddToCart = useCallback(async () => {
    if (!product || !pricing) return;
    setIsAddingToCart(true);

    try {
      // Upload design file if present
      let uploadedDesignUrl: string | undefined;
      if (selections.designMode === 'ready' && selections.designFile) {
        const uid = getAuth().currentUser?.uid;
        const timestamp = Date.now();
        const fileName = `${timestamp}_${selections.designFile.name}`;

        // Authenticated users → their private folder; guests → public temp folder
        const path = uid
          ? `personalizaciones/${uid}/${product.slug || product.id}/${fileName}`
          : `configurator-uploads/${product.id}/${fileName}`;

        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, selections.designFile);
        uploadedDesignUrl = await getDownloadURL(fileRef);
      }

      // Build customization data for the cart
      const customization: Record<string, unknown> = {
        configuratorId: product.id,
      };

      if (selections.variant) {
        const opt = product.configurator.variant?.options.find((o) => o.id === selections.variant);
        customization.selectedVariant = selections.variant;
        customization.selectedVariantLabel = opt?.label;
      }
      if (selections.size) {
        customization.selectedSize = selections.size;
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
        if (selections.placementSize) {
          customization.placementSize = selections.placementSize;
        }
      }

      addToCart({
        id: product.id,
        name: product.name,
        price: pricing.total / selections.quantity, // price per unit including design amortization
        quantity: selections.quantity,
        image: product.images[0] || '',
        customization: customization as any,
      });

      setAddedToCart(true);
      logger.info('[Configurator] Added to cart', {
        productId: product.id,
        quantity: selections.quantity,
        total: pricing.total,
      });
    } catch (err) {
      logger.error('[Configurator] Error adding to cart', err);
      notify.error('Error al añadir al carrito. Inténtalo de nuevo.');
    } finally {
      setIsAddingToCart(false);
    }
  }, [product, pricing, selections]);

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
        <p className="text-gray-500 mb-6">No pudimos cargar este producto. Comprueba el enlace o vuelve a intentarlo.</p>
        <a href="/" className="text-indigo-600 font-medium hover:underline">
          Volver al inicio
        </a>
      </div>
    );
  }

  if (addedToCart) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Producto añadido al carrito</h2>
        <p className="text-gray-500 mb-8">
          {product.name} &times; {selections.quantity}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/cart"
            className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Ver carrito
          </a>
          <a
            href="/"
            className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Seguir comprando
          </a>
        </div>
      </div>
    );
  }

  // Get preview image — variant-specific if available
  const variantOption = selections.variant
    ? product.configurator.variant?.options.find((o) => o.id === selections.variant)
    : undefined;
  const previewImage = variantOption?.previewImage || product.images[0];

  return (
    <div className="max-w-5xl mx-auto px-4 py-2 sm:py-8">
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
        <StepProgress steps={steps} currentStep={currentStep} onStepClick={goToStep} />
      </div>

      {/* Content area */}
      <div className="grid lg:grid-cols-5 gap-8">
        {/* Left: step content */}
        <div className="lg:col-span-3 pb-[80px] sm:pb-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-7">
            {currentStepId === 'variant' && product.configurator.variant && (
              <StepVariant
                config={product.configurator.variant}
                selected={selections.variant}
                onSelect={setVariant}
              />
            )}

            {currentStepId === 'size' && product.configurator.size && (
              <StepSize
                config={product.configurator.size}
                selected={selections.size}
                onSelect={setSize}
              />
            )}

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
                onSelect={setPlacement}
                onSizeSelect={setPlacementSize}
              />
            )}

            {currentStepId === 'quantity' && (
              <StepQuantity
                config={product.configurator.quantity}
                quantity={selections.quantity}
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

          {/* Desktop navigation buttons — hidden on mobile, shown from sm up */}
          {currentStepId !== 'summary' && (
            <div className="hidden sm:flex justify-between mt-6">
              <button
                type="button"
                onClick={goBack}
                disabled={currentStep === 0}
                className="
                  flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium
                  text-gray-600 bg-white border border-gray-200 hover:bg-gray-50
                  disabled:opacity-0 disabled:pointer-events-none
                  transition-all
                "
              >
                <ArrowLeft className="w-4 h-4" />
                Anterior
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                className="
                  flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                  bg-indigo-600 text-white hover:bg-indigo-700
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors shadow-sm
                "
              >
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Mobile sticky bottom bar — visible only on mobile */}
          <div
            className="
              sm:hidden
              fixed bottom-0 left-0 right-0 z-30
              bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]
              px-4 py-3 flex items-center gap-3
            "
          >
            {currentStepId === 'summary' ? (
              /* Summary step: price + full-width add to cart */
              <div className="flex-1 flex items-center gap-3">
                {pricing && (
                  <div className="shrink-0">
                    <p className="text-base font-bold text-gray-900 leading-tight">
                      {pricing.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </p>
                    <p className="text-xs text-gray-400 leading-tight">total</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className="
                    flex-1 flex items-center justify-center gap-2
                    px-5 py-3 rounded-xl text-sm font-semibold
                    bg-indigo-600 text-white hover:bg-indigo-700
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-colors shadow-sm
                  "
                >
                  {isAddingToCart ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                  Añadir al carrito
                </button>
              </div>
            ) : (
              <>
                {/* Left: total price */}
                <div className="flex-1 min-w-0">
                  {pricing ? (
                    <>
                      <p className="text-base font-bold text-gray-900 leading-tight">
                        {pricing.total.toLocaleString('es-ES', {
                          style: 'currency',
                          currency: 'EUR',
                        })}
                      </p>
                      <p className="text-xs text-gray-400 leading-tight">total</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">Calculando…</p>
                  )}
                </div>

                {/* Right: back + next buttons */}
                <button
                  type="button"
                  onClick={goBack}
                  disabled={currentStep === 0}
                  className="
                    flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium
                    text-gray-600 bg-white border border-gray-200 hover:bg-gray-50
                    disabled:opacity-0 disabled:pointer-events-none
                    transition-all shrink-0
                  "
                >
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canGoNext}
                  className="
                    flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold
                    bg-indigo-600 text-white hover:bg-indigo-700
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-colors shadow-sm shrink-0
                  "
                >
                  Siguiente
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: sidebar — preview + live pricing (hidden on mobile, shown from lg up) */}
        <div className="hidden lg:block lg:col-span-2 space-y-6">
          {/* Product preview */}
          {previewImage && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <img
                src={previewImage}
                alt={product.name}
                className="w-full aspect-square object-contain rounded-xl"
              />
            </div>
          )}

          {/* Live pricing (hidden on summary as it's shown inline) */}
          {pricing && currentStepId !== 'summary' && (
            <PriceDisplay pricing={pricing} quantity={selections.quantity} />
          )}
        </div>
      </div>
    </div>
  );
}
