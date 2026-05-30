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
  slug?: string;
  productSlug?: string;
  name?: string;
  quantity: number;
  price?: number;
  unitPrice?: number;
  item_price?: number;
  category?: string;
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

function toNonEmptyString(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

function getCatalogContentId(item: {
  slug?: string;
  productSlug?: string;
  id?: string;
  productId?: string;
}): string | null {
  return (
    toNonEmptyString(item.slug) ||
    toNonEmptyString(item.productSlug) ||
    toNonEmptyString(item.id) ||
    toNonEmptyString(item.productId)
  );
}

function toPositiveQuantity(value: unknown): number {
  const quantity = Number(value ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function toPrice(value: unknown): number {
  const price = Number(value ?? 0);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

function toMetaValue(value: number): number {
  return Number(value.toFixed(2));
}

function toMetaContent(item: AnalyticsItem) {
  const id = getCatalogContentId(item);
  if (!id) return null;

  const quantity = toPositiveQuantity(item.quantity);
  const itemPrice = toPrice(item.unitPrice ?? item.item_price ?? item.price);

  return {
    id,
    quantity,
    item_price: itemPrice,
  };
}

/**
 * Initialize Facebook Pixel
 */
export function initFacebookPixel(pixelId: string) {
  if (typeof window === 'undefined') return;

  // Create fbq function
  const existingFbq = window.fbq;
  const fbq: FbqFunction =
    existingFbq ||
    function (...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue?.push(args);
      }
    };

  if (!window.fbq) window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;

  if (!existingFbq) {
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];

    const scriptId = 'facebook-pixel-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript?.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    }
  }

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
  slug?: string;
  productSlug?: string;
  name: string;
  price: number;
  category?: string;
}) {
  if (!window.fbq) return;

  const contentId = getCatalogContentId(product);
  if (!contentId) return;

  const itemPrice = toPrice(product.price);

  window.fbq('track', 'ViewContent', {
    content_ids: [contentId],
    content_type: 'product',
    contents: [
      {
        id: contentId,
        quantity: 1,
        item_price: itemPrice,
      },
    ],
    content_name: product.name,
    content_category: product.category || 'General',
    value: itemPrice,
    currency: 'EUR',
  });

  console.log('[FB Pixel] View content:', product.name);
}

/**
 * Track add to cart (AddToCart)
 */
export function trackFBAddToCart(product: {
  id: string;
  slug?: string;
  productSlug?: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}) {
  if (!window.fbq) return;

  const contentId = getCatalogContentId(product);
  if (!contentId) return;

  const quantity = toPositiveQuantity(product.quantity);
  const itemPrice = toPrice(product.price);

  window.fbq('track', 'AddToCart', {
    content_ids: [contentId],
    content_type: 'product',
    contents: [
      {
        id: contentId,
        quantity,
        item_price: itemPrice,
      },
    ],
    content_name: product.name,
    content_category: product.category || 'General',
    value: toMetaValue(itemPrice * quantity),
    currency: 'EUR',
  });

  console.log('[FB Pixel] Add to cart:', product.name);
}

/**
 * Track initiate checkout (InitiateCheckout)
 */
export function trackFBInitiateCheckout(items: AnalyticsItem[], value: number) {
  if (!window.fbq) return;

  const contents = items
    .map((item) => toMetaContent(item))
    .filter((content): content is NonNullable<ReturnType<typeof toMetaContent>> =>
      Boolean(content)
    );

  if (contents.length === 0) return;

  const checkoutValue = contents.reduce(
    (sum, item) => sum + item.item_price * item.quantity,
    0
  );

  window.fbq('track', 'InitiateCheckout', {
    content_ids: contents.map((item) => item.id),
    content_type: 'product',
    contents,
    value: toMetaValue(checkoutValue || value),
    currency: 'EUR',
    num_items: contents.reduce((sum, item) => sum + item.quantity, 0),
  });

  console.log('[FB Pixel] Initiate checkout:', checkoutValue || value);
}

/**
 * Track purchase (Purchase) - CRITICAL FOR CONVERSIONS
 */
export function trackFBPurchase(
  order: { id: string; total: number; items: AnalyticsItem[] },
  eventId?: string
) {
  if (!window.fbq) return;

  const contents = order.items
    .map((item) => toMetaContent(item))
    .filter((content): content is NonNullable<ReturnType<typeof toMetaContent>> =>
      Boolean(content)
    );

  const params = {
    content_ids: contents.map((item) => item.id),
    content_type: 'product',
    contents,
    value: order.total,
    currency: 'EUR',
    num_items: contents.reduce((sum, item) => sum + item.quantity, 0),
  };

  if (eventId) {
    window.fbq('track', 'Purchase', params, { eventID: eventId });
  } else {
    window.fbq('track', 'Purchase', params);
  }

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
