// src/components/configurator/steps/StepSizeGrid.tsx
// Paso especial para textiles: selección de cantidad por talla en una sola pantalla.
// Reemplaza StepQuantity cuando el producto tiene un atributo de talla detectado.

import React from 'react';
import { Star } from 'lucide-react';
import type { ProductConfiguratorAttribute, PricingTier } from '../../../types/configurator';

const fmt = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

interface StepSizeGridProps {
  sizeAttribute: ProductConfiguratorAttribute;
  /** { "s": 0, "m": 10, "l": 25, "xl": 5 } */
  sizeQuantities: Record<string, number>;
  /** Tiers activos basados en las otras opciones seleccionadas (color, etc.) */
  tiers: PricingTier[];
  /** Precio unitario resuelto para el total actual */
  unitPrice: number;
  /** Cantidad mínima total */
  minQuantity: number;
  onSizeQuantityChange: (sizeId: string, qty: number) => void;
}

function getTierForQuantity(tiers: PricingTier[], qty: number): PricingTier | null {
  if (!tiers.length || qty === 0) return null;
  let match = tiers[0];
  for (const tier of tiers) {
    if (qty >= tier.from) match = tier;
  }
  return match;
}

function savingsPercent(baseTierPrice: number, tierPrice: number): number {
  if (baseTierPrice <= 0 || tierPrice >= baseTierPrice) return 0;
  return Math.round((1 - tierPrice / baseTierPrice) * 100);
}

export default function StepSizeGrid({
  sizeAttribute,
  sizeQuantities,
  tiers,
  unitPrice,
  minQuantity,
  onSizeQuantityChange,
}: StepSizeGridProps) {
  const totalQuantity = Object.values(sizeQuantities).reduce((s, q) => s + q, 0);
  const activeTier = getTierForQuantity(tiers, totalQuantity);
  const baseTierPrice = tiers[0]?.price ?? 0;
  const subtotal = unitPrice * totalQuantity;

  const setQty = (sizeId: string, raw: number) => {
    const qty = Math.max(0, Math.floor(raw || 0));
    onSizeQuantityChange(sizeId, qty);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Cantidad por talla</h2>
        <p className="text-sm text-gray-500 mt-1">
          Indica cuántas unidades necesitas de cada talla · Más cantidad = mejor precio
        </p>
      </div>

      {/* Tier reference (informational) */}
      {tiers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {tiers.map((tier, i) => {
            const isActive = activeTier?.from === tier.from;
            const savings = savingsPercent(baseTierPrice, tier.price);
            const nextTier = tiers[i + 1];
            const rangeLabel = nextTier
              ? `${tier.from}–${nextTier.from - 1} uds.`
              : `${tier.from}+ uds.`;

            return (
              <div
                key={tier.from}
                className={`relative flex flex-col gap-0.5 p-3 rounded-xl border-2 transition-all
                  ${isActive
                    ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
                    : 'border-gray-200 bg-white opacity-60'
                  }`}
              >
                {tier.recommended && isActive && (
                  <span className="absolute -top-2.5 left-2 flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <Star className="w-2.5 h-2.5 fill-amber-900" />
                    Recomendado
                  </span>
                )}
                <span className={`text-xs font-medium ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {rangeLabel}
                </span>
                <span className={`text-lg font-bold ${isActive ? 'text-indigo-700' : 'text-gray-500'}`}>
                  {fmt(tier.price)}
                  <span className="text-xs font-normal ml-0.5">/ud.</span>
                </span>
                {savings > 0 && (
                  <span className="text-[10px] font-semibold text-emerald-700">
                    −{savings}%
                  </span>
                )}
                {isActive && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Size quantity table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_auto] gap-0 divide-y divide-gray-100">
          {/* Header */}
          <div className="px-4 py-2.5 bg-gray-50 font-semibold text-sm text-gray-500 uppercase tracking-wide">
            Talla
          </div>
          <div className="px-4 py-2.5 bg-gray-50 font-semibold text-sm text-gray-500 uppercase tracking-wide text-center">
            Cantidad
          </div>

          {/* Size rows */}
          {sizeAttribute.options.map((opt) => {
            const qty = sizeQuantities[opt.id] ?? 0;
            const hasQty = qty > 0;

            return (
              <React.Fragment key={opt.id}>
                {/* Talla label */}
                <div className={`flex items-center px-4 py-3 transition-colors ${hasQty ? 'bg-indigo-50' : ''}`}>
                  <span className={`text-base font-semibold ${hasQty ? 'text-indigo-800' : 'text-gray-700'}`}>
                    {opt.label}
                  </span>
                  {hasQty && (
                    <span className="ml-2 text-xs text-indigo-500 font-medium">
                      {fmt(unitPrice > 0 ? unitPrice * qty : 0)}
                    </span>
                  )}
                </div>

                {/* Quantity control */}
                <div className={`flex items-center justify-center px-3 py-2 gap-2 transition-colors ${hasQty ? 'bg-indigo-50' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setQty(opt.id, qty - 1)}
                    disabled={qty === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm text-sm font-bold"
                    aria-label={`Reducir cantidad de talla ${opt.label}`}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={qty === 0 ? '' : qty}
                    placeholder="0"
                    onChange={(e) => setQty(opt.id, parseInt(e.target.value, 10))}
                    className="w-14 text-center text-base font-bold rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 py-1.5"
                    aria-label={`Cantidad talla ${opt.label}`}
                  />
                  <button
                    type="button"
                    onClick={() => setQty(opt.id, qty + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors shadow-sm text-sm font-bold"
                    aria-label={`Aumentar cantidad de talla ${opt.label}`}
                  >
                    +
                  </button>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Total summary */}
      <div className={`rounded-xl px-4 py-3.5 border-2 transition-colors ${
        totalQuantity >= minQuantity
          ? 'bg-indigo-50 border-indigo-200'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm text-gray-500">Total:</span>
              <span className={`text-lg font-bold ${totalQuantity >= minQuantity ? 'text-indigo-800' : 'text-gray-700'}`}>
                {totalQuantity} {totalQuantity === 1 ? 'unidad' : 'unidades'}
              </span>
            </div>
            {totalQuantity > 0 && unitPrice > 0 && (
              <div className="text-xs text-gray-500">
                {totalQuantity} × {fmt(unitPrice)}/ud.
              </div>
            )}
            {totalQuantity > 0 && totalQuantity < minQuantity && (
              <div className="text-xs text-amber-600 font-medium">
                Mínimo {minQuantity} unidades en total
              </div>
            )}
          </div>
          {totalQuantity >= minQuantity && subtotal > 0 && (
            <div className="text-right">
              <div className="text-xs text-indigo-500 font-medium">Subtotal</div>
              <div className="text-2xl font-bold text-indigo-700">{fmt(subtotal)}</div>
            </div>
          )}
        </div>

        {/* Breakdown by size */}
        {totalQuantity > 0 && (
          <div className="mt-2 pt-2 border-t border-indigo-100 flex flex-wrap gap-2">
            {sizeAttribute.options
              .filter((opt) => (sizeQuantities[opt.id] ?? 0) > 0)
              .map((opt) => (
                <span key={opt.id} className="text-xs bg-white border border-indigo-200 text-indigo-700 rounded-full px-2.5 py-0.5 font-medium">
                  {opt.label}: {sizeQuantities[opt.id]}
                </span>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
