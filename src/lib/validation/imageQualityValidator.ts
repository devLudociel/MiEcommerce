import { logger } from '../logger';

/**
 * Resultado de la validación de calidad de imagen
 */
export interface ImageQualityResult {
  isValid: boolean;
  quality: 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable';
  warnings: string[];
  errors: string[];
  metrics: {
    width: number;
    height: number;
    dpi: number;
    fileSize: number;
    aspectRatio: number;
    megapixels: number;
  };
  recommendations: string[];
}

/**
 * Configuración para validación de calidad
 */
export interface QualityConfig {
  minWidth?: number;
  minHeight?: number;
  minDPI?: number;
  maxFileSize?: number; // en MB
  recommendedWidth?: number;
  recommendedHeight?: number;
  recommendedDPI?: number;
}

/**
 * Configuraciones predefinidas por tipo de producto
 */
export const QUALITY_PRESETS: Record<string, QualityConfig> = {
  // Productos textiles (camisetas, sudaderas, etc.)
  textile: {
    minWidth: 2000,
    minHeight: 2000,
    minDPI: 150,
    recommendedWidth: 3000,
    recommendedHeight: 3000,
    recommendedDPI: 300,
    maxFileSize: 50,
  },
  // Impresión 3D y laser
  print3d: {
    minWidth: 1500,
    minHeight: 1500,
    minDPI: 100,
    recommendedWidth: 2500,
    recommendedHeight: 2500,
    recommendedDPI: 200,
    maxFileSize: 30,
  },
  // Productos pequeños (tazas, llaveros)
  small: {
    minWidth: 1000,
    minHeight: 1000,
    minDPI: 150,
    recommendedWidth: 2000,
    recommendedHeight: 2000,
    recommendedDPI: 300,
    maxFileSize: 20,
  },
  // Productos grandes (cuadros, lienzos)
  large: {
    minWidth: 3000,
    minHeight: 3000,
    minDPI: 200,
    recommendedWidth: 4500,
    recommendedHeight: 4500,
    recommendedDPI: 300,
    maxFileSize: 100,
  },
};

/**
 * Calcula el DPI aproximado de una imagen basándose en sus dimensiones
 * Asume un tamaño de impresión estándar de 10x10 pulgadas
 */
function calculateDPI(width: number, height: number, printSizeInches: number = 10): number {
  const minDimension = Math.min(width, height);
  return Math.round(minDimension / printSizeInches);
}

/**
 * Obtiene las dimensiones reales de una imagen desde su URL o File
 */
async function getImageDimensions(source: string | File): Promise<{ width: number; height: number; fileSize: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      // Obtener tamaño del archivo
      let fileSize = 0;
      if (source instanceof File) {
        fileSize = source.size;
      }

      cleanup();
      resolve({ width, height, fileSize });
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image'));
    };

    let objectUrl: string | null = null;

    if (typeof source === 'string') {
      // Es URL
      img.crossOrigin = 'anonymous';
      img.src = source;
    } else {
      // Es File
      objectUrl = URL.createObjectURL(source);
      img.src = objectUrl;
    }
  });
}

/**
 * Valida la calidad de una imagen para impresión
 *
 * @param source - URL de la imagen o File object
 * @param config - Configuración de validación (usa 'textile' por defecto)
 * @returns Resultado completo de la validación con métricas y recomendaciones
 */
