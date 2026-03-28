import React from 'react';
import { Paintbrush, Upload } from 'lucide-react';
import type { DesignConfig, DesignMode } from '../../../types/configurator';
import FileUploader from '../ui/FileUploader';

interface StepDesignProps {
  config: DesignConfig;
  designMode: DesignMode;
  designFile: File | undefined;
  referenceFiles: File[];
  designNotes: string;
  onDesignModeChange: (mode: DesignMode) => void;
  onDesignFileChange: (file: File | undefined) => void;
  onReferenceFilesChange: (files: File[]) => void;
  onDesignNotesChange: (notes: string) => void;
}

export default function StepDesign({
  config,
  designMode,
  designFile,
  referenceFiles,
  designNotes,
  onDesignModeChange,
  onDesignFileChange,
  onReferenceFilesChange,
  onDesignNotesChange,
}: StepDesignProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tu diseño</h2>
        <p className="text-sm text-gray-500 mt-1">
          ¿Ya tienes tu diseño listo o necesitas que te ayudemos?
        </p>
      </div>

      {/* Design mode selector */}
      <div className="grid sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onDesignModeChange('ready')}
          className={`
            flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all text-center
            ${designMode === 'ready'
              ? 'border-indigo-500 bg-indigo-50 shadow-md'
              : 'border-gray-200 hover:border-gray-300 bg-white'
            }
          `}
        >
          <Upload className={`w-8 h-8 ${designMode === 'ready' ? 'text-indigo-600' : 'text-gray-400'}`} />
          <div>
            <p className="font-semibold text-gray-900">Tengo mi diseño</p>
            <p className="text-sm text-gray-500 mt-1">Sube tu archivo listo para producción</p>
          </div>
        </button>

        {config.designServicePrice > 0 && (
          <button
            type="button"
            onClick={() => onDesignModeChange('need-design')}
            className={`
              flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all text-center
              ${designMode === 'need-design'
                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
          >
            <Paintbrush className={`w-8 h-8 ${designMode === 'need-design' ? 'text-indigo-600' : 'text-gray-400'}`} />
            <div>
              <p className="font-semibold text-gray-900">
                {config.designServiceLabel || 'Necesito diseño'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Nuestro equipo lo crea por ti (+{config.designServicePrice.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })})
              </p>
            </div>
          </button>
        )}
      </div>

      {/* Upload design file */}
      {designMode === 'ready' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Sube tu diseño</h3>
          <FileUploader
            formats={config.formats}
            files={designFile ? [designFile] : []}
            onChange={(files) => onDesignFileChange(files[0] || undefined)}
            helpText={
              config.minDpi > 0
                ? `Resolución mínima recomendada: ${config.minDpi} DPI${config.requireTransparentBg ? ' · Fondo transparente requerido' : ''}`
                : undefined
            }
          />
        </div>
      )}

      {/* Need design - references */}
      {designMode === 'need-design' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Imágenes de referencia (opcional)
            </h3>
            <FileUploader
              formats={['PNG', 'JPG', 'PDF']}
              multiple
              files={referenceFiles}
              onChange={onReferenceFilesChange}
              helpText="Sube ejemplos o bocetos para que entendamos tu idea"
            />
          </div>

          <div>
            <label htmlFor="design-notes" className="block text-sm font-semibold text-gray-700 mb-2">
              Describe tu idea
            </label>
            <textarea
              id="design-notes"
              rows={4}
              value={designNotes}
              onChange={(e) => onDesignNotesChange(e.target.value)}
              placeholder="Cuéntanos qué tienes en mente: colores, estilo, texto que quieres incluir..."
              className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
