// src/components/cart/FreeShippingBar.tsx
// Barra de progreso hacia el envío gratis (carrito y checkout).
// El umbral sale de los métodos de envío activos en Firestore.

import { useState, useEffect } from 'react';
import { getMinFreeShippingThreshold } from '../../lib/shipping';

interface FreeShippingBarProps {
  subtotal: number;
  className?: string;
}

export default function FreeShippingBar({ subtotal, className = '' }: FreeShippingBarProps) {
  const [threshold, setThreshold] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMinFreeShippingThreshold().then((value) => {
      if (!cancelled) setThreshold(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!threshold || subtotal <= 0) return null;

  const remaining = threshold - subtotal;
  const unlocked = remaining <= 0;
  const progress = Math.min((subtotal / threshold) * 100, 100);

  return (
    <div className={`rounded-lg p-2.5 ${unlocked ? 'bg-green-50' : 'bg-cyan-50'} ${className}`}>
      <p className={`text-xs font-medium mb-1.5 ${unlocked ? 'text-green-700' : 'text-gray-700'}`}>
        {unlocked ? (
          <>🎉 ¡Genial! Tienes envío gratis</>
        ) : (
          <>
            🚚 Te faltan <span className="font-bold">€{remaining.toFixed(2)}</span> para el envío
            gratis
          </>
        )}
      </p>
      <div
        className="h-1.5 bg-white rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso hacia envío gratis"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            unlocked ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-pink-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
