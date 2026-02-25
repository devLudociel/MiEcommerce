// src/lib/analytics/metaConversions.ts
import { createHash } from 'crypto';
import type { OrderData, OrderItem } from '../../types/firebase';
import { createScopedLogger } from '../utils/apiLogger';

const logger = createScopedLogger('meta-capi');

const META_API_VERSION = 'v21.0';
const DEFAULT_CURRENCY = 'EUR';

type StringMap = Record<string, string>;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function normalize(
  value: string,
  options?: { digitsOnly?: boolean; lower?: boolean }
): string | null {
  if (!value) return null;
  let normalized = value.trim();
  if (!normalized) return null;
  if (options?.digitsOnly) {
    normalized = normalized.replace(/\D+/g, '');
  }
  if (options?.lower !== false) {
    normalized = normalized.toLowerCase();
  }
  return normalized || null;
}

function hashField(value?: string, options?: { digitsOnly?: boolean; lower?: boolean }): string | null {
  if (!value) return null;
  const normalized = normalize(value, options);
  if (!normalized) return null;
  return sha256(normalized);
}

function addHashedField(
  target: StringMap,
  key: string,
  value?: string,
  options?: { digitsOnly?: boolean; lower?: boolean }
) {
  const hashed = hashField(value, options);
  if (hashed) {
    target[key] = hashed;
  }
}

function buildContents(items: OrderItem[]): Array<{ id: string; quantity: number; item_price?: number }> {
  const contents: Array<{ id: string; quantity: number; item_price?: number }> = [];

  for (const item of items) {
    const id = String(item.productId || '').trim();
    if (!id) continue;
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const unitPrice =
      Number.isFinite(Number(item.unitPrice)) && Number(item.unitPrice) > 0
        ? Number(item.unitPrice)
        : Number.isFinite(Number(item.totalPrice)) && Number(item.totalPrice) > 0
          ? Number(item.totalPrice) / quantity
          : undefined;

    const content: { id: string; quantity: number; item_price?: number } = { id, quantity };
    if (Number.isFinite(unitPrice)) {
      content.item_price = Number(unitPrice);
    }
    contents.push(content);
  }

  return contents;
}

function buildUserData(order: OrderData, orderId: string, context?: EventContext): StringMap | null {
  const shipping = order.shippingInfo;
  if (!shipping) return null;

  const userData: StringMap = {};

  addHashedField(userData, 'em', shipping.email);
  addHashedField(userData, 'ph', shipping.phone, { digitsOnly: true });
  addHashedField(userData, 'fn', shipping.firstName);
  addHashedField(userData, 'ln', shipping.lastName);
  addHashedField(userData, 'ct', shipping.city);
  addHashedField(userData, 'st', shipping.state);
  addHashedField(userData, 'zp', shipping.zipCode, { digitsOnly: true });
  addHashedField(userData, 'country', shipping.country);

  const externalIdSource = order.userId || orderId;
  addHashedField(userData, 'external_id', externalIdSource);

  // Add fbc/fbp cookies for browser-server event matching (not hashed per Meta docs)
  const fbc = context?.fbc || (order as Record<string, unknown>).fbc;
  const fbp = context?.fbp || (order as Record<string, unknown>).fbp;
  if (typeof fbc === 'string' && fbc) {
    userData.fbc = fbc;
  }
  if (typeof fbp === 'string' && fbp) {
    userData.fbp = fbp;
  }

  // Add client IP and user agent for improved matching
  if (context?.clientIpAddress) {
    userData.client_ip_address = context.clientIpAddress;
  }
  if (context?.clientUserAgent) {
    userData.client_user_agent = context.clientUserAgent;
  }

  return Object.keys(userData).length ? userData : null;
}

/** Optional context from the original HTTP request for better event matching */
export interface EventContext {
  /** Facebook click ID cookie (_fbc) */
  fbc?: string;
  /** Facebook browser ID cookie (_fbp) */
  fbp?: string;
  /** Client IP address from the original checkout request */
  clientIpAddress?: string;
  /** Client User-Agent from the original checkout request */
  clientUserAgent?: string;
  /** URL of the page where the event originated */
  eventSourceUrl?: string;
}

export async function sendMetaPurchaseEvent(params: {
  order: OrderData;
  orderId: string;
  eventId?: string;
  testEventCode?: string;
  context?: EventContext;
}) {
  const pixelId = import.meta.env.PUBLIC_FACEBOOK_PIXEL_ID;
  const accessToken = import.meta.env.META_CONVERSIONS_API_TOKEN;

  if (!pixelId || !accessToken) {
    logger.debug('[Meta CAPI] Missing pixel ID or access token. Skipping.');
    return;
  }

  const { order, orderId, context } = params;
  const userData = buildUserData(order, orderId, context);

  if (!userData) {
    logger.warn('[Meta CAPI] Missing user data. Skipping event.', { orderId });
    return;
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const contents = buildContents(items);
  const numItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const eventId = params.eventId || orderId;
  const event: Record<string, unknown> = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'website',
    user_data: userData,
    custom_data: {
      currency: DEFAULT_CURRENCY,
      value: Number(order.total) || 0,
      content_type: 'product',
      contents,
      num_items: numItems,
      order_id: orderId,
    },
  };

  // Add event_source_url if available
  const sourceUrl = context?.eventSourceUrl || (order as Record<string, unknown>).checkoutUrl;
  if (typeof sourceUrl === 'string' && sourceUrl) {
    event.event_source_url = sourceUrl;
  }

  const payload: Record<string, unknown> = {
    data: [event],
    access_token: accessToken,
  };

  // Only add test_event_code if explicitly passed (not from env by default)
  if (params.testEventCode) {
    payload.test_event_code = params.testEventCode;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      logger.warn('[Meta CAPI] Request failed', {
        status: response.status,
        body,
        orderId,
      });
      return;
    }

    logger.info('[Meta CAPI] Purchase event sent', {
      orderId,
      eventsReceived: body?.events_received,
      fbTraceId: body?.fbtrace_id,
    });
  } catch (error) {
    logger.warn('[Meta CAPI] Request error', { orderId, error });
  } finally {
    clearTimeout(timeout);
  }
}
