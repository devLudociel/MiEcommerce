// src/lib/customization/productSchemas.ts
/**
 * Schemas de personalización completos para TODOS los productos del catálogo
 * Organizados por categoría para fácil mantenimiento
 */

import type { CustomizationSchema } from '../../types/customization';

// ============================================================================
// PRODUCTOS GRÁFICOS
// ============================================================================

// --- FLYERS Y FOLLETOS ---
export const FLYERS_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'flyer_format',
      fieldType: 'card_selector',
      label: 'Formato',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'a6', label: 'A6 (10.5×14.8cm)', icon: '📄', description: 'Tamaño postal' },
          { value: 'a5', label: 'A5 (14.8×21cm)', icon: '📋', badge: 'Popular' },
          { value: 'a4', label: 'A4 (21×29.7cm)', icon: '📃', priceModifier: 0.5 },
          { value: 'dl', label: 'DL (10×21cm)', icon: '📑', description: 'Formato carta' },
        ],
      },
    },
    {
      id: 'flyer_type',
      fieldType: 'card_selector',
      label: 'Tipo de folleto',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'simple', label: 'Flyer simple', description: 'Una sola hoja' },
          { value: 'diptico', label: 'Díptico', description: '2 caras plegadas', priceModifier: 1 },
          { value: 'triptico', label: 'Tríptico', description: '3 cuerpos', priceModifier: 1.5 },
        ],
      },
    },
    {
      id: 'paper_weight',
      fieldType: 'dropdown',
      label: 'Gramaje del papel',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        placeholder: 'Selecciona gramaje',
        options: [
          { value: '135g', label: '135g (estándar)', description: 'Económico y ligero' },
          { value: '170g', label: '170g (premium)', priceModifier: 0.3 },
          { value: '250g', label: '250g (cartulina)', priceModifier: 0.6 },
        ],
      },
    },
    {
      id: 'finish',
      fieldType: 'radio_group',
      label: 'Acabado',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        layout: 'horizontal',
        options: [
          { value: 'mate', label: 'Mate' },
          { value: 'brillo', label: 'Brillo' },
          { value: 'sin_acabado', label: 'Sin acabado (offset)' },
        ],
      },
    },
    {
      id: 'print_sides',
      fieldType: 'radio_group',
      label: 'Impresión',
      required: true,
      priceModifier: 0,
      order: 5,
      config: {
        layout: 'horizontal',
        options: [
          { value: 'one_side', label: 'Una cara' },
          { value: 'two_sides', label: 'Dos caras', priceModifier: 0.4 },
        ],
      },
    },
    {
      id: 'design_option',
      fieldType: 'card_selector',
      label: 'Diseño',
      required: true,
      priceModifier: 0,
      order: 6,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'upload', label: 'Subir mi diseño', icon: '📤' },
          { value: 'design_service', label: 'Que lo diseñéis', icon: '🎨', priceModifier: 15 },
        ],
      },
    },
    {
      id: 'design_file',
      fieldType: 'image_upload',
      label: 'Archivo de diseño',
      required: true,
      priceModifier: 0,
      order: 7,
      condition: {
        dependsOn: 'design_option',
        showWhen: 'upload',
      },
      helpText: 'PDF vectorial preferido. Incluye 3mm de sangrado.',
      config: {
        maxSizeMB: 50,
        allowedFormats: ['pdf', 'jpg', 'jpeg', 'png', 'ai'],
        showPreview: true,
      },
    },
    {
      id: 'design_brief',
      fieldType: 'text_input',
      label: 'Describe qué necesitas',
      required: true,
      priceModifier: 0,
      order: 7,
      condition: {
        dependsOn: 'design_option',
        showWhen: 'design_service',
      },
      config: {
        placeholder: 'Describe el contenido, estilo y objetivo del flyer...',
        maxLength: 1000,
        showCharCounter: true,
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 8,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '100', label: '100 unidades', unitPriceOverride: 0.12 },
          { value: '250', label: '250 unidades', unitPriceOverride: 0.08 },
          { value: '500', label: '500 unidades', unitPriceOverride: 0.06 },
          { value: '1000', label: '1000 unidades', unitPriceOverride: 0.04 },
          { value: '2500', label: '2500 unidades', unitPriceOverride: 0.03 },
        ],
      },
    },
  ],
};

// --- IMANES PERSONALIZADOS ---
export const IMANES_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'magnet_shape',
      fieldType: 'card_selector',
      label: 'Forma del imán',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'rectangle', label: 'Rectangular', icon: '▭' },
          { value: 'square', label: 'Cuadrado', icon: '⬜' },
          { value: 'circle', label: 'Circular', icon: '⭕' },
          { value: 'heart', label: 'Corazón', icon: '❤️', priceModifier: 1 },
          { value: 'custom', label: 'Forma personalizada', icon: '✂️', priceModifier: 2 },
        ],
      },
    },
    {
      id: 'magnet_size',
      fieldType: 'dropdown',
      label: 'Tamaño',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        options: [
          { value: '5x5', label: '5×5 cm', description: 'Mini' },
          { value: '7x5', label: '7×5 cm', description: 'Tarjeta visita' },
          { value: '10x7', label: '10×7 cm (Popular)', description: 'Estándar' },
          { value: '15x10', label: '15×10 cm', description: 'Grande', priceModifier: 2 },
        ],
      },
    },
    {
      id: 'magnet_type',
      fieldType: 'radio_group',
      label: 'Tipo de imán',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        layout: 'vertical',
        options: [
          { value: 'flexible', label: 'Flexible (nevera)', description: 'El más común' },
          { value: 'rigid', label: 'Rígido premium', priceModifier: 1.5 },
        ],
      },
    },
    {
      id: 'finish',
      fieldType: 'radio_group',
      label: 'Acabado',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        layout: 'horizontal',
        options: [
          { value: 'glossy', label: 'Brillante' },
          { value: 'matte', label: 'Mate' },
        ],
      },
    },
    {
      id: 'design',
      fieldType: 'image_upload',
      label: 'Tu foto o diseño',
      required: true,
      priceModifier: 0,
      order: 5,
      helpText: 'Sube tu foto favorita en alta resolución',
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'add_text',
      fieldType: 'checkbox',
      label: 'Añadir texto',
      required: false,
      priceModifier: 0,
      order: 6,
      config: {
        description: 'Incluye un mensaje o nombre',
      },
    },
    {
      id: 'custom_text',
      fieldType: 'text_input',
      label: 'Texto',
      required: false,
      priceModifier: 1,
      order: 7,
      condition: {
        dependsOn: 'add_text',
        showWhen: 'true',
      },
      config: {
        placeholder: 'Ej: Vacaciones 2024, Te quiero mamá...',
        maxLength: 40,
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 8,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 5 },
          { value: '5', label: '5 unidades', unitPriceOverride: 4 },
          { value: '10', label: '10 unidades', unitPriceOverride: 3.5 },
          { value: '25', label: '25 unidades', unitPriceOverride: 3 },
          { value: '50', label: '50 unidades', unitPriceOverride: 2.5 },
        ],
      },
    },
  ],
};

