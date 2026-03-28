import React from 'react';
import type { SizeConfig } from '../../../types/configurator';

interface StepSizeProps {
  config: SizeConfig;
  selected: string | undefined;
  onSelect: (size: string) => void;
}

export default function StepSize({ config, selected, onSelect }: StepSizeProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{config.label}</h2>
        <p className="text-sm text-gray-500 mt-1">Elige la opción que mejor se adapte</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {config.options.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onSelect(size)}
            className={`
              min-w-[4rem] px-5 py-3 rounded-xl border-2 text-sm font-semibold transition-all
              ${selected === size
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md ring-1 ring-indigo-300'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
            aria-pressed={selected === size}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
}