export async function validateImageQuality(
  source: string | File,
  config: QualityConfig = QUALITY_PRESETS.textile
): Promise<ImageQualityResult> {
  try {
    // Obtener dimensiones y tamaño del archivo
    const { width, height, fileSize } = await getImageDimensions(source);

    const dpi = calculateDPI(width, height);
    const aspectRatio = width / height;
    const megapixels = (width * height) / 1000000;
    const fileSizeMB = fileSize / (1024 * 1024);

    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];

    // Validar dimensiones mínimas
    if (config.minWidth && width < config.minWidth) {
      errors.push(`Ancho muy pequeño (${width}px). Mínimo requerido: ${config.minWidth}px`);
    }
    if (config.minHeight && height < config.minHeight) {
      errors.push(`Alto muy pequeño (${height}px). Mínimo requerido: ${config.minHeight}px`);
    }

    // Validar DPI
    if (config.minDPI && dpi < config.minDPI) {
      errors.push(`Resolución muy baja (${dpi} DPI). Mínimo requerido: ${config.minDPI} DPI`);
      recommendations.push('La imagen puede verse pixelada al imprimirse');
    }

    // Advertencias para dimensiones por debajo de lo recomendado
    if (config.recommendedWidth && width < config.recommendedWidth && width >= (config.minWidth || 0)) {
      warnings.push(`Ancho por debajo de lo recomendado. Se sugiere ${config.recommendedWidth}px o más`);
    }
    if (config.recommendedHeight && height < config.recommendedHeight && height >= (config.minHeight || 0)) {
      warnings.push(`Alto por debajo de lo recomendado. Se sugiere ${config.recommendedHeight}px o más`);
    }
    if (config.recommendedDPI && dpi < config.recommendedDPI && dpi >= (config.minDPI || 0)) {
      warnings.push(`DPI por debajo de lo recomendado (${dpi} DPI). Se sugiere ${config.recommendedDPI} DPI para mejor calidad`);
    }

    // Validar tamaño de archivo
    if (config.maxFileSize && fileSizeMB > config.maxFileSize) {
      warnings.push(`Archivo muy grande (${fileSizeMB.toFixed(1)} MB). Máximo recomendado: ${config.maxFileSize} MB`);
      recommendations.push('Considera comprimir la imagen sin perder calidad');
    }

    // Validar aspect ratio extremo
    if (aspectRatio > 4 || aspectRatio < 0.25) {
      warnings.push('Proporción de aspecto inusual. Verifica que la imagen no esté distorsionada');
    }

    // Determinar calidad general
    let quality: ImageQualityResult['quality'];
    if (errors.length > 0) {
      quality = 'unacceptable';
    } else if (warnings.length > 2) {
      quality = 'poor';
    } else if (warnings.length > 0) {
      quality = 'acceptable';
    } else if (dpi >= (config.recommendedDPI || 300) && width >= (config.recommendedWidth || 3000)) {
      quality = 'excellent';
    } else {
      quality = 'good';
    }

    // Agregar recomendaciones específicas
    if (quality === 'excellent') {
      recommendations.push('¡Excelente! Esta imagen tiene calidad profesional para impresión');
    } else if (quality === 'good') {
      recommendations.push('Buena calidad. La impresión debería verse bien');
    } else if (quality === 'acceptable') {
      recommendations.push('Calidad aceptable, pero podría mejorarse para resultados óptimos');
    } else if (quality === 'poor') {
      recommendations.push('Calidad baja. Se recomienda usar una imagen de mayor resolución');
    } else {
      recommendations.push('Calidad inaceptable. Por favor, usa una imagen de mejor calidad');
    }

    logger.info('[ImageQualityValidator] Validation completed', {
      quality,
      metrics: { width, height, dpi, megapixels },
    });

    return {
      isValid: errors.length === 0,
      quality,
      warnings,
      errors,
      metrics: {
        width,
        height,
        dpi,
        fileSize: fileSizeMB,
        aspectRatio,
        megapixels,
      },
      recommendations,
    };
  } catch (error) {
    logger.error('[ImageQualityValidator] Validation failed', error);
    return {
      isValid: false,
      quality: 'unacceptable',
      warnings: [],
      errors: ['No se pudo validar la imagen. Verifica que el archivo sea una imagen válida'],
      metrics: {
        width: 0,
        height: 0,
        dpi: 0,
        fileSize: 0,
        aspectRatio: 0,
        megapixels: 0,
      },
      recommendations: [],
    };
  }
}

/**
 * Obtiene el preset de calidad recomendado según la categoría del producto
 */
export function getQualityPresetForCategory(categoryId: string): QualityConfig {
  const categoryLower = categoryId.toLowerCase();

  if (categoryLower.includes('textil') || categoryLower.includes('camiseta') || categoryLower.includes('sudadera')) {
    return QUALITY_PRESETS.textile;
  }

  if (categoryLower.includes('3d') || categoryLower.includes('laser')) {
    return QUALITY_PRESETS.print3d;
  }

  if (categoryLower.includes('taza') || categoryLower.includes('llavero') || categoryLower.includes('peque')) {
    return QUALITY_PRESETS.small;
  }

  if (categoryLower.includes('cuadro') || categoryLower.includes('lienzo') || categoryLower.includes('poster')) {
    return QUALITY_PRESETS.large;
  }

  // Default: textile
  return QUALITY_PRESETS.textile;
}
