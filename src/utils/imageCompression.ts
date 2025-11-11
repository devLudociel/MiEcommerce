// src/utils/imageCompression.ts
import imageCompression from 'browser-image-compression';
import { logger } from '../lib/logger';

interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
  initialQuality?: number;
}

interface ValidationConstraints {
  maxSizeMB?: number;
  allowedTypes?: string[];
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * PERFORMANCE: Comprimir imagen antes de subirla a Firebase
 * Uses WebP format for 30% better compression than JPEG
 */
export async function compressImage(file: File, options: CompressionOptions = {}): Promise<File> {
  const defaultOptions: CompressionOptions = {
    maxSizeMB: 0.8, // Reduced from 1MB for better performance
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp', // WebP provides better compression
    initialQuality: 0.85, // Slightly higher quality for WebP
  };

  const finalOptions = { ...defaultOptions, ...options };

  try {
    logger.debug('[ImageCompression] Comprimiendo imagen...', {
      originalSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      fileName: file.name,
    });

    const compressedFile = await imageCompression(file, finalOptions);

    const reductionPercent = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
    logger.info('[ImageCompression] Imagen comprimida exitosamente', {
      originalSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      compressedSize: `${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`,
      reduction: `${reductionPercent}%`,
    });

    return compressedFile;
  } catch (error) {
    logger.error('[ImageCompression] Error comprimiendo imagen', error);
    throw error;
  }
}

/**
 * Validar archivo de imagen
 */
export function validateImageFile(
  file: File,
  constraints: ValidationConstraints = {}
): ValidationResult {
  const { maxSizeMB = 10, allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'] } =
    constraints;

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Usa: ${allowedTypes.join(', ')}`,
    };
  }

  const fileSizeMB = file.size / 1024 / 1024;
  if (fileSizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `El archivo es muy grande (${fileSizeMB.toFixed(2)}MB). Máximo: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Convertir File a Base64 para preview
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
