import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { ImageTransform } from '../../types/customization';

interface ProductPreviewProps {
  baseImage: string;  // URL de la imagen base (camiseta, caja, marco)
  userImage?: string | null;  // URL de la imagen subida por el usuario
  transform?: ImageTransform;  // Transformación aplicada
  productName?: string;
  printAreaPercentage?: number; // Porcentaje del área imprimible (default 70%)
  showPrintArea?: boolean; // Mostrar área de impresión
}

export default function ProductPreview({
  baseImage,
  userImage,
  transform,
  productName = 'Producto',
  printAreaPercentage = 70,
  showPrintArea = true,
}: ProductPreviewProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showGuides, setShowGuides] = useState(true);

  const defaultTransform: ImageTransform = {
    x: 50,
    y: 50,
    scale: 1,
    rotation: 0,
  };

  const appliedTransform = transform || defaultTransform;

  // Check if image is centered (within 5% tolerance)
  const isCentered = Math.abs(appliedTransform.x - 50) < 5 && Math.abs(appliedTransform.y - 50) < 5;

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.2, 1));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  return (
    <div className="sticky top-4">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-cyan-500 p-4">
          <div className="flex items-center justify-between">
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
              >
                <ZoomIn className="w-4 h-4 text-white" />
              </button>
              {zoomLevel !== 1 && (
                <button
                  onClick={handleResetZoom}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Resetear zoom"
                >
                  <Maximize2 className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
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
            {/* Base Image (Producto base: camiseta, caja, marco) */}
            <img
              src={baseImage}
              alt="Producto base"
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />

            {/* Print Area Overlay */}
            {showPrintArea && (
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
                  Área de Impresión
                </div>
              </div>
            )}

            {/* Alignment Guides */}
            {showGuides && isCentered && userImage && (
              <>
                {/* Vertical Guide */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-green-500/50 pointer-events-none" />
                {/* Horizontal Guide */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-green-500/50 pointer-events-none" />
                {/* Center Indicator */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-8 h-8 border-2 border-green-500 rounded-full bg-green-500/20" />
                </div>
              </>
            )}

            {/* User Image Overlay (Imagen personalizada del usuario) */}
            {userImage && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={userImage}
                  alt="Diseño personalizado"
                  draggable={false}
                  style={{
                    transform: `
                      translate(${appliedTransform.x - 50}%, ${appliedTransform.y - 50}%)
                      scale(${appliedTransform.scale})
                      rotate(${appliedTransform.rotation}deg)
                    `,
                    maxWidth: '70%',
                    maxHeight: '70%',
                    objectFit: 'contain',
                    transition: 'transform 0.1s ease-out',
                    transformOrigin: 'center center',
                  }}
                />
              </div>
            )}

            {/* Overlay hint cuando no hay imagen */}
            {!userImage && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="text-5xl mb-3">🖼️</div>
                  <p className="text-gray-500 font-medium">
                    Sube tu diseño para ver el preview
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span>💡 Ajusta la posición con los controles</span>
              {isCentered && userImage && (
                <span className="text-green-600 font-semibold">✓ Centrado</span>
              )}
            </div>
            {userImage && (
              <span className="font-mono">
                {Math.round(appliedTransform.scale * 100)}%
              </span>
            )}
          </div>
          {showPrintArea && (
            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
              <div className="w-3 h-3 border border-dashed border-purple-400" />
              <span>= Área donde se imprimirá tu diseño</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
