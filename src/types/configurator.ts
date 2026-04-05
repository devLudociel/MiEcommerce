// src/types/configurator.ts
/**
 * Product Configurator types
 *
 * Este archivo define:
 * - El modelo legacy (V1) usado por el editor/admin actual
 * - El modelo nuevo (V2) basado en attributes + pricing
 * - Un modelo de compatibilidad para el frontend durante la migracion
 */

// ============================================================================
// STEPS
// ============================================================================

export type LegacyConfiguratorStepId =
  | 'variant'
  | 'size'
  | 'design'
  | 'placement'
  | 'quantity'
  | 'summary';

export type OptionStepId = `option:${string}`;
export type AttributeStepId = `attribute:${string}`;

export type ConfiguratorStepId = LegacyConfiguratorStepId | OptionStepId | AttributeStepId;

export type ConfiguratorV2StepId = AttributeStepId | 'design' | 'placement' | 'quantity' | 'summary';

// ============================================================================
// LEGACY V1 OPTION GROUPS
// ============================================================================

export type OptionDisplayType = 'color' | 'image' | 'text';

export interface OptionValue {
  id: string;
  label: string;
  /** hex si type="color" | URL si type="image" | texto descriptivo si type="text" */
  value: string;
  /** Imagen del producto cuando esta opcion esta seleccionada */
  previewImage?: string;
  /** Unidades por hoja (solo para sheetBased) */
  unitsPerSheet?: number;
}

export interface OptionGroup {
  id: string;
  label: string;
  type: OptionDisplayType;
  values: OptionValue[];
}

export type VariantDisplayType = OptionDisplayType;

export interface VariantOption {
  id: string;
  label: string;
  value: string;
  previewImage?: string;
  unitsPerSheet?: number;
}

export interface VariantConfig {
  label: string;
  type: VariantDisplayType;
  options: VariantOption[];
}

export interface SizeConfig {
  label: string;
  options: string[];
  unitsPerSheet?: Record<string, number>;
}

// ============================================================================
// SHARED DESIGN / PLACEMENT
// ============================================================================

export interface DesignConfig {
  formats: string[];
  minDpi: number;
  requireTransparentBg: boolean;
  designServicePrice: number;
  designServiceLabel?: string;
}

export interface PlacementOption {
  id: string;
  label: string;
  icon?: string;
  /** Recargo DTF por zona (ej. pecho_pequeno = 4, espalda = 8) */
  surcharge?: number;
  /** Recargo vinilo por color por zona (ej. 2 => 2€/color) */
  vinylPerColorSurcharge?: number;
  /** Recargo fijo bordado por zona (ej. 12) */
  embroideryFixedSurcharge?: number;
  /** Permitir esta zona para bordado */
  embroideryAllowed?: boolean;
}

export interface PlacementConfig {
  label: string;
  options: PlacementOption[];
  allowSize: boolean;
  sizeOptions: string[];
}

// ============================================================================
// PRICING TIERS (shared)
// ============================================================================

export interface PricingTier {
  from: number;
  price: number;
  label?: string;
  recommended?: boolean;
}

export interface QuantityConfig {
  min: number;
  step?: number;
  tiers: PricingTier[];
  sheetBased?: boolean;

  /** Legacy pricing por variante */
  variantPricing?: Record<string, PricingTier[]>;
  /** Legacy pricing por talla/tamano */
  sizePricing?: Record<string, PricingTier[]>;

  /**
   * Pricing por combinacion de valores seleccionados.
   * Clave = IDs unidos con "+" siguiendo el orden de grupos de opciones.
   */
  combinationPricing?: Record<string, PricingTier[]>;
}

// ============================================================================
// NEW V2 ATTRIBUTES + PRICING
// ============================================================================

export type ProductConfiguratorAttributeType = 'select' | 'text' | 'color' | 'image' | 'freetext';

