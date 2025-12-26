/**
 * Posiciones preestablecidas para diseños en textiles
 *
 * Coordenadas estándar usadas comúnmente en producción de ropa personalizada.
 * Facilita que clientes y admins usen ubicaciones consistentes.
 *
 * IMPORTANTE: Las coordenadas (x, y) son relativas al ÁREA DE IMPRESIÓN,
 * no al contenedor completo. Esto facilita posicionar diseños dentro del
 * espacio imprimible sin preocuparse por los márgenes del mockup.
 */

import type { ImageTransform } from '../types/customization';

export interface PresetPosition {
  id: string;
  label: string;
  labelShort: string; // Versión corta para botones
  description: string;
  // Coordenadas relativas al ÁREA DE IMPRESIÓN (0-100%)
  // Se convierten automáticamente a coordenadas del contenedor
  printAreaTransform: Omit<ImageTransform, 'rotation'>; // rotation siempre es 0 en presets
  icon?: string; // Nombre del icono (opcional)
}

/**
 * Convierte coordenadas del área de impresión a coordenadas del contenedor completo
 *
 * @param printAreaX - Coordenada X dentro del área de impresión (0-100%)
 * @param printAreaY - Coordenada Y dentro del área de impresión (0-100%)
 * @param printAreaPercentage - Tamaño del área de impresión relativo al contenedor (default 70%)
 * @returns Coordenadas en el sistema del contenedor completo
 */
export function printAreaToContainerCoords(
  printAreaX: number,
  printAreaY: number,
  printAreaPercentage: number = 70
): { x: number; y: number } {
  const offset = (100 - printAreaPercentage) / 2;
  return {
    x: offset + (printAreaPercentage * printAreaX) / 100,
    y: offset + (printAreaPercentage * printAreaY) / 100,
  };
}

/**
 * Convierte un PresetPosition con coordenadas del print area a coordenadas del contenedor
 */
export function getContainerTransform(
  preset: PresetPosition,
  printAreaPercentage: number = 70
): Omit<ImageTransform, 'rotation'> {
  const coords = printAreaToContainerCoords(
    preset.printAreaTransform.x,
    preset.printAreaTransform.y,
    printAreaPercentage
  );
  return {
    x: coords.x,
    y: coords.y,
    scale: preset.printAreaTransform.scale,
  };
}

/**
 * Posiciones para vista FRONTAL
 *
 * Coordenadas relativas al área de impresión (0-100%):
 * - x=0 → borde izquierdo del área de impresión
 * - x=100 → borde derecho del área de impresión
 * - y=0 → borde superior del área de impresión
 * - y=100 → borde inferior del área de impresión
 */
export const FRONT_POSITIONS: PresetPosition[] = [
  {
    id: 'center-chest',
    label: 'Centro Pecho',
    labelShort: 'Centro',
    description: 'Centrado en el pecho, parte superior del área de impresión',
    printAreaTransform: { x: 50, y: 25, scale: 0.6 },
  },
  {
    id: 'left-chest',
    label: 'Bolsillo Izquierdo',
    labelShort: 'Bolsillo Izq',
    description: 'Esquina superior izquierda del área de impresión, tamaño pequeño (como logo)',
    printAreaTransform: { x: 25, y: 20, scale: 0.35 },
  },
  {
    id: 'right-chest',
    label: 'Bolsillo Derecho',
    labelShort: 'Bolsillo Der',
    description: 'Esquina superior derecha del área de impresión, tamaño pequeño (como logo)',
    printAreaTransform: { x: 75, y: 20, scale: 0.35 },
  },
  {
    id: 'full-front',
    label: 'Estampado Completo Frontal',
    labelShort: 'Completo',
    description: 'Usa casi toda el área de impresión para diseños grandes',
    printAreaTransform: { x: 50, y: 50, scale: 0.9 },
  },
  {
    id: 'lower-front',
    label: 'Parte Baja Frontal',
    labelShort: 'Bajo',
    description: 'Centrado en la parte inferior del área de impresión',
    printAreaTransform: { x: 50, y: 75, scale: 0.5 },
  },
];

/**
 * Posiciones para vista TRASERA
 *
 * Coordenadas relativas al área de impresión (0-100%)
 */
export const BACK_POSITIONS: PresetPosition[] = [
  {
    id: 'upper-back',
    label: 'Espalda Alta',
    labelShort: 'Arriba',
    description: 'Parte superior del área de impresión trasera',
    printAreaTransform: { x: 50, y: 20, scale: 0.7 },
  },
  {
    id: 'center-back',
    label: 'Centro Espalda',
    labelShort: 'Centro',
    description: 'Centrado en el área de impresión trasera',
    printAreaTransform: { x: 50, y: 50, scale: 0.75 },
  },
  {
    id: 'lower-back',
    label: 'Espalda Baja',
    labelShort: 'Abajo',
    description: 'Parte inferior del área de impresión trasera',
    printAreaTransform: { x: 50, y: 75, scale: 0.5 },
  },
  {
    id: 'full-back',
    label: 'Estampado Completo Trasero',
    labelShort: 'Completo',
    description: 'Usa casi toda el área de impresión trasera',
    printAreaTransform: { x: 50, y: 50, scale: 0.9 },
  },
];

/**
 * Obtener posiciones según el lado activo
 */
export function getPositionsForSide(side: 'front' | 'back'): PresetPosition[] {
  return side === 'front' ? FRONT_POSITIONS : BACK_POSITIONS;
}

/**
 * Buscar posición por ID
 */
export function getPositionById(id: string): PresetPosition | undefined {
  return [...FRONT_POSITIONS, ...BACK_POSITIONS].find((pos) => pos.id === id);
}
