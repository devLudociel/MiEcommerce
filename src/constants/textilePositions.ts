/**
 * Posiciones preestablecidas para diseños en textiles
 *
 * Coordenadas estándar usadas comúnmente en producción de ropa personalizada.
 * Facilita que clientes y admins usen ubicaciones consistentes.
 */

import type { ImageTransform } from '../types/customization';

export interface PresetPosition {
  id: string;
  label: string;
  labelShort: string; // Versión corta para botones
  description: string;
  transform: Omit<ImageTransform, 'rotation'>; // rotation siempre es 0 en presets
  icon?: string; // Nombre del icono (opcional)
}

/**
 * Posiciones para vista FRONTAL
 */
export const FRONT_POSITIONS: PresetPosition[] = [
  {
    id: 'center-chest',
    label: 'Centro Pecho',
    labelShort: 'Centro',
    description: 'Centrado en el pecho, tamaño mediano',
    transform: { x: 50, y: 35, scale: 0.6 },
  },
  {
    id: 'left-chest',
    label: 'Bolsillo Izquierdo',
    labelShort: 'Bolsillo Izq',
    description: 'Esquina superior izquierda, tamaño pequeño (como logo)',
    transform: { x: 30, y: 25, scale: 0.3 },
  },
  {
    id: 'right-chest',
    label: 'Bolsillo Derecho',
    labelShort: 'Bolsillo Der',
    description: 'Esquina superior derecha, tamaño pequeño (como logo)',
    transform: { x: 70, y: 25, scale: 0.3 },
  },
  {
    id: 'full-front',
    label: 'Estampado Completo Frontal',
    labelShort: 'Completo',
    description: 'Área grande centrada, para diseños grandes',
    transform: { x: 50, y: 40, scale: 0.85 },
  },
  {
    id: 'lower-front',
    label: 'Parte Baja Frontal',
    labelShort: 'Bajo',
    description: 'Centrado en la parte inferior del frente',
    transform: { x: 50, y: 60, scale: 0.5 },
  },
];

/**
 * Posiciones para vista TRASERA
 */
export const BACK_POSITIONS: PresetPosition[] = [
  {
    id: 'upper-back',
    label: 'Espalda Alta',
    labelShort: 'Arriba',
    description: 'Parte superior de la espalda',
    transform: { x: 50, y: 25, scale: 0.7 },
  },
  {
    id: 'center-back',
    label: 'Centro Espalda',
    labelShort: 'Centro',
    description: 'Centrado en la espalda, tamaño mediano-grande',
    transform: { x: 50, y: 40, scale: 0.75 },
  },
  {
    id: 'lower-back',
    label: 'Espalda Baja',
    labelShort: 'Abajo',
    description: 'Parte inferior de la espalda',
    transform: { x: 50, y: 60, scale: 0.5 },
  },
  {
    id: 'full-back',
    label: 'Estampado Completo Trasero',
    labelShort: 'Completo',
    description: 'Área grande centrada en la espalda',
    transform: { x: 50, y: 40, scale: 0.85 },
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
  return [...FRONT_POSITIONS, ...BACK_POSITIONS].find(pos => pos.id === id);
}
