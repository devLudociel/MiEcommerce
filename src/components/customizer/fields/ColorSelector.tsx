import React from 'react';
import type { ColorSelectorConfig, CustomizationValue } from '../../../types/customization';

interface ColorSelectorProps {
  fieldId: string;
  label: string;
  required: boolean;
  config: ColorSelectorConfig;
  value: CustomizationValue | undefined;
  onChange: (value: CustomizationValue) => void;
  helpText?: string;
}

export default function ColorSelector({
  fieldId,
  label,
  required,
  config,
  value,
  onChange,
  helpText,
}: ColorSelectorProps) {
  const selectedColor = value?.value as string | undefined;

  const handleColorSelect = (colorId: string) => {
    const color = config.availableColors.find((c) => c.id === colorId);
    if (!color) return;

    onChange({
      fieldId,
      value: colorId,
      displayValue: color.name,
      priceModifier: 0,
    });
  };

  if (config.displayStyle === 'dropdown') {
    return (
      <div className="mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {helpText && <p className="text-xs text-gray-500 mb-2">{helpText}</p>}
        <select
          value={selectedColor || ''}
          onChange={(e) => handleColorSelect(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          required={required}
        >
          <option value="">Selecciona un color</option>
          {config.availableColors.map((color) => (
            <option key={color.id} value={color.id}>
              {color.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Display as color blocks (default)
  return (
    <div className="mb-6">
      <label className="block text-sm font-bold text-gray-700 mb-3">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {helpText && <p className="text-xs text-gray-500 mb-3">{helpText}</p>}

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
        {config.availableColors.map((color) => {
          const isSelected = selectedColor === color.id;

          return (
            <button
              key={color.id}
              type="button"
              onClick={() => handleColorSelect(color.id)}
              className={`
                group relative aspect-square rounded-xl border-2 transition-all
                ${
                  isSelected
                    ? 'border-purple-500 ring-4 ring-purple-200 scale-105'
                    : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                }
              `}
              title={color.name}
            >
              {/* Color block */}
              <div
                className="w-full h-full rounded-lg"
                style={{
                  backgroundColor: color.hex,
                  ...(color.hex === '#FFFFFF' && {
                    border: '1px solid #e5e7eb',
                  }),
                }}
              />

              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
                    ✓
                  </div>
                </div>
              )}

              {/* Color name tooltip */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs font-medium text-gray-700 pointer-events-none">
                {color.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Preview image if available */}
      {config.displayStyle === 'color_blocks_with_preview' && selectedColor && (
        <div className="mt-4">
          {(() => {
            const selectedColorData = config.availableColors.find((c) => c.id === selectedColor);
            if (selectedColorData?.previewImage) {
              return (
                <div className="relative w-full max-w-md mx-auto rounded-xl overflow-hidden border-2 border-gray-200">
                  <img
                    src={selectedColorData.previewImage}
                    alt={`Preview ${selectedColorData.name}`}
                    className="w-full h-auto"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="text-white font-medium text-sm">
                      Vista previa: {selectedColorData.name}
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
}
