// src/store/cartStore.optimized.ts
// OPTIMIZED VERSION - Implementar estas mejoras en cartStore.ts

import { atom, computed } from 'nanostores';
import { useStore } from '@nanostores/react';
import { logger } from '../lib/logger';
import { notify } from '../lib/notifications';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { withRetry } from '../lib/resilience';
import { debounce } from '../lib/utils/debounce';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variantId?: number;
  variantName?: string;
  customization?: {
    customizationId?: string;
    uploadedImage?: string | null;
    text?: string;
    textColor?: string;
    textFont?: string;
    textSize?: number;
    backgroundColor?: string;
    selectedColor?: string;
    selectedSize?: string;
    selectedMaterial?: string;
    selectedFinish?: string;
    quantity?: number;
    position?: { x: number; y: number };
    rotation?: number;
    scale?: number;
    [key: string]: string | number | boolean | { x: number; y: number } | null | undefined;
  };
}

export interface CartState {
  items: CartItem[];
  total: number;
}

const CART_STORAGE_PREFIX = 'cart';
const CART_GUEST_KEY = `${CART_STORAGE_PREFIX}:guest`;

const getCartStorageKey = (userId?: string | null) =>
  userId ? `${CART_STORAGE_PREFIX}:${userId}` : CART_GUEST_KEY;

// Load cart from localStorage
const loadCartFromStorage = (userId?: string | null): CartState => {
  if (typeof window === 'undefined') {
    return { items: [], total: 0 };
  }

  const storageKey = getCartStorageKey(userId);

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        items: parsed.items || [],
        total: parsed.total || 0,
      };
    }
  } catch (e) {
    logger.error('[CartStore] Error loading cart from localStorage', {
      storageKey,
      error: e,
    });
  }

  return { items: [], total: 0 };
};

// Save cart to localStorage
const saveCartToStorage = (state: CartState, userId?: string | null): void => {
  if (typeof window === 'undefined') return;

  const storageKey = getCartStorageKey(userId);

  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    logger.debug('[CartStore] Cart saved to localStorage', {
      storageKey,
      itemCount: state.items.length,
      total: state.total,
    });
  } catch (e) {
    logger.error('[CartStore] Error saving cart to localStorage', {
      storageKey,
      error: e,
    });
    notify.warning('No se pudo guardar el carrito. Los cambios pueden perderse.');
  }
};

// Calculate cart total
const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
};

// ============================================
// OPTIMIZATION 1: Base Atom
// ============================================
const initialCartState = loadCartFromStorage();
export const cartStore = atom<CartState>(initialCartState);
export const cartLoadingStore = atom(false);

// ============================================
// OPTIMIZATION 2: Computed Stores (Granular)
// ============================================
// These prevent unnecessary re-renders by providing specific slices of state

/**
 * Computed store for total item count
 * Components using this will ONLY re-render when the count changes
 */
export const cartItemCount = computed(cartStore, (cart) =>
  cart.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0)
);

/**
 * Computed store for cart total
 * Components using this will ONLY re-render when the total changes
 */
export const cartTotal = computed(cartStore, (cart) => cart.total);

/**
 * Computed store for item IDs only
 * Useful for checking if a product is in cart without subscribing to full cart
 */
export const cartItemIds = computed(
  cartStore,
  (cart) => new Set(cart.items.map((item) => `${item.id}-${item.variantId || 'default'}`))
);

/**
 * Computed store for cart summary (for badges/minimal UI)
 */
export const cartSummary = computed(cartStore, (cart) => ({
  itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
  total: cart.total,
  isEmpty: cart.items.length === 0,
}));

// ============================================
// OPTIMIZATION 3: Optimized Hooks
// ============================================

/**
 * Hook for cart item count only
 * USE THIS in CartBadge, NavBar, etc. instead of useCart()
 */
export function useCartItemCount(): number {
  return useStore(cartItemCount);
}

/**
 * Hook for cart total only
 * USE THIS in cart summary components
 */
export function useCartTotal(): number {
  return useStore(cartTotal);
}

/**
 * Hook for cart summary (count + total)
 * USE THIS in minimal cart widgets
 */
export function useCartSummary(): { itemCount: number; total: number; isEmpty: boolean } {
  return useStore(cartSummary);
}

/**
 * Hook to check if a specific product is in cart
 * USE THIS in ProductCard instead of useCart()
 */
