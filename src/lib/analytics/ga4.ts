// src/lib/analytics/ga4.ts

/**
 * Google Analytics 4 (GA4) Integration
 *
 * Implements enhanced ecommerce tracking for:
 * - Product views
 * - Add to cart
 * - Begin checkout
 * - Purchase
 * - Custom events (design sharing, etc.)
 */

// Extend Window interface for gtag
declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Initialize GA4 tracking
 */
export function initGA4(measurementId: string) {
  if (typeof window === 'undefined') return;

  // Create dataLayer
  window.dataLayer = window.dataLayer || [];

  // gtag function
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments);
  };

  // Initialize
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: true,
  });

  console.log('[GA4] Initialized with ID:', measurementId);
}

/**
 * Track page view
 */
export function trackPageView(url: string, title?: string) {
  if (!window.gtag) return;

  window.gtag('event', 'page_view', {
    page_path: url,
    page_title: title || document.title,
  });

  console.log('[GA4] Page view:', url);
}

/**
 * Track product view (view_item)
 */
export function trackProductView(product: {
  id: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
}) {
  if (!window.gtag) return;

  window.gtag('event', 'view_item', {
    currency: 'EUR',
    value: product.price,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category || 'General',
        item_brand: product.brand || 'ImprimeArte',
        price: product.price,
      },
    ],
  });

  console.log('[GA4] Product view:', product.name);
}

/**
 * Track add to cart (add_to_cart)
 */
export function trackAddToCart(product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}) {
  if (!window.gtag) return;

  window.gtag('event', 'add_to_cart', {
    currency: 'EUR',
    value: product.price * product.quantity,
    items: [
      {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category || 'General',
        price: product.price,
        quantity: product.quantity,
      },
    ],
  });

  console.log('[GA4] Add to cart:', product.name);
}

/**
 * Track begin checkout (begin_checkout)
 */
export function trackBeginCheckout(items: any[], value: number) {
  if (!window.gtag) return;

  window.gtag('event', 'begin_checkout', {
    currency: 'EUR',
    value: value,
    items: items.map((item) => ({
      item_id: item.id,
      item_name: item.name,
      item_category: item.category || 'General',
      price: item.price,
      quantity: item.quantity,
    })),
  });

  console.log('[GA4] Begin checkout:', value);
}

/**
 * Track purchase (purchase) - CRITICAL FOR ECOMMERCE
 */
export function trackPurchase(order: {
  id: string;
  total: number;
  subtotal: number;
  shipping: number;
  tax?: number;
  items: any[];
}) {
  if (!window.gtag) return;

  window.gtag('event', 'purchase', {
    transaction_id: order.id,
    value: order.total,
    currency: 'EUR',
    tax: order.tax || 0,
    shipping: order.shipping,
    items: order.items.map((item) => ({
      item_id: item.id || item.productId,
      item_name: item.name,
      item_category: item.category || 'General',
      price: item.price,
      quantity: item.quantity,
    })),
  });

  console.log('[GA4] Purchase:', order.id, order.total);
}

/**
 * Track custom design creation
 */
export function trackDesignCreated(productName: string) {
  if (!window.gtag) return;

  window.gtag('event', 'design_created', {
    event_category: 'engagement',
    event_label: productName,
  });

  console.log('[GA4] Design created:', productName);
}

/**
 * Track design sharing
 */
export function trackDesignShared(productName: string, method: string = 'link') {
  if (!window.gtag) return;

  window.gtag('event', 'share', {
    method: method,
    content_type: 'design',
    item_id: productName,
  });

  console.log('[GA4] Design shared:', productName, method);
}

/**
 * Track search
 */
export function trackSearch(searchTerm: string) {
  if (!window.gtag) return;

  window.gtag('event', 'search', {
    search_term: searchTerm,
  });

  console.log('[GA4] Search:', searchTerm);
}

/**
 * Track newsletter signup
 */
export function trackNewsletterSignup(email: string) {
  if (!window.gtag) return;

  window.gtag('event', 'sign_up', {
    method: 'newsletter',
  });

  console.log('[GA4] Newsletter signup');
}

/**
 * Track user registration
 */
export function trackUserRegistration(method: string = 'email') {
  if (!window.gtag) return;

  window.gtag('event', 'sign_up', {
    method: method,
  });

  console.log('[GA4] User registration:', method);
}

/**
 * Track custom event
 */
export function trackCustomEvent(
  eventName: string,
  parameters?: Record<string, any>
) {
  if (!window.gtag) return;

  window.gtag('event', eventName, parameters);

  console.log('[GA4] Custom event:', eventName, parameters);
}
