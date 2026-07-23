import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initGA4, trackBeginCheckout, trackPurchase } from './ga4';

describe('GA4 critical ecommerce events', () => {
  beforeEach(() => {
    delete window.gtag;
    delete window.dataLayer;
    vi.spyOn(document.head, 'appendChild').mockImplementation((node) => node);
  });

  afterEach(() => {
    document
      .querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')
      .forEach((script) => script.remove());
  });

  it('reports that checkout and purchase were not tracked before GA4 is ready', () => {
    expect(
      trackBeginCheckout([{ id: 'product-1', name: 'Producto', price: 10, quantity: 1 }], 10)
    ).toBe(false);

    expect(
      trackPurchase({
        id: 'order-1',
        total: 10,
        subtotal: 10,
        shipping: 0,
        items: [{ id: 'product-1', name: 'Producto', price: 10, quantity: 1 }],
      })
    ).toBe(false);
  });

  it('reports success and queues critical events after GA4 initialization', () => {
    initGA4('G-TEST123456');

    expect(
      trackBeginCheckout([{ id: 'product-1', name: 'Producto', price: 10, quantity: 1 }], 10)
    ).toBe(true);

    expect(
      trackPurchase({
        id: 'order-1',
        total: 10,
        subtotal: 10,
        shipping: 0,
        items: [{ id: 'product-1', name: 'Producto', price: 10, quantity: 1 }],
      })
    ).toBe(true);

    expect(window.dataLayer).toHaveLength(4);
  });
});