// --- CARTELES PARA EVENTOS ---
export const CARTELES_EVENTOS_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'event_type',
      fieldType: 'card_selector',
      label: 'Tipo de evento',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'boda', label: 'Boda', icon: '💒' },
          { value: 'bautizo', label: 'Bautizo', icon: '👼' },
          { value: 'comunion', label: 'Comunión', icon: '✝️' },
          { value: 'cumpleanos', label: 'Cumpleaños', icon: '🎂' },
          { value: 'baby_shower', label: 'Baby Shower', icon: '👶' },
          { value: 'otro', label: 'Otro evento', icon: '🎉' },
        ],
      },
    },
    {
      id: 'poster_size',
      fieldType: 'card_selector',
      label: 'Tamaño del cartel',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'simple_cards',
        layout: 'vertical',
        options: [
          { value: 'a3', label: 'A3 (29.7×42cm)', description: 'Mesa o atril' },
          { value: 'a2', label: 'A2 (42×59.4cm)', badge: 'Popular' },
          { value: 'a1', label: 'A1 (59.4×84cm)', priceModifier: 10 },
          { value: '50x70', label: '50×70 cm', description: 'Tamaño estándar' },
          { value: '70x100', label: '70×100 cm', priceModifier: 15, description: 'Gran formato' },
        ],
      },
    },
    {
      id: 'material',
      fieldType: 'card_selector',
      label: 'Material',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        displayStyle: 'simple_cards',
        layout: 'vertical',
        options: [
          { value: 'carton_pluma', label: 'Cartón pluma', description: 'Ligero y económico' },
          { value: 'forex', label: 'Forex (PVC)', priceModifier: 5, description: 'Resistente al agua' },
          { value: 'vinilo', label: 'Vinilo adhesivo', priceModifier: 3 },
          { value: 'lona', label: 'Lona banner', priceModifier: 8, description: 'Exterior' },
        ],
      },
    },
    {
      id: 'design_option',
      fieldType: 'card_selector',
      label: 'Diseño',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        displayStyle: 'visual_cards',
        layout: 'horizontal',
        options: [
          { value: 'template', label: 'Usar plantilla', icon: '📋' },
          { value: 'upload', label: 'Subir mi diseño', icon: '📤' },
          { value: 'design_service', label: 'Que lo diseñéis', icon: '🎨', priceModifier: 20 },
        ],
      },
    },
    {
      id: 'design_file',
      fieldType: 'image_upload',
      label: 'Tu diseño',
      required: true,
      priceModifier: 0,
      order: 5,
      condition: {
        dependsOn: 'design_option',
        showWhen: 'upload',
      },
      config: {
        maxSizeMB: 50,
        allowedFormats: ['pdf', 'jpg', 'jpeg', 'png', 'ai'],
        showPreview: true,
      },
    },
    {
      id: 'names',
      fieldType: 'text_input',
      label: 'Nombres principales',
      required: true,
      priceModifier: 0,
      order: 5,
      condition: {
        dependsOn: 'design_option',
        showWhen: ['template', 'design_service'],
      },
      config: {
        placeholder: 'Ej: María & Juan, Lucas cumple 5 años',
        maxLength: 60,
      },
    },
    {
      id: 'event_date',
      fieldType: 'text_input',
      label: 'Fecha del evento',
      required: false,
      priceModifier: 0,
      order: 6,
      condition: {
        dependsOn: 'design_option',
        showWhen: ['template', 'design_service'],
      },
      config: {
        placeholder: 'Ej: 15 de Junio 2025',
        maxLength: 30,
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 7,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 15 },
          { value: '2', label: '2 unidades', unitPriceOverride: 13 },
          { value: '5', label: '5 unidades', unitPriceOverride: 11 },
        ],
      },
    },
  ],
};

// ============================================================================
// TEXTILES
// ============================================================================

// --- DELANTALES ---
export const DELANTALES_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'apron_type',
      fieldType: 'card_selector',
      label: 'Tipo de delantal',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'kitchen', label: 'Cocina clásico', icon: '👨‍🍳', description: 'Con peto y bolsillo' },
          { value: 'bbq', label: 'BBQ/Parrilla', icon: '🔥', description: 'Resistente y largo' },
          { value: 'barista', label: 'Barista/Camarero', icon: '☕', description: 'Medio cuerpo' },
          { value: 'artist', label: 'Artista/Taller', icon: '🎨', description: 'Con múltiples bolsillos' },
          { value: 'kids', label: 'Infantil', icon: '👧', description: 'Talla niño' },
        ],
      },
    },
    {
      id: 'color',
      fieldType: 'color_selector',
      label: 'Color del delantal',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'color_blocks',
        availableColors: [
          { id: 'black', name: 'Negro', hex: '#000000' },
          { id: 'white', name: 'Blanco', hex: '#FFFFFF' },
          { id: 'red', name: 'Rojo', hex: '#DC2626' },
          { id: 'navy', name: 'Azul Marino', hex: '#1E3A8A' },
          { id: 'green', name: 'Verde Botella', hex: '#166534' },
          { id: 'brown', name: 'Marrón', hex: '#78350F' },
          { id: 'gray', name: 'Gris', hex: '#6B7280' },
        ],
      },
    },
    {
      id: 'personalization_type',
      fieldType: 'card_selector',
      label: 'Tipo de personalización',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'embroidery', label: 'Bordado', priceModifier: 5, badge: 'Premium' },
          { value: 'vinyl', label: 'Vinilo textil' },
          { value: 'dtf', label: 'DTF (Full color)', priceModifier: 2 },
        ],
      },
    },
    {
      id: 'design_style',
      fieldType: 'card_selector',
      label: 'Estilo del diseño',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'name_only', label: 'Solo nombre', icon: '✍️' },
          { value: 'name_title', label: 'Nombre + título', icon: '👨‍🍳', description: 'Ej: Chef María' },
          { value: 'logo', label: 'Logo/diseño', icon: '🎨' },
          { value: 'funny', label: 'Frase divertida', icon: '😄' },
        ],
      },
    },
    {
      id: 'name',
      fieldType: 'text_input',
      label: 'Nombre',
      required: true,
      priceModifier: 0,
      order: 5,
      condition: {
        dependsOn: 'design_style',
        showWhen: ['name_only', 'name_title'],
      },
      config: {
        placeholder: 'Ej: María, Papá, Abuelo',
        maxLength: 20,
      },
    },
    {
      id: 'title',
      fieldType: 'text_input',
      label: 'Título',
      required: false,
      priceModifier: 0,
      order: 6,
      condition: {
        dependsOn: 'design_style',
        showWhen: 'name_title',
      },
      config: {
        placeholder: 'Ej: El Mejor Chef, Master Parrillero',
        maxLength: 30,
      },
    },
    {
      id: 'logo',
      fieldType: 'image_upload',
      label: 'Logo o diseño',
      required: true,
      priceModifier: 0,
      order: 5,
      condition: {
        dependsOn: 'design_style',
        showWhen: 'logo',
      },
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'svg'],
        showPreview: true,
      },
    },
    {
      id: 'funny_phrase',
      fieldType: 'text_input',
      label: 'Frase',
      required: true,
      priceModifier: 0,
      order: 5,
      condition: {
        dependsOn: 'design_style',
        showWhen: 'funny',
      },
      config: {
        placeholder: 'Ej: "En esta cocina mando yo"',
        maxLength: 50,
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 7,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 18 },
          { value: '2', label: '2 unidades', unitPriceOverride: 16 },
          { value: '5', label: '5 unidades', unitPriceOverride: 14 },
          { value: '10', label: '10 unidades', unitPriceOverride: 12 },
        ],
      },
    },
  ],
};

