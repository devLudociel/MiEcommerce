import React, { useRef, useState } from 'react';
import { Upload, Loader, X } from 'lucide-react';
import type { ImageUploadConfig, CustomizationValue } from '../../../types/customization';
import { uploadCustomImage, auth } from '../../../lib/firebase';
import { compressImage, validateImageFile, fileToBase64 } from '../../../utils/imageCompression';
import { logger } from '../../../lib/logger';

interface ImageUploadFieldProps {
  fieldId: string;
  label: string;
  required: boolean;
  config: ImageUploadConfig;
  value: CustomizationValue | undefined;
  onChange: (value: CustomizationValue) => void;
  helpText?: string;
  productType?: string; // 'camiseta', 'cuadro', etc. for storage path
}

export default function ImageUploadField({
  fieldId,
  label,
  required,
  config,
  value,
  onChange,
  helpText,
  productType = 'custom',
}: ImageUploadFieldProps) {
  // Ensure config has required properties with defaults
  const safeConfig = {
    maxSizeMB: config.maxSizeMB || 5,
    allowedFormats: config.allowedFormats || ['jpg', 'jpeg', 'png'],
    showPreview: config.showPreview !== undefined ? config.showPreview : true,
    showPositionControls: config.showPositionControls,
    helpText: config.helpText,
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(
    (value?.imageUrl as string | undefined) || null
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await handleImageUpload(file);
  };

  const handleImageUpload = async (file: File) => {
    setError(null);
    setIsLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Debes iniciar sesión para subir imágenes');
        return;
      }

      // Validate file
      const validation = validateImageFile(file, { maxSizeMB: safeConfig.maxSizeMB });
      if (!validation.valid) {
        setError(validation.error || 'Archivo inválido');
        return;
      }

      // Check format
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (fileExt && !safeConfig.allowedFormats.includes(fileExt)) {
        setError(
          `Formato no permitido. Formatos aceptados: ${safeConfig.allowedFormats.join(', ')}`
        );
        return;
      }

      // Create preview
      const base64 = await fileToBase64(file);
      setPreview(base64);

      // Compress and upload
      const compressedFile = await compressImage(file, {
        maxSizeMB: Math.min(safeConfig.maxSizeMB, 2),
        maxWidthOrHeight: 1920,
      });

      const { url, path } = await uploadCustomImage(compressedFile, user.uid, productType);

      // Update value
      onChange({
        fieldId,
        value: url,
        imageUrl: url,
        imagePath: path,
        priceModifier: 0,
      });

      logger.info('[ImageUploadField] Image uploaded successfully', { fieldId, path });
    } catch (err) {
      logger.error('[ImageUploadField] Error uploading image', err);
      setError('Error al subir la imagen. Por favor, inténtalo de nuevo.');
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onChange({
      fieldId,
      value: '',
      imageUrl: undefined,
      imagePath: undefined,
      priceModifier: 0,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleImageUpload(file);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-bold text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {(helpText || safeConfig.helpText) && (
        <p className="text-xs text-gray-500 mb-3">{helpText || safeConfig.helpText}</p>
      )}

      {/* Upload area */}
      {!preview && (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer bg-gray-50"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={safeConfig.allowedFormats.map((f) => `.${f}`).join(',')}
            onChange={handleFileSelect}
            className="hidden"
            required={required && !preview}
          />

          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader className="w-12 h-12 text-purple-500 animate-spin" />
              <p className="text-sm text-gray-600">Subiendo imagen...</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Haz clic o arrastra una imagen aquí
              </p>
              <p className="text-xs text-gray-500">
                Formatos: {safeConfig.allowedFormats.join(', ').toUpperCase()} • Máx:{' '}
                {safeConfig.maxSizeMB}MB
              </p>
            </>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && safeConfig.showPreview && (
        <div className="relative">
          <div className="border-2 border-purple-200 rounded-xl overflow-hidden bg-gray-50">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Success message */}
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
            <span className="font-bold">✓</span>
            <span>Imagen cargada correctamente</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ❌ {error}
        </div>
      )}
    </div>
  );
}
