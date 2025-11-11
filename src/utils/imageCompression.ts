// src/utils/imageCompression.ts
import imageCompression from 'browser-image-compression';

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
    console.log('Comprimiendo imagen...');
    console.log('Tamaño original:', (file.size / 1024 / 1024).toFixed(2), 'MB');

    const compressedFile = await imageCompression(file, finalOptions);

    console.log('Tamaño comprimido:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('Reducción:', ((1 - compressedFile.size / file.size) * 100).toFixed(1), '%');

    return compressedFile;
  } catch (error) {
    console.error('Error comprimiendo imagen:', error);
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
