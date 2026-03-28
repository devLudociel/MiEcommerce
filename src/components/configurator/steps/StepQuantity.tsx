import React, { useCallback } from 'react';
import { Minus, Plus, Star } from 'lucide-react';
import type { QuantityConfig, PricingTier } from '../../../types/configurator';

interface StepQuantityProps {
  config: QuantityConfig;
  quantity: number;
  selectedVariant?: string;
  selectedSize?: string;
  onQuantityChange: (qty: number) => void;
}

function getActiveTiers(config: QuantityConfig, selectedVariant?: string, selectedSize?: string): PricingTier[] {
  if (selectedVariant && config.variantPricing?.[selectedVariant]?.length) {
    return config.variantPricing[selectedVariant];
  }
  if (selectedSize && config.sizePricing?.[selectedSize]?.length) {
    return config.sizePricing[selectedSize];
  }
  return config.tiers;
}

function getTierForQuantity(tiers: PricingTier[], qty: number): PricingTier {
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

const fmt = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

export default function StepQuantity({
  config,
  quantity,
  selectedVariant,
  selectedSize,
  onQuantityChange,
}: StepQuantityProps) {
  const tiers = getActiveTiers(config, selectedVariant, selectedSize);
  const currentTier = getTierForQuantity(tiers, quantity);
  const basePrice = tiers[0]?.price ?? 0;

  const setQty = useCallback(
    (value: number) => {
      onQuantityChange(Math.max(config.min, value));
    },
    [config.min, onQuantityChange]
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Cantidad</h2>
        <p className="text-sm text-gray-500 mt-1">
          Pedido mínimo: {config.min} {config.min === 1 ? 'unidad' : 'unidades'} · Más cantidad = mejor precio
        </p>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tiers.map((tier, i) => {
          const nextTier = tiers[i + 1];
          const isActive = tier.from === currentTier.from;
          const savings = savingsPercent(basePrice, tier.price);
          const rangeLabel = nextTier
            ? `${tier.from} – ${nextTier.from - 1} uds.`
            : `${tier.from}+ uds.`;

          return (
            <button
              key={tier.from}
              type="button"
              onClick={() => setQty(tier.from)}
              className={`
                relative flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all
                ${isActive
                  ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
                  : 'border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-indigo-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.14)]'
                }
              `}
            >
              {/* Recommended badge */}
              {tier.recommended && (
                <span className="absolute -top-3 left-3 flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  <Star className="w-3 h-3 fill-amber-900" />
                  Recomendado
                </span>
              )}

              {/* Custom label */}
              {tier.label && (
                <span className={`text-xs font-semibold uppercase tracking-wide ${isActive ? 'text-indigo-500' : 'text-gray-400'}`}>
                  {tier.label}
                </span>
              )}

              {/* Quantity range */}
              <span className={`text-sm font-semibold ${isActive ? 'text-indigo-800' : 'text-gray-700'}`}>
                {rangeLabel}
              </span>

              {/* Price per unit */}
              <span className={`text-2xl font-bold leading-tight ${isActive ? 'text-indigo-700' : 'text-gray-900'}`}>
                {fmt(tier.price)}
                <span className="text-sm font-normal text-gray-400 ml-1">/ud.</span>
              </span>

              {/* Savings */}
              {savings > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full w-fit">
                  Ahorras un {savings}%
                </span>
              )}

              {/* Active indicator */}
              {isActive && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Fine-tune quantity */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
        <span className="text-sm text-gray-500 shrink-0">Cantidad exacta:</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQty(quantity - 1)}
            disabled={quantity <= config.min}
            className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            aria-label="Reducir cantidad"
          >
            <Minus className="w-4 h-4" />
          </button>

          <input
            type="number"
            min={config.min}
            value={quantity}
            onChange={(e) => setQty(parseInt(e.target.value, 10) || config.min)}
            className="w-20 text-center text-lg font-bold rounded-xl border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
            aria-label="Cantidad"
          />

          <button
            type="button"
            onClick={() => setQty(quantity + 1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
            aria-label="Aumentar cantidad"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <span className={`ml-auto text-sm font-semibold ${currentTier.from === currentTier.from ? 'text-indigo-600' : 'text-gray-700'}`}>
          Total: {fmt(currentTier.price * quantity)}
        </span>
      </div>
    </div>
  );
}
