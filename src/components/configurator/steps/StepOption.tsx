import React from 'react';
import type { OptionGroup } from '../../../types/configurator';

interface StepOptionProps {
  group: OptionGroup;
  selected: string | undefined;
  onSelect: (valueId: string) => void;
}

export default function StepOption({ group, selected, onSelect }: StepOptionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{group.label}</h2>
        <p className="text-sm text-gray-500 mt-1">Selecciona una opción para continuar</p>
      </div>

      {/* Color swatches */}
      {group.type === 'color' && (
        <div className="flex flex-wrap gap-3">
          {group.values.map((val) => (
            <button
              key={val.id}
              type="button"
              onClick={() => onSelect(val.id)}
              className={`
                group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all
                ${selected === val.id
                  ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
                  : 'border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:border-indigo-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] hover:bg-indigo-50/40'
                }
              `}
              aria-pressed={selected === val.id}
              title={val.label}
            >
              <span
                className={`
                  w-12 h-12 rounded-full border-2 shadow-inner
                  ${selected === val.id ? 'border-indigo-500 ring-2 ring-indigo-300' : 'border-gray-300'}
                `}
                style={{ backgroundColor: val.value }}
              />
              <span className="text-xs font-medium text-gray-700">{val.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Image grid */}
      {group.type === 'image' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {group.values.map((val) => (
            <button
              key={val.id}
              type="button"
              onClick={() => onSelect(val.id)}
              className={`
                relative rounded-xl overflow-hidden border-2 transition-all aspect-square
                ${selected === val.id
                  ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-300'
                  : 'border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:border-indigo-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)]'
                }
              `}
              aria-pressed={selected === val.id}
            >
              <img
                src={val.value}
                alt={val.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2">
                <span className="text-xs font-medium text-white">{val.label}</span>
              </span>
              {selected === val.id && (
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

      {/* Text / pill buttons */}
      {group.type === 'text' && (
        <div className="flex flex-wrap gap-3">
          {group.values.map((val) => (
            <button
              key={val.id}
              type="button"
              onClick={() => onSelect(val.id)}
              className={`
                flex items-center gap-3 px-5 py-3 rounded-xl border-2 text-sm font-semibold transition-all
                ${selected === val.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md ring-2 ring-indigo-200'
                  : 'border-gray-200 bg-white text-gray-700 shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:border-indigo-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.18)] hover:bg-indigo-50/40'
                }
              `}
              aria-pressed={selected === val.id}
            >
              <span
                className={`
                  w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center
                  ${selected === val.id ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}
                `}
              >
                {selected === val.id && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
              </span>
              <span className="leading-tight">
                {val.label}
                {val.value && val.value !== val.label && (
                  <span className="block text-xs font-normal text-gray-400 mt-0.5">{val.value}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
