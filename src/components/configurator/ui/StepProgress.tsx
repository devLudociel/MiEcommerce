import React from 'react';
import { Check } from 'lucide-react';
import type {
  ConfiguratorStepId,
  OptionGroup,
  ProductConfiguratorAttribute,
} from '../../../types/configurator';

const FIXED_STEP_LABELS: Partial<Record<string, string>> = {
  design: 'Diseño',
  placement: 'Posición',
  quantity: 'Cantidad',
  summary: 'Resumen',
};

function getStepLabel(
  step: ConfiguratorStepId,
  optionGroups?: OptionGroup[],
  attributes?: ProductConfiguratorAttribute[],
): string {
  if (step.startsWith('option:')) {
    const groupId = step.slice(7);
    return optionGroups?.find((g) => g.id === groupId)?.label ?? groupId;
  }
  if (step.startsWith('attribute:')) {
    const attrId = step.slice(10);
    return (
      optionGroups?.find((g) => g.id === attrId)?.label ??
      attributes?.find((a) => a.id === attrId)?.label ??
      attrId
    );
  }
  return FIXED_STEP_LABELS[step] ?? step;
}

interface StepProgressProps {
  steps: ConfiguratorStepId[];
  currentStep: number;
  optionGroups?: OptionGroup[];
  attributes?: ProductConfiguratorAttribute[];
  onStepClick: (index: number) => void;
}

export default function StepProgress({
  steps,
  currentStep,
  optionGroups,
  attributes,
  onStepClick,
}: StepProgressProps) {
  return (
    <nav aria-label="Progreso de configuración" className="w-full">
      {/* Mobile: slim progress bar + step info */}
      <div className="sm:hidden">
        <div className="h-1 bg-gray-100 rounded-full mb-2">
          <div
            className="h-1 bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs text-gray-400">Paso {currentStep + 1} de {steps.length}</span>
          <span className="text-xs font-semibold text-indigo-600">
            {steps[currentStep] ? getStepLabel(steps[currentStep], optionGroups, attributes) : ''}
          </span>
        </div>
      </div>

      {/* Desktop: full step bar */}
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
                <span className="hidden lg:inline">
                  {getStepLabel(step, optionGroups, attributes)}
                </span>
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
