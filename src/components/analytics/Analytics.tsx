// src/components/analytics/Analytics.tsx

/**
 * Analytics Initialization Component
 *
 * Initializes Google Analytics 4 and Facebook Pixel on client-side.
 * This component should be included once in BaseLayout.astro with client:load.
 *
 * Usage in BaseLayout.astro:
 * <Analytics client:load />
 */

import { useEffect, useRef } from 'react';
import { initAnalytics } from '../../lib/analytics';
import { getAnalyticsConsent } from '../../lib/analytics/consent';

interface AnalyticsProps {
  ga4MeasurementId?: string;
  facebookPixelId?: string;
}

export default function Analytics({
  ga4MeasurementId = import.meta.env.PUBLIC_GA4_MEASUREMENT_ID,
  facebookPixelId = import.meta.env.PUBLIC_FACEBOOK_PIXEL_ID,
}: AnalyticsProps) {
  const initialized = useRef(false);

  useEffect(() => {
    // Only initialize on client-side
    if (typeof window === 'undefined') return;

    const init = () => {
      if (initialized.current) return;
      initialized.current = true;

      // Initialize analytics platforms
      initAnalytics({
        ga4MeasurementId,
        facebookPixelId,
      });

      // Log initialization for debugging
      console.log('[Analytics Component] Initialized', {
        ga4: !!ga4MeasurementId,
        facebook: !!facebookPixelId,
      });
    };

    if (getAnalyticsConsent() === 'granted') {
      init();
      return;
    }

    const handler = () => {
      if (getAnalyticsConsent() === 'granted') {
        init();
      }
    };

    window.addEventListener('analytics-consent-change', handler);
    return () => {
      window.removeEventListener('analytics-consent-change', handler);
    };
  }, [ga4MeasurementId, facebookPixelId]);

  // This component doesn't render anything
  return null;
}
