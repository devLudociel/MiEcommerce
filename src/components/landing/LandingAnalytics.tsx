// src/components/landing/LandingAnalytics.tsx
// Componente de tracking especifico para landing pages.
// Inicializa analytics, captura UTMs, trackea vista y scroll depth.

import { useEffect } from 'react';
import { initAnalytics } from '../../lib/analytics';
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
  useEffect(() => {
    if (typeof window === 'undefined') return;

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
    const cleanupScroll = initScrollDepthTracking(slug);

    return () => {
      cleanupScroll();
    };
  }, [slug, campaignId, facebookPixelId]);

  return null;
}
