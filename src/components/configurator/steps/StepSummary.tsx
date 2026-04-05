import React from 'react';
import { ShoppingCart, Upload, Hash, MapPin, Tag, Type } from 'lucide-react';
import type {
  ConfigurableProduct,
  ConfiguratorSelections,
  ConfiguratorPricing,
} from '../../../types/configurator';
import { safeImageSrc } from '../../../lib/placeholders';
import PriceDisplay from '../ui/PriceDisplay';

interface StepSummaryProps {
  product: ConfigurableProduct;
  selections: ConfiguratorSelections;
  pricing: ConfiguratorPricing;
  isAddingToCart: boolean;
  onAddToCart: () => void;
}

export default function StepSummary({
  product,
  selections,
  pricing,
  isAddingToCart,
  onAddToCart,
}: StepSummaryProps) {
  const optionGroups = product.configurator.options ?? [];

  const lines: { icon: React.ReactNode; label: string; value: string }[] = [];

  // All selected option groups
  for (const group of optionGroups) {
    const valueId = selections.options[group.id];
    if (valueId) {
      const val = group.values.find((v) => v.id === valueId);
      if (val) {
        lines.push({
          icon: <Tag className="w-4 h-4" />,
          label: group.label,
          value: val.label,
        });
      }
    }
  }

  // Freetext attributes (V2)
  const v2Attributes = product.configurator.attributes ?? [];
  for (const attr of v2Attributes) {
    if (attr.type !== 'freetext') continue;
    const val = selections.options[attr.id];
    if (val) {
      lines.push({
        icon: <Type className="w-4 h-4" />,
        label: attr.label,
        value: val,
      });
    }
  }

  // Placement
  if (selections.placement) {
    const placementOpt = product.configurator.placement?.options.find(
      (o) => o.id === selections.placement
    );
    const placementValue = [
      placementOpt?.icon,
      placementOpt?.label || selections.placement,
      selections.placementSize,
    ]
      .filter(Boolean)
      .join(' · ');
    lines.push({
      icon: <MapPin className="w-4 h-4" />,
      label: product.configurator.placement?.label || 'Posición',
      value: placementValue,
    });
  }

  // Design
  if (selections.designMode === 'ready' && selections.designFile) {
    lines.push({
      icon: <Upload className="w-4 h-4" />,
      label: 'Diseño',
      value: selections.designFile.name,
    });
  } else if (selections.designMode === 'need-design') {
    lines.push({
      icon: <Upload className="w-4 h-4" />,
      label: 'Diseño',
      value: product.configurator.design.designServiceLabel || 'Servicio de diseño',
    });
  }

  // Quantity
  const isSheetBased = product.configurator.quantity.sheetBased;
  const unitsPerSheet = (() => {
    for (const group of optionGroups) {
      const valueId = selections.options[group.id];
      if (valueId) {
        const val = group.values.find((v) => v.id === valueId);
        if (val?.unitsPerSheet) return val.unitsPerSheet;
      }
    }
    return undefined;
  })();
  const totalUnits = isSheetBased && unitsPerSheet ? selections.quantity * unitsPerSheet : undefined;

  lines.push({
    icon: <Hash className="w-4 h-4" />,
    label: 'Cantidad',
    value: isSheetBased
      ? `${selections.quantity} ${selections.quantity === 1 ? 'hoja' : 'hojas'}${totalUnits ? ` (${totalUnits} uds.)` : ''}`
      : `${selections.quantity} ${selections.quantity === 1 ? 'unidad' : 'unidades'}`,
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Resumen de tu pedido</h2>
        <p className="text-sm text-gray-500 mt-1">Revisa tu configuración antes de añadir al carrito</p>
      </div>

      {/* Product info */}
      <div className="flex gap-3 bg-gray-50 rounded-xl border border-gray-200 p-3">
        {product.images[0] && (
          <img
            src={safeImageSrc(product.images[0])}
            alt={product.name}
            className="w-14 h-14 rounded-lg object-cover shrink-0"
          />
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate text-sm">{product.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>
        </div>
      </div>

      {/* Selection details */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y overflow-hidden">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2.5 min-w-0">
            <span className="text-gray-400 shrink-0">{line.icon}</span>
            <span className="text-sm text-gray-500 shrink-0">{line.label}</span>
            <span className="ml-auto text-sm font-medium text-gray-900 text-right truncate max-w-[55%]">
              {line.value}
            </span>
          </div>
        ))}
      </div>

      {/* Design notes */}
      {selections.designMode === 'need-design' && selections.designNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-sm font-semibold text-amber-800 mb-1">Notas del diseño</p>
          <p className="text-sm text-amber-700 break-words">{selections.designNotes}</p>
        </div>
      )}

      {/* Reference files */}
      {selections.designMode === 'need-design' &&
        selections.referenceFiles &&
        selections.referenceFiles.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Archivos de referencia ({selections.referenceFiles.length})
            </p>
            <ul className="space-y-0.5">
              {selections.referenceFiles.map((f, i) => (
                <li key={i} className="text-sm text-gray-600 truncate">
                  {f.name}
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* Pricing — hidden on mobile */}
      <div className="hidden sm:block">
        <PriceDisplay pricing={pricing} quantity={selections.quantity} sheetBased={isSheetBased} />
      </div>

      {/* Add to cart — hidden on mobile */}
      <button
        type="button"
        onClick={onAddToCart}
        disabled={isAddingToCart}
        className="
          hidden sm:flex w-full items-center justify-center gap-3 px-6 py-4 rounded-xl
          bg-indigo-600 text-white font-semibold text-lg
          hover:bg-indigo-700 active:bg-indigo-800
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-colors shadow-lg shadow-indigo-200
        "
      >
        {isAddingToCart ? (
          <>
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Añadiendo...
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5" />
            Añadir al carrito
          </>
        )}
      </button>
    </div>
  );
}
