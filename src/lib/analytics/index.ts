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
export function initAnalytics(config: { ga4MeasurementId?: string; facebookPixelId?: string }) {
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
  slug?: string;
  productSlug?: string;
  name: string;
  price?: number;
  basePrice?: number;
  unitPrice?: number;
  category?: string;
  brand?: string;
}) {
  GA4.trackProductView({
    ...product,
    price: product.price ?? product.unitPrice ?? product.basePrice ?? 0,
  });
  FB.trackFBProductView(product);
}

/**
 * Track add to cart (AddToCart / add_to_cart)
 */
export function trackAddToCart(product: {
  id: string;
  slug?: string;
  productSlug?: string;
  name: string;
  price?: number;
  basePrice?: number;
  unitPrice?: number;
  quantity: number;
  category?: string;
}) {
  GA4.trackAddToCart({
    ...product,
    price: product.price ?? product.unitPrice ?? product.basePrice ?? 0,
  });
  FB.trackFBAddToCart(product);
}

// Shared analytics item type
interface AnalyticsItem {
  id?: string;
  productId?: string;
  slug?: string;
  productSlug?: string;
  name?: string;
  category?: string;
  price?: number;
  basePrice?: number;
  unitPrice?: number;
  item_price?: number;
  quantity?: number;
}

/**
 * Track checkout initiation (InitiateCheckout / begin_checkout)
 */
export function trackBeginCheckout(items: AnalyticsItem[], value: number) {
  GA4.trackBeginCheckout(
    items.map((item) => ({
      ...item,
      quantity: item.quantity ?? 1,
    })),
    value
  );
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
  items: AnalyticsItem[];
}) {
  GA4.trackPurchase({
    ...order,
    items: order.items.map((item) => ({
      ...item,
      quantity: item.quantity ?? 1,
    })),
  });
  FB.trackFBPurchase(order, order.id);
}

/**
 * Track search
 */
export function trackSearch(searchTerm: string, results: AnalyticsItem[] = []) {
  GA4.trackSearch(searchTerm);
  FB.trackFBSearch(searchTerm, results);
}

/**
 * Track lead generation (newsletter signup, contact form)
 */
export function trackLead(
  payload?:
    | number
    | {
        content_name?: string;
        value?: number;
        product?: AnalyticsItem;
        quantity?: number;
        unitPrice?: number;
      }
) {
  GA4.trackNewsletterSignup('');
  FB.trackFBLead(payload);
}

/**
 * Track contact intent (WhatsApp, phone, email, contact button)
 */
export function trackContact(payload?: {
  content_name?: string;
  value?: number;
  product?: AnalyticsItem;
}) {
  FB.trackFBContact(payload);
}

/**
 * Track user registration
 */
export function trackUserRegistration(method: string = 'email') {
  GA4.trackUserRegistration(method);
}

/**
 * Track completed registration in Meta Pixel
 */
export function trackCompleteRegistration(method: string = 'email') {
  GA4.trackUserRegistration(method);
  FB.trackFBCompleteRegistration();
}

/**
 * Track design customization started (custom event)
 */
export function trackCustomizeProduct(
  product:
    | string
    | {
        id?: string;
        slug?: string;
        productSlug?: string;
        name?: string;
        price?: number;
        basePrice?: number;
        unitPrice?: number;
        quantity?: number;
        category?: string;
      },
  quantity = 1,
  unitPrice?: number
) {
  const productName = typeof product === 'string' ? product : product.name || product.slug || product.id || '';
  GA4.trackDesignCreated(productName);
  FB.trackFBCustomizeProduct(product, quantity, unitPrice);
}

/**
 * Track payment step after Stripe PaymentIntent creation
 */
export function trackAddPaymentInfo(items: AnalyticsItem[], value?: number) {
  FB.trackFBAddPaymentInfo(items, value);
}

/**
 * Track add to wishlist
 */
export function trackAddToWishlist(product: AnalyticsItem) {
  FB.trackFBAddToWishlist(product);
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
export function trackCustomEvent(eventName: string, parameters?: Record<string, any>) {
  GA4.trackCustomEvent(eventName, parameters);
  FB.trackFBCustomEvent(eventName, parameters);
}
