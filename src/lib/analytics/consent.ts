// src/lib/analytics/consent.ts

export type AnalyticsConsent = 'granted' | 'denied' | 'unset';

const CONSENT_KEY = 'analytics_consent';

export function getAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === 'undefined') return 'unset';
  const value = window.localStorage.getItem(CONSENT_KEY);
  if (value === 'granted' || value === 'denied') return value;
  return 'unset';
}

export function setAnalyticsConsent(value: Exclude<AnalyticsConsent, 'unset'>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent('analytics-consent-change', { detail: value }));
}
