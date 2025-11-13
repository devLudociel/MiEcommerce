import React from 'react';
import type { ImageTransform } from '../../types/customization';

interface ProductPreviewProps {
  baseImage: string;  // URL de la imagen base (camiseta, caja, marco)
  userImage?: string | null;  // URL de la imagen subida por el usuario
  transform?: ImageTransform;  // Transformación aplicada
  productName?: string;
}

export default function ProductPreview({
  baseImage,
  userImage,
  transform,
  productName = 'Producto'
}: ProductPreviewProps) {
  const defaultTransform: ImageTransform = {
    x: 50,
    y: 50,
    scale: 1,
    rotation: 0,
  };

  const appliedTransform = transform || defaultTransform;

  return (
    <div className="sticky top-4">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-cyan-500 p-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>👁️</span>
            Vista Previa
          </h3>
          <p className="text-sm text-purple-100">
            {productName}
          </p>
        </div>

        {/* Preview Container */}
        <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          {/* Base Image (Producto base: camiseta, caja, marco) */}
          <img
            src={baseImage}
            alt="Producto base"
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />

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

        {/* Info Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>💡 Ajusta la posición con los controles</span>
            {userImage && (
              <span className="font-mono">
                {Math.round(appliedTransform.scale * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
