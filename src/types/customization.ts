// src/types/customization.ts

/**
 * Sistema de Personalización Dinámico
 *
 * Permite crear campos de personalización flexibles para cada categoría de producto
 * sin necesidad de tocar código.
 */

// ============================================================================
// TIPOS DE CAMPOS DISPONIBLES
// ============================================================================

export type FieldType =
  | 'color_selector'      // Selector de colores
  | 'size_selector'       // Selector de tallas (S, M, L, XL, etc.)
  | 'dropdown'            // Lista desplegable
  | 'text_input'          // Campo de texto
  | 'image_upload'        // Subir imagen
  | 'card_selector'       // Selector visual con cards
  | 'checkbox'            // Checkbox simple
  | 'radio_group'         // Grupo de radio buttons
  | 'number_input'        // Campo numérico
  | 'dimensions_input';   // Campo de dimensiones (ancho x alto)

// ============================================================================
// CONFIGURACIONES ESPECÍFICAS POR TIPO DE CAMPO
// ============================================================================

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  previewImage?: string;  // Imagen preview opcional (ej: camiseta de ese color)
}

export interface ColorSelectorConfig {
  displayStyle: 'color_blocks' | 'color_blocks_with_preview' | 'dropdown';
  availableColors: ColorOption[];
  multipleSelection?: boolean;
}

export interface SizeSelectorConfig {
  displayStyle: 'buttons' | 'dropdown';
  availableSizes: string[];  // ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  showSizeGuide?: boolean;
  sizeGuideUrl?: string;
}

export interface DropdownOption {
  value: string;
  label: string;
  priceModifier?: number;
  description?: string;
}

export interface DropdownConfig {
  options: DropdownOption[];
  placeholder?: string;
}

export interface TextInputConfig {
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  showCharCounter?: boolean;
  helpText?: string;
  validationPattern?: string;  // Regex pattern
}

export interface ImageUploadConfig {
  maxSizeMB: number;
  allowedFormats: string[];  // ['jpg', 'png', 'svg']
  showPreview?: boolean;
  showPositionControls?: boolean;  // Para customizers tipo camiseta
  helpText?: string;
}

export interface CardOption {
  value: string;
  label: string;
  subtitle?: string;
  imageUrl?: string;
  icon?: string;
  features?: string[];
  badge?: string;  // 'Más vendido', 'Recomendado', etc.
  priceModifier?: number;
  description?: string;
}

export interface CardSelectorConfig {
  displayStyle: 'visual_cards' | 'simple_cards';
  layout?: 'horizontal' | 'vertical' | 'grid';
  options: CardOption[];
}

export interface CheckboxConfig {
  description?: string;
  icon?: string;
  helpText?: string;
}

export interface RadioGroupConfig {
  options: DropdownOption[];
  layout?: 'vertical' | 'horizontal';
}

export interface NumberInputConfig {
  min?: number;
  max?: number;
  step?: number;
  unit?: string;  // 'cm', 'kg', 'unidades', etc.
  helpText?: string;
}

export interface DimensionsInputConfig {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  unit: string;  // 'cm', 'm', 'px', etc.
  allowAspectRatioLock?: boolean;
}

// Union type para todas las configs
export type FieldConfig =
  | ColorSelectorConfig
  | SizeSelectorConfig
  | DropdownConfig
  | TextInputConfig
  | ImageUploadConfig
  | CardSelectorConfig
  | CheckboxConfig
  | RadioGroupConfig
  | NumberInputConfig
  | DimensionsInputConfig;

// ============================================================================
// CAMPO DE PERSONALIZACIÓN
// ============================================================================

export interface CustomizationField {
  id: string;                    // ID único del campo
  fieldType: FieldType;          // Tipo de campo
  label: string;                 // Label visible para el usuario
  required: boolean;             // ¿Es obligatorio?
  config: FieldConfig;           // Configuración específica del tipo
  priceModifier: number;         // Precio extra por este campo (0 si no aplica)
  helpText?: string;             // Texto de ayuda opcional

  // Condiciones opcionales
  condition?: {
    dependsOn: string;           // ID del campo del que depende
    showWhen: string | string[]; // Valor(es) que hacen visible este campo
  };

  // Orden de visualización
  order?: number;
}

// ============================================================================
// SCHEMA DE PERSONALIZACIÓN DE CATEGORÍA
// ============================================================================

export interface CustomizationSchema {
  fields: CustomizationField[];
  displayComponent?: string;     // Componente a usar (default: 'DynamicCustomizer')
  previewImages?: {
    default?: string;
    byVariant?: Record<string, string>;  // Imágenes por variante
  };
}

// ============================================================================
// CATEGORÍA CON CUSTOMIZACIÓN
// ============================================================================

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  active: boolean;

  // 🎯 Schema de personalización
  customizationSchema?: CustomizationSchema;

  // Metadata
  createdAt?: any;
  updatedAt?: any;
}

// ============================================================================
// VALOR DE CAMPO PERSONALIZADO (lo que guarda el usuario)
// ============================================================================

export interface CustomizationValue {
  fieldId: string;
  value: string | string[] | number | boolean;
  displayValue?: string;  // Valor legible para mostrar (ej: "Rojo" en vez de "red")

  // Para campos de imagen
  imageUrl?: string;
  imagePath?: string;

  // Para campos con precio extra
  priceModifier?: number;
}

// ============================================================================
// CONFIGURACIÓN COMPLETA DEL USUARIO (guardada en el pedido)
// ============================================================================

export interface ProductCustomization {
  categoryId: string;
  categoryName: string;
  values: CustomizationValue[];
  totalPriceModifier: number;  // Suma de todos los priceModifiers

  // Preview/snapshot
  previewImage?: string;
  previewData?: any;  // Datos específicos del customizer (posición de imagen, etc.)
}

// ============================================================================
// UTILIDADES
// ============================================================================

export interface FieldValidationResult {
  valid: boolean;
  error?: string;
}

export interface CustomizationPricing {
  basePrice: number;
  customizationPrice: number;
  totalPrice: number;
  breakdown: Array<{
    fieldLabel: string;
    price: number;
  }>;
}
