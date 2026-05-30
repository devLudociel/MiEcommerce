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
  quantity?: number;
  price?: number;
  basePrice?: number;
  unitPrice?: number;
  item_price?: number;
  category?: string;
}

type MetaContent = {
  id: string;
  quantity: number;
  item_price: number;
};

type ProductEventInput = AnalyticsItem & {
  name?: string;
};

type ProductPayloadInput = ProductEventInput | string;

type LeadPayload =
  | number
  | {
      content_name?: string;
      value?: number;
      product?: ProductEventInput;
      quantity?: number;
      unitPrice?: number;
    };

type ContactPayload = {
  content_name?: string;
  value?: number;
  product?: ProductEventInput;
};

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

function hasFbq(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
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
  const itemPrice = toPrice(item.unitPrice ?? item.item_price ?? item.price ?? item.basePrice);

  return {
    id,
    quantity,
    item_price: itemPrice,
  };
}

function buildContents(items: AnalyticsItem[]) {
  return items
    .map((item) => toMetaContent(item))
    .filter((content): content is NonNullable<ReturnType<typeof toMetaContent>> =>
      Boolean(content)
    );
}

function contentsValue(contents: MetaContent[]): number {
  return toMetaValue(
    contents.reduce((sum, item) => sum + item.item_price * item.quantity, 0)
  );
}

function contentsNumItems(contents: Array<{ quantity: number }>): number {
  return contents.reduce((sum, item) => sum + item.quantity, 0);
}

