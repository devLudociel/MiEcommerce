import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Firebase to avoid invalid API key error in tests
vi.mock('../../lib/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}));

// Mocks mínimos para logger y notificaciones para no tocar el DOM ni consola
vi.mock('../../lib/notifications', () => ({
  notify: {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    promise: vi.fn(),
    dismiss: vi.fn(),
    dismissAll: vi.fn(),
    remove: vi.fn(),
  },
  Toaster: {},
}));
vi.mock('../../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    group: vi.fn(),
    groupCollapsed: vi.fn(),
    time: vi.fn(),
    timeEnd: vi.fn(),
    table: vi.fn(),
    trace: vi.fn(),
  },
  LogLevel: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, NONE: 4 },
  setLogLevel: vi.fn(),
  configureLogger: vi.fn(),
}));

// helper localStorage mock
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

describe('cartStore', () => {
  beforeEach(async () => {
    vi.resetModules();
    // stub window/localStorage antes de importar el módulo
    (globalThis as any).window = {};
    (globalThis as any).localStorage = createLocalStorageMock();
  });

  it('agrega y acumula items correctamente', async () => {
    const mod = await import('../cartStore');
    const { addToCart, cartStore } = mod;

    addToCart({ id: 'p1', name: 'Prod 1', price: 10, quantity: 1, image: 'x.jpg' });
    addToCart({ id: 'p1', name: 'Prod 1', price: 10, quantity: 2, image: 'x.jpg' });

    const state = cartStore.get();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(3);
    expect(state.total).toBe(30);
  });

  it('actualiza cantidad, elimina y limpia', async () => {
    const mod = await import('../cartStore');
    const {
      addToCart,
      updateCartItemQuantity,
      removeFromCart,
      clearCart,
      cartStore,
      isInCart,
      getCartItemCount,
    } = mod;

    addToCart({ id: 'p1', name: 'Prod 1', price: 5, quantity: 2, image: 'x.jpg' });
    addToCart({ id: 'p2', name: 'Prod 2', price: 3, quantity: 1, image: 'y.jpg', variantId: 1 });

    expect(getCartItemCount()).toBe(3);
    expect(isInCart('p2', 1)).toBe(true);

    updateCartItemQuantity('p1', undefined, 5);
    expect(cartStore.get().total).toBe(5 * 5 + 3 * 1);

    removeFromCart('p2', 1);
    expect(isInCart('p2', 1)).toBe(false);

    clearCart();
    expect(getCartItemCount()).toBe(0);
    expect(cartStore.get().total).toBe(0);
  });
});
