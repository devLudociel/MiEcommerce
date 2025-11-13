import React from 'react';
import type { CartItem } from '../../store/cartStore';

interface CustomizationDetailsProps {
  customization: CartItem['customization'];
}

export default function CustomizationDetails({ customization }: CustomizationDetailsProps) {
  if (!customization || Object.keys(customization).length === 0) {
    return null;
  }

  const details: Array<{ label: string; value: string | number }> = [];

  // Add color
  if (customization.selectedColor) {
    details.push({ label: 'Color', value: customization.selectedColor });
  }

  // Add size
  if (customization.selectedSize) {
    details.push({ label: 'Talla', value: customization.selectedSize });
  }

  // Add material
  if (customization.selectedMaterial) {
    details.push({ label: 'Material', value: customization.selectedMaterial });
  }

  // Add text
  if (customization.text) {
    details.push({ label: 'Texto', value: customization.text });
  }

  // Add text color
  if (customization.textColor) {
    details.push({ label: 'Color de texto', value: customization.textColor });
  }

  // Add transform details if image was uploaded
  if (customization.uploadedImage) {
    if (customization.scale !== undefined) {
      details.push({ label: 'Escala', value: `${Math.round(customization.scale * 100)}%` });
    }
    if (customization.rotation !== undefined && customization.rotation !== 0) {
      details.push({ label: 'Rotación', value: `${Math.round(customization.rotation)}°` });
    }
    if (customization.position) {
      details.push({
        label: 'Posición',
        value: `X: ${Math.round(customization.position.x)}%, Y: ${Math.round(customization.position.y)}%`,
      });
    }
  }

  // Add any other custom fields (excluding known ones and internal fields)
  const knownFields = [
    'uploadedImage',
    'text',
    'textColor',
    'selectedColor',
    'selectedSize',
    'selectedMaterial',
    'position',
    'rotation',
    'scale',
    // Internal fields that shouldn't be displayed
    'categoryName',
    'values',
    'totalPriceModifier',
    'imageUrl',
    'imagePath',
    'imageTransform',
  ];

  Object.entries(customization).forEach(([key, value]) => {
    // Skip known fields, undefined/null/empty values, and complex objects/arrays
    if (
      knownFields.includes(key) ||
      value === undefined ||
      value === null ||
      value === '' ||
      typeof value === 'object' // Skip objects and arrays
    ) {
      return;
    }

    // Only show primitive values (string, number, boolean)
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      // Format the key to be more readable (camelCase to Title Case)
      const label = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
      details.push({ label, value: String(value) });
    }
  });

  if (details.length === 0 && !customization.uploadedImage) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1">
      {/* Uploaded Image Thumbnail */}
      {customization.uploadedImage && (
        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded border border-purple-200">
          <img
            src={customization.uploadedImage}
            alt="Diseño personalizado"
            className="w-12 h-12 object-contain rounded border border-purple-300"
          />
          <span className="text-xs text-purple-700 font-medium">Imagen personalizada</span>
        </div>
      )}

      {/* Customization Details */}
      {details.length > 0 && (
        <div className="text-xs text-gray-600 space-y-0.5">
          {details.map((detail, index) => (
            <div key={index} className="flex items-start gap-1">
              <span className="font-medium text-gray-700">{detail.label}:</span>
              <span className="text-gray-600 break-words">{detail.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
