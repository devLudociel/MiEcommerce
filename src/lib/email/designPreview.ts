// src/lib/email/designPreview.ts

/**
 * Generate HTML preview for product customization in emails
 *
 * Creates visual representation of custom designs with:
 * - Uploaded images with transformations
 * - Text fields
 * - Selected options (color, size, etc.)
 */

interface CustomizationField {
  type: string;
  label: string;
  value: any;
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
  const imageFields = fields.filter(([_, field]) => field.type === 'image-upload' && field.value?.url);

  // Check if we have text fields
  const textFields = fields.filter(([_, field]) => field.type === 'text' && field.value);

  // Check if we have other customizations
  const otherFields = fields.filter(
    ([_, field]) =>
      field.type !== 'image-upload' &&
      field.type !== 'text' &&
      field.value
  );

  return `
    <div style="margin-top: 15px; padding: 15px; background-color: #faf5ff; border-left: 4px solid #9333ea; border-radius: 8px;">
      <div style="font-weight: bold; color: #9333ea; margin-bottom: 10px; font-size: 14px;">
        ✨ Diseño Personalizado
      </div>

      ${previewImageUrl ? `
        <div style="margin-bottom: 15px; text-align: center;">
          <img src="${previewImageUrl}" alt="Preview de ${itemName}" style="max-width: 300px; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
        </div>
      ` : ''}

      ${imageFields.length > 0 ? `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; color: #7c3aed; font-weight: bold; margin-bottom: 8px;">🖼️ Imágenes Cargadas:</div>
          ${imageFields.map(([key, field]) => `
            <div style="margin-bottom: 8px; background-color: white; padding: 10px; border-radius: 6px;">
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 5px;">${field.label}:</div>
              ${field.value?.url ? `
                <img src="${field.value.url}" alt="${field.label}" style="max-width: 200px; height: auto; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.1);" />
                ${field.value?.transform ? `
                  <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">
                    Position: X=${Math.round(field.value.transform.x)}%, Y=${Math.round(field.value.transform.y)}%
                    ${field.value.transform.scale ? `, Scale=${Math.round(field.value.transform.scale * 100)}%` : ''}
                    ${field.value.transform.rotation ? `, Rotation=${Math.round(field.value.transform.rotation)}°` : ''}
                  </div>
                ` : ''}
              ` : '<div style="font-size: 11px; color: #9ca3af;">No especificada</div>'}
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${textFields.length > 0 ? `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; color: #7c3aed; font-weight: bold; margin-bottom: 8px;">✍️ Textos Personalizados:</div>
          ${textFields.map(([key, field]) => `
            <div style="background-color: white; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px;">
              <div style="font-size: 11px; color: #6b7280;">${field.label}:</div>
              <div style="font-size: 13px; color: #1f2937; font-weight: 500; margin-top: 3px;">"${field.value}"</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${otherFields.length > 0 ? `
        <div style="margin-bottom: 8px;">
          <div style="font-size: 12px; color: #7c3aed; font-weight: bold; margin-bottom: 8px;">⚙️ Opciones Seleccionadas:</div>
          <div style="background-color: white; padding: 10px; border-radius: 6px;">
            ${otherFields.map(([key, field]) => `
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
                <strong>${field.label}:</strong>
                <span style="color: #1f2937;">${formatFieldValue(field)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e9d5ff; font-size: 11px; color: #7c3aed; text-align: center;">
        💡 Revisaremos tu diseño antes de la producción
      </div>
    </div>
  `;
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
export function generateCustomizationSummary(customization: ProductCustomization | null | undefined): string {
  if (!customization || !customization.fields) {
    return '';
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
  if (optionCount > 0) parts.push(`${optionCount} opción${optionCount > 1 ? 'es' : ''}`);

  return parts.join(', ');
}
