// src/components/landing/LandingAnalytics.tsx
// Componente de tracking especifico para landing pages.
// Inicializa analytics, captura UTMs, trackea vista y scroll depth.

import { useEffect, useRef } from 'react';
import { initAnalytics } from '../../lib/analytics';
import { getAnalyticsConsent } from '../../lib/analytics/consent';
import {
  captureUtmParams,
  trackLandingView,
  initScrollDepthTracking,
} from '../../lib/analytics/landingTracking';

interface LandingAnalyticsProps {
  slug: string;
  campaignId?: string;
  facebookPixelId?: string;
}

export default function LandingAnalytics({
  slug,
  campaignId,
  facebookPixelId,
}: LandingAnalyticsProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanupScroll: (() => void) | null = null;

    const init = () => {
      if (initialized.current) return;
      initialized.current = true;

      // 1. Inicializar plataformas de analytics (GA4 + FB Pixel)
      initAnalytics({
        ga4MeasurementId: import.meta.env.PUBLIC_GA4_MEASUREMENT_ID,
        facebookPixelId: facebookPixelId || import.meta.env.PUBLIC_FACEBOOK_PIXEL_ID,
      });

      // 2. Capturar y guardar UTM params de la URL
      captureUtmParams();

      // 3. Trackear vista de landing
      trackLandingView(slug, campaignId);

      // 4. Iniciar tracking de scroll depth
      cleanupScroll = initScrollDepthTracking(slug);
    };

    if (getAnalyticsConsent() === 'granted') {
      init();
    }

    const handler = () => {
      if (getAnalyticsConsent() === 'granted') {
        init();
      }
    };

    window.addEventListener('analytics-consent-change', handler);

    return () => {
      window.removeEventListener('analytics-consent-change', handler);
      if (cleanupScroll) cleanupScroll();
    };
  }, [slug, campaignId, facebookPixelId]);

  return null;
}