// ============================================================================
// SUBLIMACIÓN - PRODUCTOS ADICIONALES
// ============================================================================

// --- ALFOMBRILLAS DE RATÓN ---
export const ALFOMBRILLAS_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'mousepad_size',
      fieldType: 'card_selector',
      label: 'Tamaño',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'horizontal',
        options: [
          { value: 'standard', label: 'Estándar (24×20cm)', icon: '🖱️' },
          { value: 'large', label: 'Grande (30×25cm)', icon: '🖱️', priceModifier: 3 },
          { value: 'xl', label: 'XL Gaming (80×30cm)', icon: '🎮', priceModifier: 10, badge: 'Gamer' },
          { value: 'xxl', label: 'XXL Desk (90×40cm)', icon: '🖥️', priceModifier: 15 },
        ],
      },
    },
    {
      id: 'base_type',
      fieldType: 'radio_group',
      label: 'Tipo de base',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        layout: 'vertical',
        options: [
          { value: 'rubber', label: 'Goma antideslizante estándar' },
          { value: 'gel', label: 'Con reposamuñecas de gel', priceModifier: 5 },
        ],
      },
    },
    {
      id: 'surface',
      fieldType: 'radio_group',
      label: 'Superficie',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        layout: 'horizontal',
        options: [
          { value: 'cloth', label: 'Tela (control)', description: 'Más precisión' },
          { value: 'speed', label: 'Speed', description: 'Deslizamiento rápido', priceModifier: 2 },
        ],
      },
    },
    {
      id: 'design',
      fieldType: 'image_upload',
      label: 'Tu diseño o foto',
      required: true,
      priceModifier: 0,
      order: 4,
      helpText: 'Usa imágenes horizontales para mejor resultado',
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 5,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 12 },
          { value: '2', label: '2 unidades', unitPriceOverride: 10 },
          { value: '5', label: '5 unidades', unitPriceOverride: 8 },
          { value: '10', label: '10 unidades', unitPriceOverride: 7 },
        ],
      },
    },
  ],
};

// --- POSAVASOS ---
export const POSAVASOS_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'coaster_material',
      fieldType: 'card_selector',
      label: 'Material',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'ceramic', label: 'Cerámica', icon: '🍵', description: 'Sublimación full color' },
          { value: 'cork', label: 'Corcho', icon: '🪵', description: 'Natural y absorbente' },
          { value: 'mdf', label: 'MDF', icon: '🪵', description: 'Económico' },
          { value: 'glass', label: 'Cristal', icon: '💎', priceModifier: 3, badge: 'Premium' },
          { value: 'slate', label: 'Pizarra', icon: '⬛', priceModifier: 2 },
        ],
      },
    },
    {
      id: 'coaster_shape',
      fieldType: 'card_selector',
      label: 'Forma',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'visual_cards',
        layout: 'horizontal',
        options: [
          { value: 'round', label: 'Redondo', icon: '⭕' },
          { value: 'square', label: 'Cuadrado', icon: '⬜' },
          { value: 'hexagon', label: 'Hexagonal', icon: '⬡', priceModifier: 1 },
        ],
      },
    },
    {
      id: 'design_type',
      fieldType: 'card_selector',
      label: 'Tipo de diseño',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'photo', label: 'Foto', icon: '📷' },
          { value: 'logo', label: 'Logo', icon: '🎨' },
          { value: 'text', label: 'Texto/iniciales', icon: '✍️' },
          { value: 'pattern', label: 'Patrón decorativo', icon: '✨' },
        ],
      },
    },
    {
      id: 'design',
      fieldType: 'image_upload',
      label: 'Tu diseño',
      required: true,
      priceModifier: 0,
      order: 4,
      condition: {
        dependsOn: 'design_type',
        showWhen: ['photo', 'logo', 'pattern'],
      },
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'custom_text',
      fieldType: 'text_input',
      label: 'Texto o iniciales',
      required: true,
      priceModifier: 0,
      order: 4,
      condition: {
        dependsOn: 'design_type',
        showWhen: 'text',
      },
      config: {
        placeholder: 'Ej: M&J, Casa García, Boda 2025',
        maxLength: 30,
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 5,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 6 },
          { value: '4', label: 'Pack 4 unidades (Popular)', unitPriceOverride: 5 },
          { value: '6', label: 'Pack 6 unidades', unitPriceOverride: 4.5 },
          { value: '12', label: 'Pack 12 unidades', unitPriceOverride: 4 },
        ],
      },
    },
  ],
};

