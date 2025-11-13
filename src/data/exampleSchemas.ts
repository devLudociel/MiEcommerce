// src/data/exampleSchemas.ts

import type { CustomizationSchema } from '../types/customization';

/**
 * Schemas de ejemplo para diferentes tipos de productos
 * Estos pueden ser usados como punto de partida o aplicados directamente
 */

// ============================================================================
// SCHEMA: CAMISETAS
// ============================================================================

export const camisetasSchema: CustomizationSchema = {
  fields: [
    {
      id: 'tshirt_color',
      fieldType: 'color_selector',
      label: 'Color de la camiseta',
      required: true,
      config: {
        displayStyle: 'color_blocks',
        availableColors: [
          { id: 'white', name: 'Blanco', hex: '#FFFFFF' },
          { id: 'black', name: 'Negro', hex: '#000000' },
          { id: 'red', name: 'Rojo', hex: '#EF4444' },
          { id: 'blue', name: 'Azul', hex: '#3B82F6' },
          { id: 'green', name: 'Verde', hex: '#10B981' },
          { id: 'yellow', name: 'Amarillo', hex: '#F59E0B' },
          { id: 'pink', name: 'Rosa', hex: '#EC4899' },
          { id: 'gray', name: 'Gris', hex: '#6B7280' },
        ],
      },
      priceModifier: 0,
      order: 1,
    },
    {
      id: 'tshirt_size',
      fieldType: 'size_selector',
      label: 'Talla',
      required: true,
      config: {
        displayStyle: 'buttons',
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        showSizeGuide: true,
      },
      priceModifier: 0,
      helpText: 'Consulta la guía de tallas para encontrar tu talla perfecta',
      order: 2,
    },
    {
      id: 'custom_design',
      fieldType: 'image_upload',
      label: 'Sube tu diseño (opcional)',
      required: false,
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'png', 'svg'],
        showPreview: true,
        showPositionControls: true,
        helpText: 'Formatos aceptados: JPG, PNG, SVG • Máximo 10MB',
      },
      priceModifier: 5,
      helpText: '¿Tienes un diseño personalizado? Súbelo aquí (+€5.00)',
      order: 3,
    },
  ],
  displayComponent: 'DynamicCustomizer',
};

// ============================================================================
// SCHEMA: CUADROS
// ============================================================================

export const cuadrosSchema: CustomizationSchema = {
  fields: [
    {
      id: 'frame_size',
      fieldType: 'dropdown',
      label: 'Tamaño del cuadro',
      required: true,
      config: {
        placeholder: 'Selecciona un tamaño',
        options: [
          { value: '20x30', label: '20 × 30 cm (Pequeño)', priceModifier: 0 },
          {
            value: '30x40',
            label: '30 × 40 cm (Mediano)',
            priceModifier: 8,
            description: 'Tamaño más vendido, ideal para salas y dormitorios',
          },
          { value: '40x50', label: '40 × 50 cm (Grande)', priceModifier: 15 },
          { value: '50x70', label: '50 × 70 cm (Extra Grande)', priceModifier: 25 },
        ],
      },
      priceModifier: 0,
      order: 1,
    },
    {
      id: 'flower_color',
      fieldType: 'color_selector',
      label: 'Color de las flores',
      required: true,
      config: {
        displayStyle: 'color_blocks',
        availableColors: [
          { id: 'rosa', name: 'Rosas', hex: '#EC4899' },
          { id: 'rojo', name: 'Rojas', hex: '#DC2626' },
          { id: 'morado', name: 'Moradas', hex: '#9333EA' },
          { id: 'amarillo', name: 'Amarillas', hex: '#FACC15' },
          { id: 'blanco', name: 'Blancas', hex: '#F3F4F6' },
          { id: 'azul', name: 'Azules', hex: '#3B82F6' },
        ],
      },
      priceModifier: 0,
      order: 2,
    },
    {
      id: 'frame_material',
      fieldType: 'dropdown',
      label: 'Material del marco',
      required: true,
      config: {
        placeholder: 'Selecciona el material',
        options: [
          { value: 'wood', label: 'Madera Natural', priceModifier: 0 },
          {
            value: 'metal',
            label: 'Metal Moderno',
            priceModifier: 5,
            description: 'Marco de aluminio con acabado mate',
          },
          {
            value: 'acrylic',
            label: 'Acrílico Premium',
            priceModifier: 12,
            description: 'Look moderno y elegante, resistente a rayones',
          },
        ],
      },
      priceModifier: 0,
      order: 3,
    },
  ],
  displayComponent: 'DynamicCustomizer',
};

