// src/lib/customization/schema-templates.ts
/**
 * Plantillas de schemas de personalización predefinidas
 * Para usar en el panel de admin cuando creas nuevos productos
 */

import type { CustomizationSchema } from '../../types/customization';

// ============================================================================
// PACKAGING - CAJAS PERSONALIZADAS
// ============================================================================

export const SCHEMA_CAJAS_PERSONALIZADAS: CustomizationSchema = {
  fields: [
    {
      id: 'box_type',
      fieldType: 'card_selector',
      label: 'Tipo de Caja',
      required: true,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          {
            value: 'kraft',
            label: 'Caja Kraft',
            subtitle: 'Ecológica y natural',
            icon: '📦',
            badge: 'Más vendida',
            priceModifier: 0,
          },
          {
            value: 'cardboard_white',
            label: 'Cartón Blanco',
            subtitle: 'Acabado premium',
            icon: '⬜',
            priceModifier: 0.5,
          },
          {
            value: 'rigid',
            label: 'Caja Rígida',
            subtitle: 'Máxima calidad',
            icon: '💎',
            priceModifier: 2.5,
          },
        ],
      },
      priceModifier: 0,
      order: 1,
    },
    {
      id: 'dimensions',
      fieldType: 'dropdown',
      label: 'Tamaño',
      required: true,
      config: {
        placeholder: 'Selecciona un tamaño',
        options: [
          { value: 'small', label: 'Pequeña (10x10x10 cm)', priceModifier: 0 },
          { value: 'medium', label: 'Mediana (20x20x10 cm)', priceModifier: 0.5 },
          { value: 'large', label: 'Grande (30x30x15 cm)', priceModifier: 1.2 },
          {
            value: 'custom',
            label: 'Medidas personalizadas',
            priceModifier: 2,
            description: 'Te contactaremos para confirmar las medidas',
          },
        ],
      },
      priceModifier: 0,
      order: 2,
    },
    {
      id: 'printing',
      fieldType: 'card_selector',
      label: 'Impresión',
      required: true,
      config: {
        displayStyle: 'simple_cards',
        layout: 'vertical',
        options: [
          {
            value: 'no_print',
            label: 'Sin impresión',
            subtitle: 'Caja natural',
            priceModifier: 0,
          },
          {
            value: 'one_color',
            label: 'Un color',
            subtitle: 'Logo o texto simple',
            priceModifier: 1,
          },
          {
            value: 'full_color',
            label: 'Full color',
            subtitle: 'Impresión digital completa',
            icon: '🌈',
            priceModifier: 2.5,
            badge: 'Recomendado',
          },
        ],
      },
      priceModifier: 0,
      order: 3,
    },
    {
      id: 'design_upload',
      fieldType: 'image_upload',
      label: 'Sube tu diseño',
      required: false,
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'png', 'pdf', 'ai'],
        showPreview: true,
        helpText: 'Formatos aceptados: JPG, PNG, PDF, AI. Máximo 10MB',
      },
      priceModifier: 0,
      order: 4,
      condition: {
        dependsOn: 'printing',
        showWhen: ['one_color', 'full_color'],
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      isQuantityMultiplier: true,
      config: {
        placeholder: 'Selecciona cantidad',
        options: [
          {
            value: '50',
            label: '50 unidades',
            unitPriceOverride: 2.5,
            description: '€2.50/unidad',
          },
          {
            value: '100',
            label: '100 unidades',
            unitPriceOverride: 2.0,
            description: '€2.00/unidad',
          },
          {
            value: '250',
            label: '250 unidades',
            unitPriceOverride: 1.5,
            description: '€1.50/unidad',
          },
          {
            value: '500',
            label: '500 unidades',
            unitPriceOverride: 1.2,
            description: '€1.20/unidad',
          },
          {
            value: '1000',
            label: '1000+ unidades',
            unitPriceOverride: 1.0,
            description: '€1.00/unidad',
          },
        ],
      },
      priceModifier: 0,
      order: 5,
    },
    {
      id: 'notes',
      fieldType: 'text_input',
      label: 'Instrucciones especiales',
      required: false,
      config: {
        placeholder: 'Cualquier detalle adicional sobre tu pedido...',
        maxLength: 500,
        showCharCounter: true,
        helpText: 'Indícanos si necesitas algo específico',
      },
      priceModifier: 0,
      order: 6,
    },
  ],
  displayComponent: 'PackagingCustomizer',
};

