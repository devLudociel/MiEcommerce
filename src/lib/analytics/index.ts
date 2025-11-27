// src/lib/analytics/index.ts

/**
 * Unified Analytics API
 *
 * Provides a single interface to track events across multiple platforms:
 * - Google Analytics 4 (GA4)
 * - Facebook Pixel
 *
 * All tracking functions automatically call both platforms.
 */

import * as GA4 from './ga4';
import * as FB from './facebookPixel';

// Re-export individual platform functions for advanced use cases
export { GA4, FB };

/**
 * Initialize all analytics platforms
 */
export function initAnalytics(config: {
  ga4MeasurementId?: string;
  facebookPixelId?: string;
}) {
  if (config.ga4MeasurementId) {
    GA4.initGA4(config.ga4MeasurementId);
  }

  if (config.facebookPixelId) {
    FB.initFacebookPixel(config.facebookPixelId);
  }

  console.log('[Analytics] Initialized', {
    ga4: !!config.ga4MeasurementId,
    facebook: !!config.facebookPixelId,
  });
}

/**
 * Track page view (automatic in GA4, manual in FB Pixel)
 */
export function trackPageView(url?: string, title?: string) {
  if (url) {
    GA4.trackPageView(url, title);
  }
  FB.trackFBPageView();
}

/**
 * Track product view (ViewContent / view_item)
 */
export function trackProductView(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
}) {
  GA4.trackProductView(product);
  FB.trackFBProductView(product);
}

/**
 * Track add to cart (AddToCart / add_to_cart)
 */
export function trackAddToCart(product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}) {
  GA4.trackAddToCart(product);
  FB.trackFBAddToCart(product);
}

/**
 * Track checkout initiation (InitiateCheckout / begin_checkout)
 */
export function trackBeginCheckout(items: any[], value: number) {
  GA4.trackBeginCheckout(items, value);
  FB.trackFBInitiateCheckout(items, value);
}

/**
 * Track purchase (Purchase / purchase) - CRITICAL FOR CONVERSIONS
 */
export function trackPurchase(order: {
  id: string;
  total: number;
  subtotal: number;
  shipping: number;
  tax?: number;
  items: any[];
}) {
  GA4.trackPurchase(order);
  FB.trackFBPurchase(order);
}

/**
 * Track search
 */
export function trackSearch(searchTerm: string) {
  GA4.trackSearch(searchTerm);
  FB.trackFBSearch(searchTerm);
}

/**
 * Track lead generation (newsletter signup, contact form)
 */
export function trackLead(value?: number) {
  GA4.trackNewsletterSignup('');
  FB.trackFBLead(value);
}

/**
 * Track user registration
 */
export function trackUserRegistration(method: string = 'email') {
  GA4.trackUserRegistration(method);
}

/**
 * Track design customization started (custom event)
 */
export function trackCustomizeProduct(productName: string) {
  GA4.trackDesignCreated(productName);
  FB.trackFBCustomizeProduct(productName);
}

/**
 * Track design sharing (custom event)
 */
export function trackShareDesign(productName: string, method: string = 'link') {
  GA4.trackDesignShared(productName, method);
  FB.trackFBShareDesign(productName);
}

/**
 * Track custom event (advanced use)
 */
export function trackCustomEvent(
  eventName: string,
  parameters?: Record<string, any>
) {
  GA4.trackCustomEvent(eventName, parameters);
  FB.trackFBCustomEvent(eventName, parameters);
}
