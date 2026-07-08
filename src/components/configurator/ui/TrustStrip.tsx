import React from 'react';
import { ShieldCheck, MessageCircle, MapPin } from 'lucide-react';

/**
 * Franja compacta de señales de confianza, visible durante todo el
 * flujo de configuración. Ataca la objeción principal en impresión
 * personalizada: "¿y si queda mal?".
 */
const ITEMS = [
  {
    icon: ShieldCheck,
    label: 'Revisamos tu archivo gratis',
  },
  {
    icon: MessageCircle,
    label: 'Confirmamos contigo antes de imprimir',
  },
  {
    icon: MapPin,
    label: 'Taller propio en Canarias',
  },
] as const;

export default function TrustStrip() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 rounded-xl bg-emerald-50/70 border border-emerald-100 px-3 py-2">
      {ITEMS.map(({ icon: IconCmp, label }) => (
        <div key={label} className="flex items-center gap-1.5 min-w-0">
          <IconCmp className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
          <span className="text-[11px] sm:text-xs font-medium text-emerald-900 leading-tight">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