// ============================================================================
// PACKAGING - BOLSAS DE PAPEL
// ============================================================================

export const SCHEMA_BOLSAS_PAPEL: CustomizationSchema = {
  fields: [
    {
      id: 'bag_style',
      fieldType: 'card_selector',
      label: 'Estilo de Bolsa',
      required: true,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          {
            value: 'kraft_flat',
            label: 'Kraft Plana',
            subtitle: 'Sin asa',
            icon: '📄',
            priceModifier: 0,
          },
          {
            value: 'kraft_handle',
            label: 'Kraft con Asa',
            subtitle: 'Asa rizada o plana',
            icon: '🛍️',
            priceModifier: 0.3,
            badge: 'Popular',
          },
          {
            value: 'white_glossy',
            label: 'Blanca Estucada',
            subtitle: 'Acabado brillante',
            icon: '✨',
            priceModifier: 0.5,
          },
          {
            value: 'luxury_rope',
            label: 'Premium con Cordón',
            subtitle: 'Asa de cordón',
            icon: '💎',
            priceModifier: 1.2,
          },
        ],
      },
      priceModifier: 0,
      order: 1,
    },
    {
      id: 'size',
      fieldType: 'dropdown',
      label: 'Tamaño',
      required: true,
      config: {
        options: [
          { value: 'xs', label: 'XS - 18x8x22 cm', description: 'Joyería, pequeños detalles' },
          { value: 's', label: 'S - 22x10x29 cm', description: 'Ropa doblada, libros' },
          { value: 'm', label: 'M - 32x12x41 cm', description: 'Zapatos, ropa' },
          { value: 'l', label: 'L - 42x13x37 cm', description: 'Compras grandes' },
          { value: 'xl', label: 'XL - 54x14x44 cm', description: 'Paquetes voluminosos' },
        ],
      },
      priceModifier: 0,
      order: 2,
    },
    {
      id: 'printing_option',
      fieldType: 'radio_group',
      label: 'Opción de Impresión',
      required: true,
      config: {
        layout: 'vertical',
        options: [
          { value: 'none', label: 'Sin impresión', priceModifier: 0 },
          { value: 'logo', label: 'Solo logo (un color)', priceModifier: 0.5 },
          { value: 'design', label: 'Diseño completo (full color)', priceModifier: 1.2 },
        ],
      },
      priceModifier: 0,
      order: 3,
    },
    {
      id: 'logo_upload',
      fieldType: 'image_upload',
      label: 'Sube tu logo o diseño',
      required: true,
      config: {
        maxSizeMB: 5,
        allowedFormats: ['jpg', 'png', 'svg', 'pdf'],
        showPreview: true,
        helpText: 'Resolución mínima recomendada: 300 DPI',
      },
      priceModifier: 0,
      order: 4,
      condition: {
        dependsOn: 'printing_option',
        showWhen: ['logo', 'design'],
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      isQuantityMultiplier: true,
      config: {
        options: [
          {
            value: '100',
            label: '100 unidades',
            unitPriceOverride: 0.8,
            description: '€0.80/unidad',
          },
          {
            value: '250',
            label: '250 unidades',
            unitPriceOverride: 0.6,
            description: '€0.60/unidad',
          },
          {
            value: '500',
            label: '500 unidades',
            unitPriceOverride: 0.45,
            description: '€0.45/unidad',
          },
          {
            value: '1000',
            label: '1000 unidades',
            unitPriceOverride: 0.35,
            description: '€0.35/unidad',
          },
        ],
      },
      priceModifier: 0,
      order: 5,
    },
  ],
  displayComponent: 'PackagingCustomizer',
};

// ============================================================================
// PACKAGING - ETIQUETAS ADHESIVAS
// ============================================================================