function buildSingleContent(
  product: ProductEventInput,
  quantity = 1,
  unitPrice?: number
): MetaContent | null {
  return toMetaContent({
    ...product,
    quantity,
    unitPrice: unitPrice ?? product.unitPrice,
  });
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
  if (!hasFbq()) return;

  window.fbq!('track', 'PageView');

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
  price?: number;
  basePrice?: number;
  unitPrice?: number;
  category?: string;
}) {
  if (!hasFbq()) return;

  const content = buildSingleContent(product, 1);
  if (!content) return;

  window.fbq!('track', 'ViewContent', {
    content_ids: [content.id],
    content_type: 'product',
    contents: [content],
    content_name: product.name,
    content_category: product.category || 'General',
    value: content.item_price,
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
  price?: number;
  basePrice?: number;
  unitPrice?: number;
  quantity: number;
  category?: string;
}) {
  if (!hasFbq()) return;

  const content = buildSingleContent(product, product.quantity);
  if (!content) return;

  window.fbq!('track', 'AddToCart', {
    content_ids: [content.id],
    content_type: 'product',
    contents: [content],
    content_name: product.name,
    content_category: product.category || 'General',
    value: toMetaValue(content.item_price * content.quantity),
    currency: 'EUR',
  });

  console.log('[FB Pixel] Add to cart:', product.name);
}

/**
 * Track initiate checkout (InitiateCheckout)
 */
export function trackFBInitiateCheckout(items: AnalyticsItem[], value: number) {
  if (!hasFbq()) return;

  const contents = buildContents(items);

  if (contents.length === 0) return;

  const checkoutValue = contentsValue(contents);

  window.fbq!('track', 'InitiateCheckout', {
    content_ids: contents.map((item) => item.id),
    content_type: 'product',
    contents,
    value: checkoutValue || toMetaValue(value),
    currency: 'EUR',
    num_items: contentsNumItems(contents),
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
  if (!hasFbq()) return;

  const contents = buildContents(order.items);
  if (contents.length === 0) return;

  const params = {
    content_ids: contents.map((item) => item.id),
    content_type: 'product',
    contents,
    value: toMetaValue(order.total),
    currency: 'EUR',
    num_items: contentsNumItems(contents),
    order_id: order.id,
  };

  if (eventId) {
    window.fbq!('track', 'Purchase', params, { eventID: eventId });
  } else {
    window.fbq!('track', 'Purchase', params);
  }

  console.log('[FB Pixel] Purchase:', order.id, order.total);
}

/**
 * Track search
 */
export function trackFBSearch(searchTerm: string, results: AnalyticsItem[] = []) {
  const query = searchTerm.trim();
  if (!query || !hasFbq()) return;

  const contents = buildContents(results).slice(0, 10);
  const params: Record<string, unknown> = {
    search_string: query,
    content_type: 'product',
  };

  if (contents.length > 0) {
    params.content_ids = contents.map((item) => item.id);
    params.contents = contents;
    params.currency = 'EUR';
    params.value = 0;
  }

  window.fbq!('track', 'Search', params);

  console.log('[FB Pixel] Search:', query);
}

/**
 * Track lead (newsletter signup, contact form)
 */
export function trackFBLead(payload?: LeadPayload) {
  if (!hasFbq()) return;

  const params: Record<string, unknown> = {
    value: 0,
    currency: 'EUR',
  };

  if (typeof payload === 'number') {
    params.value = toMetaValue(payload);
  } else if (payload) {
    if (payload.content_name) params.content_name = payload.content_name;
    params.value = toMetaValue(toPrice(payload.value));

    if (payload.product) {
      const content = buildSingleContent(
        payload.product,
        payload.quantity ?? payload.product.quantity ?? 1,
        payload.unitPrice
      );
      if (content) {
        params.content_ids = [content.id];
        params.content_type = 'product';
        params.contents = [content];
        params.value = contentsValue([content]);
        if (!params.content_name && payload.product.name) {
          params.content_name = payload.product.name;
        }
      }
    }
  }

  window.fbq!('track', 'Lead', params);

  console.log('[FB Pixel] Lead generated');
}

/**
 * Track contact intent
 */
export function trackFBContact(payload?: ContactPayload) {
  if (!hasFbq()) return;

  const params: Record<string, unknown> = {};
  if (payload?.content_name) params.content_name = payload.content_name;
  if (typeof payload?.value === 'number') {
    params.value = toMetaValue(payload.value);
    params.currency = 'EUR';
  }

  if (payload?.product) {
    const content = buildSingleContent(payload.product, 1);
    if (content) {
      params.content_ids = [content.id];
      params.content_type = 'product';
      params.content_name = payload.product.name || payload.content_name;
      params.value = content.item_price;
      params.currency = 'EUR';
    }
  }

  window.fbq!('track', 'Contact', params);

  console.log('[FB Pixel] Contact:', params);
}

/**
 * Track payment info added after a PaymentIntent is created
 */
export function trackFBAddPaymentInfo(items: AnalyticsItem[], value?: number) {
  if (!hasFbq()) return;

  const contents = buildContents(items);
  if (contents.length === 0) return;

  window.fbq!('track', 'AddPaymentInfo', {
    content_ids: contents.map((item) => item.id),
    content_type: 'product',
    contents,
    value: toMetaValue(value ?? contentsValue(contents)),
    currency: 'EUR',
  });

  console.log('[FB Pixel] Add payment info');
}

/**
 * Track user registration
 */
export function trackFBCompleteRegistration() {
  if (!hasFbq()) return;

  window.fbq!('track', 'CompleteRegistration', {
    content_name: 'Registro de usuario',
    status: 'completed',
    currency: 'EUR',
    value: 0,
  });

  console.log('[FB Pixel] Complete registration');
}

/**
 * Track add to wishlist
 */
export function trackFBAddToWishlist(product: ProductEventInput) {
  if (!hasFbq()) return;

  const content = buildSingleContent(product, 1);
  if (!content) return;

  window.fbq!('track', 'AddToWishlist', {
    content_ids: [content.id],
    content_type: 'product',
    contents: [content],
    content_name: product.name,
    content_category: product.category || 'General',
    value: content.item_price,
    currency: 'EUR',
  });

  console.log('[FB Pixel] Add to wishlist:', product.name);
}

/**
 * Track custom event
 */
export function trackFBCustomEvent(eventName: string, parameters?: Record<string, any>) {
  if (!hasFbq()) return;

  window.fbq!('trackCustom', eventName, parameters);

  console.log('[FB Pixel] Custom event:', eventName, parameters);
}

/**
 * Track design customization started
 */
export function trackFBCustomizeProduct(
  product: ProductPayloadInput,
  quantity = 1,
  unitPrice?: number
) {
  if (!hasFbq()) return;

  if (typeof product === 'string') {
    window.fbq!('track', 'CustomizeProduct', {
      content_name: product,
      currency: 'EUR',
      value: 0,
    });
    console.log('[FB Pixel] Customize product:', product);
    return;
  }

  const content = buildSingleContent(product, quantity, unitPrice);
  if (!content) return;

  window.fbq!('track', 'CustomizeProduct', {
    content_ids: [content.id],
    content_type: 'product',
    contents: [content],
    content_name: product.name,
    content_category: product.category || 'General',
    value: contentsValue([content]),
    currency: 'EUR',
  });

  console.log('[FB Pixel] Customize product:', product.name);
}

/**
 * Track design sharing
 */
export function trackFBShareDesign(productName: string) {
  if (!hasFbq()) return;

  window.fbq!('trackCustom', 'ShareDesign', {
    product_name: productName,
  });

  console.log('[FB Pixel] Share design:', productName);
}
