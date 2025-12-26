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
import {
  getPositionsForSide,
  getContainerTransform,
  type PresetPosition,
} from '../../constants/textilePositions';

interface TextileProductPreviewProps {
  frontImage: string; // URL de la imagen del producto (vista frontal)
  backImage: string; // URL de la imagen del producto (vista trasera)
  userFrontImage?: string | null; // Imagen del usuario para el frente
  userBackImage?: string | null; // Imagen del usuario para la espalda
  frontTransform?: ImageTransform; // Transform para imagen frontal
  backTransform?: ImageTransform; // Transform para imagen trasera
  productName?: string;
  onTransformChange?: (side: 'front' | 'back', transform: ImageTransform) => void;
  printAreaPercentage?: number;
  activeSide?: 'front' | 'back'; // Vista activa controlada externamente
  onActiveSideChange?: (side: 'front' | 'back') => void; // Callback para cambio de vista
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
  activeSide: externalActiveSide,
  onActiveSideChange,
}: TextileProductPreviewProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [internalActiveSide, setInternalActiveSide] = useState<'front' | 'back'>('front');
  const [showGuides, setShowGuides] = useState(true);

  // Use external activeSide if provided, otherwise use internal state
  const activeSide = externalActiveSide ?? internalActiveSide;
  const setActiveSide = (side: 'front' | 'back') => {
    if (onActiveSideChange) {
      onActiveSideChange(side);
    } else {
      setInternalActiveSide(side);
    }
  };

  const defaultTransform: ImageTransform = {
    x: 50,
    y: 50,
    scale: 1,
    rotation: 0,
  };

  // Get active transform and images based on current side
  const activeTransform =
    activeSide === 'front' ? frontTransform || defaultTransform : backTransform || defaultTransform;
  const activeUserImage = activeSide === 'front' ? userFrontImage : userBackImage;

  // Debug logs
  console.log('[TextilePreview] Active side:', activeSide);
  console.log('[TextilePreview] Front image:', frontImage);
  console.log('[TextilePreview] Back image:', backImage);
  console.log('[TextilePreview] Front user image:', userFrontImage);
  console.log('[TextilePreview] Back user image:', userBackImage);

  // Check if active image is centered
  const isCentered = Math.abs(activeTransform.x - 50) < 5 && Math.abs(activeTransform.y - 50) < 5;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.2, 1));
  const handleResetZoom = () => setZoomLevel(1);

  const handleResetTransform = () => {
    if (onTransformChange) {
      onTransformChange(activeSide, defaultTransform);
    }
  };

  const handleApplyPresetPosition = (preset: PresetPosition) => {
    if (onTransformChange) {
      // Convertir coordenadas del área de impresión al contenedor
      const containerTransform = getContainerTransform(preset, printAreaPercentage);
      const newTransform: ImageTransform = {
        ...containerTransform,
        rotation: activeTransform.rotation, // Preserve current rotation
      };
      onTransformChange(activeSide, newTransform);
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

        {/* Quick Position Buttons - Solo si hay imagen subida */}
        {activeUserImage && onTransformChange && (
          <div className="bg-purple-50 border-t border-b border-purple-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-purple-700">⚡ Posiciones Rápidas:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {getPositionsForSide(activeSide).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPresetPosition(preset)}
                  className="px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-purple-100 hover:border-purple-400 hover:text-purple-900 transition-all active:scale-95"
                  title={preset.description}
                >
                  {preset.labelShort}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 italic">
              Haz clic para posicionar tu diseño automáticamente
            </p>
          </div>
        )}

        {/* Preview Container */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          <div
            className="absolute inset-0 transition-transform duration-200"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Front Base Image - ALWAYS RENDERED */}
            <img
              key={`base-front-${frontImage}`}
              src={frontImage}
              alt="Vista frontal"
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
              onLoad={(e) => {
                console.log('[TextilePreview] ✅ FRONT Base image LOADED:', frontImage);
                console.log(
                  '[TextilePreview] FRONT dimensions:',
                  e.currentTarget.naturalWidth,
                  'x',
                  e.currentTarget.naturalHeight
                );
              }}
              onError={(e) => {
                console.error('[TextilePreview] ❌ FRONT Base image ERROR:', frontImage, e);
              }}
              style={{
                zIndex: 10,
                display: activeSide === 'front' ? 'block' : 'none',
              }}
            />

            {/* Back Base Image - ALWAYS RENDERED */}
            <img
              key={`base-back-${backImage}`}
              src={backImage}
              alt="Vista trasera"
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
              onLoad={(e) => {
                console.log('[TextilePreview] ✅ BACK Base image LOADED:', backImage);
                console.log(
                  '[TextilePreview] BACK dimensions:',
                  e.currentTarget.naturalWidth,
                  'x',
                  e.currentTarget.naturalHeight
                );
              }}
              onError={(e) => {
                console.error('[TextilePreview] ❌ BACK Base image ERROR:', backImage, e);
              }}
              style={{
                zIndex: 10,
                display: activeSide === 'back' ? 'block' : 'none',
              }}
            />

            {/* Print Area Overlay */}
            <div
              className="absolute border-2 border-dashed border-purple-400/60 bg-purple-400/5 pointer-events-none"
              style={{
                left: `${(100 - printAreaPercentage) / 2}%`,
                top: `${(100 - printAreaPercentage) / 2}%`,
                width: `${printAreaPercentage}%`,
                height: `${printAreaPercentage}%`,
                zIndex: 20,
              }}
            >
              <div className="absolute top-2 left-2 text-xs font-bold text-purple-600 bg-white/80 px-2 py-1 rounded">
                Área de Impresión {activeSide === 'front' ? '(Frente)' : '(Espalda)'}
              </div>
            </div>

            {/* Alignment Guides - Show when centered */}
            {showGuides && (
              <>
                {/* Front guides */}
                {activeSide === 'front' &&
                  userFrontImage &&
                  Math.abs((frontTransform?.x || 50) - 50) < 5 &&
                  Math.abs((frontTransform?.y || 50) - 50) < 5 && (
                    <>
                      <div
                        className="absolute left-1/2 top-0 bottom-0 w-px bg-green-500/50 pointer-events-none"
                        style={{ zIndex: 40 }}
                      />
                      <div
                        className="absolute top-1/2 left-0 right-0 h-px bg-green-500/50 pointer-events-none"
                        style={{ zIndex: 40 }}
                      />
                      <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ zIndex: 40 }}
                      >
                        <div className="w-8 h-8 border-2 border-green-500 rounded-full bg-green-500/20" />
                      </div>
                    </>
                  )}
                {/* Back guides */}
                {activeSide === 'back' &&
                  userBackImage &&
                  Math.abs((backTransform?.x || 50) - 50) < 5 &&
                  Math.abs((backTransform?.y || 50) - 50) < 5 && (
                    <>
                      <div
                        className="absolute left-1/2 top-0 bottom-0 w-px bg-green-500/50 pointer-events-none"
                        style={{ zIndex: 40 }}
                      />
                      <div
                        className="absolute top-1/2 left-0 right-0 h-px bg-green-500/50 pointer-events-none"
                        style={{ zIndex: 40 }}
                      />
                      <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ zIndex: 40 }}
                      >
                        <div className="w-8 h-8 border-2 border-green-500 rounded-full bg-green-500/20" />
                      </div>
                    </>
                  )}
              </>
            )}

            {/* Front User Image Overlay - ALWAYS RENDERED IF EXISTS */}
            {userFrontImage && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  display: activeSide === 'front' ? 'flex' : 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 30,
                }}
              >
                <img
                  key={`user-front-${userFrontImage}`}
                  src={userFrontImage}
                  alt="Diseño personalizado frontal"
                  draggable={false}
                  style={{
                    transform: `
                      translate(${(frontTransform?.x || 50) - 50}%, ${(frontTransform?.y || 50) - 50}%)
                      scale(${frontTransform?.scale || 1})
                      rotate(${frontTransform?.rotation || 0}deg)
                    `,
                    maxWidth: '70%',
                    maxHeight: '70%',
                    objectFit: 'contain',
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            )}

            {/* Back User Image Overlay - ALWAYS RENDERED IF EXISTS */}
            {userBackImage && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  display: activeSide === 'back' ? 'flex' : 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 30,
                }}
              >
                <img
                  key={`user-back-${userBackImage}`}
                  src={userBackImage}
                  alt="Diseño personalizado trasero"
                  draggable={false}
                  style={{
                    transform: `
                      translate(${(backTransform?.x || 50) - 50}%, ${(backTransform?.y || 50) - 50}%)
                      scale(${backTransform?.scale || 1})
                      rotate(${backTransform?.rotation || 0}deg)
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
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ zIndex: 5, pointerEvents: 'none', backgroundColor: 'transparent' }}
              >
                <div className="text-center p-6">
                  <div className="text-5xl mb-3">{activeSide === 'front' ? '🔵' : '🔴'}</div>
                  <p className="text-gray-500 font-medium">
                    Sube tu diseño para la{' '}
                    {activeSide === 'front' ? 'parte frontal' : 'parte trasera'}
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
                <span className="font-mono">{Math.round(activeTransform.scale * 100)}%</span>
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
            <span>= Área de impresión. Sube diseños diferentes para frente y espalda.</span>
          </div>

          {/* Status indicators */}
          <div className="mt-2 flex gap-2 text-xs">
            <div
              className={`px-2 py-1 rounded ${userFrontImage ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
            >
              Frente: {userFrontImage ? '✓ Con diseño' : '○ Sin diseño'}
            </div>
            <div
              className={`px-2 py-1 rounded ${userBackImage ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}
            >
              Espalda: {userBackImage ? '✓ Con diseño' : '○ Sin diseño'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
