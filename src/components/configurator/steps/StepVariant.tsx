import React from 'react';
import type { VariantConfig } from '../../../types/configurator';

interface StepVariantProps {
  config: VariantConfig;
  selected: string | undefined;
  onSelect: (variantId: string) => void;
}

export default function StepVariant({ config, selected, onSelect }: StepVariantProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{config.label}</h2>
        <p className="text-sm text-gray-500 mt-1">Selecciona una opción para continuar</p>
      </div>

      {config.type === 'color' && (
        <div className="flex flex-wrap gap-3">
          {config.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`
                group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all
                ${selected === opt.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
                  : 'border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:border-indigo-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] hover:bg-indigo-50/40'
                }
              `}
              aria-pressed={selected === opt.id}
              title={opt.label}
            >
              <span
                className={`
                  w-12 h-12 rounded-full border-2 shadow-inner
                  ${selected === opt.id ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-gray-300'}
                `}
                style={{ backgroundColor: opt.value }}
              />
              <span className="text-xs font-medium text-gray-700">{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {config.type === 'image' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {config.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`
                relative rounded-xl overflow-hidden border-2 transition-all aspect-square
                ${selected === opt.id
                  ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-300'
                  : 'border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:border-indigo-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)]'
                }
              `}
              aria-pressed={selected === opt.id}
            >
              <img
                src={opt.value}
                alt={opt.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2">
                <span className="text-xs font-medium text-white">{opt.label}</span>
              </span>
              {selected === opt.id && (
                <span className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {config.type === 'text' && (
        <div className="grid gap-3">
          {config.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`
                flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                ${selected === opt.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
                  : 'border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:border-indigo-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] hover:bg-indigo-50/40'
                }
              `}
              aria-pressed={selected === opt.id}
            >
              <span
                className={`
                  w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center
                  ${selected === opt.id ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}
                `}
              >
                {selected === opt.id && (
                  <span className="w-2 h-2 bg-white rounded-full" />
                )}
              </span>
              <div>
                <span className="font-medium text-gray-900">{opt.label}</span>
                {opt.value && opt.value !== opt.label && (
                  <p className="text-sm text-gray-500 mt-0.5">{opt.value}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
