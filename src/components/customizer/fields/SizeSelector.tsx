import React, { useState } from 'react';
import type { SizeSelectorConfig, CustomizationValue } from '../../../types/customization';

interface SizeSelectorProps {
  fieldId: string;
  label: string;
  required: boolean;
  config: SizeSelectorConfig;
  value: CustomizationValue | undefined;
  onChange: (value: CustomizationValue) => void;
  helpText?: string;
}

export default function SizeSelector({
  fieldId,
  label,
  required,
  config,
  value,
  onChange,
  helpText,
}: SizeSelectorProps) {
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const selectedSize = value?.value as string | undefined;

  const handleSizeSelect = (size: string) => {
    onChange({
      fieldId,
      value: size,
      displayValue: size,
      priceModifier: 0,
    });
  };

  if (config.displayStyle === 'dropdown') {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {config.showSizeGuide && (
            <button
              type="button"
              onClick={() => setShowSizeGuide(!showSizeGuide)}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium underline"
            >
              📏 Guía de tallas
            </button>
          )}
        </div>
        {helpText && <p className="text-xs text-gray-500 mb-2">{helpText}</p>}
        <select
          value={selectedSize || ''}
          onChange={(e) => handleSizeSelect(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          required={required}
        >
          <option value="">Selecciona una talla</option>
          {config.sizes.map((size) => (
            <option key={size} value={size}>
              Talla {size}
            </option>
          ))}
        </select>

        {/* Size Guide Modal */}
        {showSizeGuide && (
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-bold text-sm mb-2">Guía de Tallas</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-purple-200">
                  <th className="text-left py-2">Talla</th>
                  <th className="text-left py-2">Pecho (cm)</th>
                  <th className="text-left py-2">Cintura (cm)</th>
                </tr>
              </thead>
              <tbody>
                {config.sizes.map((size) => {
                  // Valores aproximados por talla
                  const measurements: Record<string, { chest: string; waist: string }> = {
                    XS: { chest: '86-91', waist: '71-76' },
                    S: { chest: '91-96', waist: '76-81' },
                    M: { chest: '96-101', waist: '81-86' },
                    L: { chest: '101-106', waist: '86-91' },
                    XL: { chest: '106-112', waist: '91-97' },
                    XXL: { chest: '112-118', waist: '97-103' },
                  };
                  const measure = measurements[size];
                  if (!measure) return null;

                  return (
                    <tr key={size} className="border-b border-purple-100">
                      <td className="py-2 font-medium">{size}</td>
                      <td className="py-2">{measure.chest}</td>
                      <td className="py-2">{measure.waist}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Display as buttons (default)
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-bold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {config.showSizeGuide && (
          <button
            type="button"
            onClick={() => setShowSizeGuide(!showSizeGuide)}
            className="text-xs text-purple-600 hover:text-purple-700 font-medium underline"
          >
            📏 Guía de tallas
          </button>
        )}
      </div>
      {helpText && <p className="text-xs text-gray-500 mb-3">{helpText}</p>}

      <div className="flex flex-wrap gap-3">
        {config.sizes.map((size) => {
          const isSelected = selectedSize === size;

          return (
            <button
              key={size}
              type="button"
              onClick={() => handleSizeSelect(size)}
              className={`
                px-6 py-3 min-w-[60px] rounded-lg font-bold text-sm transition-all
                ${
                  isSelected
                    ? 'bg-purple-500 text-white ring-4 ring-purple-200 scale-105'
                    : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-purple-300 hover:scale-105'
                }
              `}
            >
              {size}
            </button>
          );
        })}
      </div>

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowSizeGuide(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>

            <h3 className="text-xl font-bold mb-4">📏 Guía de Tallas</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 font-bold">Talla</th>
                    <th className="text-left py-3 font-bold">Pecho (cm)</th>
                    <th className="text-left py-3 font-bold">Cintura (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  {config.sizes.map((size) => {
                    const measurements: Record<string, { chest: string; waist: string }> = {
                      XS: { chest: '86-91', waist: '71-76' },
                      S: { chest: '91-96', waist: '76-81' },
                      M: { chest: '96-101', waist: '81-86' },
                      L: { chest: '101-106', waist: '86-91' },
                      XL: { chest: '106-112', waist: '91-97' },
                      XXL: { chest: '112-118', waist: '97-103' },
                    };
                    const measure = measurements[size];
                    if (!measure) return null;

                    return (
                      <tr
                        key={size}
                        className={`border-b border-gray-100 ${
                          selectedSize === size ? 'bg-purple-50' : ''
                        }`}
                      >
                        <td className="py-3 font-bold">{size}</td>
                        <td className="py-3">{measure.chest}</td>
                        <td className="py-3">{measure.waist}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
              <p className="font-medium mb-1">💡 Consejo:</p>
              <p>Para obtener las medidas correctas, mide tu pecho y cintura con una cinta métrica.</p>
            </div>

            <button
              onClick={() => setShowSizeGuide(false)}
              className="mt-4 w-full bg-purple-500 text-white py-3 rounded-lg font-bold hover:bg-purple-600 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