// --- DECORACIÓN SUBLIMADA (Cuadros metálicos) ---
export const DECORACION_SUBLIMADA_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'panel_type',
      fieldType: 'card_selector',
      label: 'Tipo de panel',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'aluminum', label: 'Aluminio ChromaLuxe', icon: '✨', badge: 'Premium', description: 'Máxima calidad' },
          { value: 'hd_metal', label: 'Metal HD', icon: '🖼️', description: 'Colores vibrantes' },
          { value: 'wood_panel', label: 'Panel de madera', icon: '🪵', priceModifier: -5 },
        ],
      },
    },
    {
      id: 'panel_size',
      fieldType: 'card_selector',
      label: 'Tamaño',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'simple_cards',
        layout: 'grid',
        options: [
          { value: '15x20', label: '15×20 cm', description: 'Pequeño' },
          { value: '20x30', label: '20×30 cm' },
          { value: '30x40', label: '30×40 cm', badge: 'Popular' },
          { value: '40x50', label: '40×50 cm', priceModifier: 15 },
          { value: '50x70', label: '50×70 cm', priceModifier: 30 },
          { value: '60x90', label: '60×90 cm', priceModifier: 50 },
        ],
      },
    },
    {
      id: 'finish',
      fieldType: 'radio_group',
      label: 'Acabado',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        layout: 'horizontal',
        options: [
          { value: 'glossy', label: 'Brillante', description: 'Colores vivos' },
          { value: 'matte', label: 'Mate', description: 'Sin reflejos' },
          { value: 'brushed', label: 'Cepillado', priceModifier: 5, description: 'Textura metálica' },
        ],
      },
    },
    {
      id: 'hanging_system',
      fieldType: 'dropdown',
      label: 'Sistema de colgado',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        options: [
          { value: 'hidden', label: 'Colgador oculto trasero' },
          { value: 'float', label: 'Sistema flotante (separado de pared)', priceModifier: 5 },
          { value: 'easel', label: 'Con caballete (de pie)', priceModifier: 8 },
        ],
      },
    },
    {
      id: 'photo',
      fieldType: 'image_upload',
      label: 'Tu foto',
      required: true,
      priceModifier: 0,
      order: 5,
      helpText: 'Fotos de paisajes, retratos, mascotas... en alta resolución',
      config: {
        maxSizeMB: 20,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'tiff'],
        showPreview: true,
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 6,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 35 },
          { value: '2', label: '2 unidades', unitPriceOverride: 32 },
          { value: '3', label: '3 unidades', unitPriceOverride: 30 },
        ],
      },
    },
  ],
};

// ============================================================================
// CORTE LÁSER - PRODUCTOS ADICIONALES
// ============================================================================

// --- DECORACIÓN EN MADERA ---
export const DECORACION_MADERA_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'product_type',
      fieldType: 'card_selector',
      label: 'Tipo de producto',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'name_sign', label: 'Nombre decorativo', icon: '✨', description: 'Para pared o puerta' },
          { value: 'cake_topper', label: 'Cake Topper', icon: '🎂', description: 'Para tartas' },
          { value: 'table_numbers', label: 'Números de mesa', icon: '🔢' },
          { value: 'welcome_sign', label: 'Cartel bienvenida', icon: '👋', priceModifier: 10 },
          { value: 'ring_holder', label: 'Porta alianzas', icon: '💍', priceModifier: 5 },
          { value: 'custom_figure', label: 'Figura personalizada', icon: '🎨', priceModifier: 15 },
        ],
      },
    },
    {
      id: 'wood_type',
      fieldType: 'card_selector',
      label: 'Tipo de madera',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'mdf', label: 'MDF (para pintar)', description: 'Económico' },
          { value: 'birch', label: 'Abedul', description: 'Claro y elegante' },
          { value: 'walnut', label: 'Nogal', priceModifier: 5, description: 'Oscuro premium' },
          { value: 'bamboo', label: 'Bambú', priceModifier: 3, description: 'Ecológico' },
        ],
      },
    },
    {
      id: 'finish',
      fieldType: 'radio_group',
      label: 'Acabado',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        layout: 'vertical',
        options: [
          { value: 'natural', label: 'Natural (sin barniz)' },
          { value: 'varnish', label: 'Barnizado', priceModifier: 3 },
          { value: 'painted_white', label: 'Pintado blanco', priceModifier: 5 },
          { value: 'painted_gold', label: 'Pintado dorado', priceModifier: 8 },
        ],
      },
    },
    {
      id: 'size',
      fieldType: 'dropdown',
      label: 'Tamaño aproximado',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        options: [
          { value: 'small', label: 'Pequeño (hasta 15cm)' },
          { value: 'medium', label: 'Mediano (15-30cm)', priceModifier: 5 },
          { value: 'large', label: 'Grande (30-50cm)', priceModifier: 15 },
          { value: 'xl', label: 'Extra grande (50cm+)', priceModifier: 30 },
        ],
      },
    },
    {
      id: 'text',
      fieldType: 'text_input',
      label: 'Texto a grabar',
      required: true,
      priceModifier: 0,
      order: 5,
      config: {
        placeholder: 'Ej: María & Juan, Familia García, Bienvenidos',
        maxLength: 50,
      },
    },
    {
      id: 'date',
      fieldType: 'text_input',
      label: 'Fecha (opcional)',
      required: false,
      priceModifier: 0,
      order: 6,
      config: {
        placeholder: 'Ej: 15.06.2025',
        maxLength: 20,
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 7,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 12 },
          { value: '5', label: '5 unidades', unitPriceOverride: 10 },
          { value: '10', label: '10 unidades', unitPriceOverride: 8 },
          { value: '20', label: '20 unidades', unitPriceOverride: 7 },
        ],
      },
    },
  ],
};

// --- SEÑALIZACIÓN ---
export const SENALIZACION_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'sign_type',
      fieldType: 'card_selector',
      label: 'Tipo de señal',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'door_sign', label: 'Placa de puerta', icon: '🚪' },
          { value: 'desk_sign', label: 'Placa de escritorio', icon: '🖥️' },
          { value: 'wall_sign', label: 'Cartel de pared', icon: '🪧' },
          { value: 'directional', label: 'Señal direccional', icon: '➡️' },
          { value: 'number_plate', label: 'Número de casa', icon: '🏠' },
          { value: 'logo_sign', label: 'Logo corporativo', icon: '🏢', priceModifier: 10 },
        ],
      },
    },
    {
      id: 'material',
      fieldType: 'card_selector',
      label: 'Material',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'simple_cards',
        layout: 'vertical',
        options: [
          { value: 'acrylic', label: 'Acrílico', description: 'Moderno y elegante' },
          { value: 'wood', label: 'Madera', description: 'Cálido y natural' },
          { value: 'aluminum', label: 'Aluminio', priceModifier: 5, description: 'Duradero' },
          { value: 'brass', label: 'Latón', priceModifier: 10, description: 'Premium', badge: 'Lujo' },
        ],
      },
    },
    {
      id: 'size',
      fieldType: 'dropdown',
      label: 'Tamaño',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        options: [
          { value: '10x5', label: '10×5 cm (mini)' },
          { value: '15x5', label: '15×5 cm (puerta)' },
          { value: '20x10', label: '20×10 cm (estándar)' },
          { value: '30x15', label: '30×15 cm (grande)', priceModifier: 8 },
          { value: '40x20', label: '40×20 cm (extra)', priceModifier: 15 },
        ],
      },
    },
    {
      id: 'main_text',
      fieldType: 'text_input',
      label: 'Texto principal',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        placeholder: 'Ej: Despacho 203, Familia García, Recepción',
        maxLength: 40,
      },
    },
    {
      id: 'secondary_text',
      fieldType: 'text_input',
      label: 'Texto secundario (opcional)',
      required: false,
      priceModifier: 0,
      order: 5,
      config: {
        placeholder: 'Ej: Director General, 2º Piso',
        maxLength: 40,
      },
    },
    {
      id: 'include_icon',
      fieldType: 'checkbox',
      label: 'Incluir icono',
      required: false,
      priceModifier: 3,
      order: 6,
      config: {
        description: 'Añade un icono relacionado con el texto',
      },
    },
    {
      id: 'mounting',
      fieldType: 'dropdown',
      label: 'Sistema de montaje',
      required: true,
      priceModifier: 0,
      order: 7,
      config: {
        options: [
          { value: 'adhesive', label: 'Adhesivo doble cara' },
          { value: 'screws', label: 'Tornillos (ocultos)', priceModifier: 3 },
          { value: 'standoff', label: 'Separadores metálicos', priceModifier: 8 },
        ],
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 8,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 15 },
          { value: '2', label: '2 unidades', unitPriceOverride: 13 },
          { value: '5', label: '5 unidades', unitPriceOverride: 11 },
          { value: '10', label: '10 unidades', unitPriceOverride: 9 },
        ],
      },
    },
  ],
};

