/**
 * TextileProductPreview - Preview con frente/espalda para textiles
 *
 * Características:
 * - Dos vistas: frontal y trasera
 * - Toggle para cambiar entre vistas
 * - Imagen diferente para cada lado
 * - Controles de posición/tamaño independientes para cada lado
 * - Diseñado para camisetas, sudaderas, polos, etc.
 */

import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import type { ImageTransform } from '../../types/customization';

interface TextileProductPreviewProps {
  frontImage: string;  // URL de la imagen del producto (vista frontal)
  backImage: string;   // URL de la imagen del producto (vista trasera)
  userFrontImage?: string | null;  // Imagen del usuario para el frente
  userBackImage?: string | null;   // Imagen del usuario para la espalda
  frontTransform?: ImageTransform;  // Transform para imagen frontal
  backTransform?: ImageTransform;   // Transform para imagen trasera
  productName?: string;
  onTransformChange?: (side: 'front' | 'back', transform: ImageTransform) => void;
  printAreaPercentage?: number;
}

export default function TextileProductPreview({
  frontImage,
  backImage,
  userFrontImage,
  userBackImage,
  frontTransform,
  backTransform,
  productName = 'Producto',
  onTransformChange,
  printAreaPercentage = 70,
}: TextileProductPreviewProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [showGuides, setShowGuides] = useState(true);

  const defaultTransform: ImageTransform = {
    x: 50,
    y: 50,
    scale: 1,
    rotation: 0,
  };

  // Get active transform based on current side
  const activeTransform = activeSide === 'front'
    ? (frontTransform || defaultTransform)
    : (backTransform || defaultTransform);

  // Get active images
  const activeBaseImage = activeSide === 'front' ? frontImage : backImage;
  const activeUserImage = activeSide === 'front' ? userFrontImage : userBackImage;

  // Check if image is centered
  const isCentered = Math.abs(activeTransform.x - 50) < 5 && Math.abs(activeTransform.y - 50) < 5;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.2, 1));
  const handleResetZoom = () => setZoomLevel(1);

  const handleResetTransform = () => {
    if (onTransformChange) {
      onTransformChange(activeSide, defaultTransform);
    }
  };

  return (
    <div className="sticky top-4">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-cyan-500 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>👁️</span>
                Vista Previa
              </h3>
              <p className="text-sm text-purple-100">{productName}</p>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Alejar"
                aria-label="Alejar"
              >
                <ZoomOut className="w-4 h-4 text-white" />
              </button>
              <span className="text-white font-mono text-sm min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Acercar"
                aria-label="Acercar"
              >
                <ZoomIn className="w-4 h-4 text-white" />
              </button>
              {zoomLevel !== 1 && (
                <button
                  onClick={handleResetZoom}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Resetear zoom"
                  aria-label="Resetear zoom"
                >
                  <Maximize2 className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          </div>

          {/* Front/Back Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSide('front')}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                activeSide === 'front'
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              aria-label="Ver frente"
              aria-pressed={activeSide === 'front'}
            >
              🔵 Frente
              {userFrontImage && <span className="ml-1 text-xs">✓</span>}
            </button>
            <button
              onClick={() => setActiveSide('back')}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                activeSide === 'back'
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              aria-label="Ver espalda"
              aria-pressed={activeSide === 'back'}
            >
              🔴 Espalda
              {userBackImage && <span className="ml-1 text-xs">✓</span>}
            </button>
          </div>
        </div>

        {/* Preview Container */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          <div
            className="absolute inset-0 transition-transform duration-200"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Base Image (Camiseta frente o espalda) */}
            <img
              src={activeBaseImage}
              alt={activeSide === 'front' ? 'Vista frontal' : 'Vista trasera'}
              className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
              draggable={false}
            />

            {/* Print Area Overlay */}
            <div
              className="absolute border-2 border-dashed border-purple-400/60 bg-purple-400/5 pointer-events-none"
              style={{
                left: `${(100 - printAreaPercentage) / 2}%`,
                top: `${(100 - printAreaPercentage) / 2}%`,
                width: `${printAreaPercentage}%`,
                height: `${printAreaPercentage}%`,
              }}
            >
              <div className="absolute top-2 left-2 text-xs font-bold text-purple-600 bg-white/80 px-2 py-1 rounded">
                Área de Impresión {activeSide === 'front' ? '(Frente)' : '(Espalda)'}
              </div>
            </div>

            {/* Alignment Guides */}
            {showGuides && isCentered && activeUserImage && (
              <>
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-green-500/50 pointer-events-none" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-green-500/50 pointer-events-none" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-8 h-8 border-2 border-green-500 rounded-full bg-green-500/20" />
                </div>
              </>
            )}

            {/* User Image Overlay */}
            {activeUserImage && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={activeUserImage}
                  alt={`Diseño personalizado ${activeSide === 'front' ? 'frontal' : 'trasero'}`}
                  draggable={false}
                  className="transition-transform duration-100"
                  style={{
                    transform: `
                      translate(${activeTransform.x - 50}%, ${activeTransform.y - 50}%)
                      scale(${activeTransform.scale})
                      rotate(${activeTransform.rotation}deg)
                    `,
                    maxWidth: '70%',
                    maxHeight: '70%',
                    objectFit: 'contain',
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            )}

            {/* Overlay hint cuando no hay imagen */}
            {!activeUserImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="text-5xl mb-3">
                    {activeSide === 'front' ? '🔵' : '🔴'}
                  </div>
                  <p className="text-gray-500 font-medium">
                    Sube tu diseño para la {activeSide === 'front' ? 'parte frontal' : 'parte trasera'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <div className="flex items-center gap-2">
              <span className={activeSide === 'front' ? 'text-blue-600 font-bold' : ''}>
                {activeSide === 'front' ? '🔵 Frente' : '🔴 Espalda'}
              </span>
              {isCentered && activeUserImage && (
                <span className="text-green-600 font-semibold">✓ Centrado</span>
              )}
            </div>
            {activeUserImage && (
              <div className="flex items-center gap-2">
                <span className="font-mono">
                  {Math.round(activeTransform.scale * 100)}%
                </span>
                <button
                  onClick={handleResetTransform}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Resetear posición"
                  aria-label="Resetear posición de la imagen"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-start gap-1 text-xs text-gray-500">
            <div className="w-3 h-3 border border-dashed border-purple-400 mt-0.5" />
            <span>
              = Área de impresión. Sube diseños diferentes para frente y espalda.
            </span>
          </div>

          {/* Status indicators */}
          <div className="mt-2 flex gap-2 text-xs">
            <div className={`px-2 py-1 rounded ${userFrontImage ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              Frente: {userFrontImage ? '✓ Con diseño' : '○ Sin diseño'}
            </div>
            <div className={`px-2 py-1 rounded ${userBackImage ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
              Espalda: {userBackImage ? '✓ Con diseño' : '○ Sin diseño'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