export interface ProductConfiguratorAttributeOption {
  id: string;
  label: string;
  /**
   * Valor visual opcional:
   * - color -> hex
   * - image -> URL
   * - text/select -> opcional, normalmente igual a label
   */
  value?: string;
  previewImage?: string;
  unitsPerSheet?: number;
  /** Recargo adicional por seleccionar esta opción */
  surcharge?: number;
  /** per_unit = surcharge × quantity, fixed = surcharge una sola vez */
  surchargeType?: 'per_unit' | 'fixed';
}

export type ProductConfiguratorConditionMap = Record<string, string[]>;

export interface ProductConfiguratorDefaultWhenRule {
  when: ProductConfiguratorConditionMap;
  value: string;
}

export interface ProductConfiguratorAttribute {
  id: string;
  label: string;
  type: ProductConfiguratorAttributeType;
  required?: boolean;
  options: ProductConfiguratorAttributeOption[];
  /** Condicion de visibilidad: atributo -> opciones permitidas */
  visibleWhen?: ProductConfiguratorConditionMap;
  /** Condicion de habilitacion: atributo -> opciones permitidas */
  enabledWhen?: ProductConfiguratorConditionMap;
  /** Reglas de valor por defecto condicionado */
  defaultWhen?: ProductConfiguratorDefaultWhenRule[];
  /** Estrategia opcional para autoseleccion por defecto */
  defaultOptionResolver?: string;
  /** Placeholder para atributos de tipo freetext */
  placeholder?: string;
}

export interface ProductConfiguratorPricingQuantityInput {
  min: number;
  step: number;
  label?: string;
  /** Extension para compatibilidad con productos por hoja */
  sheetBased?: boolean;
}

export interface ProductConfiguratorPricingRule {
  match: Record<string, string>;
  tiers: PricingTier[];
}

export interface ProductConfiguratorPricingSimple {
  mode: 'simple';
  quantityInput: ProductConfiguratorPricingQuantityInput;
  tiers: PricingTier[];
}

export interface ProductConfiguratorPricingMatrix {
  mode: 'matrix';
  quantityInput: ProductConfiguratorPricingQuantityInput;
  rules: ProductConfiguratorPricingRule[];
  /** Recargo fijo opcional para grabado (se suma una sola vez al total) */
  engravingSurcharge?: number;
}

export interface ProductConfiguratorSheetPricingRule {
  match: Record<string, string>;
  unitsPerSheet: number;
  sheetPricingTiers: PricingTier[];
}

export interface ProductConfiguratorPricingSheetMatrix {
  mode: 'sheet-matrix';
  quantityInput: ProductConfiguratorPricingQuantityInput;
  rules: ProductConfiguratorSheetPricingRule[];
}

export type ProductConfiguratorPricing =
  | ProductConfiguratorPricingSimple
  | ProductConfiguratorPricingMatrix
  | ProductConfiguratorPricingSheetMatrix;

export interface ProductConfiguratorImportMeta {
  legacy?: boolean;
  source?: 'json' | 'csv' | 'excel' | 'manual' | string;
  migratedAt?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface ConfiguratorV1 {
  version?: 1;
  steps: ConfiguratorStepId[];
  variant?: VariantConfig;
  size?: SizeConfig;
  options?: OptionGroup[];
  design: DesignConfig;
  placement?: PlacementConfig;
  quantity: QuantityConfig;
  importMeta?: ProductConfiguratorImportMeta;
  legacySnapshot?: unknown;
}

export interface ConfiguratorV2 {
  version: 2;
  steps: ConfiguratorV2StepId[];
  attributes: ProductConfiguratorAttribute[];
  pricing: ProductConfiguratorPricing;
  design: DesignConfig;
  placement?: PlacementConfig;
  importMeta?: ProductConfiguratorImportMeta;
  legacySnapshot?: unknown;
}

/**
 * Forma de compatibilidad para el frontend actual.
 * Mantiene quantity/options/variant/size y expone ademas attributes+pricing (V2).
 */
export interface ProductConfigurator {
  version?: 1 | 2;
  steps: ConfiguratorStepId[];