// --- CAJAS DE MADERA ---
export const CAJAS_MADERA_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'box_type',
      fieldType: 'card_selector',
      label: 'Tipo de caja',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'gift', label: 'Caja regalo', icon: '🎁', description: 'Tapa deslizante' },
          { value: 'jewelry', label: 'Joyero', icon: '💍', description: 'Con compartimentos' },
          { value: 'wine', label: 'Caja de vino', icon: '🍷', description: '1-2 botellas' },
          { value: 'memory', label: 'Caja de recuerdos', icon: '📷', description: 'Fotos y objetos' },
          { value: 'tea', label: 'Caja de té', icon: '🍵', description: 'Divisiones para sobres' },
        ],
      },
    },
    {
      id: 'wood_type',
      fieldType: 'dropdown',
      label: 'Tipo de madera',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        options: [
          { value: 'pine', label: 'Pino natural', description: 'Económico' },
          { value: 'birch', label: 'Abedul', priceModifier: 5 },
          { value: 'walnut', label: 'Nogal (Premium)', priceModifier: 12 },
          { value: 'bamboo', label: 'Bambú', priceModifier: 8 },
        ],
      },
    },
    {
      id: 'size',
      fieldType: 'dropdown',
      label: 'Tamaño',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        options: [
          { value: 'small', label: 'Pequeña (15×10×5cm)' },
          { value: 'medium', label: 'Mediana (20×15×8cm)', priceModifier: 5 },
          { value: 'large', label: 'Grande (30×20×10cm)', priceModifier: 12 },
        ],
      },
    },
    {
      id: 'engraving_type',
      fieldType: 'card_selector',
      label: 'Tipo de grabado',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'text', label: 'Solo texto', icon: '✍️' },
          { value: 'logo', label: 'Logo/imagen', icon: '🎨' },
          { value: 'text_image', label: 'Texto + imagen', icon: '📝', priceModifier: 5 },
        ],
      },
    },
    {
      id: 'engraving_text',
      fieldType: 'text_input',
      label: 'Texto a grabar',
      required: false,
      priceModifier: 0,
      order: 5,
      condition: {
        dependsOn: 'engraving_type',
        showWhen: ['text', 'text_image'],
      },
      config: {
        placeholder: 'Ej: María & Juan, Recuerdos 2024',
        maxLength: 50,
      },
    },
    {
      id: 'engraving_image',
      fieldType: 'image_upload',
      label: 'Imagen/logo a grabar',
      required: false,
      priceModifier: 0,
      order: 6,
      condition: {
        dependsOn: 'engraving_type',
        showWhen: ['logo', 'text_image'],
      },
      config: {
        maxSizeMB: 5,
        allowedFormats: ['jpg', 'jpeg', 'png', 'svg'],
        showPreview: true,
        helpText: 'Imágenes simples funcionan mejor para grabado',
      },
    },
    {
      id: 'interior_lining',
      fieldType: 'checkbox',
      label: 'Interior forrado',
      required: false,
      priceModifier: 8,
      order: 7,
      config: {
        description: 'Forro de terciopelo en el interior',
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 8,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 25 },
          { value: '2', label: '2 unidades', unitPriceOverride: 22 },
          { value: '5', label: '5 unidades', unitPriceOverride: 20 },
          { value: '10', label: '10 unidades', unitPriceOverride: 18 },
        ],
      },
    },
  ],
};

// ============================================================================
// EVENTOS - PRODUCTOS ADICIONALES
// ============================================================================

// --- BANDERINES Y GUIRNALDAS ---
export const BANDERINES_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'bunting_type',
      fieldType: 'card_selector',
      label: 'Tipo de guirnalda',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'triangular', label: 'Banderines triangulares', icon: '🎏' },
          { value: 'rectangular', label: 'Banderines rectangulares', icon: '🏴' },
          { value: 'letters', label: 'Letras sueltas', icon: '🔤', description: 'Forma tu mensaje' },
          { value: 'mixed', label: 'Combinado (letras + decoración)', icon: '✨', priceModifier: 5 },
        ],
      },
    },
    {
      id: 'material',
      fieldType: 'card_selector',
      label: 'Material',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'paper', label: 'Cartulina', description: 'Económico' },
          { value: 'fabric', label: 'Tela', priceModifier: 5, description: 'Reutilizable' },
          { value: 'felt', label: 'Fieltro', priceModifier: 3 },
          { value: 'wood', label: 'Madera fina', priceModifier: 10 },
        ],
      },
    },
    {
      id: 'message',
      fieldType: 'text_input',
      label: 'Mensaje',
      required: true,
      priceModifier: 0,
      order: 3,
      helpText: 'El mensaje que formarán los banderines',
      config: {
        placeholder: 'Ej: FELIZ CUMPLE, BIENVENIDOS, BABY SHOWER',
        maxLength: 30,
      },
    },
    {
      id: 'length',
      fieldType: 'dropdown',
      label: 'Longitud total',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        options: [
          { value: '1.5m', label: '1.5 metros' },
          { value: '2.5m', label: '2.5 metros', priceModifier: 3 },
          { value: '4m', label: '4 metros', priceModifier: 6 },
          { value: '6m', label: '6 metros', priceModifier: 10 },
        ],
      },
    },
    {
      id: 'color_scheme',
      fieldType: 'card_selector',
      label: 'Colores',
      required: true,
      priceModifier: 0,
      order: 5,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'pastel', label: 'Pastel', icon: '🎀' },
          { value: 'rainbow', label: 'Arcoíris', icon: '🌈' },
          { value: 'gold_white', label: 'Dorado y blanco', icon: '✨' },
          { value: 'pink', label: 'Rosas', icon: '💗' },
          { value: 'blue', label: 'Azules', icon: '💙' },
          { value: 'custom', label: 'Personalizado', icon: '🎨' },
        ],
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 6,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 guirnalda', unitPriceOverride: 12 },
          { value: '2', label: '2 guirnaldas', unitPriceOverride: 10 },
          { value: '3', label: '3 guirnaldas', unitPriceOverride: 9 },
        ],
      },
    },
  ],
};

