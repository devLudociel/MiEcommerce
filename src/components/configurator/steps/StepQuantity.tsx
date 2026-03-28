import React, { useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { QuantityConfig, PricingTier } from '../../../types/configurator';

interface StepQuantityProps {
  config: QuantityConfig;
  quantity: number;
  onQuantityChange: (qty: number) => void;
}

function getTierForQuantity(tiers: PricingTier[], qty: number): PricingTier {
  // Los tiers están ordenados por `from` ascendente.
  // Buscamos el tier más alto cuyo `from` <= qty.
  let match = tiers[0];
  for (const tier of tiers) {
    if (qty >= tier.from) match = tier;
  }
  return match;
}

export default function StepQuantity({ config, quantity, onQuantityChange }: StepQuantityProps) {
  const currentTier = getTierForQuantity(config.tiers, quantity);
  const fmt = (n: number) =>
    n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const setQty = useCallback(
    (value: number) => {
      const clamped = Math.max(config.min, value);
      onQuantityChange(clamped);
    },
    [config.min, onQuantityChange]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Cantidad</h2>
        <p className="text-sm text-gray-500 mt-1">
          Pedido mínimo: {config.min} {config.min === 1 ? 'unidad' : 'unidades'}
        </p>
      </div>

      {/* Quantity selector */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setQty(quantity - 1)}
          disabled={quantity <= config.min}
          className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Reducir cantidad"
        >
          <Minus className="w-5 h-5" />
        </button>

        <input
          type="number"
          min={config.min}
          value={quantity}
          onChange={(e) => setQty(parseInt(e.target.value, 10) || config.min)}
          className="w-24 text-center text-xl font-bold rounded-xl border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          aria-label="Cantidad"
        />

        <button
          type="button"
          onClick={() => setQty(quantity + 1)}
          className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
          aria-label="Aumentar cantidad"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Pricing tiers table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="text-left px-4 py-3 font-semibold">Desde</th>
              <th className="text-right px-4 py-3 font-semibold">Precio/ud.</th>
            </tr>
          </thead>
          <tbody>
            {config.tiers.map((tier, i) => {
              const isActive = tier.from === currentTier.from;
              return (
                <tr
                  key={tier.from}
                  className={`
                    border-t border-gray-100 cursor-pointer transition-colors
                    ${isActive ? 'bg-indigo-50 font-semibold' : 'hover:bg-gray-50'}
                  `}
                  onClick={() => setQty(tier.from)}
                >
                  <td className="px-4 py-3">
                    <span className={isActive ? 'text-indigo-700' : 'text-gray-700'}>
                      {tier.from} {tier.from === 1 ? 'unidad' : 'unidades'}
                    </span>
                    {isActive && (
                      <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        Tu tramo
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right ${isActive ? 'text-indigo-700' : 'text-gray-900'}`}>
                    {fmt(tier.price)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quick quantity shortcuts */}
      {config.tiers.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {config.tiers.map((tier) => (
            <button
              key={tier.from}
              type="button"
              onClick={() => setQty(tier.from)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${quantity >= tier.from && (config.tiers.findIndex(t => t.from > quantity) === -1 || config.tiers[config.tiers.indexOf(tier) + 1]?.from > quantity)
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {tier.from}+ uds. &rarr; {fmt(tier.price)}/ud.
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
