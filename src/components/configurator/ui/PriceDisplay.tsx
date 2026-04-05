import React from 'react';
import type { ConfiguratorPricing } from '../../../types/configurator';

interface PriceDisplayProps {
  pricing: ConfiguratorPricing;
  quantity: number;
  sheetBased?: boolean;
}

export default function PriceDisplay({ pricing, quantity, sheetBased }: PriceDisplayProps) {
  const fmt = (n: number) =>
    n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const isTextBannerPricing =
    pricing.letterCount != null && pricing.letterUnitPrice != null;

  if (isTextBannerPricing) {
    const letterCount = pricing.letterCount!;
    const letterUnitPrice = pricing.letterUnitPrice!;
    const giftImagePennants = pricing.giftImagePennants ?? 2;

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 shadow-sm">
        <div className="flex justify-between text-sm text-gray-700">
          <span>Letras</span>
          <span className="text-right">
            {letterCount} banderines × {fmt(letterUnitPrice)} = {fmt(letterCount * letterUnitPrice)}
          </span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Regalo</span>
          <span>+ {giftImagePennants} banderines temáticos</span>
        </div>

        <div className="border-t pt-2 flex justify-between text-lg font-bold text-gray-900">
          <span>Total</span>
          <span>{fmt(pricing.total)}</span>
        </div>
      </div>
    );
  }

  const hasBreakdown = pricing.basePrice != null && pricing.printSurcharge != null && pricing.printSurcharge > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 shadow-sm">
      {hasBreakdown ? (
        <>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Precio base</span>
            <span>{fmt(pricing.basePrice!)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{pricing.printSurchargeLabel || 'Estampado'}</span>
            <span>+ {fmt(pricing.printSurcharge!)}</span>
          </div>
          {pricing.quantityDiscount != null && pricing.quantityDiscount > 0 && pricing.unitPriceBeforeDiscount != null && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Dto. cantidad ({pricing.quantityDiscount}%)</span>
              <span>&minus;{fmt(pricing.unitPriceBeforeDiscount - pricing.unitPrice)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-semibold text-gray-800 border-t border-dashed border-gray-200 pt-1">
            <span>Precio por unidad</span>
            <span>{fmt(pricing.unitPrice)}</span>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between text-sm text-gray-600">
            <span>{sheetBased ? 'Precio/hoja' : 'Precio unitario'}</span>
            <span>{fmt(pricing.unitPrice)}</span>
          </div>
          {pricing.quantityDiscount != null && pricing.quantityDiscount > 0 && pricing.unitPriceBeforeDiscount != null && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Dto. cantidad ({pricing.quantityDiscount}%)</span>
              <span>&minus;{fmt(pricing.unitPriceBeforeDiscount - pricing.unitPrice)}</span>
            </div>
          )}
        </>
      )}

      <div className="flex justify-between text-sm text-gray-600">
        <span>{sheetBased ? 'Hojas' : 'Cantidad'}</span>
        <span>&times; {quantity}</span>
      </div>

      {pricing.attributeSurcharges?.map((s, i) => (
        <div key={i} className="flex justify-between text-sm text-gray-600">
          <span>{s.label}</span>
          <span className="text-right">
            <span>+ {fmt(s.amount)}</span>
            <span className="block text-xs text-gray-400">{s.detail}</span>
          </span>
        </div>
      ))}

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
