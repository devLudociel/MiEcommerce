import React, { useRef, useState } from 'react';
import { Upload, Loader, X } from 'lucide-react';
import type { ImageUploadConfig, CustomizationValue, ImageTransform } from '../../../types/customization';
import { uploadCustomImage, auth } from '../../../lib/firebase';
import { compressImage, validateImageFile, fileToBase64 } from '../../../utils/imageCompression';
import { logger } from '../../../lib/logger';
import InteractiveImageEditor from '../InteractiveImageEditor';
import { validateImageQuality, getQualityPresetForCategory, type ImageQualityResult } from '../../../lib/validation/imageQualityValidator';
import ImageQualityBadge from '../../common/ImageQualityBadge';

interface ImageUploadFieldProps {
  fieldId: string;
  label: string;
  required: boolean;
  config: ImageUploadConfig;
  value: CustomizationValue | undefined;
  onChange: (value: CustomizationValue) => void;
  helpText?: string;
  productType?: string; // 'camiseta', 'cuadro', etc. for storage path
  categoryId?: string; // Category ID for quality validation preset
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
  categoryId,
}: ImageUploadFieldProps) {
  // Ensure config has required properties with defaults
  const safeConfig = {
    maxSizeMB: config.maxSizeMB || 5,
    allowedFormats: config.allowedFormats || ['jpg', 'jpeg', 'png'],
    showPreview: config.showPreview !== undefined ? config.showPreview : true,
    showPositionControls: config.showPositionControls !== undefined ? config.showPositionControls : true,
    helpText: config.helpText,
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(
    (value?.imageUrl as string | undefined) || null
  );
  const [imageQuality, setImageQuality] = useState<ImageQualityResult | null>(null);

  // Image transform state
  const [transform, setTransform] = useState<ImageTransform>(
    value?.imageTransform || {
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    }
  );

  const handleTransformChange = (newTransform: ImageTransform) => {
    setTransform(newTransform);
    // Update the value with new transform
    onChange({
      fieldId,
      value: value?.value || '',
      imageUrl: value?.imageUrl,
      imagePath: value?.imagePath,
      imageTransform: newTransform,
      priceModifier: 0,
    });
  };

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

      // Validate image quality
      const qualityConfig = categoryId ? getQualityPresetForCategory(categoryId) : undefined;
      const qualityResult = await validateImageQuality(file, qualityConfig);
      setImageQuality(qualityResult);

      logger.info('[ImageUploadField] Image quality validated', {
        quality: qualityResult.quality,
        isValid: qualityResult.isValid,
      });

      // Compress and upload
      const compressedFile = await compressImage(file, {
        maxSizeMB: Math.min(safeConfig.maxSizeMB, 2),
        maxWidthOrHeight: 1920,
      });

      const { url, path } = await uploadCustomImage(compressedFile, user.uid, productType);

      // Reset transform to default when uploading new image
      const defaultTransform: ImageTransform = {
        x: 50,
        y: 50,
        scale: 1,
        rotation: 0,
      };
      setTransform(defaultTransform);

      // Update value
      onChange({
        fieldId,
        value: url,
        imageUrl: url,
        imageTransform: defaultTransform,
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
    setImageQuality(null);
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
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors cursor-pointer bg-gray-50 focus-within:ring-4 focus-within:ring-purple-300 focus-within:border-purple-500"
          onClick={() => fileInputRef.current?.click()}
          tabIndex={0}
          role="button"
          aria-label={`${label} - Subir imagen o arrastrar aquí`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={safeConfig.allowedFormats.map((f) => `.${f}`).join(',')}
            onChange={handleFileSelect}
            className="sr-only"
            required={required && !preview}
            aria-label={`Seleccionar archivo: ${label}`}
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
              <p className="text-xs text-gray-500 mb-1">
                Formatos: {safeConfig.allowedFormats.join(', ').toUpperCase()} • Máx:{' '}
                {safeConfig.maxSizeMB}MB
              </p>
              <p className="text-xs text-gray-400">
                Pulsa Enter o Espacio para abrir
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

          {/* Image Quality Badge */}
          {imageQuality && (
            <div className="mt-3">
              <ImageQualityBadge quality={imageQuality} showDetails={true} />
            </div>
          )}
        </div>
      )}

      {/* Editor Visual Interactivo */}
      {preview && safeConfig.showPositionControls && (
        <div className="mt-4">
          <InteractiveImageEditor
            image={preview}
            transform={transform}
            onChange={handleTransformChange}
            disabled={isLoading}
          />
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
