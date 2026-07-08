// src/lib/email/designPreview.ts

/**
 * Generate HTML preview for product customization in emails
 *
 * Creates visual representation of custom designs with:
 * - Uploaded images with transformations
 * - Text fields
 * - Selected options (color, size, etc.)
 */

/** Image transform data for positioned images */
interface ImageTransform {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
}

/** Image field value with URL and optional transform */
interface ImageFieldValue {
  url?: string;
  transform?: ImageTransform;
}

/** Color field value */
interface ColorFieldValue {
  hex?: string;
  name?: string;
}

/** Union of all possible customization field values */
type CustomizationValue =
  | string
  | number
  | boolean
  | ImageFieldValue
  | ColorFieldValue
  | null
  | undefined;

interface CustomizationField {
  type: string;
  label: string;
  value: CustomizationValue;
}

interface ProductCustomization {
  fields: Record<string, CustomizationField>;
}

/**
 * Generate design preview card for email
 */
export function generateDesignPreviewHTML(
  itemName: string,
  customization: ProductCustomization | null | undefined,
  previewImageUrl?: string
): string {
  if (!customization || !customization.fields) {
    return '';
  }

  const fields = Object.entries(customization.fields);
  if (fields.length === 0) {
    return '';
  }

  // Check if we have image uploads
  const imageFields = fields.filter(
    ([_, field]) => field.type === 'image-upload' && field.value?.url
  );

  // Check if we have text fields
  const textFields = fields.filter(([_, field]) => field.type === 'text' && field.value);

  // Check if we have other customizations
  const otherFields = fields.filter(
    ([_, field]) => field.type !== 'image-upload' && field.type !== 'text' && field.value
  );

  return `
    <div style="margin-top: 15px; padding: 15px; background-color: #faf5ff; border-left: 4px solid #9333ea; border-radius: 8px;">
      <div style="font-weight: bold; color: #9333ea; margin-bottom: 10px; font-size: 14px;">
        ✨ Diseño Personalizado
      </div>

      ${
        previewImageUrl
          ? `
        <div style="margin-bottom: 15px; text-align: center;">
          <img src="${previewImageUrl}" alt="Preview de ${itemName}" style="max-width: 300px; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
        </div>
      `
          : ''
      }

      ${
        imageFields.length > 0
          ? `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; color: #7c3aed; font-weight: bold; margin-bottom: 8px;">🖼️ Imágenes Cargadas:</div>
          ${imageFields
            .map(
              ([key, field]) => `
            <div style="margin-bottom: 8px; background-color: white; padding: 10px; border-radius: 6px;">
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 5px;">${field.label}:</div>
              ${
                field.value?.url
                  ? `
                <img src="${field.value.url}" alt="${field.label}" style="max-width: 200px; height: auto; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.1);" />
                ${
                  field.value?.transform
                    ? `
                  <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">
                    Position: X=${Math.round(field.value.transform.x)}%, Y=${Math.round(field.value.transform.y)}%
                    ${field.value.transform.scale ? `, Scale=${Math.round(field.value.transform.scale * 100)}%` : ''}
                    ${field.value.transform.rotation ? `, Rotation=${Math.round(field.value.transform.rotation)}°` : ''}
                  </div>
                `
                    : ''
                }
              `
                  : '<div style="font-size: 11px; color: #9ca3af;">No especificada</div>'
              }
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }

      ${
        textFields.length > 0
          ? `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; color: #7c3aed; font-weight: bold; margin-bottom: 8px;">✍️ Textos Personalizados:</div>
          ${textFields
            .map(
              ([key, field]) => `
            <div style="background-color: white; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px;">
              <div style="font-size: 11px; color: #6b7280;">${field.label}:</div>
              <div style="font-size: 13px; color: #1f2937; font-weight: 500; margin-top: 3px;">"${field.value}"</div>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }

      ${
        otherFields.length > 0
          ? `
        <div style="margin-bottom: 8px;">
          <div style="font-size: 12px; color: #7c3aed; font-weight: bold; margin-bottom: 8px;">⚙️ Opciones Seleccionadas:</div>
          <div style="background-color: white; padding: 10px; border-radius: 6px;">
            ${otherFields
              .map(
                ([key, field]) => `
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
                <strong>${field.label}:</strong>
                <span style="color: #1f2937;">${formatFieldValue(field)}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }

      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e9d5ff; font-size: 11px; color: #7c3aed; text-align: center;">
        💡 Revisaremos tu diseño antes de la producción
      </div>
    </div>
  `;
}

// ============================================================================
// CONFIGURADOR V2 (formato flat)
// ============================================================================

/**
 * Pedidos del configurador V2 guardan la personalización como objeto plano:
 * option_<id> / option_<id>_label, designMode ('ready'|'need-design'|'send-later'),
 * designNotes, placement / placementLabel / placementSize, uploadedImage.
 * Este formato no tiene `fields` ni `values`, así que las funciones legacy
 * devuelven '' y estas actúan de fallback.
 */
type FlatCustomization = Record<string, unknown>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isFlatConfiguratorCustomization(customization: FlatCustomization): boolean {
  if (customization.fields || customization.values) return false;
  return (
    typeof customization.designMode === 'string' ||
    typeof customization.configuratorId === 'string' ||
    Object.keys(customization).some((k) => k.startsWith('option_'))
  );
}

function flatOptionLines(customization: FlatCustomization): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = [];
  for (const [key, val] of Object.entries(customization)) {
    if (key.startsWith('option_') && key.endsWith('_label') && typeof val === 'string' && val) {
      lines.push({ label: key.slice(7, -6).replace(/_/g, ' '), value: val });
    }
  }
  if (typeof customization.placementLabel === 'string' && customization.placementLabel) {
    const size =
      typeof customization.placementSize === 'string' && customization.placementSize
        ? ` · ${customization.placementSize}`
        : '';
    lines.push({ label: 'Posición', value: customization.placementLabel + size });
  }
  return lines;
}

/**
 * Preview HTML para personalizaciones del configurador V2 en emails.
 * Devuelve '' si la personalización no es del formato flat.
 */
export function generateConfiguratorPreviewHTML(
  customization: FlatCustomization | null | undefined
): string {
  if (!customization || typeof customization !== 'object') return '';
  if (!isFlatConfiguratorCustomization(customization)) return '';

  const lines = flatOptionLines(customization);
  const designMode = customization.designMode;
  const designNotes =
    typeof customization.designNotes === 'string' && customization.designNotes
      ? customization.designNotes
      : null;
  const uploadedImage =
    typeof customization.uploadedImage === 'string' &&
    /^https?:\/\//.test(customization.uploadedImage)
      ? customization.uploadedImage
      : null;

  if (lines.length === 0 && !designMode) return '';

  let designBlock = '';
  if (designMode === 'send-later') {
    designBlock = `
      <div style="margin-bottom: 12px; padding: 12px; background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px;">
        <div style="font-size: 13px; font-weight: bold; color: #92400e; margin-bottom: 4px;">📤 Diseño pendiente de envío</div>
        <div style="font-size: 12px; color: #92400e; line-height: 1.5;">
          Nos enviarás tu diseño después del pedido. Te contactaremos para recibirlo —
          también puedes adelantarlo respondiendo a este email o por WhatsApp.
          No imprimimos nada sin tu confirmación.
        </div>
      </div>`;
  } else if (designMode === 'need-design') {
    designBlock = `
      <div style="margin-bottom: 12px; padding: 12px; background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px;">
        <div style="font-size: 13px; font-weight: bold; color: #4338ca; margin-bottom: 4px;">🎨 Servicio de diseño incluido</div>
        <div style="font-size: 12px; color: #4338ca; line-height: 1.5;">
          Nuestro equipo creará tu diseño y te enviaremos una propuesta antes de imprimir.
        </div>
      </div>`;
  } else if (designMode === 'ready' && uploadedImage) {
    designBlock = `
      <div style="margin-bottom: 12px; text-align: center;">
        <img src="${escapeHtml(uploadedImage)}" alt="Tu diseño" style="max-width: 200px; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
        <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Tu diseño subido</div>
      </div>`;
  }

  const optionsBlock =
    lines.length > 0
      ? `
      <div style="background-color: white; padding: 10px; border-radius: 6px;">
        ${lines
          .map(
            (l) => `
          <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
            <strong style="text-transform: capitalize;">${escapeHtml(l.label)}:</strong>
            <span style="color: #1f2937;">${escapeHtml(l.value)}</span>
          </div>`
          )
          .join('')}
      </div>`
      : '';

  const notesBlock = designNotes
    ? `
      <div style="margin-top: 8px; background-color: white; padding: 8px 12px; border-radius: 6px;">
        <div style="font-size: 11px; color: #6b7280;">Notas de diseño:</div>
        <div style="font-size: 12px; color: #1f2937; margin-top: 3px;">"${escapeHtml(designNotes)}"</div>
      </div>`
    : '';

  return `
    <div style="margin-top: 15px; padding: 15px; background-color: #faf5ff; border-left: 4px solid #9333ea; border-radius: 8px;">
      <div style="font-weight: bold; color: #9333ea; margin-bottom: 10px; font-size: 14px;">
        ✨ Tu Personalización
      </div>
      ${designBlock}
      ${optionsBlock}
      ${notesBlock}
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e9d5ff; font-size: 11px; color: #7c3aed; text-align: center;">
        💡 Revisaremos tu pedido antes de la producción
      </div>
    </div>`;
}

/**
 * Format field value for display
 */
function formatFieldValue(field: CustomizationField): string {
  if (typeof field.value === 'boolean') {
    return field.value ? 'Sí' : 'No';
  }

  if (typeof field.value === 'object' && field.value !== null) {
    // For color objects
    if (field.value.hex || field.value.name) {
      return `<span style="display: inline-block; width: 14px; height: 14px; border-radius: 3px; background-color: ${field.value.hex || '#ccc'}; border: 1px solid #ddd; vertical-align: middle; margin-right: 4px;"></span>${field.value.name || field.value.hex}`;
    }
    return JSON.stringify(field.value);
  }

  return String(field.value);
}

/**
 * Generate summary text of customizations
 */
export function generateCustomizationSummary(
  customization: ProductCustomization | null | undefined
): string {
  if (!customization) {
    return '';
  }

  // Formato flat del configurador V2
  if (!customization.fields) {
    const flat = customization as unknown as FlatCustomization;
    if (!isFlatConfiguratorCustomization(flat)) return '';
    const parts: string[] = [];
    const optionCount = flatOptionLines(flat).length;
    if (optionCount > 0)
      parts.push(`${optionCount} ${optionCount > 1 ? 'opciones' : 'opción'}`);
    if (flat.designMode === 'send-later') parts.push('diseño pendiente de envío');
    else if (flat.designMode === 'need-design') parts.push('servicio de diseño');
    else if (flat.designMode === 'ready') parts.push('diseño propio');
    return parts.join(', ');
  }

  const fields = Object.entries(customization.fields);
  if (fields.length === 0) {
    return '';
  }

  const imageCount = fields.filter(([_, f]) => f.type === 'image-upload' && f.value?.url).length;
  const textCount = fields.filter(([_, f]) => f.type === 'text' && f.value).length;
  const optionCount = fields.filter(
    ([_, f]) => f.type !== 'image-upload' && f.type !== 'text' && f.value
  ).length;

  const parts = [];
  if (imageCount > 0) parts.push(`${imageCount} imagen${imageCount > 1 ? 'es' : ''}`);
  if (textCount > 0) parts.push(`${textCount} texto${textCount > 1 ? 's' : ''}`);
  if (optionCount > 0) parts.push(`${optionCount} ${optionCount > 1 ? 'opciones' : 'opción'}`);

  return parts.join(', ');
}
