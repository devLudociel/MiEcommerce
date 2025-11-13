import { useState } from 'react';
import { Plus, Trash2, Ruler } from 'lucide-react';

interface SizeSelectorConfigEditorProps {
  sizes: string[];
  onChange: (sizes: string[]) => void;
}

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export default function SizeSelectorConfigEditor({ sizes, onChange }: SizeSelectorConfigEditorProps) {
  const [showAddSize, setShowAddSize] = useState(false);
  const [newSize, setNewSize] = useState('');

  const handleAddSize = () => {
    const trimmedSize = newSize.trim().toUpperCase();

    if (!trimmedSize) {
      alert('Ingresa una talla');
      return;
    }

    if (sizes.includes(trimmedSize)) {
      alert('Esta talla ya existe');
      return;
    }

    onChange([...sizes, trimmedSize]);
    setNewSize('');
    setShowAddSize(false);
  };

  const handleRemoveSize = (size: string) => {
    onChange(sizes.filter((s) => s !== size));
  };

  const handleAddCommonSize = (size: string) => {
    if (!sizes.includes(size)) {
      onChange([...sizes, size]);
    }
  };

  const handleMoveSize = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sizes.length - 1) return;

    const newSizes = [...sizes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSizes[index], newSizes[targetIndex]] = [newSizes[targetIndex], newSizes[index]];
    onChange(newSizes);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <Ruler className="w-4 h-4" />
          Tallas Disponibles
        </h4>
        <button
          onClick={() => setShowAddSize(!showAddSize)}
          className="text-sm px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-1" />
          Agregar Talla
        </button>
      </div>

      {/* Quick Add Common Sizes */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs font-medium text-blue-900 mb-2">⚡ Agregar rápido:</p>
        <div className="flex flex-wrap gap-2">
          {COMMON_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => handleAddCommonSize(size)}
              disabled={sizes.includes(size)}
              className={`px-3 py-1 text-sm font-bold rounded-lg transition-all ${
                sizes.includes(size)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border-2 border-blue-300 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Sizes List */}
      <div className="space-y-2">
        {sizes.map((size, index) => (
          <div
            key={size}
            className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg hover:border-purple-300 transition-colors"
          >
            {/* Order Controls */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleMoveSize(index, 'up')}
                disabled={index === 0}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                title="Mover arriba"
              >
                ▲
              </button>
              <span className="text-xs font-bold text-gray-500">{index + 1}</span>
              <button
                onClick={() => handleMoveSize(index, 'down')}
                disabled={index === sizes.length - 1}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                title="Mover abajo"
              >
                ▼
              </button>
            </div>

            {/* Size Display */}
            <div className="flex-1 flex items-center gap-3">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-700">{size}</span>
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900">Talla {size}</div>
                <div className="text-xs text-gray-500">Orden: #{index + 1}</div>
              </div>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => handleRemoveSize(size)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar talla"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Size Form */}
      {showAddSize && (
        <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50">
          <h5 className="font-semibold text-gray-900 mb-3">Nueva Talla Personalizada</h5>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código de Talla
              </label>
              <input
                type="text"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSize()}
                placeholder="Ej: 3XL, 42, 10-12"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Se convertirá automáticamente a mayúsculas
              </p>
            </div>

            {/* Preview */}
            {newSize.trim() && (
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-700">
                    {newSize.trim().toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Talla {newSize.trim().toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500">Vista previa</div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAddSize}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors"
              >
                ✓ Agregar Talla
              </button>
              <button
                onClick={() => {
                  setShowAddSize(false);
                  setNewSize('');
                }}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {sizes.length === 0 && !showAddSize && (
        <div className="text-center py-8 text-gray-500">
          <Ruler className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No hay tallas configuradas</p>
          <p className="text-xs mt-1">Usa los botones rápidos o agrega tallas personalizadas</p>
        </div>
      )}
    </div>
  );
}
