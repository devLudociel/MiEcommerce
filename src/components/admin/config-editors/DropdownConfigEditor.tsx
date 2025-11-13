import { useState } from 'react';
import { Plus, Trash2, List, GripVertical } from 'lucide-react';
import type { DropdownOption } from '../../../types/customization';

interface DropdownConfigEditorProps {
  options: DropdownOption[];
  onChange: (options: DropdownOption[]) => void;
}

export default function DropdownConfigEditor({ options, onChange }: DropdownConfigEditorProps) {
  const [showAddOption, setShowAddOption] = useState(false);
  const [newOption, setNewOption] = useState<DropdownOption>({
    value: '',
    label: '',
    priceModifier: 0,
    description: '',
  });

  const handleAddOption = () => {
    if (!newOption.label.trim()) {
      alert('Ingresa un nombre para la opción');
      return;
    }

    const optionValue = newOption.label.toLowerCase().replace(/\s+/g, '_');
    onChange([...options, { ...newOption, value: optionValue }]);

    // Reset form
    setNewOption({ value: '', label: '', priceModifier: 0, description: '' });
    setShowAddOption(false);
  };

  const handleRemoveOption = (optionValue: string) => {
    onChange(options.filter((opt) => opt.value !== optionValue));
  };

  const handleUpdateOption = (optionValue: string, updates: Partial<DropdownOption>) => {
    onChange(
      options.map((opt) =>
        opt.value === optionValue
          ? { ...opt, ...updates, value: updates.label ? updates.label.toLowerCase().replace(/\s+/g, '_') : opt.value }
          : opt
      )
    );
  };

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === options.length - 1) return;

    const newOptions = [...options];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newOptions[index], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[index]];
    onChange(newOptions);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <List className="w-4 h-4" />
          Opciones del Dropdown
        </h4>
        <button
          onClick={() => setShowAddOption(!showAddOption)}
          className="text-sm px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-1" />
          Agregar Opción
        </button>
      </div>

      {/* Options List */}
      <div className="space-y-2">
        {options.map((option, index) => (
          <div
            key={option.value}
            className="border-2 border-gray-200 rounded-lg p-3 hover:border-purple-300 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Order Controls */}
              <div className="flex flex-col gap-1 pt-2">
                <button
                  onClick={() => handleMoveOption(index, 'up')}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                  title="Mover arriba"
                >
                  ▲
                </button>
                <GripVertical className="w-4 h-4 text-gray-400" />
                <button
                  onClick={() => handleMoveOption(index, 'down')}
                  disabled={index === options.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                  title="Mover abajo"
                >
                  ▼
                </button>
              </div>

              {/* Option Content */}
              <div className="flex-1 space-y-2">
                {/* Order Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    #{index + 1}
                  </span>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nombre de la opción
                  </label>
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => handleUpdateOption(option.value, { label: e.target.value })}
                    placeholder="Ej: Tamaño Grande"
                    className="w-full px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Price Modifier */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Precio adicional (opcional)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={option.priceModifier || 0}
                      onChange={(e) =>
                        handleUpdateOption(option.value, {
                          priceModifier: parseFloat(e.target.value) || 0,
                        })
                      }
                      min="0"
                      step="0.01"
                      className="w-32 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-600">€</span>
                    {option.priceModifier && option.priceModifier > 0 && (
                      <span className="text-sm font-bold text-purple-600">
                        (+€{option.priceModifier.toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    value={option.description || ''}
                    onChange={(e) => handleUpdateOption(option.value, { description: e.target.value })}
                    placeholder="Descripción adicional para ayudar al usuario"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveOption(option.value)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar opción"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Option Form */}
      {showAddOption && (
        <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50">
          <h5 className="font-semibold text-gray-900 mb-3">Nueva Opción</h5>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la opción *
              </label>
              <input
                type="text"
                value={newOption.label}
                onChange={(e) => setNewOption({ ...newOption, label: e.target.value })}
                placeholder="Ej: Mediano (30 x 40 cm)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio adicional
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={newOption.priceModifier || 0}
                  onChange={(e) =>
                    setNewOption({ ...newOption, priceModifier: parseFloat(e.target.value) || 0 })
                  }
                  min="0"
                  step="0.01"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <span className="text-gray-600">€</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción (opcional)
              </label>
              <textarea
                value={newOption.description || ''}
                onChange={(e) => setNewOption({ ...newOption, description: e.target.value })}
                placeholder="Descripción adicional que ayude al usuario a elegir"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Preview */}
            {newOption.label && (
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{newOption.label}</div>
                    {newOption.description && (
                      <div className="text-xs text-gray-500 mt-1">{newOption.description}</div>
                    )}
                  </div>
                  {newOption.priceModifier && newOption.priceModifier > 0 && (
                    <div className="text-sm font-bold text-purple-600">
                      +€{newOption.priceModifier.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAddOption}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors"
              >
                ✓ Agregar Opción
              </button>
              <button
                onClick={() => {
                  setShowAddOption(false);
                  setNewOption({ value: '', label: '', priceModifier: 0, description: '' });
                }}
                className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {options.length === 0 && !showAddOption && (
        <div className="text-center py-8 text-gray-500">
          <List className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No hay opciones configuradas</p>
          <p className="text-xs mt-1">Haz clic en "Agregar Opción" para empezar</p>
        </div>
      )}
    </div>
  );
}
