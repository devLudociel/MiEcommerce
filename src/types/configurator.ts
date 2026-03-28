// src/types/configurator.ts
/**
 * Product Configurator — schema y tipos para el configurador paso a paso.
 * Cada producto puede tener un campo `configurator` en Firestore que
 * define qué pasos aplican y cómo se calculan los precios.
 */

// ============================================================================
// STEPS
// ============================================================================

export type ConfiguratorStepId =
  | 'variant'
  | 'size'
  | 'design'
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
  /** Imagen de preview del producto en esta variante (opcional) */
  previewImage?: string;
}

export interface VariantConfig {
  /** Label visible: "Color", "Tipo de taza", "Modelo de caja" */
  label: string;
  type: VariantDisplayType;
  options: VariantOption[];
}

// ============================================================================
// SIZE CONFIG
// ============================================================================

export interface SizeConfig {
  /** Label visible: "Talla", "Tamaño" */
  label: string;
  options: string[];
}

// ============================================================================
// DESIGN CONFIG
// ============================================================================

export interface DesignConfig {
  /** Formatos aceptados para subida de archivo */
  formats: string[];
  /** DPI mínimo recomendado */
  minDpi: number;
  /** Si el diseño necesita fondo transparente */
  requireTransparentBg: boolean;
  /** Precio del servicio de diseño (0 si no aplica) */
  designServicePrice: number;
  /** Label del servicio, p.ej. "Servicio de diseño" */
  designServiceLabel?: string;
}

// ============================================================================
// QUANTITY / PRICING TIERS
// ============================================================================

export interface PricingTier {
  /** Cantidad mínima para este tramo */
  from: number;
  /** Precio unitario en este tramo */
  price: number;
}

export interface QuantityConfig {
  /** Cantidad mínima de pedido */
  min: number;
  /** Tramos de precio */
  tiers: PricingTier[];
}

// ============================================================================
// CONFIGURATOR SCHEMA (campo `configurator` en Firestore por producto)
// ============================================================================

export interface ProductConfigurator {
  /** Steps activos para este producto, en orden */
  steps: ConfiguratorStepId[];
  variant?: VariantConfig;
  size?: SizeConfig;
  design: DesignConfig;
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
// PRODUCTO CON CONFIGURADOR (lo que viene de Firebase)
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
