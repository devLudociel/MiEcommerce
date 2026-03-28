import React from 'react';
import type { CartItem } from '../../store/cartStore';

interface Props {
  customization: CartItem['customization'];
}

export default function CustomizationDetails({ customization }: Props) {
  if (!customization || Object.keys(customization).length === 0) return null;

  const lines: { label: string; value: string }[] = [];

  if (customization.variantLabel) {
    lines.push({ label: customization.variantLabel || 'Variante', value: customization.variantLabel });
  } else if (customization.variant) {
    lines.push({ label: 'Variante', value: String(customization.variant) });
  }

  if (customization.size) {
    lines.push({ label: 'Tamaño', value: String(customization.size) });
  }

  if (customization.placementLabel || customization.placement) {
    const val = [customization.placementLabel || customization.placement, customization.placementSize]
      .filter(Boolean)
      .join(' · ');
    lines.push({ label: 'Posición', value: val as string });
  }

  if (customization.designMode === 'ready' && customization.designFileName) {
    lines.push({ label: 'Diseño', value: String(customization.designFileName) });
  } else if (customization.designMode === 'need-design') {
    lines.push({ label: 'Diseño', value: 'Servicio de diseño incluido' });
  }

  if (customization.designNotes) {
    lines.push({ label: 'Notas', value: String(customization.designNotes) });
  }

  const designFileUrl: string | undefined =
    customization.designFileUrl as string | undefined;

  if (lines.length === 0 && !designFileUrl) return null;

  return (
    <div className="mt-2 space-y-1">
      {designFileUrl && (
        <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded border border-indigo-200">
          <img
            src={designFileUrl}
            alt="Diseño"
            className="w-10 h-10 object-contain rounded border border-indigo-200"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-xs text-indigo-700 font-medium">Diseño adjunto</span>
        </div>
      )}
      {lines.length > 0 && (
        <div className="text-xs text-gray-600 space-y-0.5">
          {lines.map((line) => (
            <div key={line.label} className="flex items-start gap-1">
              <span className="font-medium text-gray-700">{line.label}:</span>
              <span className="text-gray-600 break-words">{line.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
