import React, { useCallback } from 'react';
import { Star } from 'lucide-react';
import type { QuantityConfig, PricingTier, OptionGroup, ConfiguratorPricing } from '../../../types/configurator';

interface StepQuantityProps {
  config: QuantityConfig;
  quantity: number;
  optionGroups?: OptionGroup[];
  selectedOptions?: Record<string, string>;
  /** Unidades por hoja resueltas del valor de opción seleccionado */
  unitsPerSheet?: number;
  /** Pricing breakdown for display */
  pricing?: ConfiguratorPricing | null;
  onQuantityChange: (qty: number) => void;
}

function getActiveTiers(
  config: QuantityConfig,
  optionGroups: OptionGroup[] = [],
  selectedOptions: Record<string, string> = {}
): PricingTier[] {
  const { combinationPricing, tiers } = config;
  if (!combinationPricing) return tiers;

  // 1. Full combination key (all selected values in group order)
  const valueIds = optionGroups
    .map((g) => selectedOptions[g.id])
    .filter((id): id is string => !!id);

  if (valueIds.length > 1) {
    const fullKey = valueIds.join('+');
    if (combinationPricing[fullKey]?.length) return combinationPricing[fullKey];
  }

  // 2. Each individual value (first group has priority)
  for (const id of valueIds) {
    if (combinationPricing[id]?.length) return combinationPricing[id];
  }

  return tiers;
}

function getTierForQuantity(tiers: PricingTier[], qty: number): PricingTier {
  let match = tiers[0];
  for (const tier of tiers) {
    if (qty >= tier.from) match = tier;
  }
  return match;
}

const fmt = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

// ─── Standard (per-unit) mode ───────────────────────────────────────────────

function savingsPercent(baseTierPrice: number, tierPrice: number): number {
  if (baseTierPrice <= 0 || tierPrice >= baseTierPrice) return 0;
  return Math.round((1 - tierPrice / baseTierPrice) * 100);
}

