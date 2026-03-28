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
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md ring-2 ring-indigo-200'
                : 'border-gray-200 bg-white text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:border-indigo-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] hover:bg-indigo-50/40'
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
