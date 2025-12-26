// src/components/customizer/mug/utils/textureGenerator.ts

import type { MugDesignElement, MugCustomizationData } from '../types';
import { MUG_PRINT_DIMENSIONS } from '../mugConfig';

/**
 * Genera una imagen/textura a partir de los elementos de diseño
 * Esta imagen se puede usar como textura en el modelo 3D
 */
export function generateTextureFromElements(
  customization: MugCustomizationData,
  backgroundColor?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const isPrint360 = customization.printArea === '360';
      const dimensions = isPrint360
        ? MUG_PRINT_DIMENSIONS['360']
        : MUG_PRINT_DIMENSIONS.double_side.front;

      // Crear canvas con resolución alta para mejor calidad
      const canvas = document.createElement('canvas');
      const scale = 4; // 4x resolution para mejor calidad
      canvas.width = dimensions.width * 100 * scale; // 100 pixels per cm
      canvas.height = dimensions.height * 100 * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo crear contexto de canvas'));
        return;
      }

      // Fondo
      if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // Fondo blanco por defecto
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Elementos a renderizar
      const elements = isPrint360
        ? customization.elements || []
        : customization.frontElements || [];

      // Ordenar por zIndex
      const sortedElements = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

      // Renderizar cada elemento
      const promises: Promise<void>[] = sortedElements.map((element) =>
        renderElementToCanvas(ctx, element, canvas.width, canvas.height, scale)
      );

      // Esperar a que todos los elementos se rendericen
      Promise.all(promises)
        .then(() => {
          // Convertir canvas a data URL
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          resolve(dataUrl);
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Renderiza un elemento individual en el canvas
 */
function renderElementToCanvas(
  ctx: CanvasRenderingContext2D,
  element: MugDesignElement,
  canvasWidth: number,
  canvasHeight: number,
  scale: number
): Promise<void> {
  return new Promise((resolve) => {
    // Calcular posición y tamaño en píxeles
    const x = (element.x / 100) * canvasWidth;
    const y = (element.y / 100) * canvasHeight;
    const width = (element.width / 100) * canvasWidth;
    const height = (element.height / 100) * canvasHeight;

    ctx.save();

    // Aplicar transformaciones
    ctx.translate(x + width / 2, y + height / 2);
    if (element.rotation) {
      ctx.rotate((element.rotation * Math.PI) / 180);
    }
    ctx.translate(-width / 2, -height / 2);

    switch (element.type) {
      case 'text':
        renderText(ctx, element, width, height, scale);
        resolve();
        break;

      case 'image':
      case 'clipart':
        renderImage(ctx, element, width, height).then(resolve).catch(resolve);
        break;

      case 'background':
        ctx.fillStyle = element.backgroundColor || 'transparent';
        ctx.fillRect(-x, -y, canvasWidth, canvasHeight);
        resolve();
        break;

      default:
        resolve();
    }

    ctx.restore();
  });
}

/**
 * Renderiza texto en el canvas
 */
function renderText(
  ctx: CanvasRenderingContext2D,
  element: MugDesignElement,
  width: number,
  height: number,
  scale: number
) {
  const fontSize = (element.fontSize || 16) * scale;
  const fontFamily = element.fontFamily || 'Arial';
  const fontWeight = element.bold ? 'bold' : 'normal';
  const fontStyle = element.italic ? 'italic' : 'normal';

  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = element.color || '#000000';
  ctx.textBaseline = 'top';

  // Alineación
  switch (element.align) {
    case 'center':
      ctx.textAlign = 'center';
      ctx.fillText(element.text || '', width / 2, 0, width);
      break;
    case 'right':
      ctx.textAlign = 'right';
      ctx.fillText(element.text || '', width, 0, width);
      break;
    case 'left':
    default:
      ctx.textAlign = 'left';
      ctx.fillText(element.text || '', 0, 0, width);
      break;
  }
}

/**
 * Renderiza imagen en el canvas
 */
function renderImage(
  ctx: CanvasRenderingContext2D,
  element: MugDesignElement,
  width: number,
  height: number
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      resolve();
    };

    img.onerror = () => {
      // Si falla la carga, dibujar placeholder
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#999';
      ctx.strokeRect(0, 0, width, height);
      resolve();
    };

    img.src = element.imageUrl || element.imageData || '';
  });
}
