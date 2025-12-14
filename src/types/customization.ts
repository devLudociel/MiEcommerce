// src/types/customization.ts

/**
 * Sistema de Personalización Dinámico
 *
 * Permite crear campos de personalización flexibles para cada categoría de producto
 * sin necesidad de tocar código.
 */

import type { Timestamp, FieldValue } from 'firebase/firestore';

/** Firebase timestamp type - can be Timestamp object or FieldValue during writes */
export type FirebaseTimestamp = Timestamp | FieldValue;

/** Template field value - can be string, number, boolean, array, or object */
export type TemplateFieldValue = string | number | boolean | string[] | Record<string, unknown>;

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
  previewImage?: string;  // Imagen preview opcional (ej: camiseta de ese color) - DEPRECATED, usar previewImages
  previewImages?: {
    front?: string;  // Imagen frontal del producto en este color
    back?: string;   // Imagen trasera del producto en este color
  };
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
  imageUrl?: string;       // Thumbnail pequeño en el selector de cards
  previewImage?: string;   // Imagen grande para el preview del producto (como color en camisetas)
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

  // Multiplicador de cantidad - si es true, el valor de este campo multiplica el precio base
  isQuantityMultiplier?: boolean;
}

// ============================================================================
// SCHEMA DE PERSONALIZACIÓN DE CATEGORÍA
// ============================================================================

export interface CustomizationSchema {
  fields: CustomizationField[];
  displayComponent?: string;     // Componente a usar (default: 'DynamicCustomizer')
  previewImages?: {
    default?: string;
    front?: string;   // Imagen frontal del producto (para textiles)
    back?: string;    // Imagen trasera del producto (para textiles)
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
  createdAt?: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
}

// ============================================================================
// VALOR DE CAMPO PERSONALIZADO (lo que guarda el usuario)
// ============================================================================

export interface CustomizationValue {
  fieldId: string;
  fieldLabel?: string;  // Etiqueta legible del campo (ej: "Color", "Talla")
  value: string | string[] | number | boolean;
  displayValue?: string;  // Valor legible para mostrar (ej: "Rojo" en vez de "red")

  // Para campos de imagen
  imageUrl?: string;
  imagePath?: string;
  imageTransform?: ImageTransform;  // Transformación de la imagen (posición, escala, rotación)

  // Para campos con precio extra
  priceModifier?: number;
}

// ============================================================================
// TRANSFORMACIÓN DE IMAGEN (para editor de posición)
// ============================================================================

export interface ImageTransform {
  x: number;        // Posición X en % (0-100)
  y: number;        // Posición Y en % (0-100)
  scale: number;    // Escala (0.1 a 3.0)
  rotation: number; // Rotación en grados (0-360)
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
  previewData?: Record<string, unknown>;  // Datos específicos del customizer (posición de imagen, etc.)
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
  quantity: number;              // Cantidad seleccionada (multiplicador)
  unitPrice: number;             // Precio por unidad (basePrice + customizationPrice por unidad)
  breakdown: Array<{
    fieldLabel: string;
    price: number;
  }>;
}

// ============================================================================
// PLANTILLAS PREDEFINIDAS (Fase 3 - Growth)
// ============================================================================

export interface DesignTemplate {
  id: string;
  name: string;                    // "Cumpleaños Elegante"
  description: string;
  category: string;                // ID de categoría (ej: "camisetas")
  subcategory: string;             // "Cumpleaños", "Deportes", etc.
  tags: string[];                  // ["cumpleaños", "elegante", "dorado"]
  thumbnail: string;               // URL del preview
  isPremium: boolean;
  popularity: number;              // Contador de usos

  // Datos del diseño
  template: {
    fields: Array<{
      fieldId: string;
      value: TemplateFieldValue;
      displayValue?: string;
      imageUrl?: string;
      imageTransform?: ImageTransform;
    }>;
    previewImage?: string;
  };

  // Metadata
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  createdBy?: string;              // userId o 'system'
}

export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
}

// ============================================================================
// CLIPARTS Y SISTEMA DE CAPAS (Fase 3 - Growth)
// ============================================================================

export interface Clipart {
  id: string;
  name: string;                    // "Corazón rojo"
  category: string;                // "Celebraciones"
  subcategory: string;             // "Amor"
  tags: string[];                  // ["corazón", "amor", "rojo"]
  imageUrl: string;                // URL en Firebase Storage
  thumbnailUrl: string;            // Thumbnail optimizado
  isPremium: boolean;
  usageCount: number;
  format: 'png' | 'svg';
  hasTransparency: boolean;
  dimensions: {
    width: number;
    height: number;
  };
  colors: string[];                // Colores predominantes
  createdAt: FirebaseTimestamp;
  createdBy: string;               // 'system' o userId
}

export interface DesignLayer {
  id: string;
  type: 'uploaded_image' | 'clipart' | 'text';
  source?: string;                 // URL si es imagen/clipart
  text?: string;                   // Si es capa de texto
  transform: ImageTransform;
  zIndex: number;                  // Orden de capas
  locked: boolean;                 // Evitar edición accidental
  visible: boolean;
  opacity: number;                 // 0-100
}

// ============================================================================
// DISEÑOS GUARDADOS (Fase 3 - Growth)
// ============================================================================

export interface SavedDesign {
  id: string;
  userId: string;
  name: string;                    // "Mi diseño de cumpleaños"
  thumbnail: string;               // Preview del diseño
  originalProductId: string;
  originalCategory: string;
  designData: ProductCustomization; // Configuración completa
  layers?: DesignLayer[];          // Si usa sistema de capas
  usageCount: number;              // Veces reutilizado
  products: string[];              // IDs de productos donde se usó
  tags?: string[];
  isFavorite: boolean;
  createdAt: FirebaseTimestamp;
  lastUsedAt: FirebaseTimestamp;
}

// ============================================================================
// DISEÑOS COMPARTIDOS (Fase 3 - Growth)
// ============================================================================

export interface SharedDesign {
  id: string;                      // Short ID (ej: "abc123")
  userId: string;
  productId: string;
  productName: string;
  designData: ProductCustomization;
  imageUrl: string;                // Snapshot del diseño
  shareCount: number;
  viewCount: number;
  clickCount: number;
  conversionCount: number;
  platform: {
    whatsapp: number;
    facebook: number;
    instagram: number;
    twitter: number;
    pinterest: number;
    email: number;
    link: number;
  };
  createdAt: FirebaseTimestamp;
  expiresAt: FirebaseTimestamp;    // Auto-delete después de 90 días
}
