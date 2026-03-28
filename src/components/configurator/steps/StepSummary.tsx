import React from 'react';
import { ShoppingCart, CheckCircle2, Palette, Ruler, Upload, Hash } from 'lucide-react';
import type {
  ConfigurableProduct,
  ConfiguratorSelections,
  ConfiguratorPricing,
} from '../../../types/configurator';
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
  const variantOption = selections.variant
    ? product.configurator.variant?.options.find((o) => o.id === selections.variant)
    : undefined;

  const lines: { icon: React.ReactNode; label: string; value: string }[] = [];

  if (variantOption) {
    lines.push({
      icon: <Palette className="w-4 h-4" />,
      label: product.configurator.variant?.label || 'Variante',
      value: variantOption.label,
    });
  }

  if (selections.size) {
    lines.push({
      icon: <Ruler className="w-4 h-4" />,
      label: product.configurator.size?.label || 'Tamaño',
      value: selections.size,
    });
  }

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

  lines.push({
    icon: <Hash className="w-4 h-4" />,
    label: 'Cantidad',
    value: `${selections.quantity} ${selections.quantity === 1 ? 'unidad' : 'unidades'}`,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Resumen de tu pedido</h2>
        <p className="text-sm text-gray-500 mt-1">Revisa tu configuración antes de añadir al carrito</p>
      </div>

      {/* Product info */}
      <div className="flex gap-4 bg-white rounded-xl border border-gray-200 p-4">
        {product.images[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-20 h-20 rounded-lg object-cover shrink-0"
          />
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
        </div>
      </div>

      {/* Selection details */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <span className="text-gray-400">{line.icon}</span>
            <span className="text-sm text-gray-500">{line.label}</span>
            <span className="ml-auto text-sm font-medium text-gray-900">{line.value}</span>
          </div>
        ))}
      </div>

      {/* Design notes */}
      {selections.designMode === 'need-design' && selections.designNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">Notas del diseño</p>
          <p className="text-sm text-amber-700 whitespace-pre-wrap">{selections.designNotes}</p>
        </div>
      )}

      {/* Reference files */}
      {selections.designMode === 'need-design' && selections.referenceFiles && selections.referenceFiles.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Archivos de referencia ({selections.referenceFiles.length})
          </p>
          <ul className="space-y-1">
            {selections.referenceFiles.map((f, i) => (
              <li key={i} className="text-sm text-gray-600">{f.name}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Pricing */}
      <PriceDisplay pricing={pricing} quantity={selections.quantity} />

      {/* Add to cart */}
      <button
        type="button"
        onClick={onAddToCart}
        disabled={isAddingToCart}
        className="
          w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl
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