// --- MESEROS / NÚMEROS DE MESA ---
export const MESEROS_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'style',
      fieldType: 'card_selector',
      label: 'Estilo',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'classic', label: 'Clásico (solo número)', icon: '1️⃣' },
          { value: 'frame', label: 'Con marco', icon: '🖼️', priceModifier: 2 },
          { value: 'floral', label: 'Con decoración floral', icon: '🌸', priceModifier: 3 },
          { value: 'geometric', label: 'Geométrico moderno', icon: '◇' },
          { value: 'rustic', label: 'Rústico', icon: '🪵' },
        ],
      },
    },
    {
      id: 'material',
      fieldType: 'card_selector',
      label: 'Material',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'acrylic', label: 'Acrílico transparente', badge: 'Elegante' },
          { value: 'wood', label: 'Madera', description: 'Rústico y cálido' },
          { value: 'mirror', label: 'Espejo', priceModifier: 3 },
          { value: 'cardstock', label: 'Cartulina premium', priceModifier: -2 },
        ],
      },
    },
    {
      id: 'size',
      fieldType: 'dropdown',
      label: 'Tamaño',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        options: [
          { value: 'small', label: 'Pequeño (10×8cm)' },
          { value: 'medium', label: 'Mediano (15×12cm)', description: 'Recomendado' },
          { value: 'large', label: 'Grande (20×15cm)', priceModifier: 3 },
        ],
      },
    },
    {
      id: 'number_range',
      fieldType: 'dropdown',
      label: 'Numeración',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        placeholder: 'Selecciona rango',
        options: [
          { value: '1-10', label: 'Mesas 1-10' },
          { value: '1-15', label: 'Mesas 1-15', priceModifier: 2 },
          { value: '1-20', label: 'Mesas 1-20', priceModifier: 4 },
          { value: '1-25', label: 'Mesas 1-25', priceModifier: 6 },
          { value: '1-30', label: 'Mesas 1-30', priceModifier: 8 },
          { value: 'custom', label: 'Personalizado' },
        ],
      },
    },
    {
      id: 'custom_numbers',
      fieldType: 'text_input',
      label: 'Números específicos',
      required: false,
      priceModifier: 0,
      order: 5,
      condition: {
        dependsOn: 'number_range',
        showWhen: 'custom',
      },
      config: {
        placeholder: 'Ej: 1,2,3,5,7,10',
        maxLength: 50,
      },
    },
    {
      id: 'include_stand',
      fieldType: 'checkbox',
      label: 'Incluir soporte/base',
      required: false,
      priceModifier: 2,
      order: 6,
      config: {
        description: 'Base de madera o acrílico para que se mantenga de pie',
      },
    },
  ],
};

// ============================================================================
// PAPELERÍA
// ============================================================================

// --- CUADERNOS Y LIBRETAS ---
export const CUADERNOS_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'notebook_type',
      fieldType: 'card_selector',
      label: 'Tipo de cuaderno',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'hardcover', label: 'Tapa dura', icon: '📕', badge: 'Premium' },
          { value: 'softcover', label: 'Tapa blanda', icon: '📒' },
          { value: 'spiral', label: 'Espiral', icon: '📓' },
          { value: 'sewn', label: 'Cosido artesanal', icon: '📔', priceModifier: 5 },
        ],
      },
    },
    {
      id: 'size',
      fieldType: 'dropdown',
      label: 'Tamaño',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        options: [
          { value: 'a6', label: 'A6 (10.5×14.8cm) - Bolsillo' },
          { value: 'a5', label: 'A5 (14.8×21cm) - Estándar (Popular)' },
          { value: 'a4', label: 'A4 (21×29.7cm) - Grande', priceModifier: 3 },
          { value: 'square', label: 'Cuadrado (15×15cm)' },
        ],
      },
    },
    {
      id: 'pages',
      fieldType: 'dropdown',
      label: 'Número de páginas',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        options: [
          { value: '50', label: '50 páginas' },
          { value: '100', label: '100 páginas', priceModifier: 2 },
          { value: '150', label: '150 páginas', priceModifier: 4 },
          { value: '200', label: '200 páginas', priceModifier: 6 },
        ],
      },
    },
    {
      id: 'page_type',
      fieldType: 'card_selector',
      label: 'Tipo de página',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'lined', label: 'Rayado', icon: '📝' },
          { value: 'blank', label: 'Blanco', icon: '📄' },
          { value: 'dotted', label: 'Punteado', icon: '⋯' },
          { value: 'grid', label: 'Cuadriculado', icon: '📊' },
        ],
      },
    },
    {
      id: 'cover_design',
      fieldType: 'card_selector',
      label: 'Diseño de portada',
      required: true,
      priceModifier: 0,
      order: 5,
      config: {
        displayStyle: 'visual_cards',
        layout: 'horizontal',
        options: [
          { value: 'photo', label: 'Tu foto', icon: '📷' },
          { value: 'logo', label: 'Logo/diseño', icon: '🎨' },
          { value: 'text', label: 'Nombre/texto', icon: '✍️' },
        ],
      },
    },
    {
      id: 'cover_image',
      fieldType: 'image_upload',
      label: 'Imagen de portada',
      required: true,
      priceModifier: 0,
      order: 6,
      condition: {
        dependsOn: 'cover_design',
        showWhen: ['photo', 'logo'],
      },
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'cover_text',
      fieldType: 'text_input',
      label: 'Texto de portada',
      required: true,
      priceModifier: 0,
      order: 6,
      condition: {
        dependsOn: 'cover_design',
        showWhen: 'text',
      },
      config: {
        placeholder: 'Ej: Mi Diario, Notas de María, Ideas',
        maxLength: 40,
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 7,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 15 },
          { value: '5', label: '5 unidades', unitPriceOverride: 12 },
          { value: '10', label: '10 unidades', unitPriceOverride: 10 },
          { value: '25', label: '25 unidades', unitPriceOverride: 8 },
        ],
      },
    },
  ],
};

