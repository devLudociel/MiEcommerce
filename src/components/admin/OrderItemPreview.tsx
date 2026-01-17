/**
 * OrderItemPreview - Muestra mockup visual de productos personalizados en órdenes
 *
 * Renderiza el producto exactamente como lo ve el cliente:
 * - Imagen base del producto (mockup)
 * - Imágenes subidas por el cliente aplicadas con transformaciones
 * - Útil para producción: ver resultado final sin adivinar coordenadas
 */

import React, { useState } from 'react';
import {
  FRONT_POSITIONS,
  BACK_POSITIONS,
  getContainerTransform,
  type PresetPosition,
} from '../../constants/textilePositions';

interface ImageTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

/**
 * Detecta si las coordenadas coinciden con alguna posición preset
 * @param transform - Transformación actual de la imagen
 * @param side - Lado activo (front o back)
 * @returns PresetPosition si se detecta coincidencia, null si no
 */
function detectPresetPosition(
  transform: ImageTransform,
  side: 'front' | 'back'
): PresetPosition | null {
  const positions = side === 'front' ? FRONT_POSITIONS : BACK_POSITIONS;
  const tolerance = 3; // Margen de error en porcentaje
  const scaleTolerance = 0.05; // Margen de error en escala

  for (const preset of positions) {
    const containerTransform = getContainerTransform(preset);

    // Comparar coordenadas con tolerancia
    const xMatch = Math.abs(transform.x - containerTransform.x) <= tolerance;
    const yMatch = Math.abs(transform.y - containerTransform.y) <= tolerance;
    const scaleMatch = Math.abs(transform.scale - containerTransform.scale) <= scaleTolerance;

    if (xMatch && yMatch && scaleMatch) {
      return preset;
    }
  }

  return null;
}

interface CustomizationValue {
  fieldLabel?: string;
  fieldId?: string;
  value?: string;
  imageUrl?: string;
  imagePath?: string;
  imageTransform?: ImageTransform;
}

interface OrderItemCustomization {
  values?: CustomizationValue[];
}

interface OrderItemData {
  customization?: OrderItemCustomization;
  [key: string]: unknown;
}

interface OrderItemPreviewProps {
  item: OrderItemData;
  signedUrls?: Record<string, string>;
}

