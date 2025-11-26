// src/components/customizer/mug/MugCanvas3D.tsx

import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Eye, EyeOff, Box, Layers } from 'lucide-react';
import type { MugDesignElement, MugCanvasState, MugCustomizationData } from './types';
import { MUG_PRINT_DIMENSIONS } from './mugConfig';
import { generateTextureFromElements } from './utils/textureGenerator';
import InteractiveElement from './InteractiveElement';

// Lazy load del componente 3D para mejor performance
const ThreeDMugPreview = lazy(() => import('../../3d/ThreeDMugPreview'));

interface MugCanvas3DProps {
  customization: MugCustomizationData;
  baseImage?: string; // Imagen base de la taza (opcional, se puede generar con CSS)
  onElementSelect?: (elementId: string | null) => void;
  selectedElementId?: string | null;
  onUpdateElement?: (elementId: string, updates: Partial<MugDesignElement>) => void;
}

export default function MugCanvas3D({
  customization,
  baseImage,
  onElementSelect,
  selectedElementId,
  onUpdateElement,
}: MugCanvas3DProps) {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d'); // Por defecto 3D
  const [textureUrl, setTextureUrl] = useState<string | undefined>(undefined);
  const [canvasState, setCanvasState] = useState<MugCanvasState>({
    zoom: 1,
    rotation: 0,
    showSafeArea: true,
    showMargins: true,
    showGrid: false,
  });

  const [showDimensionsInfo, setShowDimensionsInfo] = useState(true);

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

  // Generar textura cuando cambien los elementos (para vista 3D)
  useEffect(() => {
    if (viewMode === '3d' && elements.length > 0) {
      generateTextureFromElements(customization)
        .then((url) => setTextureUrl(url))
        .catch((error) => {
          console.error('Error generating texture:', error);
          setTextureUrl(undefined);
        });
    } else if (elements.length === 0) {
      setTextureUrl(undefined);
    }
  }, [customization, viewMode, elements.length]);

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
                {viewMode === '3d' ? <Box className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                Vista Previa {viewMode === '3d' ? '3D' : '2D'}
              </h3>
              <p className="text-sm text-purple-100">
                {isPrint360 ? 'Impresión 360°' : 'Vista frontal'}
              </p>
            </div>

            {/* View Mode Toggle + Zoom Controls */}
            <div className="flex items-center gap-2">
              {/* Toggle 2D/3D */}
              <div className="flex items-center bg-white/20 rounded-lg overflow-hidden mr-2">
                <button
                  onClick={() => setViewMode('2d')}
                  className={`px-3 py-2 text-xs font-bold transition-colors ${
                    viewMode === '2d'
                      ? 'bg-white text-purple-600'
                      : 'text-white hover:bg-white/10'
                  }`}
                  title="Vista 2D"
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('3d')}
                  className={`px-3 py-2 text-xs font-bold transition-colors ${
                    viewMode === '3d'
                      ? 'bg-white text-purple-600'
                      : 'text-white hover:bg-white/10'
                  }`}
                  title="Vista 3D"
                >
                  <Box className="w-4 h-4" />
                </button>
              </div>

              {/* Zoom Controls (solo en modo 2D) */}
              {viewMode === '2d' && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Canvas Container - Conditional rendering */}
        {viewMode === '3d' ? (
          /* Vista 3D */
          <div className="relative w-full bg-gradient-to-br from-gray-900 to-gray-800" style={{ minHeight: '500px' }}>
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-white">Cargando vista 3D...</p>
                  </div>
                </div>
              }
            >
              <ThreeDMugPreview
                imageUrl={textureUrl}
                productType="mug"
                productColor={customization.color || '#ffffff'}
                autoRotate={true}
                mugColors={customization.mugColors}
              />
            </Suspense>
          </div>
        ) : (
          /* Vista 2D original */
          <>
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
              {elements.map((element) => (
                <InteractiveElement
                  key={element.id}
                  element={element}
                  isSelected={element.id === selectedElementId}
                  onSelect={() => onElementSelect?.(element.id)}
                  onUpdate={(updates) => onUpdateElement?.(element.id, updates)}
                  canvasRef={canvasRef}
                />
              ))}

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

            {/* Dimensions Info Panel */}
            {showDimensionsInfo && (
              <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-cyan-50 border-t border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                          Área de impresión
                        </div>
                        <div className="text-sm text-gray-700">
                          <span className="font-bold text-purple-600">{dimensions.width * 10}mm</span>
                          {' × '}
                          <span className="font-bold text-purple-600">{dimensions.height * 10}mm</span>
                          <span className="text-gray-500 ml-2">
                            ({dimensions.width}cm × {dimensions.height}cm)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="h-8 w-px bg-gray-300" />

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                          Área segura
                        </div>
                        <div className="text-sm text-gray-700">
                          <span className="font-bold text-blue-600">
                            {(dimensions.width - dimensions.safeMargin * 2) * 10}mm
                          </span>
                          {' × '}
                          <span className="font-bold text-blue-600">
                            {(dimensions.height - dimensions.safeMargin * 2) * 10}mm
                          </span>
                          <span className="text-gray-500 ml-2 text-xs">
                            (margen {dimensions.safeMargin}cm)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowDimensionsInfo(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Ocultar información"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

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
                {!showDimensionsInfo && (
                  <button
                    onClick={() => setShowDimensionsInfo(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors bg-purple-100 text-purple-700 hover:bg-purple-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Dimensiones
                  </button>
                )}
              </div>

              <div className="text-xs text-gray-500 flex items-center gap-1">
                <div className="w-3 h-3 border border-dashed border-blue-400" />
                <span>= Mantén tu diseño dentro del área de seguridad</span>
              </div>
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
