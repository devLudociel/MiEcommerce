import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, FileIcon, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  /** Formatos aceptados, p.ej. ["PNG", "PDF", "AI"] */
  formats: string[];
  /** Permite múltiples archivos */
  multiple?: boolean;
  /** Archivos actualmente seleccionados */
  files: File[];
  /** Callback al cambiar archivos */
  onChange: (files: File[]) => void;
  /** Texto de ayuda extra */
  helpText?: string;
  /** Tamaño máximo por archivo en MB */
  maxSizeMB?: number;
}

const formatToMime: Record<string, string> = {
  PNG: 'image/png',
  JPG: 'image/jpeg',
  JPEG: 'image/jpeg',
  PDF: 'application/pdf',
  AI: 'application/postscript',
  SVG: 'image/svg+xml',
  PSD: 'image/vnd.adobe.photoshop',
  EPS: 'application/postscript',
};

export default function FileUploader({
  formats,
  multiple = false,
  files,
  onChange,
  helpText,
  maxSizeMB = 50,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = formats
    .map((f) => formatToMime[f.toUpperCase()] || `.${f.toLowerCase()}`)
    .join(',');

  const validateFiles = useCallback(
    (incoming: FileList | File[]): File[] => {
      const valid: File[] = [];
      const maxBytes = maxSizeMB * 1024 * 1024;

      for (const file of Array.from(incoming)) {
        if (file.size > maxBytes) {
          setError(`"${file.name}" excede el límite de ${maxSizeMB} MB`);
          continue;
        }
        valid.push(file);
      }
      return valid;
    },
    [maxSizeMB]
  );

  const handleFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError(null);
      const valid = validateFiles(incoming);
      if (valid.length === 0) return;
      onChange(multiple ? [...files, ...valid] : [valid[0]]);
    },
    [files, multiple, onChange, validateFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      onChange(files.filter((_, i) => i !== index));
    },
    [files, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
          ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400 bg-white'}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-indigo-600">Haz clic para subir</span> o arrastra
          tu archivo aquí
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Formatos: {formats.join(', ')} &middot; Máx. {maxSizeMB} MB
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Help text */}
      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileIcon className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                aria-label={`Eliminar ${file.name}`}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
