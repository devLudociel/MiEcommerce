import React from 'react';
import type { ProductConfiguratorAttribute } from '../../../types/configurator';

interface StepFreetextProps {
  attribute: ProductConfiguratorAttribute;
  value: string;
  onChange: (value: string) => void;
}

export default function StepFreetext({ attribute, value, onChange }: StepFreetextProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{attribute.label}</h2>
        {attribute.required !== false && (
          <p className="text-sm text-gray-500 mt-1">Este campo es obligatorio</p>
        )}
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={attribute.placeholder ?? ''}
        className="
          w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl
          focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none
          transition-colors placeholder:text-gray-400
        "
      />
    </div>
  );
}