export function useIsInCart(productId: string, variantId?: number): boolean {
  const itemIds = useStore(cartItemIds);
  return itemIds.has(`${productId}-${variantId || 'default'}`);
}

/**
 * Hook for full cart state
 * ONLY USE THIS in components that need the full cart (CartPage, Checkout)
 */
export function useCart(): CartState {
  return useStore(cartStore);
}

/**
 * Hook for loading state
 */
export function useCartLoading(): boolean {
  return useStore(cartLoadingStore);
}

// ============================================
// Firestore & User Management (unchanged)
// ============================================
let currentUserId: string | null = null;
let activeCartSyncs = 0;

const beginCartSync = (): void => {
  activeCartSyncs += 1;
  if (activeCartSyncs === 1) {
    cartLoadingStore.set(true);
  }
};

const endCartSync = (): void => {
  activeCartSyncs = Math.max(0, activeCartSyncs - 1);
  if (activeCartSyncs === 0) {
    cartLoadingStore.set(false);
  }
};

const saveCartToFirestore = async (userId: string, state: CartState): Promise<void> => {
  try {
    await withRetry(
      async () => {
        const cartRef = doc(db, 'carts', userId);
        await setDoc(cartRef, {
          items: state.items,
          total: state.total,
          updatedAt: new Date(),
        });
      },
      {
        context: 'Save cart to Firestore',
        maxAttempts: 3,
      }
    );
    logger.debug('[CartStore] Cart saved to Firestore', {
      userId,
      itemCount: state.items.length,
    });
  } catch (error) {
    logger.error('[CartStore] Error saving cart to Firestore', error);
  }
};

const saveCartToFirestoreDebounced = debounce(saveCartToFirestore, 500);

const loadCartFromFirestore = async (userId: string): Promise<CartState | null> => {
  try {
    return await withRetry(
      async () => {
        const cartRef = doc(db, 'carts', userId);
        const cartSnap = await getDoc(cartRef);

        if (cartSnap.exists()) {
          const data = cartSnap.data();
          return {
            items: data.items || [],
            total: data.total || 0,
          };
        }
        return null;
      },
      {
        context: 'Load cart from Firestore',
        maxAttempts: 3,
      }
    );
  } catch (error) {
    logger.error('[CartStore] Error loading cart from Firestore', error);
    return null;
  }
};

export const syncCartWithUser = async (userId: string | null): Promise<void> => {
  if (userId === currentUserId) {
    return;
  }

  beginCartSync();
  try {
    const previousUserId = currentUserId;

    logger.info('[CartStore] Syncing cart with user', { userId, previousUserId });

    if (userId) {
      const storedCart = loadCartFromStorage(userId);
      const guestCart = loadCartFromStorage(null);
      const firestoreCart = await loadCartFromFirestore(userId);

      let source: 'firestore' | 'stored' | 'guest' | 'empty' = 'empty';
      let resolvedCart: CartState = { items: [], total: 0 };

      if (firestoreCart && firestoreCart.items.length > 0) {
        resolvedCart = {
          items: firestoreCart.items,
          total: calculateTotal(firestoreCart.items),
        };
        source = 'firestore';
      } else if (storedCart.items.length > 0) {
        resolvedCart = {
          items: storedCart.items,
          total: calculateTotal(storedCart.items),
        };
        source = 'stored';
      } else if (guestCart.items.length > 0) {
        resolvedCart = {
          items: guestCart.items,
          total: calculateTotal(guestCart.items),
        };
        source = 'guest';
      }

      cartStore.set(resolvedCart);
      saveCartToStorage(resolvedCart, userId);

      if (source === 'guest') {
        saveCartToStorage({ items: [], total: 0 }, null);
      }

      if (source !== 'firestore' && resolvedCart.items.length > 0) {
        await saveCartToFirestore(userId, resolvedCart);
      }
    } else {
      const emptyCart: CartState = { items: [], total: 0 };
      cartStore.set(emptyCart);
      if (previousUserId) {
        saveCartToStorage(emptyCart, previousUserId);
      }
      saveCartToStorage(emptyCart, null);
    }

    currentUserId = userId;
  } finally {
    endCartSync();
  }
};

export const setCurrentUserId = (userId: string | null): void => {
  currentUserId = userId;
};

// ============================================
// Cart Actions (unchanged)
// ============================================

