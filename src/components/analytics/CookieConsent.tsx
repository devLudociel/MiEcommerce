// src/components/analytics/CookieConsent.tsx
import { useEffect, useState } from 'react';
import { getAnalyticsConsent, setAnalyticsConsent } from '../../lib/analytics/consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setVisible(getAnalyticsConsent() === 'unset');
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-xl backdrop-blur md:inset-x-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-700">
          <p className="font-semibold text-gray-900">Cookies y privacidad</p>
          <p className="mt-1">
            Usamos cookies analíticas y de marketing (GA4 y Meta Pixel) para mejorar la experiencia
            y medir resultados. Puedes aceptar o rechazar.
          </p>
          <a href="/politica-cookies" className="mt-2 inline-block text-cyan-600 hover:underline">
            Ver política de cookies
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            onClick={() => {
              setAnalyticsConsent('denied');
              setVisible(false);
            }}
          >
            Rechazar
          </button>
          <button
            className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
            onClick={() => {
              setAnalyticsConsent('granted');
              setVisible(false);
            }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
