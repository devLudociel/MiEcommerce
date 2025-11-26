/**
 * Posiciones preestablecidas para diseños en tazas
 *
 * Coordenadas estándar para personalización de tazas cilíndricas.
 * Facilita que clientes posicionen sus diseños de manera profesional.
 */

export interface MugPresetPosition {
  id: string;
  label: string;
  labelShort: string;
  description: string;
  // Coordenadas relativas al área de impresión (0-100%)
  x: number; // Horizontal: 0=izquierda, 50=centro, 100=derecha
  y: number; // Vertical: 0=arriba, 50=centro, 100=abajo
  scale: number; // Tamaño: 0.3=pequeño, 0.6=mediano, 0.9=grande
}

/**
 * Posiciones preestablecidas para tazas
 *
 * El área de impresión de una taza típica es ~210mm × 95mm (asa a asa)
 */
export const MUG_POSITIONS: MugPresetPosition[] = [
  {
    id: 'center',
    label: 'Centro',
    labelShort: 'Centro',
    description: 'Centrado perfectamente en la taza',
    x: 50,
    y: 50,
    scale: 0.6,
  },
  {
    id: 'center-large',
    label: 'Centro Grande',
    labelShort: 'Grande',
    description: 'Diseño grande centrado, ocupa más espacio',
    x: 50,
    y: 50,
    scale: 0.8,
  },
  {
    id: 'top-center',
    label: 'Arriba Centro',
    labelShort: 'Arriba',
    description: 'Parte superior de la taza, centrado',
    x: 50,
    y: 30,
    scale: 0.5,
  },
  {
    id: 'bottom-center',
    label: 'Abajo Centro',
    labelShort: 'Abajo',
    description: 'Parte inferior de la taza, centrado',
    x: 50,
    y: 70,
    scale: 0.5,
  },
  {
    id: 'left',
    label: 'Lado Izquierdo',
    labelShort: 'Izquierda',
    description: 'Lado izquierdo de la taza (visto de frente)',
    x: 25,
    y: 50,
    scale: 0.5,
  },
  {
    id: 'right',
    label: 'Lado Derecho',
    labelShort: 'Derecha',
    description: 'Lado derecho de la taza (visto de frente)',
    x: 75,
    y: 50,
    scale: 0.5,
  },
  {
    id: 'wrap',
    label: 'Diseño Envolvente',
    labelShort: 'Envolvente',
    description: 'Diseño grande que rodea la taza (360°)',
    x: 50,
    y: 50,
    scale: 0.9,
  },
  {
    id: 'small-logo',
    label: 'Logo Pequeño',
    labelShort: 'Logo',
    description: 'Diseño pequeño tipo logo o icono',
    x: 50,
    y: 50,
    scale: 0.35,
  },
];

/**
 * Buscar posición por ID
 */
export function getMugPositionById(id: string): MugPresetPosition | undefined {
  return MUG_POSITIONS.find(pos => pos.id === id);
}

/**
 * Posiciones más usadas (para mostrar primero)
 */
export const POPULAR_MUG_POSITIONS = [
  'center',
  'center-large',
  'wrap',
  'top-center',
  'bottom-center',
  'small-logo',
];
