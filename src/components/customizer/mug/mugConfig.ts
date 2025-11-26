// src/components/customizer/mug/mugConfig.ts

import type {
  MugColorOption,
  MugMaterialOption,
  MugPrintAreaOption,
  MugTemplate,
  MugClipart,
} from './types';

// ============================================================================
// MATERIALES
// ============================================================================

export const MUG_MATERIALS: MugMaterialOption[] = [
  {
    id: 'standard',
    name: 'Estándar',
    description: 'Cerámica de alta calidad',
    priceModifier: 0,
    icon: '☕',
  },
  {
    id: 'magic',
    name: 'Mágica',
    description: 'Cambia de color con el calor',
    priceModifier: 3.5,
    icon: '✨',
  },
];

// ============================================================================
// ÁREAS DE IMPRESIÓN
// ============================================================================

export const MUG_PRINT_AREAS: MugPrintAreaOption[] = [
  {
    id: 'double_side',
    name: 'Impresión a doble cara',
    description: 'Diseño en frente y atrás',
    priceModifier: -0.7,
  },
  {
    id: '360',
    name: 'Impresión 360°',
    description: 'Diseño envuelve toda la taza',
    priceModifier: 0,
  },
];

// ============================================================================
// COLORES
// ============================================================================

export const MUG_COLORS: MugColorOption[] = [
  {
    id: 'white',
    name: 'Blanco',
    primaryColor: '#FFFFFF',
    priceModifier: -0.7,
    previewImage: '/images/mugs/white-mug.png',
  },
  {
    id: 'blue-white',
    name: 'Azul y blanco',
    primaryColor: '#3B82F6',
    accentColor: '#FFFFFF',
    priceModifier: 0,
    previewImage: '/images/mugs/blue-white-mug.png',
  },
  {
    id: 'black-white',
    name: 'Blanco y negro',
    primaryColor: '#FFFFFF',
    accentColor: '#000000',
    priceModifier: 0,
    previewImage: '/images/mugs/black-white-mug.png',
  },
  {
    id: 'red-white',
    name: 'Rojo y blanco',
    primaryColor: '#EF4444',
    accentColor: '#FFFFFF',
    priceModifier: 0,
    previewImage: '/images/mugs/red-white-mug.png',
  },
  {
    id: 'pink-white',
    name: 'Rosa y blanco',
    primaryColor: '#EC4899',
    accentColor: '#FFFFFF',
    priceModifier: 3.6,
    previewImage: '/images/mugs/pink-white-mug.png',
  },
  {
    id: 'orange-white',
    name: 'Naranja y blanco',
    primaryColor: '#F97316',
    accentColor: '#FFFFFF',
    priceModifier: 0,
    previewImage: '/images/mugs/orange-white-mug.png',
  },
  {
    id: 'yellow-white',
    name: 'Amarillo y blanco',
    primaryColor: '#FACC15',
    accentColor: '#FFFFFF',
    priceModifier: 0,
    previewImage: '/images/mugs/yellow-white-mug.png',
  },
  {
    id: 'green-white',
    name: 'Verde y blanco',
    primaryColor: '#10B981',
    accentColor: '#FFFFFF',
    priceModifier: 0,
    previewImage: '/images/mugs/green-white-mug.png',
  },
  {
    id: 'magic-black-white',
    name: 'Mágica: blanco y negro',
    primaryColor: '#000000',
    accentColor: '#FFFFFF',
    priceModifier: 0,
    isMagic: true,
    previewImage: '/images/mugs/magic-black-white-mug.png',
  },
];

// ============================================================================
// TAMAÑOS
// ============================================================================

export const MUG_SIZES = [
  {
    id: 'small',
    label: 'Pequeña (250ml)',
    value: 'small',
    priceModifier: 0,
    dimensions: { height: 8, diameter: 7.5 },
  },
  {
    id: 'medium',
    label: 'Mediana (350ml)',
    value: 'medium',
    priceModifier: 2,
    dimensions: { height: 10, diameter: 8.5 },
  },
  {
    id: 'large',
    label: 'Grande (500ml)',
    value: 'large',
    priceModifier: 4,
    dimensions: { height: 12, diameter: 9.5 },
  },
];

// ============================================================================
// DIMENSIONES DE ÁREA DE IMPRESIÓN
// ============================================================================

export const MUG_PRINT_DIMENSIONS = {
  // Para impresión 360° - Área total de asa a asa
  '360': {
    width: 21.0, // cm (210mm) - De asa a asa
    height: 9.5, // cm (95mm) - Altura total
    safeMargin: 0.5, // cm desde los bordes
  },
  // Para impresión doble cara
  double_side: {
    front: {
      width: 9.5, // cm
      height: 9.5, // cm
      safeMargin: 0.5,
    },
    back: {
      width: 9.5, // cm
      height: 9.5, // cm
      safeMargin: 0.5,
    },
  },
};

