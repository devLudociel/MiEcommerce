// src/components/customizer/mug/InteractiveElement.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Move, RotateCw, Maximize2 } from 'lucide-react';
import type { MugDesignElement } from './types';

interface InteractiveElementProps {
  element: MugDesignElement;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<MugDesignElement>) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export default function InteractiveElement({
  element,
  isSelected,
  onSelect,
  onUpdate,
  canvasRef,
}: InteractiveElementProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, elementX: 0, elementY: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  // Estilos base del elemento
  const elementStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${element.x}%`,
    top: `${element.y}%`,
    width: `${element.width}%`,
    height: `${element.height}%`,
    transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
    zIndex: element.zIndex,
    cursor: isDragging ? 'grabbing' : 'grab',
    border: isSelected ? '2px solid #8B5CF6' : '1px solid transparent',
    outline: isSelected ? '2px solid rgba(139, 92, 246, 0.3)' : 'none',
    outlineOffset: '4px',
    userSelect: 'none',
    transition: isDragging || isResizing || isRotating ? 'none' : 'all 0.1s ease',
  };

  // Handlers de arrastre
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelected) {
      onSelect();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      elementX: element.x,
      elementY: element.y,
    });
    setIsDragging(true);
    e.stopPropagation();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const percentX = (deltaX / rect.width) * 100;
    const percentY = (deltaY / rect.height) * 100;

    onUpdate({
      x: Math.max(0, Math.min(100, dragStart.elementX + percentX)),
      y: Math.max(0, Math.min(100, dragStart.elementY + percentY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setIsRotating(false);
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    if (!canvasRef.current) return;

    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: element.width,
      height: element.height,
    });
    setIsResizing(true);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const deltaX = e.clientX - resizeStart.x;
    const percentX = (deltaX / rect.width) * 100;

    // Mantener aspect ratio para elementos cuadrados
    const newWidth = Math.max(5, Math.min(100, resizeStart.width + percentX * 2));
    const aspectRatio = resizeStart.height / resizeStart.width;
    const newHeight = newWidth * aspectRatio;

    onUpdate({
      width: newWidth,
      height: newHeight,
    });
  };

  // Rotation handler
  const handleRotationStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
  };

  const handleRotationMove = (e: MouseEvent) => {
    if (!isRotating || !elementRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + (element.x / 100) * rect.width;
    const centerY = rect.top + (element.y / 100) * rect.height;

    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const degrees = (angle * 180) / Math.PI + 90;

    onUpdate({
      rotation: (degrees + 360) % 360,
    });
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else if (isRotating) {
      document.addEventListener('mousemove', handleRotationMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mousemove', handleRotationMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, isRotating, dragStart, resizeStart]);

  // Renderizado según tipo de elemento
  const renderContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <div
            style={{
              fontFamily: element.fontFamily || 'Arial',
              fontSize: `${element.fontSize || 16}px`,
              color: element.color || '#000000',
              fontWeight: element.bold ? 'bold' : 'normal',
              fontStyle: element.italic ? 'italic' : 'normal',
              textAlign: element.align || 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                element.align === 'center'
                  ? 'center'
                  : element.align === 'right'
                    ? 'flex-end'
                    : 'flex-start',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          >
            {element.text}
          </div>
        );

      case 'image':
      case 'clipart':
        return (
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
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={elementRef}
      style={elementStyle}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        if (!isSelected) onSelect();
      }}
    >
      {renderContent()}

      {/* Handles de transformación (solo si está seleccionado) */}
      {isSelected && (
        <>
          {/* Resize handles en las esquinas */}
          <div
            className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nwse-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nesw-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nesw-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-purple-500 rounded-full cursor-nwse-resize hover:scale-125 transition-transform"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Rotation handle */}
          <div
            className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-purple-500 rounded-full cursor-grab hover:scale-125 transition-transform flex items-center justify-center"
            onMouseDown={handleRotationStart}
            onClick={(e) => e.stopPropagation()}
            title="Rotar"
          >
            <RotateCw className="w-3 h-3 text-white" />
          </div>

          {/* Label con dimensiones */}
          <div className="absolute -top-6 left-0 bg-purple-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
            {element.width.toFixed(0)}% × {element.height.toFixed(0)}%
          </div>
        </>
      )}
    </div>
  );
}
