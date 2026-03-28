import React from 'react';
import type { PlacementConfig } from '../../../types/configurator';

interface StepPlacementProps {
  config: PlacementConfig;
  selected: string | undefined;
  selectedSize: string | undefined;
  onSelect: (id: string) => void;
  onSizeSelect: (size: string) => void;
}

export default function StepPlacement({
  config,
  selected,
  selectedSize,
  onSelect,
  onSizeSelect,
}: StepPlacementProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{config.label || 'Posición del diseño'}</h2>
        <p className="text-sm text-gray-500 mt-1">
          Indica dónde quieres que vaya estampado tu diseño
        </p>
      </div>

      {/* Placement options grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {config.options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all
                ${isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
                  : 'border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:border-indigo-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] hover:bg-indigo-50/40'
                }
              `}
            >
              {option.icon && (
                <span className="text-2xl leading-none">{option.icon}</span>
              )}
              <span className={`text-sm font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Size of print (optional) */}
      {config.allowSize && selected && config.sizeOptions.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Tamaño del estampado</h3>
          <div className="flex flex-wrap gap-2">
            {config.sizeOptions.map((size) => {
              const isSelected = selectedSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => onSizeSelect(size)}
                  className={`
                    px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                    ${isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                      : 'border-gray-200 bg-white text-gray-700 shadow-sm hover:border-indigo-300 hover:shadow-md hover:bg-indigo-50/40'
                    }
                  `}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
