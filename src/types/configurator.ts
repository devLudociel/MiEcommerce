// src/types/configurator.ts
/**
 * Product Configurator — schema y tipos para el configurador paso a paso.
 * Arquitectura Shopify-style: N grupos de opciones con pricing matricial.
 */

// ============================================================================
// STEPS
// ============================================================================

/**
 * IDs de paso. Los pasos de opciones son dinámicos: 'option:<groupId>'
 * Ej: 'option:material', 'option:color', 'option:shape'
 */
export type ConfiguratorStepId =
  | `option:${string}`
  | 'design'
  | 'placement'
  | 'quantity'
  | 'summary';

// ============================================================================
// OPTION GROUPS (reemplaza VariantConfig + SizeConfig)
// ============================================================================

export type OptionDisplayType = 'color' | 'image' | 'text';

export interface OptionValue {
  id: string;
  label: string;
  /** hex si type="color" | URL si type="image" | texto descriptivo si type="text" */
  value: string;
  /** Imagen del producto cuando esta opción está seleccionada */
  previewImage?: string;
  /** Unidades por hoja — sólo para products sheetBased */
  unitsPerSheet?: number;
}

export interface OptionGroup {
  id: string;           // ej: 'material', 'color', 'shape', 'size'
  label: string;        // ej: 'Material', 'Color', 'Forma', 'Talla'
  type: OptionDisplayType;
  values: OptionValue[];
}

// ============================================================================
// DESIGN CONFIG
// ============================================================================

export interface DesignConfig {
  formats: string[];
  minDpi: number;
  requireTransparentBg: boolean;
  designServicePrice: number;
  designServiceLabel?: string;
}

// ============================================================================
// PLACEMENT CONFIG
// ============================================================================

export interface PlacementOption {
  id: string;
  label: string;
  icon?: string;
}

export interface PlacementConfig {
  label: string;
  options: PlacementOption[];
  allowSize: boolean;
  sizeOptions: string[];
}

// ============================================================================
// QUANTITY / PRICING TIERS
// ============================================================================

export interface PricingTier {
  from: number;
  price: number;
  label?: string;
  recommended?: boolean;
}

export interface QuantityConfig {
  min: number;
  tiers: PricingTier[];
  /**
   * Si true, los tramos se miden en HOJAS (from = hojas, price = precio total
   * por esas hojas). Las unidades se calculan con OptionValue.unitsPerSheet
   * del valor seleccionado en el grupo de opciones correspondiente.
   */
  sheetBased?: boolean;
  /**
   * Pricing por combinación de valores seleccionados.
   * Clave = IDs de valores unidos con "+" en el orden de los OptionGroups.
   *
   * Ejemplos de claves:
   *   "vinilo-mate"                   → sólo por material (independiente de forma)
   *   "vinilo-mate+circular-3-8cm"    → combinación exacta material + forma
   *
   * Prioridad de búsqueda:
   *   1. Combinación completa (todos los grupos seleccionados)
   *   2. Cada valor individual, en orden de grupos (primero tiene prioridad)
   *   3. Tramos por defecto (tiers)
   */
  combinationPricing?: Record<string, PricingTier[]>;
}

// ============================================================================
// CONFIGURATOR SCHEMA
// ============================================================================

export interface ProductConfigurator {
  steps: ConfiguratorStepId[];
  /** Grupos de opciones — cada uno genera un paso 'option:<id>' */
  options?: OptionGroup[];
  design: DesignConfig;
  placement?: PlacementConfig;
  quantity: QuantityConfig;
}

// ============================================================================
// ESTADO INTERNO DEL CONFIGURADOR (React)
// ============================================================================

export type DesignMode = 'ready' | 'need-design' | null;

export interface ConfiguratorSelections {
  /** Valor seleccionado por grupo: { groupId: valueId } */
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
}

export interface ConfiguratorState {
  currentStep: number;
  productId: string;
  selections: ConfiguratorSelections;
  pricing: ConfiguratorPricing;
}

// ============================================================================
// PRODUCTO CON CONFIGURADOR
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
