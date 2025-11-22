// src/components/customizer/mug/MugCanvas3D.tsx

import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Eye, EyeOff } from 'lucide-react';
import type { MugDesignElement, MugCanvasState, MugCustomizationData } from './types';
import { MUG_PRINT_DIMENSIONS } from './mugConfig';

interface MugCanvas3DProps {
  customization: MugCustomizationData;
  baseImage?: string; // Imagen base de la taza (opcional, se puede generar con CSS)
  onElementSelect?: (elementId: string | null) => void;
  selectedElementId?: string | null;
}

export default function MugCanvas3D({
  customization,
  baseImage,
  onElementSelect,
  selectedElementId,
}: MugCanvas3DProps) {
  const [canvasState, setCanvasState] = useState<MugCanvasState>({
    zoom: 1,
    rotation: 0,
    showSafeArea: true,
    showMargins: true,
    showGrid: false,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const isPrint360 = customization.printArea === '360';
  const dimensions = isPrint360
    ? MUG_PRINT_DIMENSIONS['360']
    : MUG_PRINT_DIMENSIONS.double_side.front;

  // Elementos a mostrar
  const elements = isPrint360
    ? customization.elements || []
    : customization.frontElements || [];

  // Handlers de zoom
  const handleZoomIn = () => {
    setCanvasState((prev) => ({ ...prev, zoom: Math.min(prev.zoom + 0.2, 3) }));
  };

  const handleZoomOut = () => {
    setCanvasState((prev) => ({ ...prev, zoom: Math.max(prev.zoom - 0.2, 0.5) }));
  };

  const handleResetZoom = () => {
    setCanvasState((prev) => ({ ...prev, zoom: 1 }));
  };

  // Handlers de rotación (arrastar para rotar)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('mug-surface')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      setCanvasState((prev) => ({
        ...prev,
        rotation: (prev.rotation + deltaX * 0.5) % 360,
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRotateStep = () => {
    setCanvasState((prev) => ({
      ...prev,
      rotation: (prev.rotation + 45) % 360,
    }));
  };

  const toggleSafeArea = () => {
    setCanvasState((prev) => ({ ...prev, showSafeArea: !prev.showSafeArea }));
  };

  const toggleMargins = () => {
    setCanvasState((prev) => ({ ...prev, showMargins: !prev.showMargins }));
  };

  const renderElement = (element: MugDesignElement) => {
    const isSelected = element.id === selectedElementId;

    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${element.x}%`,
      top: `${element.y}%`,
      width: `${element.width}%`,
      height: `${element.height}%`,
      transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
      zIndex: element.zIndex,
      cursor: 'pointer',
      border: isSelected ? '2px solid #8B5CF6' : 'none',
      outline: isSelected ? '2px solid rgba(139, 92, 246, 0.3)' : 'none',
      outlineOffset: '4px',
    };

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onElementSelect?.(element.id);
    };

    switch (element.type) {
      case 'text':
        return (
          <div
            key={element.id}
            style={{
              ...style,
              fontFamily: element.fontFamily || 'Arial',
              fontSize: `${element.fontSize || 16}px`,
              color: element.color || '#000000',
              fontWeight: element.bold ? 'bold' : 'normal',
              fontStyle: element.italic ? 'italic' : 'normal',
              textAlign: element.align || 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: element.align === 'center' ? 'center' : element.align === 'right' ? 'flex-end' : 'flex-start',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
            onClick={handleClick}
          >
            {element.text}
          </div>
        );

      case 'image':
      case 'clipart':
        return (
          <div
            key={element.id}
            style={style}
            onClick={handleClick}
          >
            <img
              src={element.imageUrl || element.imageData}
              alt="Design element"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
              }}
              draggable={false}
            />
          </div>
        );

      case 'background':
        return (
          <div
            key={element.id}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: element.backgroundColor || 'transparent',
              backgroundImage: element.backgroundPattern ? `url(${element.backgroundPattern})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              zIndex: element.zIndex,
              pointerEvents: 'none',
            }}
          />
        );

      default:
        return null;
    }
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
                Vista Previa 3D
              </h3>
              <p className="text-sm text-purple-100">
                {isPrint360 ? 'Impresión 360°' : 'Vista frontal'}
              </p>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={canvasState.zoom <= 0.5}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Alejar"
              >
                <ZoomOut className="w-4 h-4 text-white" />
              </button>
              <span className="text-white font-mono text-sm min-w-[3rem] text-center">
                {Math.round(canvasState.zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={canvasState.zoom >= 3}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Acercar"
              >
                <ZoomIn className="w-4 h-4 text-white" />
              </button>
              {canvasState.zoom !== 1 && (
                <button
                  onClick={handleResetZoom}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  title="Resetear zoom"
                >
                  <Maximize2 className="w-4 h-4 text-white" />
                </button>
              )}
              <button
                onClick={handleRotateStep}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors ml-2"
                title="Rotar 45°"
              >
                <RotateCw className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Canvas Container */}
        <div
          ref={canvasRef}
          className="relative w-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden cursor-grab active:cursor-grabbing"
          style={{
            aspectRatio: isPrint360 ? '21.5 / 8' : '1 / 1',
            minHeight: '400px',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="absolute inset-0 transition-transform duration-100"
            style={{
              transform: `scale(${canvasState.zoom})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Superficie de diseño */}
            <div
              className="mug-surface absolute inset-0"
              style={{
                background: baseImage
                  ? `url(${baseImage}) center/cover no-repeat, linear-gradient(to bottom, #f9fafb 0%, #e5e7eb 100%)`
                  : 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 25%, #ffffff 50%, #f5f5f5 75%, #ffffff 100%)',
                backgroundBlendMode: baseImage ? 'normal' : 'normal',
              }}
              onClick={() => onElementSelect?.(null)}
            >
              {/* Representación visual de taza cuando no hay imagen */}
              {!baseImage && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <svg
                    viewBox="0 0 200 200"
                    className="w-64 h-64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Cuerpo de la taza */}
                    <path
                      d="M50 60 L50 140 Q50 160 70 160 L130 160 Q150 160 150 140 L150 60 Z"
                      fill="#e0e0e0"
                      stroke="#999"
                      strokeWidth="2"
                    />
                    {/* Asa */}
                    <path
                      d="M150 80 Q170 80 170 100 Q170 120 150 120"
                      fill="none"
                      stroke="#999"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* Brillo */}
                    <ellipse cx="80" cy="90" rx="15" ry="30" fill="white" opacity="0.3" />
                  </svg>
                </div>
              )}
              {/* Área de seguridad (Safe Area) */}
              {canvasState.showSafeArea && (
                <div
                  className="absolute border-2 border-dashed border-blue-400/60 bg-blue-400/5 pointer-events-none"
                  style={{
                    left: `${(dimensions.safeMargin / dimensions.width) * 100}%`,
                    top: `${(dimensions.safeMargin / dimensions.height) * 100}%`,
                    right: `${(dimensions.safeMargin / dimensions.width) * 100}%`,
                    bottom: `${(dimensions.safeMargin / dimensions.height) * 100}%`,
                  }}
                >
                  <div className="absolute top-2 left-2 text-xs font-bold text-blue-600 bg-white/80 px-2 py-1 rounded">
                    Área de seguridad
                  </div>
                </div>
              )}

              {/* Márgenes */}
              {canvasState.showMargins && (
                <>
                  {/* Dimensiones */}
                  <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col items-center text-gray-500 pointer-events-none">
                    <div className="h-full border-l-2 border-gray-400" />
                    <span className="text-xs font-mono bg-white px-1 rounded transform -rotate-90 whitespace-nowrap">
                      {dimensions.height}cm
                    </span>
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 flex items-center text-gray-500 pointer-events-none">
                    <div className="w-full border-t-2 border-gray-400" />
                    <span className="text-xs font-mono bg-white px-1 rounded whitespace-nowrap">
                      {dimensions.width}cm
                    </span>
                  </div>
                </>
              )}

              {/* Elementos de diseño */}
              {elements.map((element) => renderElement(element))}

              {/* Overlay cuando no hay elementos */}
              {elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center p-6">
                    <div className="text-5xl mb-3">🎨</div>
                    <p className="text-gray-500 font-medium">
                      Empieza a diseñar tu taza
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Usa las herramientas de la izquierda
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Indicador de rotación para 360° */}
            {isPrint360 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                <span className="flex items-center gap-2">
                  <RotateCw className="w-3 h-3" />
                  Arrastra para rotar • {Math.round(canvasState.rotation)}°
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Controls Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSafeArea}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  canvasState.showSafeArea
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {canvasState.showSafeArea ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Área de seguridad
              </button>
              <button
                onClick={toggleMargins}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  canvasState.showMargins
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {canvasState.showMargins ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Márgenes
              </button>
            </div>

            <div className="text-xs text-gray-500 flex items-center gap-1">
              <div className="w-3 h-3 border border-dashed border-blue-400" />
              <span>= Mantén tu diseño dentro del área de seguridad</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
