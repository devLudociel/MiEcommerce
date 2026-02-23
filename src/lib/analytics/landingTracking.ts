// src/lib/analytics/landingTracking.ts
// Tracking especifico para landing pages: UTM, scroll depth, eventos personalizados

import { trackCustomEvent } from './index';
import { FB } from './index';

// ============================================================================
// UTM PARAMETERS
// ============================================================================

export interface UtmParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

const UTM_STORAGE_KEY = 'lp_utm_params';

/** Leer UTM params de la URL actual */
export function getUtmFromUrl(): UtmParams {
  if (typeof window === 'undefined') {
    return { utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content'),
  };
}

/** Guardar UTM params en sessionStorage para persistir durante la sesion */
export function saveUtmParams(utm: UtmParams): void {
  if (typeof window === 'undefined') return;

  // Solo guardar si al menos un parametro tiene valor
  const hasValues = Object.values(utm).some((v) => v !== null);
  if (hasValues) {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
  }
}

/** Recuperar UTM params guardados */
export function getSavedUtmParams(): UtmParams | null {
  if (typeof window === 'undefined') return null;

  const saved = sessionStorage.getItem(UTM_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

/** Capturar y guardar UTM params de la URL actual */
export function captureUtmParams(): UtmParams {
  const utm = getUtmFromUrl();
  saveUtmParams(utm);
  return utm;
}

// ============================================================================
// LANDING PAGE EVENTS
// ============================================================================

/** Evento: vista de landing page */
export function trackLandingView(slug: string, campaignId?: string): void {
  const utm = getSavedUtmParams() || getUtmFromUrl();

  trackCustomEvent('landing_view', {
    landing_slug: slug,
    campaign_id: campaignId || slug,
    ...flattenUtm(utm),
  });

  // Facebook Pixel: ViewContent para la landing
  FB.trackFBCustomEvent('ViewContent', {
    content_type: 'landing_page',
    content_name: slug,
    campaign_id: campaignId || slug,
  });

  console.log('[Landing Tracking] View:', slug);
}

/** Evento: clic en CTA */
export function trackCtaClick(slug: string, ctaType: string, ctaPosition: string): void {
  const utm = getSavedUtmParams();

  trackCustomEvent('cta_click', {
    landing_slug: slug,
    cta_type: ctaType,
    cta_position: ctaPosition,
    ...flattenUtm(utm),
  });

  // Facebook Pixel: Lead al hacer clic en CTA
  FB.trackFBLead();

  console.log('[Landing Tracking] CTA click:', slug, ctaType, ctaPosition);
}

/** Evento: profundidad de scroll */
export function trackScrollDepth(slug: string, depth: number): void {
  trackCustomEvent('scroll_depth', {
    landing_slug: slug,
    depth_percent: depth,
  });
}

/** Evento: envio de formulario de contacto desde landing */
export function trackLandingFormSubmit(slug: string, formData?: Record<string, string>): void {
  const utm = getSavedUtmParams();

  trackCustomEvent('landing_form_submit', {
    landing_slug: slug,
    ...flattenUtm(utm),
    ...(formData || {}),
  });

  FB.trackFBLead();

  console.log('[Landing Tracking] Form submit:', slug);
}

// ============================================================================
// SCROLL DEPTH OBSERVER
// ============================================================================

const SCROLL_THRESHOLDS = [25, 50, 75, 100];

/** Iniciar observacion de scroll depth en la landing */
export function initScrollDepthTracking(slug: string): () => void {
  if (typeof window === 'undefined') return () => {};

  const trackedThresholds = new Set<number>();

  const handleScroll = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return;

    const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);

    for (const threshold of SCROLL_THRESHOLDS) {
      if (scrollPercent >= threshold && !trackedThresholds.has(threshold)) {
        trackedThresholds.add(threshold);
        trackScrollDepth(slug, threshold);
      }
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function flattenUtm(utm: UtmParams | null): Record<string, string> {
  if (!utm) return {};

  const result: Record<string, string> = {};
  if (utm.utm_source) result.utm_source = utm.utm_source;
  if (utm.utm_medium) result.utm_medium = utm.utm_medium;
  if (utm.utm_campaign) result.utm_campaign = utm.utm_campaign;
  if (utm.utm_term) result.utm_term = utm.utm_term;
  if (utm.utm_content) result.utm_content = utm.utm_content;
  return result;
}
