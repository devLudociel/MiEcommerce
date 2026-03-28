// src/types/configurator.ts
/**
 * Product Configurator — schema y tipos para el configurador paso a paso.
 */

// ============================================================================
// STEPS
// ============================================================================

export type ConfiguratorStepId =
  | 'variant'
  | 'size'
  | 'design'
  | 'placement'
  | 'quantity'
  | 'summary';

// ============================================================================
// VARIANT CONFIG
// ============================================================================

export type VariantDisplayType = 'color' | 'image' | 'text';

export interface VariantOption {
  id: string;
  label: string;
  /** hex si type="color", url si type="image", texto descriptivo si type="text" */
  value: string;
  /** Imagen de preview del producto en esta variante */
  previewImage?: string;
}

export interface VariantConfig {
  label: string;
  type: VariantDisplayType;
  options: VariantOption[];
}

// ============================================================================
// SIZE CONFIG
// ============================================================================

export interface SizeConfig {
  label: string;
  options: string[];
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
// PLACEMENT CONFIG (posición del diseño en textiles)
// ============================================================================

export interface PlacementOption {
  id: string;
  label: string;
  /** Emoji o icono corto que representa la posición */
  icon?: string;
}

export interface PlacementConfig {
  label: string;
  options: PlacementOption[];
  /** Si true, el cliente también elige tamaño del estampado */
  allowSize: boolean;
  sizeOptions: string[];
}

// ============================================================================
// QUANTITY / PRICING TIERS
// ============================================================================

export interface PricingTier {
  from: number;
  price: number;
  /** Etiqueta visible (ej: "Inicio", "Popular", "Mayorista") */
  label?: string;
  /** Marca este tramo como recomendado */
  recommended?: boolean;
}

export interface QuantityConfig {
  min: number;
  tiers: PricingTier[];
  /** Precios distintos por opción de variante: clave = VariantOption.id */
  variantPricing?: Record<string, PricingTier[]>;
}

// ============================================================================
// CONFIGURATOR SCHEMA
// ============================================================================

export interface ProductConfigurator {
  steps: ConfiguratorStepId[];
  variant?: VariantConfig;
  size?: SizeConfig;
  design: DesignConfig;
  placement?: PlacementConfig;
  quantity: QuantityConfig;
}

// ============================================================================
// ESTADO INTERNO DEL CONFIGURADOR (React)
// ============================================================================

export type DesignMode = 'ready' | 'need-design' | null;

export interface ConfiguratorSelections {
  variant?: string;
  size?: string;
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