// ============================================================================
// PLANTILLAS PREDEFINIDAS
// ============================================================================

export const MUG_TEMPLATES: MugTemplate[] = [
  {
    id: 'love-photo',
    name: 'Love Photo',
    category: 'Romántico',
    thumbnail: '/images/templates/love-photo.jpg',
    elements: [
      {
        id: 'bg-1',
        type: 'background',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        zIndex: 0,
        backgroundColor: '#FFFFFF',
      },
      {
        id: 'text-1',
        type: 'text',
        x: 50,
        y: 70,
        width: 60,
        height: 15,
        rotation: 0,
        zIndex: 2,
        text: 'love',
        fontSize: 48,
        fontFamily: 'Brush Script MT',
        color: '#FFFFFF',
        align: 'center',
        italic: true,
      },
    ],
    tags: ['amor', 'romántico', 'foto', 'pareja'],
  },
  {
    id: 'good-morning',
    name: '¡Gur morning!',
    category: 'Divertido',
    thumbnail: '/images/templates/good-morning.jpg',
    elements: [
      {
        id: 'bg-1',
        type: 'background',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        zIndex: 0,
        backgroundColor: '#000000',
      },
      {
        id: 'text-1',
        type: 'text',
        x: 30,
        y: 35,
        width: 40,
        height: 20,
        rotation: 0,
        zIndex: 2,
        text: '¡Gur morning!\nbiutiful pipol',
        fontSize: 24,
        fontFamily: 'Arial',
        color: '#FFFFFF',
        align: 'left',
        bold: true,
      },
    ],
    tags: ['divertido', 'buenos días', 'humor'],
  },
  {
    id: 'minimalist',
    name: 'Minimalista',
    category: 'Moderno',
    thumbnail: '/images/templates/minimalist.jpg',
    elements: [
      {
        id: 'bg-1',
        type: 'background',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        zIndex: 0,
        backgroundColor: '#F3F4F6',
      },
    ],
    tags: ['simple', 'minimalista', 'moderno'],
  },
];

// ============================================================================
// CLIPARTS / GRÁFICOS
// ============================================================================

export const MUG_CLIPARTS: MugClipart[] = [
  {
    id: 'heart-1',
    name: 'Corazón Rojo',
    category: 'Amor',
    imageUrl: '/images/cliparts/heart-red.svg',
    tags: ['amor', 'corazón', 'romántico'],
  },
  {
    id: 'coffee-cup',
    name: 'Taza de Café',
    category: 'Bebidas',
    imageUrl: '/images/cliparts/coffee-cup.svg',
    tags: ['café', 'bebida', 'taza'],
  },
  {
    id: 'star-1',
    name: 'Estrella Dorada',
    category: 'Formas',
    imageUrl: '/images/cliparts/star-gold.svg',
    tags: ['estrella', 'dorado', 'brillante'],
  },
  {
    id: 'flower-1',
    name: 'Flor Primavera',
    category: 'Naturaleza',
    imageUrl: '/images/cliparts/flower-spring.svg',
    tags: ['flor', 'naturaleza', 'primavera'],
  },
  {
    id: 'crown-1',
    name: 'Corona Real',
    category: 'Premium',
    imageUrl: '/images/cliparts/crown.svg',
    tags: ['corona', 'rey', 'reina'],
    premium: true,
  },
];

// ============================================================================
// FUENTES DISPONIBLES
// ============================================================================

export const MUG_FONTS = [
  { value: 'Arial', label: 'Arial', style: 'sans-serif' },
  { value: 'Times New Roman', label: 'Times New Roman', style: 'serif' },
  { value: 'Courier New', label: 'Courier New', style: 'monospace' },
  { value: 'Georgia', label: 'Georgia', style: 'serif' },
  { value: 'Verdana', label: 'Verdana', style: 'sans-serif' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS', style: 'cursive' },
  { value: 'Brush Script MT', label: 'Brush Script', style: 'cursive' },
  { value: 'Impact', label: 'Impact', style: 'sans-serif' },
  { value: 'Palatino', label: 'Palatino', style: 'serif' },
];

// ============================================================================
// COLORES DE TEXTO POPULARES
// ============================================================================

export const TEXT_COLORS = [
  { name: 'Negro', value: '#000000' },
  { name: 'Blanco', value: '#FFFFFF' },
  { name: 'Rojo', value: '#EF4444' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Amarillo', value: '#FACC15' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Morado', value: '#9333EA' },
  { name: 'Naranja', value: '#F97316' },
  { name: 'Gris', value: '#6B7280' },
];