  // UI legacy/actual
  options?: OptionGroup[];
  variant?: VariantConfig;
  size?: SizeConfig;
  design: DesignConfig;
  placement?: PlacementConfig;
  quantity: QuantityConfig;

  // Nueva fuente de verdad
  attributes?: ProductConfiguratorAttribute[];
  pricing?: ProductConfiguratorPricing;
  importMeta?: ProductConfiguratorImportMeta;
  legacySnapshot?: unknown;
}

// ============================================================================
// PRICING INPUT/OUTPUT TYPES
// ============================================================================

export type ProductConfiguratorSelection = Record<string, string>;

export type ProductConfiguratorPriceErrorCode =
  | 'MISSING_ATTRIBUTE'
  | 'INVALID_QUANTITY'
  | 'INVALID_SELECTION'
  | 'NO_TIERS_DEFINED'
  | 'NO_MATCHING_RULE';

export interface ProductConfiguratorPriceError {
  code: ProductConfiguratorPriceErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface ProductConfiguratorPriceResult {
  ok: boolean;
  pricingMode?: ProductConfiguratorPricing['mode'];
  quantity?: number;
  unitPrice: number;
  totalPrice?: number;
  effectiveUnitPrice?: number;
  unitsPerSheet?: number;
  sheetsNeeded?: number;
  matchedRule: ProductConfiguratorPricingRule | ProductConfiguratorSheetPricingRule | null;
  appliedTier: PricingTier | null;
  matchedTier?: PricingTier | null;
  error: ProductConfiguratorPriceError | null;
}

// ============================================================================
// FRONTEND INTERNAL STATE
// ============================================================================

export type DesignMode = 'ready' | 'need-design' | null;

export interface ConfiguratorSelections {
  options: Record<string, string>;
  designMode: DesignMode;
  designFile?: File;
  referenceFiles?: File[];
  designNotes?: string;
  placement?: string;
  placementSize?: string;
  quantity: number;
}

export interface ConfiguratorPricing {
  unitPrice: number;
  designPrice: number;
  subtotal: number;
  total: number;
  /** Subtotal del producto base (sin grabado fijo ni servicio de diseño) */
  productBaseSubtotal?: number;
  /** Recargo fijo de grabado aplicado al total */
  engravingSurcharge?: number;
  /** Pricing especial para banderines por texto */
  letterCount?: number;
  /** Precio por letra para banderines de texto */
  letterUnitPrice?: number;
  /** Cantidad de banderines tematicos de regalo */
  giftImagePennants?: number;
  /** Precio base de la prenda (del pricing engine, sin recargo de estampado) */
  basePrice?: number;
  /** Recargo por estampado calculado (DTF/vinilo/bordado) */
  printSurcharge?: number;
  /** Etiqueta descriptiva del recargo (ej. "Pecho pequeño", "Vinilo textil (3 colores)") */
  printSurchargeLabel?: string;
  /** Descuento por cantidad aplicado (porcentaje, ej. 10 = 10%) */
  quantityDiscount?: number;
  /** Precio unitario sin descuento por cantidad */
  unitPriceBeforeDiscount?: number;
  /** Recargos de opciones de atributos (surcharge en attribute options) */
  attributeSurcharges?: Array<{
    label: string;
    amount: number;
    detail: string;
  }>;
}

export interface ConfiguratorState {
  currentStep: number;
  productId: string;
  selections: ConfiguratorSelections;
  pricing: ConfiguratorPricing;
}

// ============================================================================
// PRODUCT
// ============================================================================

export interface ConfigurableProduct {
  id: string;
  name: string;
  description: string;
  images: string[];
  slug: string;
  basePrice: number;
  configurator: ProductConfigurator;
}
