/**
 * SplitProductPreview - Preview con dos imágenes separadas
 *
 * Usado para productos donde la imagen del usuario es solo una REFERENCIA
 * (ej: figuras de resina), no se imprime sobre el producto.
 *
 * Muestra:
 * 1. Preview de la caja/producto (sin imagen superpuesta)
 * 2. Preview de la imagen de referencia del cliente (sin caja)
 */

import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface SplitProductPreviewProps {
  baseImage: string;  // URL de la imagen base (caja, producto)
  userImage?: string | null;  // URL de la imagen subida por el usuario
  productName?: string;
  baseImageLabel?: string;  // Label para el preview de la caja
  userImageLabel?: string;  // Label para el preview de referencia
}

export default function SplitProductPreview({
  baseImage,
  userImage,
  productName = 'Producto',
  baseImageLabel = 'Tu caja personalizada',
  userImageLabel = 'Foto de referencia',
}: SplitProductPreviewProps) {
  const [baseZoom, setBaseZoom] = useState(1);
  const [refZoom, setRefZoom] = useState(1);

  const handleBaseZoomIn = () => setBaseZoom((prev) => Math.min(prev + 0.2, 3));
  const handleBaseZoomOut = () => setBaseZoom((prev) => Math.max(prev - 0.2, 1));
  const handleBaseResetZoom = () => setBaseZoom(1);

  const handleRefZoomIn = () => setRefZoom((prev) => Math.min(prev + 0.2, 3));
  const handleRefZoomOut = () => setRefZoom((prev) => Math.max(prev - 0.2, 1));
  const handleRefResetZoom = () => setRefZoom(1);

  return (
    <div className="sticky top-4 space-y-4">
      {/* Preview 1: Caja/Producto Base */}
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-cyan-500 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📦</span>
                {baseImageLabel}
              </h3>
              <p className="text-sm text-purple-100">{productName}</p>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleBaseZoomOut}
                disabled={baseZoom <= 1}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Alejar"
                aria-label="Alejar vista de la caja"
              >
                <ZoomOut className="w-4 h-4 text-white" />
              </button>
              <span className="text-white font-mono text-sm min-w-[3rem] text-center">
                {Math.round(baseZoom * 100)}%
              </span>
              <button
                onClick={handleBaseZoomIn}
                disabled={baseZoom >= 3}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Acercar"
                aria-label="Acercar vista de la caja"
              >
                <ZoomIn className="w-4 h-4 text-white" />
              </button>
              {baseZoom !== 1 && (
                <button
                  onClick={handleBaseResetZoom}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Resetear zoom"
                  aria-label="Resetear zoom de la caja"
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
              transform: `scale(${baseZoom})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Base Image SOLO (sin imagen del usuario superpuesta) */}
            <img
              src={baseImage}
              alt="Caja personalizada"
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
            />
          </div>
        </div>

        {/* Info Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>✨ Así quedará tu caja con el color seleccionado</span>
          </div>
        </div>
      </div>

      {/* Preview 2: Imagen de Referencia */}
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🖼️</span>
                {userImageLabel}
              </h3>
              <p className="text-sm text-blue-100">Para crear tu figura</p>
            </div>

            {/* Zoom Controls */}
            {userImage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefZoomOut}
                  disabled={refZoom <= 1}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Alejar"
                  aria-label="Alejar foto de referencia"
                >
                  <ZoomOut className="w-4 h-4 text-white" />
                </button>
                <span className="text-white font-mono text-sm min-w-[3rem] text-center">
                  {Math.round(refZoom * 100)}%
                </span>
                <button
                  onClick={handleRefZoomIn}
                  disabled={refZoom >= 3}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Acercar"
                  aria-label="Acercar foto de referencia"
                >
                  <ZoomIn className="w-4 h-4 text-white" />
                </button>
                {refZoom !== 1 && (
                  <button
                    onClick={handleRefResetZoom}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    title="Resetear zoom"
                    aria-label="Resetear zoom de referencia"
                  >
                    <Maximize2 className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview Container */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
          <div
            className="absolute inset-0 transition-transform duration-200"
            style={{
              transform: `scale(${refZoom})`,
              transformOrigin: 'center center',
            }}
          >
            {/* User Image SOLO (sin caja de fondo) */}
            {userImage ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <img
                  src={userImage}
                  alt="Foto de referencia para tu figura"
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="text-6xl mb-4">📸</div>
                  <p className="text-gray-600 font-semibold mb-2">
                    Sube tu foto de referencia
                  </p>
                  <p className="text-sm text-gray-500">
                    Esta imagen la usaremos para crear tu figura personalizada
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <div className="flex items-start gap-2 text-xs text-blue-900">
            <span className="text-lg">💡</span>
            <div>
              <p className="font-semibold mb-1">Esta es tu foto de referencia</p>
              <p className="text-blue-700">
                La usaremos para crear tu figura personalizada y te enviaremos el resultado final
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