// --- PAPEL DE REGALO ---
export const PAPEL_REGALO_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'paper_type',
      fieldType: 'card_selector',
      label: 'Tipo de papel',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'glossy', label: 'Papel brillo', icon: '✨' },
          { value: 'matte', label: 'Papel mate', icon: '📄' },
          { value: 'kraft', label: 'Papel kraft', icon: '🌱', description: 'Ecológico' },
          { value: 'tissue', label: 'Papel de seda', icon: '🎀', priceModifier: 2 },
        ],
      },
    },
    {
      id: 'sheet_size',
      fieldType: 'dropdown',
      label: 'Tamaño de hoja',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        options: [
          { value: '50x70', label: '50×70 cm' },
          { value: '70x100', label: '70×100 cm', priceModifier: 1 },
          { value: 'roll', label: 'Rollo (5 metros)', priceModifier: 5 },
        ],
      },
    },
    {
      id: 'design_type',
      fieldType: 'card_selector',
      label: 'Tipo de diseño',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'pattern', label: 'Patrón repetido', icon: '🔄' },
          { value: 'photo', label: 'Foto/imagen única', icon: '📷' },
          { value: 'collage', label: 'Collage de fotos', icon: '🖼️', priceModifier: 3 },
        ],
      },
    },
    {
      id: 'design',
      fieldType: 'image_upload',
      label: 'Tu diseño',
      required: true,
      priceModifier: 0,
      order: 4,
      helpText: 'Sube la imagen que quieres imprimir',
      config: {
        maxSizeMB: 15,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 5,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '5', label: '5 hojas', unitPriceOverride: 3 },
          { value: '10', label: '10 hojas', unitPriceOverride: 2.5 },
          { value: '25', label: '25 hojas', unitPriceOverride: 2 },
          { value: '50', label: '50 hojas', unitPriceOverride: 1.5 },
        ],
      },
    },
  ],
};

// ============================================================================
// IMPRESIÓN 3D - PRODUCTOS ESPECÍFICOS
// ============================================================================

// --- FIGURAS GAMING/ANIME ---
export const FIGURAS_GAMING_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'figure_source',
      fieldType: 'card_selector',
      label: 'Origen de la figura',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'horizontal',
        options: [
          { value: 'catalog', label: 'Del catálogo', icon: '📚', description: 'Elige de nuestros modelos' },
          { value: 'custom_file', label: 'Tu archivo 3D', icon: '📁', description: 'Sube tu STL/OBJ' },
          { value: 'custom_design', label: 'Diseño a medida', icon: '🎨', priceModifier: 30 },
        ],
      },
    },
    {
      id: 'category',
      fieldType: 'card_selector',
      label: 'Categoría',
      required: true,
      priceModifier: 0,
      order: 2,
      condition: {
        dependsOn: 'figure_source',
        showWhen: ['catalog', 'custom_design'],
      },
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'videogames', label: 'Videojuegos', icon: '🎮' },
          { value: 'anime', label: 'Anime/Manga', icon: '🎌' },
          { value: 'movies', label: 'Películas/Series', icon: '🎬' },
          { value: 'tabletop', label: 'Juegos de mesa/D&D', icon: '🎲' },
          { value: 'funko_style', label: 'Estilo Funko', icon: '🤖' },
        ],
      },
    },
    {
      id: 'custom_file',
      fieldType: 'image_upload',
      label: 'Tu archivo 3D',
      required: true,
      priceModifier: 0,
      order: 2,
      condition: {
        dependsOn: 'figure_source',
        showWhen: 'custom_file',
      },
      config: {
        maxSizeMB: 100,
        allowedFormats: ['stl', 'obj', '3mf'],
        showPreview: false,
        helpText: 'Formatos: STL, OBJ, 3MF',
      },
    },
    {
      id: 'reference_description',
      fieldType: 'text_input',
      label: 'Describe la figura que quieres',
      required: true,
      priceModifier: 0,
      order: 3,
      condition: {
        dependsOn: 'figure_source',
        showWhen: 'custom_design',
      },
      config: {
        placeholder: 'Describe el personaje, pose, detalles...',
        maxLength: 500,
        showCharCounter: true,
      },
    },
    {
      id: 'reference_images',
      fieldType: 'image_upload',
      label: 'Imágenes de referencia',
      required: false,
      priceModifier: 0,
      order: 4,
      condition: {
        dependsOn: 'figure_source',
        showWhen: 'custom_design',
      },
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'material',
      fieldType: 'card_selector',
      label: 'Material',
      required: true,
      priceModifier: 0,
      order: 5,
      config: {
        displayStyle: 'simple_cards',
        layout: 'vertical',
        options: [
          { value: 'pla', label: 'PLA (estándar)', description: 'Buena calidad, económico' },
          { value: 'resin', label: 'Resina', priceModifier: 10, description: 'Alto detalle', badge: 'Recomendado' },
          { value: 'resin_premium', label: 'Resina Premium', priceModifier: 20, description: 'Máximo detalle' },
        ],
      },
    },
    {
      id: 'size',
      fieldType: 'dropdown',
      label: 'Altura',
      required: true,
      priceModifier: 0,
      order: 6,
      config: {
        options: [
          { value: '5cm', label: '5 cm (miniatura)' },
          { value: '10cm', label: '10 cm (Popular)' },
          { value: '15cm', label: '15 cm', priceModifier: 10 },
          { value: '20cm', label: '20 cm', priceModifier: 20 },
          { value: '25cm', label: '25 cm', priceModifier: 35 },
        ],
      },
    },
    {
      id: 'painting',
      fieldType: 'card_selector',
      label: 'Pintado',
      required: true,
      priceModifier: 0,
      order: 7,
      config: {
        displayStyle: 'simple_cards',
        layout: 'vertical',
        options: [
          { value: 'none', label: 'Sin pintar (gris/blanco)' },
          { value: 'primed', label: 'Imprimado (listo para pintar)', priceModifier: 5 },
          { value: 'basic', label: 'Pintado básico', priceModifier: 15 },
          { value: 'premium', label: 'Pintado premium', priceModifier: 30, badge: 'Pro' },
        ],
      },
    },
    {
      id: 'base',
      fieldType: 'checkbox',
      label: 'Incluir base/peana',
      required: false,
      priceModifier: 5,
      order: 8,
      config: {
        description: 'Base decorativa para exhibir la figura',
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 9,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 20 },
          { value: '2', label: '2 unidades', unitPriceOverride: 18 },
          { value: '5', label: '5 unidades', unitPriceOverride: 15 },
        ],
      },
    },
  ],
};

