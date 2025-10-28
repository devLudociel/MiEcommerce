import { describe, it, expect, beforeEach, vi } from 'vitest';

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  } as any;
}

describe('wishlistStore', () => {
  beforeEach(() => {
    vi.resetModules();
    const listeners: Record<string, Function[]> = {};
    (globalThis as any).window = {
      addEventListener: vi.fn((evt: string, cb: any) => {
        listeners[evt] = listeners[evt] || [];
        listeners[evt].push(cb);
      }),
      removeEventListener: vi.fn((evt: string, cb: any) => {
        listeners[evt] = (listeners[evt] || []).filter((fn) => fn !== cb);
      }),
      dispatchEvent: vi.fn((e: any) => {
        const cbs = listeners[e?.type] || [];
        cbs.forEach((fn) => fn(e));
        return true;
      }),
    };
    (globalThis as any).localStorage = createLocalStorageMock();
    (globalThis as any).CustomEvent = function (type: string) {
      return { type } as any;
    } as any;
  });

  it('agrega, alterna y limpia elementos', async () => {
    const mod = await import('../wishlistStore');
    const { getWishlist, toggleWishlist, removeFromWishlist, clearWishlist } = mod;

    expect(getWishlist()).toEqual([]);
    toggleWishlist({ id: 'p1', name: 'Prod 1' });
    expect(getWishlist()).toEqual([{ id: 'p1', name: 'Prod 1' }]);

    // alterna quita
    toggleWishlist({ id: 'p1', name: 'Prod 1' });
    expect(getWishlist()).toEqual([]);

    // agrega dos y remueve uno
    toggleWishlist({ id: 'p1', name: 'Prod 1' });
    toggleWishlist({ id: 'p2', name: 'Prod 2' });
    removeFromWishlist('p1');
    expect(getWishlist()).toEqual([{ id: 'p2', name: 'Prod 2' }]);

    clearWishlist();
    expect(getWishlist()).toEqual([]);
  });
});

