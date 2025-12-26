import React from 'react';
import type { CartItem } from '../../store/cartStore';

interface CustomizationDetailsProps {
  customization: CartItem['customization'];
}

interface CustomizationFieldValue {
  fieldId?: string;
  fieldLabel?: string;
  value?: string | number | string[];
  displayValue?: string | string[];
  imageUrl?: string;
  imageTransform?: {
    x?: number;
    y?: number;
    scale?: number;
    rotation?: number;
  };
}

export default function CustomizationDetails({ customization }: CustomizationDetailsProps) {
  if (!customization || Object.keys(customization).length === 0) {
    return null;
  }

  const details: Array<{ key: string; label: string; value: string | number }> = [];
  let uploadedImage: string | null = null;

  // Process DynamicCustomizer format (has 'values' array)
  if (customization.values && Array.isArray(customization.values)) {
    customization.values.forEach((field: CustomizationFieldValue, index: number) => {
      // Skip if no value
      if (field.value === undefined || field.value === null || field.value === '') {
        return;
      }

      // Handle image fields specially
      if (field.imageUrl) {
        uploadedImage = field.imageUrl;

        // Add transform details if present
        if (field.imageTransform) {
          const transform = field.imageTransform;
          if (transform.scale !== undefined && transform.scale !== 1) {
            details.push({
              key: `${field.fieldId}_scale`,
              label: 'Escala',
              value: `${Math.round(transform.scale * 100)}%`,
            });
          }
          if (transform.rotation !== undefined && transform.rotation !== 0) {
            details.push({
              key: `${field.fieldId}_rotation`,
              label: 'Rotación',
              value: `${Math.round(transform.rotation)}°`,
            });
          }
        }
        return;
      }

      // Get display value (use displayValue if available, otherwise value)
      const displayValue = field.displayValue || field.value;

      // Use fieldLabel if available, otherwise format fieldId as fallback
      const label =
        field.fieldLabel ||
        field.fieldId
          .replace(/^field_/, '')
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str: string) => str.toUpperCase())
          .trim();

      // Handle arrays (like multi-select)
      if (Array.isArray(displayValue)) {
        details.push({
          key: field.fieldId || `field_${index}`,
          label,
          value: displayValue.join(', '),
        });
      } else {
        details.push({
          key: field.fieldId || `field_${index}`,
          label,
          value: String(displayValue),
        });
      }
    });
  } else {
    // Process legacy/simple format (direct properties)
    // Add color
    if (customization.selectedColor) {
      details.push({ key: 'selectedColor', label: 'Color', value: customization.selectedColor });
    }

    // Add size
    if (customization.selectedSize) {
      details.push({ key: 'selectedSize', label: 'Talla', value: customization.selectedSize });
    }

    // Add material
    if (customization.selectedMaterial) {
      details.push({
        key: 'selectedMaterial',
        label: 'Material',
        value: customization.selectedMaterial,
      });
    }

    // Add text
    if (customization.text) {
      details.push({ key: 'text', label: 'Texto', value: customization.text });
    }

    // Add uploaded image
    if (customization.uploadedImage) {
      uploadedImage = customization.uploadedImage;

      // Add transform details
      if (customization.scale !== undefined && customization.scale !== 1) {
        details.push({
          key: 'scale',
          label: 'Escala',
          value: `${Math.round(customization.scale * 100)}%`,
        });
      }
      if (customization.rotation !== undefined && customization.rotation !== 0) {
        details.push({
          key: 'rotation',
          label: 'Rotación',
          value: `${Math.round(customization.rotation)}°`,
        });
      }
    }
  }

  // Show component if there's an uploaded image OR if there are any details
  if (details.length === 0 && !uploadedImage) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1">
      {/* Uploaded Image Thumbnail */}
      {uploadedImage && (
        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-200">
          <img
            src={uploadedImage}
            alt="Diseño personalizado"
            className="w-12 h-12 object-contain rounded border border-purple-300"
          />
          <span className="text-xs text-purple-700 font-medium">Imagen personalizada</span>
        </div>
      )}

      {/* Customization Details */}
      {details.length > 0 && (
        <div className="text-xs text-gray-600 space-y-0.5">
          {details.map((detail) => (
            <div key={detail.key} className="flex items-start gap-1">
              <span className="font-medium text-gray-700">{detail.label}:</span>
              <span className="text-gray-600 break-words">{detail.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
