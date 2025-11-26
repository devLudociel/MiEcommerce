/**
 * Editor Visual Interactivo de Imagen
 * Permite drag & drop, resize con handles, y rotación visual
 * Diseñado para ser más intuitivo que sliders
 */

import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, Move, Maximize2, RefreshCw, Undo, Redo } from 'lucide-react';
import type { ImageTransform } from '../../types/customization';
import { useTransformHistory } from '../../hooks/useTransformHistory';

interface InteractiveImageEditorProps {
  image: string;
  transform: ImageTransform;
  onChange: (transform: ImageTransform);
  productImage?: string;
  disabled?: boolean;
}

export default function InteractiveImageEditor({
  image,
  transform,
  onChange,
  productImage,
  disabled = false,
}: InteractiveImageEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ scale: 1, x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);

  const {
    transform: historyTransform,
    canUndo,
    canRedo,
    pushTransform,
    undo,
    redo,
  } = useTransformHistory(transform);

  // Drag para mover imagen
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || isResizing || isRotating) return;

    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;

    const canvas = canvasRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / canvas.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / canvas.height) * 100;

    const newTransform = {
      ...transform,
      x: Math.max(0, Math.min(100, transform.x + deltaX)),
      y: Math.max(0, Math.min(100, transform.y + deltaY)),
    };

    onChange(newTransform);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      pushTransform(transform);
      setIsDragging(false);
    }
    if (isResizing) {
      pushTransform(transform);
      setIsResizing(false);
    }
    if (isRotating) {
      pushTransform(transform);
      setIsRotating(false);
    }
  };

  // Resize con handles
  const handleResizeStart = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();

    setIsResizing(true);
    setResizeStart({
      scale: transform.scale,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!isResizing || !canvasRef.current) return;

    const deltaY = e.clientY - resizeStart.y;
    const scaleFactor = 1 + (deltaY / 200); // Sensitivity
    const newScale = Math.max(0.1, Math.min(3, resizeStart.scale * scaleFactor));

    onChange({
      ...transform,
      scale: newScale,
    });
  };

  // Rotación con handle
  const handleRotateStart = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    setIsRotating(true);
  };

  const handleRotateMove = (e: React.MouseEvent) => {
    if (!isRotating || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current.getBoundingClientRect();
    const imageRect = imageRef.current.getBoundingClientRect();

    const centerX = imageRect.left + imageRect.width / 2;
    const centerY = imageRect.top + imageRect.height / 2;

    const angle = Math.atan2(
      e.clientY - centerY,
      e.clientX - centerX
    ) * (180 / Math.PI);

    onChange({
      ...transform,
      rotation: (angle + 360) % 360,
    });
  };

  // Global mouse events
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const deltaY = e.clientY - resizeStart.y;
        const scaleFactor = 1 + (deltaY / 200);
        const newScale = Math.max(0.1, Math.min(3, resizeStart.scale * scaleFactor));
        onChange({ ...transform, scale: newScale });
      }
      if (isRotating && canvasRef.current && imageRef.current) {
        const imageRect = imageRef.current.getBoundingClientRect();
        const centerX = imageRect.left + imageRect.width / 2;
        const centerY = imageRect.top + imageRect.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        onChange({ ...transform, rotation: (angle + 360) % 360 });
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging || isResizing || isRotating) {
        pushTransform(transform);
      }
      setIsDragging(false);
      setIsResizing(false);
      setIsRotating(false);
    };

    if (isDragging || isResizing || isRotating) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isResizing, isRotating, transform, resizeStart]);

  const handleReset = () => {
    const resetTransform = {
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    };
    onChange(resetTransform);
    pushTransform(resetTransform);
  };

  const handleUndo = () => {
    if (canUndo) {
      const prev = undo();
      if (prev) onChange(prev);
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      const next = redo();
      if (next) onChange(next);
    }
  };

  // Touch events para móviles
  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;

    if (e.touches.length === 1) {
      // Single touch = drag
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
    } else if (e.touches.length === 2) {
      // Pinch to zoom
      setIsResizing(true);
      const distance = getTouchDistance(e.touches);
      setInitialPinchDistance(distance);
      setResizeStart({
        scale: transform.scale,
        x: 0,
        y: 0,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canvasRef.current) return;

    if (isDragging && e.touches.length === 1) {
      const canvas = canvasRef.current.getBoundingClientRect();
      const deltaX = ((e.touches[0].clientX - dragStart.x) / canvas.width) * 100;
      const deltaY = ((e.touches[0].clientY - dragStart.y) / canvas.height) * 100;

      onChange({
        ...transform,
        x: Math.max(0, Math.min(100, transform.x + deltaX)),
        y: Math.max(0, Math.min(100, transform.y + deltaY)),
      });

      setDragStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
    } else if (isResizing && e.touches.length === 2 && initialPinchDistance) {
      const distance = getTouchDistance(e.touches);
      const scaleFactor = distance / initialPinchDistance;
      const newScale = Math.max(0.1, Math.min(3, resizeStart.scale * scaleFactor));

      onChange({
        ...transform,
        scale: newScale,
      });
    }
  };

  const handleTouchEnd = () => {
    if (isDragging || isResizing) {
      pushTransform(transform);
    }
    setIsDragging(false);
    setIsResizing(false);
    setInitialPinchDistance(null);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Move className="w-4 h-4" />
            <span>Arrastra para mover</span>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Maximize2 className="w-4 h-4" />
            <span>Handles para escalar</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo || disabled}
            className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-30"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo || disabled}
            className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-30"
            title="Rehacer (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={disabled}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Resetear
          </button>
        </div>
      </div>

      {/* Canvas Interactivo */}
      <div
        ref={canvasRef}
        className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden border-2 border-gray-300 select-none touch-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Producto de fondo (opcional) */}
        {productImage && (
          <img
            src={productImage}
            alt="Producto"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* Grid de ayuda */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />
        </div>

        {/* Imagen editable */}
        <div
          ref={imageRef}
          className="absolute"
          style={{
            left: `${transform.x}%`,
            top: `${transform.y}%`,
            transform: `translate(-50%, -50%) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging || isResizing || isRotating ? 'none' : 'transform 0.1s ease-out',
          }}
          onMouseDown={handleMouseDown}
        >
          <img
            src={image}
            alt="Diseño"
            className="max-w-none pointer-events-none"
            style={{
              width: '200px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              border: '3px solid white',
              borderRadius: '4px',
            }}
            draggable={false}
          />

          {/* Handles de resize (4 esquinas) */}
          {!disabled && (
            <>
              {/* Esquina superior izquierda */}
              <div
                className="absolute -top-2 -left-2 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-nwse-resize hover:scale-125 transition-transform shadow-lg"
                onMouseDown={handleResizeStart}
                style={{ touchAction: 'none' }}
              />

              {/* Esquina superior derecha */}
              <div
                className="absolute -top-2 -right-2 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-nesw-resize hover:scale-125 transition-transform shadow-lg"
                onMouseDown={handleResizeStart}
                style={{ touchAction: 'none' }}
              />

              {/* Esquina inferior izquierda */}
              <div
                className="absolute -bottom-2 -left-2 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-nesw-resize hover:scale-125 transition-transform shadow-lg"
                onMouseDown={handleResizeStart}
                style={{ touchAction: 'none' }}
              />

              {/* Esquina inferior derecha */}
              <div
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-purple-500 border-2 border-white rounded-full cursor-nwse-resize hover:scale-125 transition-transform shadow-lg"
                onMouseDown={handleResizeStart}
                style={{ touchAction: 'none' }}
              />

              {/* Handle de rotación (arriba centro) */}
              <div
                className="absolute -top-8 left-1/2 -translate-x-1/2 cursor-grab hover:cursor-grabbing"
                onMouseDown={handleRotateStart}
                style={{ touchAction: 'none' }}
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="w-6 h-6 bg-cyan-500 border-2 border-white rounded-full flex items-center justify-center hover:scale-125 transition-transform shadow-lg">
                    <RotateCw className="w-3 h-3 text-white" />
                  </div>
                  <div className="w-0.5 h-4 bg-cyan-400" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Indicador de estado */}
        {(isDragging || isResizing || isRotating) && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/75 text-white px-4 py-2 rounded-lg text-sm font-medium pointer-events-none">
            {isDragging && '🖐️ Moviendo'}
            {isResizing && '📐 Escalando'}
            {isRotating && '🔄 Rotando'}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
          <div className="text-xs text-gray-500">Posición X</div>
          <div className="text-sm font-bold text-gray-800">{Math.round(transform.x)}%</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
          <div className="text-xs text-gray-500">Posición Y</div>
          <div className="text-sm font-bold text-gray-800">{Math.round(transform.y)}%</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
          <div className="text-xs text-gray-500">Escala</div>
          <div className="text-sm font-bold text-gray-800">{Math.round(transform.scale * 100)}%</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
          <div className="text-xs text-gray-500">Rotación</div>
          <div className="text-sm font-bold text-gray-800">{Math.round(transform.rotation)}°</div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <span className="font-bold">💡 Tips:</span> Arrastra la imagen para moverla •
          Usa los círculos morados para escalar •
          Usa el círculo cyan para rotar
        </p>
      </div>
    </div>
  );
}