export function addToCart(item: CartItem): void {
  const currentState = cartStore.get();
  const existingItemIndex = currentState.items.findIndex(
    (i: CartItem) => i.id === item.id && i.variantId === item.variantId
  );

  let newItems: CartItem[];

  if (existingItemIndex > -1) {
    newItems = currentState.items.map((i: CartItem, index: number) =>
      index === existingItemIndex ? { ...i, quantity: i.quantity + item.quantity } : i
    );
    notify.success(`Cantidad actualizada: ${item.name}`);
  } else {
    newItems = [...currentState.items, item];
    notify.success(`¡${item.name} agregado al carrito!`);
  }

  const newState: CartState = {
    items: newItems,
    total: calculateTotal(newItems),
  };

  cartStore.set(newState);
  saveCartToStorage(newState, currentUserId);

  if (currentUserId) {
    saveCartToFirestoreDebounced(currentUserId, newState);
  }
}

export function updateCartItemQuantity(
  itemId: string,
  variantId: number | undefined,
  quantity: number
): void {
  const currentState = cartStore.get();

  const newItems = currentState.items.map((item: CartItem) =>
    item.id === itemId && item.variantId === variantId
      ? { ...item, quantity: Math.max(1, quantity) }
      : item
  );

  const newState: CartState = {
    items: newItems,
    total: calculateTotal(newItems),
  };

  cartStore.set(newState);
  saveCartToStorage(newState, currentUserId);

  if (currentUserId) {
    saveCartToFirestoreDebounced(currentUserId, newState);
  }
}

export function removeFromCart(itemId: string, variantId?: number): void {
  const currentState = cartStore.get();

  const removedItem = currentState.items.find(
    (item: CartItem) => item.id === itemId && item.variantId === variantId
  );

  const newItems = currentState.items.filter(
    (item: CartItem) => !(item.id === itemId && item.variantId === variantId)
  );

  const newState: CartState = {
    items: newItems,
    total: calculateTotal(newItems),
  };

  cartStore.set(newState);
  saveCartToStorage(newState, currentUserId);

  if (removedItem) {
    notify.info(`${removedItem.name} eliminado del carrito`);
  }

  if (currentUserId) {
    saveCartToFirestoreDebounced(currentUserId, newState);
  }
}

export async function clearCart(): Promise<void> {
  const currentState = cartStore.get();
  const itemCount = currentState.items.length;

  const newState: CartState = { items: [], total: 0 };
  cartStore.set(newState);
  saveCartToStorage(newState, currentUserId);

  if (currentUserId) {
    await saveCartToFirestore(currentUserId, newState);
  }

  if (itemCount > 0) {
    notify.info('Carrito vaciado');
  }
}

// ============================================
// Utility Functions
// ============================================

export function getCartItemCount(): number {
  return cartItemCount.get();
}

export function isInCart(productId: string, variantId?: number): boolean {
  const itemIds = cartItemIds.get();
  return itemIds.has(`${productId}-${variantId || 'default'}`);
}

// ============================================
// USAGE EXAMPLES
// ============================================

/**
 * BEFORE (causes unnecessary re-renders):
 *
 * function CartBadge() {
 *   const cart = useCart(); // Re-renders on EVERY cart change
 *   const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
 *   return <span>{count}</span>;
 * }
 *
 * AFTER (optimized):
 *
 * function CartBadge() {
 *   const count = useCartItemCount(); // Only re-renders when count changes
 *   return <span>{count}</span>;
 * }
 */

/**
 * BEFORE:
 *
 * function ProductCard({ product }) {
 *   const cart = useCart(); // Re-renders on EVERY cart change
 *   const isInCart = cart.items.some(item => item.id === product.id);
 *   // ...
 * }
 *
 * AFTER:
 *
 * function ProductCard({ product }) {
 *   const isInCart = useIsInCart(product.id); // Only re-renders when THIS product changes
 *   // ...
 * }
 */

/**
 * BEFORE:
 *
 * function MiniCart() {
 *   const cart = useCart(); // Re-renders on EVERY cart change
 *   return (
 *     <div>
 *       <span>{cart.items.length} items</span>
 *       <span>€{cart.total}</span>
 *     </div>
 *   );
 * }
 *
 * AFTER:
 *
 * function MiniCart() {
 *   const summary = useCartSummary(); // Only re-renders when count or total changes
 *   return (
 *     <div>
 *       <span>{summary.itemCount} items</span>
 *       <span>€{summary.total}</span>
 *     </div>
 *   );
 * }
 */
