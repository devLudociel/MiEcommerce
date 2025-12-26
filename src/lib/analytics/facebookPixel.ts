// src/lib/analytics/facebookPixel.ts

/**
 * Facebook Pixel Integration
 *
 * Implements tracking for:
 * - Page views
 * - View content (product views)
 * - Add to cart
 * - Initiate checkout
 * - Purchase
 * - Custom events
 */

// Types for analytics items
interface AnalyticsItem {
  id?: string;
  productId?: string;
  name?: string;
  quantity: number;
  price?: number;
}

// Facebook Pixel function type
type FbqFunction = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  push?: FbqFunction;
  loaded?: boolean;
  version?: string;
};

// Extend Window interface for Facebook Pixel
declare global {
  interface Window {
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
  }
}

/**
 * Initialize Facebook Pixel
 */
export function initFacebookPixel(pixelId: string) {
  if (typeof window === 'undefined') return;

  // Create fbq function
  const fbq: FbqFunction = function (...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      fbq.queue?.push(args);
    }
  };

  if (!window.fbq) {
    window.fbq = fbq;
  }

  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];

  // Initialize pixel
  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');

  console.log('[FB Pixel] Initialized with ID:', pixelId);
}

/**
 * Track page view
 */
export function trackFBPageView() {
  if (!window.fbq) return;

  window.fbq('track', 'PageView');

  console.log('[FB Pixel] Page view');
}

/**
 * Track product view (ViewContent)
 */
export function trackFBProductView(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
}) {
  if (!window.fbq) return;

  window.fbq('track', 'ViewContent', {
    content_ids: [product.id],
    content_type: 'product',
    content_name: product.name,
    content_category: product.category || 'General',
    value: product.price,
    currency: 'EUR',
  });

  console.log('[FB Pixel] View content:', product.name);
}

/**
 * Track add to cart (AddToCart)
 */
export function trackFBAddToCart(product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}) {
  if (!window.fbq) return;

  window.fbq('track', 'AddToCart', {
    content_ids: [product.id],
    content_type: 'product',
    content_name: product.name,
    content_category: product.category || 'General',
    value: product.price * product.quantity,
    currency: 'EUR',
  });

  console.log('[FB Pixel] Add to cart:', product.name);
}

/**
 * Track initiate checkout (InitiateCheckout)
 */
export function trackFBInitiateCheckout(items: AnalyticsItem[], value: number) {
  if (!window.fbq) return;

  window.fbq('track', 'InitiateCheckout', {
    content_ids: items.map((item) => item.id),
    content_type: 'product',
    value: value,
    currency: 'EUR',
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
  });

  console.log('[FB Pixel] Initiate checkout:', value);
}

/**
 * Track purchase (Purchase) - CRITICAL FOR CONVERSIONS
 */
export function trackFBPurchase(order: { id: string; total: number; items: AnalyticsItem[] }) {
  if (!window.fbq) return;

  window.fbq('track', 'Purchase', {
    content_ids: order.items.map((item) => item.id || item.productId),
    content_type: 'product',
    value: order.total,
    currency: 'EUR',
    num_items: order.items.reduce((sum, item) => sum + item.quantity, 0),
  });

  console.log('[FB Pixel] Purchase:', order.id, order.total);
}

/**
 * Track search
 */
export function trackFBSearch(searchTerm: string) {
  if (!window.fbq) return;

  window.fbq('track', 'Search', {
    search_string: searchTerm,
  });

  console.log('[FB Pixel] Search:', searchTerm);
}

/**
 * Track lead (newsletter signup, contact form)
 */
export function trackFBLead(value?: number) {
  if (!window.fbq) return;

  window.fbq('track', 'Lead', {
    value: value || 0,
    currency: 'EUR',
  });

  console.log('[FB Pixel] Lead generated');
}

/**
 * Track custom event
 */
export function trackFBCustomEvent(eventName: string, parameters?: Record<string, any>) {
  if (!window.fbq) return;

  window.fbq('trackCustom', eventName, parameters);

  console.log('[FB Pixel] Custom event:', eventName, parameters);
}

/**
 * Track design customization started
 */
export function trackFBCustomizeProduct(productName: string) {
  if (!window.fbq) return;

  window.fbq('trackCustom', 'CustomizeProduct', {
    product_name: productName,
  });

  console.log('[FB Pixel] Customize product:', productName);
}

/**
 * Track design sharing
 */
export function trackFBShareDesign(productName: string) {
  if (!window.fbq) return;

  window.fbq('trackCustom', 'ShareDesign', {
    product_name: productName,
  });

  console.log('[FB Pixel] Share design:', productName);
}
