import React from 'react';
import { Check } from 'lucide-react';
import type { ConfiguratorStepId } from '../../../types/configurator';

const STEP_LABELS: Record<ConfiguratorStepId, string> = {
  variant: 'Variante',
  size: 'Tamaño',
  design: 'Diseño',
  quantity: 'Cantidad',
  summary: 'Resumen',
};

interface StepProgressProps {
  steps: ConfiguratorStepId[];
  currentStep: number;
  onStepClick: (index: number) => void;
}

export default function StepProgress({ steps, currentStep, onStepClick }: StepProgressProps) {
  return (
    <nav aria-label="Progreso de configuración" className="w-full">
      {/* Mobile: compact */}
      <div className="sm:hidden flex items-center justify-between px-2 py-3">
        <span className="text-sm font-medium text-gray-700">
          Paso {currentStep + 1} de {steps.length}
        </span>
        <span className="text-sm font-semibold text-indigo-600">
          {STEP_LABELS[steps[currentStep]]}
        </span>
      </div>

      {/* Desktop: full bar */}
      <ol className="hidden sm:flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = index < currentStep;

          return (
            <li
              key={step}
              className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
            >
              <button
                type="button"
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${isCurrent
                    ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500'
                    : isCompleted
                      ? 'text-indigo-600 hover:bg-indigo-50 cursor-pointer'
                      : 'text-gray-400 cursor-default'
                  }
                `}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span
                  className={`
                    flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0
                    ${isCurrent
                      ? 'bg-indigo-600 text-white'
                      : isCompleted
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-200 text-gray-500'
                    }
                  `}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </span>
                <span className="hidden lg:inline">{STEP_LABELS[step]}</span>
              </button>

              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-indigo-400' : 'bg-gray-200'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