// --- MAQUETAS Y PROTOTIPOS ---
export const MAQUETAS_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'project_type',
      fieldType: 'card_selector',
      label: 'Tipo de proyecto',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'architectural', label: 'Maqueta arquitectónica', icon: '🏠' },
          { value: 'product', label: 'Prototipo de producto', icon: '📦' },
          { value: 'mechanical', label: 'Pieza mecánica', icon: '⚙️' },
          { value: 'educational', label: 'Modelo educativo', icon: '🎓' },
          { value: 'art', label: 'Escultura/Arte', icon: '🎨' },
        ],
      },
    },
    {
      id: 'file_source',
      fieldType: 'card_selector',
      label: '¿Tienes el archivo 3D?',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'yes', label: 'Sí, lo subiré', icon: '📁' },
          { value: 'need_model', label: 'No, necesito modelado', icon: '🎨', priceModifier: 50 },
        ],
      },
    },
    {
      id: 'file_3d',
      fieldType: 'image_upload',
      label: 'Archivo 3D',
      required: true,
      priceModifier: 0,
      order: 3,
      condition: {
        dependsOn: 'file_source',
        showWhen: 'yes',
      },
      config: {
        maxSizeMB: 200,
        allowedFormats: ['stl', 'obj', '3mf', 'step', 'stp'],
        showPreview: false,
        helpText: 'STL, OBJ, 3MF, STEP',
      },
    },
    {
      id: 'project_description',
      fieldType: 'text_input',
      label: 'Describe el proyecto',
      required: true,
      priceModifier: 0,
      order: 3,
      condition: {
        dependsOn: 'file_source',
        showWhen: 'need_model',
      },
      config: {
        placeholder: 'Describe qué necesitas, medidas aproximadas, uso...',
        maxLength: 1000,
        showCharCounter: true,
      },
    },
    {
      id: 'reference_files',
      fieldType: 'image_upload',
      label: 'Planos o imágenes de referencia',
      required: false,
      priceModifier: 0,
      order: 4,
      condition: {
        dependsOn: 'file_source',
        showWhen: 'need_model',
      },
      config: {
        maxSizeMB: 20,
        allowedFormats: ['jpg', 'jpeg', 'png', 'pdf'],
        showPreview: true,
      },
    },
    {
      id: 'material',
      fieldType: 'card_selector',
      label: 'Material',
      required: true,
      priceModifier: 0,
      order: 5,
      config: {
        displayStyle: 'simple_cards',
        layout: 'vertical',
        options: [
          { value: 'pla', label: 'PLA', description: 'Estándar, fácil postproceso' },
          { value: 'petg', label: 'PETG', priceModifier: 5, description: 'Resistente, flexible' },
          { value: 'abs', label: 'ABS', priceModifier: 5, description: 'Resistente al calor' },
          { value: 'resin', label: 'Resina', priceModifier: 15, description: 'Alto detalle' },
          { value: 'nylon', label: 'Nylon', priceModifier: 20, description: 'Industrial' },
        ],
      },
    },
    {
      id: 'scale',
      fieldType: 'dropdown',
      label: 'Escala',
      required: true,
      priceModifier: 0,
      order: 6,
      config: {
        options: [
          { value: '1:100', label: '1:100 (edificios grandes)' },
          { value: '1:50', label: '1:50 (casas)', priceModifier: 10 },
          { value: '1:25', label: '1:25 (detallado)', priceModifier: 25 },
          { value: '1:1', label: '1:1 (tamaño real)', description: 'Prototipos' },
          { value: 'custom', label: 'Escala personalizada' },
        ],
      },
    },
    {
      id: 'finish',
      fieldType: 'dropdown',
      label: 'Acabado',
      required: true,
      priceModifier: 0,
      order: 7,
      config: {
        options: [
          { value: 'raw', label: 'Sin acabado' },
          { value: 'sanded', label: 'Lijado', priceModifier: 10 },
          { value: 'primed', label: 'Imprimado', priceModifier: 15 },
          { value: 'painted', label: 'Pintado completo', priceModifier: 40 },
        ],
      },
    },
    {
      id: 'urgency',
      fieldType: 'radio_group',
      label: 'Plazo de entrega',
      required: true,
      priceModifier: 0,
      order: 8,
      config: {
        layout: 'vertical',
        options: [
          { value: 'standard', label: 'Estándar (7-10 días laborables)' },
          { value: 'express', label: 'Express (3-5 días)', priceModifier: 30 },
          { value: 'urgent', label: 'Urgente (1-2 días)', priceModifier: 60 },
        ],
      },
    },
  ],
};

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export const ALL_PRODUCT_SCHEMAS = {
  // Productos Gráficos
  flyers: FLYERS_SCHEMA,
  imanes: IMANES_SCHEMA,
  cartelesEventos: CARTELES_EVENTOS_SCHEMA,

  // Textiles
  delantales: DELANTALES_SCHEMA,

  // Sublimación
  alfombrillas: ALFOMBRILLAS_SCHEMA,
  posavasos: POSAVASOS_SCHEMA,
  decoracionSublimada: DECORACION_SUBLIMADA_SCHEMA,

  // Corte Láser
  decoracionMadera: DECORACION_MADERA_SCHEMA,
  senalizacion: SENALIZACION_SCHEMA,
  cajasMadera: CAJAS_MADERA_SCHEMA,

  // Eventos
  banderines: BANDERINES_SCHEMA,
  meseros: MESEROS_SCHEMA,

  // Papelería
  cuadernos: CUADERNOS_SCHEMA,
  papelRegalo: PAPEL_REGALO_SCHEMA,

  // Impresión 3D
  figurasGaming: FIGURAS_GAMING_SCHEMA,
  maquetas: MAQUETAS_SCHEMA,
};

// Lista completa para el selector del admin
export const ALL_SCHEMA_OPTIONS = [
  // Productos Gráficos
  { value: 'flyers', label: '📰 Flyers y Folletos', category: 'Productos Gráficos' },
  { value: 'imanes', label: '🧲 Imanes Personalizados', category: 'Productos Gráficos' },
  { value: 'cartelesEventos', label: '📋 Carteles para Eventos', category: 'Productos Gráficos' },

  // Textiles
  { value: 'delantales', label: '👨‍🍳 Delantales', category: 'Textiles' },

  // Sublimación
  { value: 'alfombrillas', label: '🖱️ Alfombrillas de Ratón', category: 'Sublimación' },
  { value: 'posavasos', label: '🍵 Posavasos', category: 'Sublimación' },
  { value: 'decoracionSublimada', label: '🖼️ Decoración Sublimada', category: 'Sublimación' },

  // Corte Láser
  { value: 'decoracionMadera', label: '🌳 Decoración en Madera', category: 'Corte Láser' },
  { value: 'senalizacion', label: '🪧 Señalización', category: 'Corte Láser' },
  { value: 'cajasMadera', label: '📦 Cajas de Madera', category: 'Corte Láser' },

  // Eventos
  { value: 'banderines', label: '🎏 Banderines y Guirnaldas', category: 'Eventos' },
  { value: 'meseros', label: '🔢 Meseros / Números de Mesa', category: 'Eventos' },

  // Papelería
  { value: 'cuadernos', label: '📓 Cuadernos y Libretas', category: 'Papelería' },
  { value: 'papelRegalo', label: '🎀 Papel de Regalo', category: 'Papelería' },

  // Impresión 3D
  { value: 'figurasGaming', label: '🎮 Figuras Gaming/Anime', category: 'Impresión 3D' },
  { value: 'maquetas', label: '🏗️ Maquetas y Prototipos', category: 'Impresión 3D' },
];