function TierCardUnit({
  tier,
  nextTier,
  isActive,
  basePrice,
  onClick,
}: {
  tier: PricingTier;
  nextTier?: PricingTier;
  isActive: boolean;
  basePrice: number;
  onClick: () => void;
}) {
  const savings = savingsPercent(basePrice, tier.price);
  const rangeLabel = nextTier
    ? `${tier.from} – ${nextTier.from - 1} uds.`
    : `${tier.from}+ uds.`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all
        ${isActive
          ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
          : 'border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-indigo-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.14)]'
        }
      `}
    >
      {tier.recommended && (
        <span className="absolute -top-3 left-3 flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
          <Star className="w-3 h-3 fill-amber-900" />
          Recomendado
        </span>
      )}
      {tier.label && (
        <span className={`text-xs font-semibold uppercase tracking-wide ${isActive ? 'text-indigo-500' : 'text-gray-400'}`}>
          {tier.label}
        </span>
      )}
      <span className={`text-sm font-semibold ${isActive ? 'text-indigo-800' : 'text-gray-700'}`}>
        {rangeLabel}
      </span>
      <span className={`text-2xl font-bold leading-tight ${isActive ? 'text-indigo-700' : 'text-gray-900'}`}>
        {fmt(tier.price)}
        <span className="text-sm font-normal text-gray-400 ml-1">/ud.</span>
      </span>
      {savings > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full w-fit">
          Ahorras un {savings}%
        </span>
      )}
      {isActive && (
        <span className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
    </button>
  );
}

// ─── Sheet-based mode ────────────────────────────────────────────────────────

function sheetSavingsPercent(tiers: PricingTier[], tier: PricingTier): number {
  const basePerSheet = tiers[0].price / Math.max(tiers[0].from, 1);
  const thisPerSheet = tier.price / Math.max(tier.from, 1);
  if (basePerSheet <= 0 || thisPerSheet >= basePerSheet) return 0;
  return Math.round((1 - thisPerSheet / basePerSheet) * 100);
}

function TierCardSheet({
  tier,
  tiers,
  isActive,
  unitsPerSheet,
  onClick,
}: {
  tier: PricingTier;
  tiers: PricingTier[];
  isActive: boolean;
  unitsPerSheet?: number;
  onClick: () => void;
}) {
  const savings = sheetSavingsPercent(tiers, tier);
  const hojas = tier.from;
  const units = unitsPerSheet ? hojas * unitsPerSheet : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all
        ${isActive
          ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
          : 'border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-indigo-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.14)]'
        }
      `}
    >
      {tier.recommended && (
        <span className="absolute -top-3 left-3 flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
          <Star className="w-3 h-3 fill-amber-900" />
          Recomendado
        </span>
      )}
      {tier.label && (
        <span className={`text-xs font-semibold uppercase tracking-wide ${isActive ? 'text-indigo-500' : 'text-gray-400'}`}>
          {tier.label}
        </span>
      )}
      {/* Sheet count */}
      <span className={`text-sm font-semibold ${isActive ? 'text-indigo-800' : 'text-gray-700'}`}>
        {hojas} {hojas === 1 ? 'hoja' : 'hojas'}
        {units && (
          <span className="ml-1.5 text-xs font-normal text-gray-400">= {units} uds.</span>
        )}
      </span>
      {/* Total price */}
      <span className={`text-2xl font-bold leading-tight ${isActive ? 'text-indigo-700' : 'text-gray-900'}`}>
        {fmt(tier.price)}
      </span>
      {units && (
        <span className="text-xs text-gray-400">
          {fmt(tier.price / units)}/ud.
        </span>
      )}
      {savings > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full w-fit">
          Ahorras un {savings}%
        </span>
      )}
      {isActive && (
        <span className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StepQuantity({
  config,
  quantity,
  optionGroups,
  selectedOptions,
  unitsPerSheet,
  pricing,
  onQuantityChange,
}: StepQuantityProps) {
  const tiers = getActiveTiers(config, optionGroups, selectedOptions);
  const currentTier = getTierForQuantity(tiers, quantity);
  const basePrice = tiers[0]?.price ?? 0;
  const isSheetBased = !!config.sheetBased;
  const isTextBannerPricing =
    pricing?.letterCount != null && pricing?.letterUnitPrice != null;

  const setQty = useCallback(
    (value: number) => {
      onQuantityChange(Math.max(config.min, value));
    },
    [config.min, onQuantityChange]
  );

  if (isTextBannerPricing) {
    const letterCount = pricing.letterCount!;
    const letterUnitPrice = pricing.letterUnitPrice!;
    const giftImagePennants = pricing.giftImagePennants ?? 2;

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Cantidad</h2>
          <p className="text-sm text-gray-500 mt-1">
            En este producto el precio se calcula por letras del texto.
          </p>
        </div>

        <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span>Letras del texto</span>
            <span className="font-semibold">{letterCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span>{letterCount} banderines × {fmt(letterUnitPrice)}</span>
            <span className="font-semibold">{fmt(letterCount * letterUnitPrice)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span>Regalo</span>
            <span>+ {giftImagePennants} banderines temáticos</span>
          </div>
          <div className="border-t border-indigo-200 pt-2 flex items-center justify-between text-lg font-bold text-indigo-800">
            <span>Total</span>
            <span>{fmt(pricing.total)}</span>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          La cantidad se mantiene en {config.min} para este cálculo.
        </p>
      </div>
    );
  }

  if (isSheetBased) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Cantidad</h2>
          <p className="text-sm text-gray-500 mt-1">
            Elige cuántas hojas quieres · Más hojas = mejor precio por unidad
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {tiers.map((tier) => (
            <TierCardSheet
              key={tier.from}
              tier={tier}
              tiers={tiers}
              isActive={tier.from === currentTier.from}
              unitsPerSheet={unitsPerSheet}
              onClick={() => setQty(tier.from)}
            />
          ))}
        </div>
      </div>
    );
  }

  // Standard per-unit mode
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Cantidad</h2>
        <p className="text-sm text-gray-500 mt-1">
          Pedido mínimo: {config.min} {config.min === 1 ? 'unidad' : 'unidades'} · Más cantidad = mejor precio
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tiers.map((tier, i) => (
          <TierCardUnit
            key={tier.from}
            tier={tier}
            nextTier={tiers[i + 1]}
            isActive={tier.from === currentTier.from}
            basePrice={basePrice}
            onClick={() => setQty(tier.from)}
          />
        ))}
      </div>

      {/* Fine-tune quantity */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 shrink-0">Cantidad exacta:</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQty(quantity - 1)}
              disabled={quantity <= config.min}
              className="w-10 h-10 flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
              aria-label="Reducir cantidad"
            >
              <span className="text-lg leading-none">−</span>
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
              <span className="text-lg leading-none">+</span>
            </button>
          </div>
        </div>

        {/* Price breakdown — full width row */}
        {pricing?.basePrice != null && pricing?.printSurcharge != null && pricing.printSurcharge > 0 ? (
          <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-2.5">
            <div className="text-sm text-gray-600 space-x-1">
              <span>{fmt(pricing.basePrice)}</span>
              <span className="text-gray-400">+</span>
              <span>{fmt(pricing.printSurcharge)}</span>
              {pricing.designPrice > 0 && (
                <>
                  <span className="text-gray-400">+</span>
                  <span>{fmt(pricing.designPrice)} diseño</span>
                </>
              )}
            </div>
            <span className="text-base font-bold text-indigo-700">
              {fmt(pricing.total)}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-end">
            <span className="text-sm font-semibold text-indigo-600">
              Total: {fmt(pricing?.total ?? currentTier.price * quantity)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
