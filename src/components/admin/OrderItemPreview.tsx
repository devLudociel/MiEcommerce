/**
 * OrderItemPreview - Muestra mockup visual de productos personalizados en órdenes
 *
 * Renderiza el producto exactamente como lo ve el cliente:
 * - Imagen base del producto (mockup)
 * - Imágenes subidas por el cliente aplicadas con transformaciones
 * - Útil para producción: ver resultado final sin adivinar coordenadas
 */

import React, { useState } from 'react';

interface ImageTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface OrderItemPreviewProps {
  item: any; // Order item con customization
}

export default function OrderItemPreview({ item }: OrderItemPreviewProps) {
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');

  if (!item.customization?.values) {
    return null;
  }

  // Extraer información de personalización
  const values = item.customization.values;

  // Buscar color seleccionado
  const colorField = values.find((v: any) =>
    v.fieldLabel?.toLowerCase().includes('color') ||
    v.fieldId?.toLowerCase().includes('color')
  );
  const selectedColor = colorField?.value?.toLowerCase();

  // Buscar imágenes subidas
  const frontImageField = values.find((v: any) =>
    v.imageUrl && (
      v.fieldLabel?.toLowerCase().includes('front') ||
      v.fieldLabel?.toLowerCase().includes('frontal') ||
      v.fieldLabel?.toLowerCase().includes('delantera')
    )
  );

  const backImageField = values.find((v: any) =>
    v.imageUrl && (
      v.fieldLabel?.toLowerCase().includes('back') ||
      v.fieldLabel?.toLowerCase().includes('trasera') ||
      v.fieldLabel?.toLowerCase().includes('espalda')
    )
  );

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

  const userFrontImage = frontImageField?.imageUrl;
  const userBackImage = backImageField?.imageUrl;

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

      {/* Mockup Preview */}
      <div className="relative w-full" style={{ aspectRatio: '1/1', maxWidth: '400px', margin: '0 auto' }}>
        {/* Base image (mockup de camiseta) */}
        {activeBaseImage ? (
          <img
            src={activeBaseImage}
            alt={`Vista ${activeSide}`}
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          /* Placeholder si no hay imagen base */
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <div className="text-center text-gray-400">
              <p className="text-sm font-semibold">Mockup base no disponible</p>
              <p className="text-xs">(Se muestra solo el diseño del cliente)</p>
            </div>
          </div>
        )}

        {/* User uploaded image con transformaciones */}
        {activeImage && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 10 }}
          >
            <img
              src={activeImage}
              alt={`Diseño ${activeSide}`}
              className="max-w-[70%] max-h-[70%] object-contain"
              style={{
                transform: `
                  translate(${(activeTransform.x - 50) * 4}px, ${(activeTransform.y - 50) * 4}px)
                  scale(${activeTransform.scale})
                  rotate(${activeTransform.rotation}deg)
                `,
                transformOrigin: 'center center',
              }}
            />
          </div>
        )}
      </div>

      {/* Leyenda de transformaciones */}
      <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
        <p className="font-semibold mb-1">Posición actual:</p>
        <p>• X: {activeTransform.x}%, Y: {activeTransform.y}%</p>
        <p>• Escala: {(activeTransform.scale * 100).toFixed(0)}%</p>
        {activeTransform.rotation !== 0 && (
          <p>• Rotación: {activeTransform.rotation}°</p>
        )}
      </div>
    </div>
  );
}
