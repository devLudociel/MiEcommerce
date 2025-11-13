import { useState } from 'react';
import { Plus, Trash2, Palette } from 'lucide-react';
import type { ColorOption } from '../../../types/customization';

interface ColorSelectorConfigEditorProps {
  colors: ColorOption[];
  onChange: (colors: ColorOption[]) => void;
}

export default function ColorSelectorConfigEditor({ colors, onChange }: ColorSelectorConfigEditorProps) {
  const [showAddColor, setShowAddColor] = useState(false);
  const [newColor, setNewColor] = useState<ColorOption>({
    id: '',
    name: '',
    hex: '#000000',
  });

  const handleAddColor = () => {
    if (!newColor.name.trim() || !newColor.hex) {
      alert('Completa todos los campos');
      return;
    }

    const colorId = newColor.name.toLowerCase().replace(/\s+/g, '_');
    onChange([...colors, { ...newColor, id: colorId }]);

    // Reset form
    setNewColor({ id: '', name: '', hex: '#000000' });
    setShowAddColor(false);
  };

  const handleRemoveColor = (colorId: string) => {
    onChange(colors.filter((c) => c.id !== colorId));
  };

  const handleUpdateColor = (colorId: string, updates: Partial<ColorOption>) => {
    onChange(
      colors.map((c) =>
        c.id === colorId
          ? { ...c, ...updates, id: updates.name ? updates.name.toLowerCase().replace(/\s+/g, '_') : c.id }
          : c
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Colores Disponibles
        </h4>
        <button
          onClick={() => setShowAddColor(!showAddColor)}
          className="text-sm px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-1" />
          Agregar Color
        </button>
      </div>

      {/* Colors Grid */}
      <div className="grid grid-cols-2 gap-3">
        {colors.map((color) => (
          <div
            key={color.id}
            className="border-2 border-gray-200 rounded-lg p-3 hover:border-purple-300 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              {/* Color Preview */}
              <div
                className="w-12 h-12 rounded-lg border-2 border-gray-300 flex-shrink-0"
                style={{ backgroundColor: color.hex }}
                title={color.hex}
              />

              {/* Color Info */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={color.name}
                  onChange={(e) => handleUpdateColor(color.id, { name: e.target.value })}
                  className="w-full px-2 py-1 text-sm font-medium border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Nombre del color"
                />
                <input
                  type="text"
                  value={color.hex}
                  onChange={(e) => handleUpdateColor(color.id, { hex: e.target.value })}
                  className="w-full px-2 py-1 text-xs font-mono mt-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="#000000"
                />
                <input
                  type="text"
                  value={color.previewImage || ''}
                  onChange={(e) => handleUpdateColor(color.id, { previewImage: e.target.value })}
                  className="w-full px-2 py-1 text-xs mt-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="URL imagen preview (ej: https://...)"
                />
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveColor(color.id)}
                className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Eliminar color"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Color Picker */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color.hex}
                onChange={(e) => handleUpdateColor(color.id, { hex: e.target.value })}
                className="w-full h-8 cursor-pointer rounded border border-gray-300"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add Color Form */}
      {showAddColor && (
        <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50">
          <h5 className="font-semibold text-gray-900 mb-3">Nuevo Color</h5>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Color
              </label>
              <input
                type="text"
                value={newColor.name}
                onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                placeholder="Ej: Rojo Intenso"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código de Color (Hex)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newColor.hex}
                  onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                  placeholder="#FF0000"
                  className="flex-1 px-3 py-2 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="color"
                  value={newColor.hex}
                  onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                  className="w-20 h-10 cursor-pointer rounded-lg border border-gray-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Imagen Preview (Opcional)
              </label>
              <input
                type="text"
                value={newColor.previewImage || ''}
                onChange={(e) => setNewColor({ ...newColor, previewImage: e.target.value })}
                placeholder="https://ejemplo.com/imagen-camiseta-roja.jpg"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                💡 URL de la imagen del producto en este color (ej: camiseta blanca, camiseta negra)
              </p>
            </div>

            {/* Preview */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <div
                className="w-16 h-16 rounded-lg border-2 border-gray-300"
                style={{ backgroundColor: newColor.hex }}
              />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {newColor.name || 'Nombre del color'}
                </div>
                <div className="text-xs font-mono text-gray-500">{newColor.hex}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddColor}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors"
              >
                ✓ Agregar Color
              </button>
              <button
                onClick={() => setShowAddColor(false)}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {colors.length === 0 && !showAddColor && (
        <div className="text-center py-8 text-gray-500">
          <Palette className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No hay colores configurados</p>
          <p className="text-xs mt-1">Haz clic en "Agregar Color" para empezar</p>
        </div>
      )}
    </div>
  );
}