function extractStoragePath(url: string): string | null {
  if (!url) return null;
  if (url.startsWith('gs://')) {
    return url.replace(/^gs:\/\/[^/]+\//, '');
  }
  const parts = url.split('/o/');
  if (parts.length < 2) return null;
  return decodeURIComponent(parts[1].split('?')[0]);
}

export default function OrderItemPreview({ item, signedUrls }: OrderItemPreviewProps) {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');

  if (!item.customization?.values) {
    return null;
  }

  // Extraer información de personalización
  const values = item.customization.values;

  // Buscar color seleccionado
  const colorField = values.find(
    (v: CustomizationValue) =>
      v.fieldLabel?.toLowerCase().includes('color') || v.fieldId?.toLowerCase().includes('color')
  );
  const selectedColor = colorField?.value?.toLowerCase();

  // Buscar imágenes subidas
  const frontImageField = values.find((v: CustomizationValue) => {
    const hasImage = Boolean(v.imageUrl || v.imagePath);
    return (
      hasImage &&
      (v.fieldLabel?.toLowerCase().includes('front') ||
        v.fieldLabel?.toLowerCase().includes('frontal') ||
        v.fieldLabel?.toLowerCase().includes('delantera'))
    );
  });

  const backImageField = values.find((v: CustomizationValue) => {
    const hasImage = Boolean(v.imageUrl || v.imagePath);
    return (
      hasImage &&
      (v.fieldLabel?.toLowerCase().includes('back') ||
        v.fieldLabel?.toLowerCase().includes('trasera') ||
        v.fieldLabel?.toLowerCase().includes('espalda'))
    );
  });

  // Si no hay imágenes subidas, no mostrar preview
  if (!frontImageField && !backImageField) {
    return null;
  }

  // NOTA: Las imágenes base deberían venir del schema del producto
  // Por ahora, usamos placeholders. Idealmente esto vendría de la orden.
  const getFallbackBaseImage = (side: 'front' | 'back') => {
    // Esto debería obtenerse del schema guardado en la orden
    // Por ahora retornamos null para usar un placeholder
    return null;
  };

  const frontBaseImage = getFallbackBaseImage('front');
  const backBaseImage = getFallbackBaseImage('back');

  const resolveImageUrl = (field?: CustomizationValue): string | null => {
    if (!field) return null;
    if (field.imageUrl && field.imageUrl.startsWith('data:')) return field.imageUrl;
    const path = field.imagePath || (field.imageUrl ? extractStoragePath(field.imageUrl) : null);
    if (path) {
      return signedUrls?.[path] || null;
    }
    return field.imageUrl || null;
  };

  const userFrontImage = resolveImageUrl(frontImageField);
  const userBackImage = resolveImageUrl(backImageField);

  const frontTransform: ImageTransform = frontImageField?.imageTransform || {
    x: 50,
    y: 50,
    scale: 1,
    rotation: 0,
  };

  const backTransform: ImageTransform = backImageField?.imageTransform || {
    x: 50,
    y: 50,
    scale: 1,
    rotation: 0,
  };

  const activeImage = activeSide === 'front' ? userFrontImage : userBackImage;
  const activeTransform = activeSide === 'front' ? frontTransform : backTransform;
  const activeBaseImage = activeSide === 'front' ? frontBaseImage : backBaseImage;

  // Detectar posiciones preset
  const detectedFrontPreset = userFrontImage ? detectPresetPosition(frontTransform, 'front') : null;
  const detectedBackPreset = userBackImage ? detectPresetPosition(backTransform, 'back') : null;
  const activePreset = activeSide === 'front' ? detectedFrontPreset : detectedBackPreset;

  return (
    <div className="mt-4 p-4 bg-white border-2 border-purple-300 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-gray-800">Vista de Producción</h4>

        {/* Toggle Front/Back si tiene ambas imágenes */}
        {userFrontImage && userBackImage && (
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSide('front')}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${
                activeSide === 'front'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Frente
            </button>
            <button
              onClick={() => setActiveSide('back')}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${
                activeSide === 'back'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Espalda
            </button>
          </div>
        )}
      </div>

      {/* Mockup Preview - Vista de producción realista */}
      <div
        className="relative w-full bg-white rounded-lg border-2 border-gray-200 overflow-hidden"
        style={{ aspectRatio: '1/1', maxWidth: '500px', margin: '0 auto' }}
      >
        {/* Base image (mockup de camiseta) */}
        {activeBaseImage ? (
          <img
            src={activeBaseImage}
            alt={`Vista ${activeSide}`}
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          /* Área de impresión simulada si no hay mockup base */
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Grid de referencia para producción */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                linear-gradient(to right, rgba(200,200,200,0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(200,200,200,0.1) 1px, transparent 1px)
              `,
                backgroundSize: '20px 20px',
              }}
            />

            {/* Área de impresión destacada (centro) */}
            <div className="absolute inset-[15%] border-2 border-dashed border-purple-300 rounded-lg bg-white/50 flex items-center justify-center">
              <div className="text-center text-gray-400 pointer-events-none">
                <p className="text-xs font-semibold mb-1">ÁREA DE IMPRESIÓN</p>
                <p className="text-[10px]">Vista previa del diseño</p>
              </div>
            </div>
          </div>
        )}

        {/* User uploaded image con transformaciones REALISTAS */}
        {activeImage && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              zIndex: 10,
              overflow: 'hidden',
            }}
          >
            <div
              className="relative"
              style={{
                width: '70%',
                height: '70%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={activeImage}
                alt={`Diseño ${activeSide}`}
                className="max-w-full max-h-full object-contain"
                style={{
                  transform: `
                    translate(${(activeTransform.x - 50) * 5}px, ${(activeTransform.y - 50) * 5}px)
                    scale(${activeTransform.scale})
                    rotate(${activeTransform.rotation}deg)
                  `,
                  transformOrigin: 'center center',
                  filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))',
                }}
              />
            </div>
          </div>
        )}

        {/* Guías de medición para producción */}
        <div className="absolute top-2 left-2 text-[10px] text-gray-400 bg-white/80 px-2 py-1 rounded">
          Vista 1:1
        </div>

        {/* Indicador de centro */}
        <div className="absolute top-1/2 left-1/2 w-4 h-4 -ml-2 -mt-2 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-red-400/30" />
          <div className="absolute left-1/2 top-0 w-[1px] h-full bg-red-400/30" />
        </div>
      </div>

      {/* Información técnica para producción - Mejorada */}
      <div className="mt-4 space-y-2">
        {/* Posición detectada */}
        {activePreset ? (
          <div className="p-3 bg-green-50 border-2 border-green-300 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-lg">📍</span>
              <div className="flex-1">
                <p className="font-bold text-green-900 text-sm mb-0.5">
                  Posición: {activePreset.label}
                </p>
                <p className="text-green-700 text-xs">{activePreset.description}</p>
                <p className="text-green-600 text-[10px] mt-1 font-medium">
                  ✓ Coincide con posición estándar (más fácil de producir)
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div className="flex-1">
                <p className="font-bold text-yellow-900 text-sm mb-0.5">Posición Personalizada</p>
                <p className="text-yellow-700 text-xs">
                  Esta posición NO coincide con ningún preset estándar.
                </p>
                <p className="text-yellow-600 text-[10px] mt-1 font-medium">
                  ⚡ Requiere ajuste manual según coordenadas exactas
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Datos técnicos de impresión */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="font-bold text-blue-900 text-xs mb-2 flex items-center gap-1">
            <span>📐</span> Datos técnicos de impresión
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2 rounded border border-blue-100">
              <p className="text-gray-500 text-[10px] mb-0.5">Posición X</p>
              <p className="font-bold text-blue-900">{activeTransform.x.toFixed(1)}%</p>
            </div>
            <div className="bg-white p-2 rounded border border-blue-100">
              <p className="text-gray-500 text-[10px] mb-0.5">Posición Y</p>
              <p className="font-bold text-blue-900">{activeTransform.y.toFixed(1)}%</p>
            </div>
            <div className="bg-white p-2 rounded border border-blue-100">
              <p className="text-gray-500 text-[10px] mb-0.5">Escala</p>
              <p className="font-bold text-blue-900">{(activeTransform.scale * 100).toFixed(0)}%</p>
            </div>
            <div className="bg-white p-2 rounded border border-blue-100">
              <p className="text-gray-500 text-[10px] mb-0.5">Rotación</p>
              <p className="font-bold text-blue-900">
                {activeTransform.rotation !== 0 ? `${activeTransform.rotation}°` : 'Sin rotación'}
              </p>
            </div>
          </div>

          {/* Alertas de producción */}
          {(activeTransform.scale > 2 ||
            activeTransform.scale < 0.3 ||
            Math.abs(activeTransform.rotation) > 45) && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 text-[10px] font-bold flex items-center gap-1">
                <span>⚠️</span> ADVERTENCIAS DE PRODUCCIÓN:
              </p>
              <ul className="mt-1 space-y-0.5 text-[10px] text-red-700">
                {activeTransform.scale > 2 && (
                  <li>
                    • Escala muy grande ({(activeTransform.scale * 100).toFixed(0)}%) - Puede perder
                    calidad
                  </li>
                )}
                {activeTransform.scale < 0.3 && (
                  <li>
                    • Escala muy pequeña ({(activeTransform.scale * 100).toFixed(0)}%) - Difícil de
                    imprimir
                  </li>
                )}
                {Math.abs(activeTransform.rotation) > 45 && (
                  <li>• Rotación extrema ({activeTransform.rotation}°) - Verificar orientación</li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Instrucciones rápidas */}
        {selectedColor && (
          <div className="p-2 bg-purple-50 border border-purple-200 rounded text-[10px] text-purple-800">
            <p className="font-bold mb-0.5">💡 Instrucción rápida:</p>
            <p>
              Imprimir en producto color{' '}
              <span className="font-bold uppercase">{selectedColor}</span> usando las coordenadas
              exactas arriba.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
