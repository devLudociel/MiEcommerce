import React from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  MoveUp,
  MoveDown,
  Image,
  Type,
} from 'lucide-react';
import type { DesignLayer } from '../../types/customization';

interface LayerManagerProps {
  layers: DesignLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onMoveUp: (layerId: string) => void;
  onMoveDown: (layerId: string) => void;
}

export default function LayerManager({
  layers,
  selectedLayerId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onDeleteLayer,
  onMoveUp,
  onMoveDown,
}: LayerManagerProps) {
  // Sort layers by zIndex (highest first = top of stack)
  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  const getLayerIcon = (type: DesignLayer['type']) => {
    switch (type) {
      case 'uploaded_image':
      case 'clipart':
        return <Image className="w-4 h-4" />;
      case 'text':
        return <Type className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  const getLayerName = (layer: DesignLayer) => {
    if (layer.type === 'text' && layer.text) {
      return layer.text.substring(0, 20) + (layer.text.length > 20 ? '...' : '');
    }
    if (layer.type === 'clipart') {
      return 'Clipart';
    }
    if (layer.type === 'uploaded_image') {
      return 'Imagen subida';
    }
    return 'Capa';
  };

  if (layers.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 flex items-center gap-2">
        <Layers className="w-5 h-5 text-white" />
        <h3 className="font-bold text-white">Capas</h3>
        <span className="ml-auto text-xs text-purple-100">{layers.length}</span>
      </div>

      {/* Layers List */}
      <div className="max-h-[300px] overflow-y-auto">
        {sortedLayers.map((layer, index) => (
          <div
            key={layer.id}
            onClick={() => !layer.locked && onSelectLayer(layer.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b hover:bg-purple-50 transition-colors cursor-pointer ${
              selectedLayerId === layer.id ? 'bg-purple-100 border-l-4 border-l-purple-500' : ''
            } ${layer.locked ? 'opacity-60' : ''}`}
          >
            {/* Layer Icon & Name */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={`p-1.5 rounded ${
                  selectedLayerId === layer.id ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {getLayerIcon(layer.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    selectedLayerId === layer.id ? 'text-purple-900' : 'text-gray-900'
                  }`}
                >
                  {getLayerName(layer)}
                </p>
                <p className="text-xs text-gray-500">z-index: {layer.zIndex}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {/* Visibility Toggle */}
              <button
                onClick={() => onToggleVisibility(layer.id)}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title={layer.visible ? 'Ocultar' : 'Mostrar'}
              >
                {layer.visible ? (
                  <Eye className="w-4 h-4 text-gray-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Lock Toggle */}
              <button
                onClick={() => onToggleLock(layer.id)}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                title={layer.locked ? 'Desbloquear' : 'Bloquear'}
              >
                {layer.locked ? (
                  <Lock className="w-4 h-4 text-gray-600" />
                ) : (
                  <Unlock className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Move Up */}
              <button
                onClick={() => onMoveUp(layer.id)}
                disabled={index === 0}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Traer al frente"
              >
                <MoveUp className="w-4 h-4 text-gray-600" />
              </button>

              {/* Move Down */}
              <button
                onClick={() => onMoveDown(layer.id)}
                disabled={index === sortedLayers.length - 1}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Enviar atrás"
              >
                <MoveDown className="w-4 h-4 text-gray-600" />
              </button>

              {/* Delete */}
              <button
                onClick={() => onDeleteLayer(layer.id)}
                disabled={layer.locked}
                className="p-1.5 hover:bg-red-100 rounded transition-colors text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Footer */}
      <div className="px-4 py-2 bg-purple-50 border-t text-xs text-purple-700 text-center">
        💡 Click en una capa para seleccionarla y editarla
      </div>
    </div>
  );
}
