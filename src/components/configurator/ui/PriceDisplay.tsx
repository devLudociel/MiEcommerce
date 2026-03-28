import React from 'react';
import type { ConfiguratorPricing } from '../../../types/configurator';

interface PriceDisplayProps {
  pricing: ConfiguratorPricing;
  quantity: number;
}

export default function PriceDisplay({ pricing, quantity }: PriceDisplayProps) {
  const fmt = (n: number) =>
    n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 shadow-sm">
      <div className="flex justify-between text-sm text-gray-600">
        <span>Precio unitario</span>
        <span>{fmt(pricing.unitPrice)}</span>
      </div>

      <div className="flex justify-between text-sm text-gray-600">
        <span>Cantidad</span>
        <span>&times; {quantity}</span>
      </div>

      {pricing.designPrice > 0 && (
        <div className="flex justify-between text-sm text-gray-600">
          <span>Servicio de diseño</span>
          <span>+ {fmt(pricing.designPrice)}</span>
        </div>
      )}

      <div className="border-t pt-2 flex justify-between text-lg font-bold text-gray-900">
        <span>Total</span>
        <span>{fmt(pricing.total)}</span>
      </div>
    </div>
  );
}
