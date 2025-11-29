/**
 * Validadores de imágenes para personalización de productos
 * Previene problemas de calidad de impresión validando dimensiones
 */

export interface ImageValidationOptions {
  maxSizeMB?: number;
  minWidth?: number;
  minHeight?: number;
  recommendedWidth?: number;
  recommendedHeight?: number;
  allowedFormats?: string[];
}

export interface ImageValidationResult {
  valid: boolean;
  message: string;
  quality: 'low' | 'medium' | 'high';
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Convierte File a base64 data URL
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Valida las dimensiones de una imagen para impresión de calidad
 * @param file - Archivo de imagen a validar
 * @param options - Opciones de validación
 * @returns Resultado de validación con calidad estimada
 *
 * @example
 * const result = await validateImageDimensions(file, {
 *   minWidth: 800,
 *   minHeight: 800,
 *   recommendedWidth: 1200,
 *   recommendedHeight: 1200
 * });
 *
 * if (!result.valid) {
 *   alert(result.message);
 * }
 */
export async function validateImageDimensions(
  file: File,
  options: ImageValidationOptions = {}
): Promise<ImageValidationResult> {
  const {
    minWidth = 800,
    minHeight = 800,
    recommendedWidth = 1200,
    recommendedHeight = 1200,
    maxSizeMB = 10,
    allowedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  } = options;

  // Validar formato
  if (!allowedFormats.includes(file.type)) {
    return {
      valid: false,
      message: `Formato no soportado. Usa: ${allowedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}`,
      quality: 'low',
    };
  }

  // Validar tamaño de archivo
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    return {
      valid: false,
      message: `Archivo muy grande (${fileSizeMB.toFixed(1)}MB). Máximo permitido: ${maxSizeMB}MB`,
      quality: 'low',
    };
  }

  // Cargar imagen para obtener dimensiones
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      // Bloquear si es muy pequeña
      if (width < minWidth || height < minHeight) {
        resolve({
          valid: false,
          message: `Imagen muy pequeña (${width}x${height}px). Mínimo requerido: ${minWidth}x${minHeight}px para calidad de impresión aceptable.`,
          quality: 'low',
          dimensions: { width, height },
        });
        return;
      }

      // Advertir si es menor a recomendado
      if (width < recommendedWidth || height < recommendedHeight) {
        resolve({
          valid: true,
          message: `Imagen de resolución aceptable (${width}x${height}px), pero recomendamos ${recommendedWidth}x${recommendedHeight}px para mejor calidad.`,
          quality: 'medium',
          dimensions: { width, height },
        });
        return;
      }

      // Excelente calidad
      resolve({
        valid: true,
        message: `Excelente calidad (${width}x${height}px). Tu diseño se verá perfecto impreso.`,
        quality: 'high',
        dimensions: { width, height },
      });
    };

    img.onerror = () => {
      resolve({
        valid: false,
        message: 'Error al procesar la imagen. Asegúrate de que sea un archivo de imagen válido.',
        quality: 'low',
      });
    };

    fileToBase64(file).then((base64) => {
      img.src = base64;
    });
  });
}

/**
 * Calcula la calidad de impresión basada en dimensiones y escala
 * @param imageWidth - Ancho de la imagen en píxeles
 * @param imageHeight - Alto de la imagen en píxeles
 * @param scale - Factor de escala aplicado (0.1 - 3.0)
 * @param printAreaCm - Área de impresión en centímetros (default: 10cm)
 * @returns Nivel de calidad
 *
 * @example
 * const quality = calculatePrintQuality(1200, 1200, 0.8, 10);
 * // Returns: 'high'
 */
export function calculatePrintQuality(
  imageWidth: number,
  imageHeight: number,
  scale: number = 1,
  printAreaCm: number = 10
): 'low' | 'medium' | 'high' {
  const printDPI = 300; // DPI profesional para impresión
  const pixelsNeeded = (printAreaCm * printDPI * 0.393701) * scale; // cm to inches
  const actualPixels = Math.min(imageWidth, imageHeight) * scale;

  // Calidad alta: 150% o más de los píxeles necesarios
  if (actualPixels >= pixelsNeeded * 1.5) return 'high';

  // Calidad media: entre 100% y 150%
  if (actualPixels >= pixelsNeeded) return 'medium';

  // Calidad baja: menos del 100%
  return 'low';
}

/**
 * Obtiene información detallada sobre la calidad de impresión
 * @param imageWidth - Ancho de la imagen
 * @param imageHeight - Alto de la imagen
 * @param scale - Escala aplicada
 * @param printAreaCm - Área de impresión
 * @returns Información detallada de calidad
 */
export function getPrintQualityInfo(
  imageWidth: number,
  imageHeight: number,
  scale: number = 1,
  printAreaCm: number = 10
): {
  quality: 'low' | 'medium' | 'high';
  dpi: number;
  message: string;
  recommendation?: string;
} {
  const quality = calculatePrintQuality(imageWidth, imageHeight, scale, printAreaCm);
  const actualPixels = Math.min(imageWidth, imageHeight) * scale;
  const printSizeInches = printAreaCm * 0.393701 * scale;
  const dpi = Math.round(actualPixels / printSizeInches);

  const qualityInfo = {
    low: {
      message: 'Calidad baja. La imagen puede verse pixelada al imprimir.',
      recommendation: 'Sube una imagen de al menos 1200x1200px o reduce la escala.',
    },
    medium: {
      message: 'Calidad aceptable. La imagen se verá bien en la mayoría de casos.',
      recommendation: 'Para mejor calidad, usa una imagen de al menos 1500x1500px.',
    },
    high: {
      message: 'Excelente calidad. Tu diseño se imprimirá con máxima nitidez.',
    },
  };

  return {
    quality,
    dpi,
    ...qualityInfo[quality],
  };
}
