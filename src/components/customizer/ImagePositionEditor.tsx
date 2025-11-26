import React, { useEffect } from 'react';
import { Move, ZoomIn, RotateCw, RefreshCw, Undo, Redo } from 'lucide-react';
import type { ImageTransform } from '../../types/customization';
import { useTransformHistory } from '../../hooks/useTransformHistory';

interface ImagePositionEditorProps {
  transform: ImageTransform;
  onChange: (transform: ImageTransform) => void;
  disabled?: boolean;
}

export default function ImagePositionEditor({
  transform,
  onChange,
  disabled = false
}: ImagePositionEditorProps) {
  const {
    transform: historyTransform,
    canUndo,
    canRedo,
    pushTransform,
    undo,
    redo,
  } = useTransformHistory(transform);

  const handleTransformChange = (newTransform: ImageTransform) => {
    pushTransform(newTransform);
    onChange(newTransform);
  };

  const handleUndo = () => {
    if (canUndo) {
      const previousTransform = undo();
      if (previousTransform) {
        onChange(previousTransform);
      }
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      const nextTransform = redo();
      if (nextTransform) {
        onChange(nextTransform);
      }
    }
  };

  const handleReset = () => {
    const resetTransform = {
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    };
    pushTransform(resetTransform);
    onChange(resetTransform);
  };

  return (
    <div className="bg-white rounded-xl border-2 border-purple-200 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900 flex items-center gap-2">
          <Move className="w-4 h-4" />
          Ajustar Posición
        </h4>
        <div className="flex items-center gap-2">
          {/* Undo/Redo Buttons */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={disabled || !canUndo}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={disabled || !canRedo}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Rehacer (Ctrl+Y)"
          >
            <Redo className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={disabled}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-3 h-3" />
            Resetear
          </button>
        </div>
      </div>

      {/* Position X */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700">
          <span className="flex items-center gap-2">
            ↔️ Posición Horizontal
          </span>
          <span className="text-purple-600 font-mono">{Math.round(transform.x)}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={transform.x}
          onChange={(e) => handleTransformChange({ ...transform, x: Number(e.target.value) })}
          disabled={disabled}
          className="w-full h-8 md:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          style={{
            padding: '12px 0',
            margin: '-12px 0',
          }}
          aria-label="Ajustar posición horizontal del diseño"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={transform.x}
          aria-valuetext={`${Math.round(transform.x)} porciento horizontal`}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>← Izquierda</span>
          <span>Derecha →</span>
        </div>
      </div>

      {/* Position Y */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700">
          <span className="flex items-center gap-2">
            ↕️ Posición Vertical
          </span>
          <span className="text-purple-600 font-mono">{Math.round(transform.y)}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={transform.y}
          onChange={(e) => handleTransformChange({ ...transform, y: Number(e.target.value) })}
          disabled={disabled}
          className="w-full h-8 md:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          style={{
            padding: '12px 0',
            margin: '-12px 0',
          }}
          aria-label="Ajustar posición vertical del diseño"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={transform.y}
          aria-valuetext={`${Math.round(transform.y)} porciento vertical`}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>↑ Arriba</span>
          <span>Abajo ↓</span>
        </div>
      </div>

      {/* Scale */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700">
          <span className="flex items-center gap-2">
            <ZoomIn className="w-4 h-4" />
            Tamaño
          </span>
          <span className="text-purple-600 font-mono">{Math.round(transform.scale * 100)}%</span>
        </label>
        <input
          type="range"
          min="10"
          max="300"
          step="5"
          value={transform.scale * 100}
          onChange={(e) => handleTransformChange({ ...transform, scale: Number(e.target.value) / 100 })}
          disabled={disabled}
          className="w-full h-8 md:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          style={{
            padding: '12px 0',
            margin: '-12px 0',
          }}
          aria-label="Ajustar tamaño del diseño"
          aria-valuemin={10}
          aria-valuemax={300}
          aria-valuenow={transform.scale * 100}
          aria-valuetext={`${Math.round(transform.scale * 100)} porciento de tamaño`}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>10%</span>
          <span>300%</span>
        </div>
      </div>

      {/* Rotation */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-sm font-medium text-gray-700">
          <span className="flex items-center gap-2">
            <RotateCw className="w-4 h-4" />
            Rotación
          </span>
          <span className="text-purple-600 font-mono">{Math.round(transform.rotation)}°</span>
        </label>
        <input
          type="range"
          min="0"
          max="360"
          value={transform.rotation}
          onChange={(e) => handleTransformChange({ ...transform, rotation: Number(e.target.value) })}
          disabled={disabled}
          className="w-full h-8 md:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          style={{
            padding: '12px 0',
            margin: '-12px 0',
          }}
          aria-label="Ajustar rotación del diseño"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={transform.rotation}
          aria-valuetext={`${Math.round(transform.rotation)} grados`}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>0°</span>
          <span>360°</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleTransformChange({ ...transform, rotation: 0 })}
            disabled={disabled}
            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 Sin rotación
          </button>
          <button
            type="button"
            onClick={() => handleTransformChange({ ...transform, scale: 1 })}
            disabled={disabled}
            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📏 Tamaño 100%
          </button>
          <button
            type="button"
            onClick={() => handleTransformChange({ ...transform, x: 50, y: 50 })}
            disabled={disabled}
            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed col-span-2"
          >
            🎯 Centrar
          </button>
        </div>
      </div>

      {/* Tip */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <span className="font-bold">💡 Tip:</span> Ajusta la posición para que tu diseño quede perfectamente centrado en el producto.
        </p>
      </div>
    </div>
  );
}