// ============================================================================
// SCHEMA: FIGURAS DE RESINA
// ============================================================================

export const resinaSchema: CustomizationSchema = {
  fields: [
    {
      id: 'box_type',
      fieldType: 'dropdown',
      label: 'Tipo de caja',
      required: true,
      config: {
        placeholder: 'Selecciona el tipo de caja',
        options: [
          {
            value: 'simple',
            label: 'Caja Simple',
            priceModifier: 0,
            description: 'Caja básica con cierre magnético e interior acolchado',
          },
          {
            value: 'premium',
            label: 'Caja Premium',
            priceModifier: 15,
            description: 'Exterior de terciopelo, compartimentos y luz LED interior',
          },
          {
            value: 'luxury',
            label: 'Caja Luxury',
            priceModifier: 30,
            description: 'Madera premium con grabado personalizado y certificado de autenticidad',
          },
        ],
      },
      priceModifier: 0,
      order: 1,
    },
    {
      id: 'box_color',
      fieldType: 'color_selector',
      label: 'Color de la caja',
      required: true,
      config: {
        displayStyle: 'color_blocks',
        availableColors: [
          { id: 'blue', name: 'Azul Océano', hex: '#3B82F6' },
          { id: 'pink', name: 'Rosa Romántico', hex: '#EC4899' },
          { id: 'gold', name: 'Dorado Elegante', hex: '#F59E0B' },
          { id: 'silver', name: 'Plateado Moderno', hex: '#94A3B8' },
          { id: 'black', name: 'Negro Sofisticado', hex: '#1F2937' },
          { id: 'white', name: 'Blanco Puro', hex: '#F3F4F6' },
        ],
      },
      priceModifier: 0,
      order: 2,
    },
  ],
  displayComponent: 'DynamicCustomizer',
};

// ============================================================================
// SCHEMA: TAZAS (ejemplo adicional)
// ============================================================================

export const tazasSchema: CustomizationSchema = {
  fields: [
    {
      id: 'cup_size',
      fieldType: 'dropdown',
      label: 'Tamaño de la taza',
      required: true,
      config: {
        placeholder: 'Selecciona el tamaño',
        options: [
          { value: 'small', label: 'Pequeña (250ml)', priceModifier: 0 },
          { value: 'medium', label: 'Mediana (350ml)', priceModifier: 2 },
          { value: 'large', label: 'Grande (500ml)', priceModifier: 4 },
        ],
      },
      priceModifier: 0,
      order: 1,
    },
    {
      id: 'cup_color',
      fieldType: 'color_selector',
      label: 'Color de la taza',
      required: true,
      config: {
        displayStyle: 'color_blocks',
        availableColors: [
          { id: 'white', name: 'Blanco', hex: '#FFFFFF' },
          { id: 'black', name: 'Negro', hex: '#000000' },
          { id: 'red', name: 'Rojo', hex: '#EF4444' },
          { id: 'blue', name: 'Azul', hex: '#3B82F6' },
        ],
      },
      priceModifier: 0,
      order: 2,
    },
    {
      id: 'custom_image',
      fieldType: 'image_upload',
      label: 'Diseño personalizado',
      required: false,
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'png'],
        showPreview: true,
        helpText: 'Sube una imagen para personalizar tu taza',
      },
      priceModifier: 3,
      order: 3,
    },
  ],
  displayComponent: 'DynamicCustomizer',
};

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export const exampleSchemas = {
  camisetas: camisetasSchema,
  cuadros: cuadrosSchema,
  resina: resinaSchema,
  tazas: tazasSchema,
};

// Schema names for dropdown selection
export const schemaOptions = [
  { value: 'camisetas', label: 'Camisetas / Textiles' },
  { value: 'cuadros', label: 'Cuadros / Marcos' },
  { value: 'resina', label: 'Figuras de Resina' },
  { value: 'tazas', label: 'Tazas / Sublimados' },
  { value: 'custom', label: 'Personalizado (crear desde cero)' },
];
