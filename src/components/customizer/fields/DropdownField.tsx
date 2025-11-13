import React from 'react';
import type { DropdownConfig, CustomizationValue } from '../../../types/customization';

interface DropdownFieldProps {
  fieldId: string;
  label: string;
  required: boolean;
  config: DropdownConfig;
  value: CustomizationValue | undefined;
  onChange: (value: CustomizationValue) => void;
  helpText?: string;
}

export default function DropdownField({
  fieldId,
  label,
  required,
  config,
  value,
  onChange,
  helpText,
}: DropdownFieldProps) {
  const selectedValue = value?.value as string | undefined;

  const handleChange = (optionValue: string) => {
    const option = config.options.find((opt) => opt.value === optionValue);
    if (!option) return;

    onChange({
      fieldId,
      value: optionValue,
      displayValue: option.label,
      priceModifier: option.priceModifier || 0,
    });
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-bold text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {helpText && <p className="text-xs text-gray-500 mb-2">{helpText}</p>}

      <select
        value={selectedValue || ''}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
        required={required}
      >
        <option value="">{config.placeholder || 'Selecciona una opción'}</option>
        {config.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.priceModifier && option.priceModifier > 0
              ? ` (+€${option.priceModifier.toFixed(2)})`
              : ''}
          </option>
        ))}
      </select>

      {/* Show description of selected option */}
      {selectedValue && (
        <>
          {(() => {
            const selectedOption = config.options.find((opt) => opt.value === selectedValue);
            if (selectedOption?.description) {
              return (
                <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800">{selectedOption.description}</p>
                </div>
              );
            }
            return null;
          })()}
        </>
      )}

      {/* Price indicator */}
      {selectedValue && (
        <>
          {(() => {
            const selectedOption = config.options.find((opt) => opt.value === selectedValue);
            if (selectedOption?.priceModifier && selectedOption.priceModifier > 0) {
              return (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Precio adicional:</span>
                  <span className="font-bold text-purple-600">
                    +€{selectedOption.priceModifier.toFixed(2)}
                  </span>
                </div>
              );
            }
            return null;
          })()}
        </>
      )}
    </div>
  );
}
