// src/components/customizer/mug/types.ts

export interface MugDesignElement {
  id: string;
  type: 'text' | 'image' | 'clipart' | 'background';
  x: number; // Posición X en % (0-100)
  y: number; // Posición Y en % (0-100)
  width: number; // Ancho en % (0-100)
  height: number; // Alto en % (0-100)
  rotation: number; // Grados (0-360)
  zIndex: number;

  // Para texto
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';

  // Para imágenes/cliparts
  imageUrl?: string;
  imageData?: string; // Base64

  // Para background
  backgroundColor?: string;
  backgroundPattern?: string;
}

export interface Mug3DColors {
  body: string; // Color del cuerpo de la taza (hex)
  handle: string; // Color del asa (hex)
  interior: string; // Color interior de la taza (hex)
}

export interface MugCustomizationData {
  // Opciones del producto
  material: 'standard' | 'magic';
  printArea: 'double_side' | '360';
  color: string; // ID del color seleccionado
  size?: 'small' | 'medium' | 'large';

  // Colores personalizables 3D
  mugColors?: Mug3DColors;

  // Elementos de diseño
  elements: MugDesignElement[];

  // Lados (para double_side)
  frontElements?: MugDesignElement[];
  backElements?: MugDesignElement[];

  // Template aplicado (si hay)
  templateId?: string;
}

export interface MugColorOption {
  id: string;
  name: string;
  primaryColor: string; // Color principal de la taza
  accentColor?: string; // Color del asa/interior
  priceModifier: number;
  previewImage?: string; // Imagen de preview de la taza en este color
  isMagic?: boolean; // Es color mágico
}

export interface MugMaterialOption {
  id: 'standard' | 'magic';
  name: string;
  description: string;
  priceModifier: number;
  icon?: string;
}

export interface MugPrintAreaOption {
  id: 'double_side' | '360';
  name: string;
  description: string;
  priceModifier: number;
  icon?: string;
}

export interface MugTemplate {
  id: string;
  name: string;
  category: string;
  thumbnail: string;
  elements: MugDesignElement[];
  tags: string[];
}

export interface MugClipart {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  tags: string[];
  premium?: boolean;
}

export type MugTool =
  | 'text'
  | 'names'
  | 'uploads'
  | 'graphics'
  | 'background'
  | 'template'
  | 'tables'
  | 'color';

export interface MugCanvasState {
  zoom: number; // 0.5 - 3.0
  rotation: number; // 0 - 360 (para rotar la vista de la taza)
  showSafeArea: boolean;
  showMargins: boolean;
  showGrid: boolean;
}
