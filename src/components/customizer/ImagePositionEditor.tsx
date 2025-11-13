import React from 'react';
import { Move, ZoomIn, RotateCw, RefreshCw } from 'lucide-react';
import type { ImageTransform } from '../../types/customization';

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

  const handleReset = () => {
    onChange({
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    });
  };

  return (
    <div className="bg-white rounded-xl border-2 border-purple-200 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900 flex items-center gap-2">
          <Move className="w-4 h-4" />
          Ajustar Posición
        </h4>
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
          onChange={(e) => onChange({ ...transform, x: Number(e.target.value) })}
          disabled={disabled}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
          onChange={(e) => onChange({ ...transform, y: Number(e.target.value) })}
          disabled={disabled}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
          onChange={(e) => onChange({ ...transform, scale: Number(e.target.value) / 100 })}
          disabled={disabled}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
          onChange={(e) => onChange({ ...transform, rotation: Number(e.target.value) })}
          disabled={disabled}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
            onClick={() => onChange({ ...transform, rotation: 0 })}
            disabled={disabled}
            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 Sin rotación
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...transform, scale: 1 })}
            disabled={disabled}
            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📏 Tamaño 100%
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...transform, x: 50, y: 50 })}
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