export const SCHEMA_ETIQUETAS_ADHESIVAS: CustomizationSchema = {
  fields: [
    {
      id: 'label_shape',
      fieldType: 'card_selector',
      label: 'Forma de Etiqueta',
      required: true,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'circle', label: 'Circular', icon: '⭕', priceModifier: 0 },
          { value: 'square', label: 'Cuadrada', icon: '⬜', priceModifier: 0 },
          { value: 'rectangle', label: 'Rectangular', icon: '▭', priceModifier: 0 },
          { value: 'oval', label: 'Ovalada', icon: '⬭', priceModifier: 0.2 },
          { value: 'custom', label: 'Forma personalizada', icon: '✂️', priceModifier: 0.5 },
        ],
      },
      priceModifier: 0,
      order: 1,
    },
    {
      id: 'size',
      fieldType: 'dropdown',
      label: 'Tamaño',
      required: true,
      config: {
        options: [
          { value: '3x3', label: '3x3 cm', priceModifier: 0 },
          { value: '5x5', label: '5x5 cm', priceModifier: 0.1 },
          { value: '7x7', label: '7x7 cm', priceModifier: 0.2 },
          { value: '10x5', label: '10x5 cm', priceModifier: 0.25 },
          { value: 'custom', label: 'Tamaño personalizado', priceModifier: 0.5 },
        ],
      },
      priceModifier: 0,
      order: 2,
    },
    {
      id: 'material',
      fieldType: 'radio_group',
      label: 'Material',
      required: true,
      config: {
        layout: 'vertical',
        options: [
          {
            value: 'paper_matte',
            label: 'Papel Mate',
            description: 'Acabado natural',
            priceModifier: 0,
          },
          {
            value: 'paper_glossy',
            label: 'Papel Brillo',
            description: 'Colores vibrantes',
            priceModifier: 0.1,
          },
          {
            value: 'vinyl',
            label: 'Vinilo',
            description: 'Resistente al agua',
            priceModifier: 0.3,
          },
          {
            value: 'transparent',
            label: 'Transparente',
            description: 'Efecto cristal',
            priceModifier: 0.4,
          },
        ],
      },
      priceModifier: 0,
      order: 3,
    },
    {
      id: 'design',
      fieldType: 'image_upload',
      label: 'Diseño de la etiqueta',
      required: true,
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'png', 'pdf', 'ai', 'svg'],
        showPreview: true,
        helpText: 'Alta resolución (300 DPI mínimo). Incluye sangrado de 2mm',
      },
      priceModifier: 0,
      order: 4,
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      isQuantityMultiplier: true,
      config: {
        options: [
          {
            value: '100',
            label: '100 etiquetas',
            unitPriceOverride: 0.15,
            description: '€0.15/unidad',
          },
          {
            value: '250',
            label: '250 etiquetas',
            unitPriceOverride: 0.1,
            description: '€0.10/unidad',
          },
          {
            value: '500',
            label: '500 etiquetas',
            unitPriceOverride: 0.07,
            description: '€0.07/unidad',
          },
          {
            value: '1000',
            label: '1000 etiquetas',
            unitPriceOverride: 0.05,
            description: '€0.05/unidad',
          },
        ],
      },
      priceModifier: 0,
      order: 5,
    },
  ],
  displayComponent: 'LabelCustomizer',
};

// ============================================================================
// EXPORTAR TODOS LOS SCHEMAS
// ============================================================================

export const PACKAGING_SCHEMAS = {
  'cajas-personalizadas': SCHEMA_CAJAS_PERSONALIZADAS,
  'bolsas-papel': SCHEMA_BOLSAS_PAPEL,
  'etiquetas-adhesivas': SCHEMA_ETIQUETAS_ADHESIVAS,
};

// Helper para obtener un schema por slug
export function getSchemaBySlug(slug: string): CustomizationSchema | null {
  return PACKAGING_SCHEMAS[slug as keyof typeof PACKAGING_SCHEMAS] || null;
}

// Lista de todos los schemas disponibles para el selector del admin
export const AVAILABLE_SCHEMAS = [
  {
    id: 'cajas-personalizadas',
    name: 'Cajas Personalizadas',
    category: 'Packaging',
    description: 'Schema para cajas de cartón, kraft y rígidas',
    icon: '📦',
  },
  {
    id: 'bolsas-papel',
    name: 'Bolsas de Papel',
    category: 'Packaging',
    description: 'Schema para bolsas kraft, estucadas y premium',
    icon: '🛍️',
  },
  {
    id: 'etiquetas-adhesivas',
    name: 'Etiquetas Adhesivas',
    category: 'Packaging',
    description: 'Schema para etiquetas en diferentes materiales',
    icon: '🏷️',
  },
];
