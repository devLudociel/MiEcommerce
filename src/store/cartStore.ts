// src/store/cartStore.ts
import { atom } from 'nanostores';
import { useStore } from '@nanostores/react';
import { logger } from '../lib/logger';
import { notify } from '../lib/notifications';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
    uploadedImageFile?: File | null;
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
    [key: string]: any;
  };
}

export interface CartState {
  items: CartItem[];
  total: number;
}

// Cargar carrito desde localStorage al iniciar
const loadCartFromStorage = (): CartState => {
  if (typeof window === 'undefined') {
    return { items: [], total: 0 };
  }

  try {
    const stored = localStorage.getItem('cart');
    if (stored) {
      const parsed = JSON.parse(stored);
      logger.debug('[CartStore] Cart loaded from localStorage', {
        itemCount: parsed.items?.length || 0,
        total: parsed.total || 0,
      });
      return {
        items: parsed.items || [],
        total: parsed.total || 0,
      };
    }
  } catch (e) {
    logger.error('[CartStore] Error loading cart from localStorage', e);
    // No mostrar notificación aquí para no molestar al usuario al cargar la página
  }

  logger.debug('[CartStore] Initialized empty cart');
  return { items: [], total: 0 };
};

// Guardar carrito en localStorage
const saveCartToStorage = (state: CartState): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem('cart', JSON.stringify(state));
    logger.debug('[CartStore] Cart saved to localStorage', {
      itemCount: state.items.length,
      total: state.total,
    });
  } catch (e) {
    logger.error('[CartStore] Error saving cart to localStorage', e);
    logger.warn('[CartStore] Cart changes will not persist across sessions');
    // Mostrar advertencia al usuario si falla el guardado
    notify.warning('No se pudo guardar el carrito. Los cambios pueden perderse.');
  }
};

// Calcular total del carrito
const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
};

// Atom del carrito
export const cartStore = atom<CartState>(loadCartFromStorage());

// Track current user ID
let currentUserId: string | null = null;

// Save cart to Firestore for authenticated users
const saveCartToFirestore = async (userId: string, state: CartState): Promise<void> => {
  try {
    const cartRef = doc(db, 'carts', userId);
    await setDoc(cartRef, {
      items: state.items,
      total: state.total,
      updatedAt: new Date(),
    });
    logger.debug('[CartStore] Cart saved to Firestore', {
      userId,
      itemCount: state.items.length,
    });
  } catch (error) {
    logger.error('[CartStore] Error saving cart to Firestore', error);
  }
};

// Load cart from Firestore for authenticated users
const loadCartFromFirestore = async (userId: string): Promise<CartState | null> => {
  try {
    const cartRef = doc(db, 'carts', userId);
    const cartSnap = await getDoc(cartRef);

    if (cartSnap.exists()) {
      const data = cartSnap.data();
      logger.debug('[CartStore] Cart loaded from Firestore', {
        userId,
        itemCount: data.items?.length || 0,
      });
      return {
        items: data.items || [],
        total: data.total || 0,
      };
    }
  } catch (error) {
    logger.error('[CartStore] Error loading cart from Firestore', error);
  }
  return null;
};

// Sync cart when user logs in or out
export const syncCartWithUser = async (userId: string | null): Promise<void> => {
  if (userId === currentUserId) {
    // Same user, no need to sync
    return;
  }

  logger.info('[CartStore] Syncing cart with user', { userId, previousUserId: currentUserId });

  if (userId) {
    // User logged in
    const localCart = cartStore.get();
    const firestoreCart = await loadCartFromFirestore(userId);

    if (firestoreCart && firestoreCart.items.length > 0) {
      // User has cart in Firestore, load it
      cartStore.set(firestoreCart);
      saveCartToStorage(firestoreCart);
      logger.info('[CartStore] Loaded cart from Firestore', {
        itemCount: firestoreCart.items.length,
      });
    } else if (localCart.items.length > 0) {
      // User has local cart but nothing in Firestore, save local to Firestore
      await saveCartToFirestore(userId, localCart);
      logger.info('[CartStore] Migrated local cart to Firestore', {
        itemCount: localCart.items.length,
      });
    }
  } else {
    // User logged out
    // Clear cart to prevent showing previous user's cart
    const emptyCart: CartState = { items: [], total: 0 };
    cartStore.set(emptyCart);
    saveCartToStorage(emptyCart);
    logger.info('[CartStore] Cleared cart after logout');
  }

  currentUserId = userId;
};

// Get current user ID
export const setCurrentUserId = (userId: string | null): void => {
  currentUserId = userId;
};

// Agregar item al carrito
export function addToCart(item: CartItem): void {
  const currentState = cartStore.get();
  const existingItemIndex = currentState.items.findIndex(
    (i: CartItem) => i.id === item.id && i.variantId === item.variantId
  );

  let newItems: CartItem[];

  if (existingItemIndex > -1) {
    // Si el item ya existe, aumentar cantidad
    newItems = currentState.items.map((i: CartItem, index: number) =>
      index === existingItemIndex ? { ...i, quantity: i.quantity + item.quantity } : i
    );
    logger.info('[CartStore] Item quantity updated', {
      productId: item.id,
      newQuantity: currentState.items[existingItemIndex].quantity + item.quantity,
    });
    notify.success(`Cantidad actualizada: ${item.name}`);
  } else {
    // Si no existe, agregarlo
    newItems = [...currentState.items, item];
    logger.info('[CartStore] New item added to cart', {
      productId: item.id,
      productName: item.name,
      price: item.price,
      quantity: item.quantity,
    });
    notify.success(`¡${item.name} agregado al carrito!`);
  }

  const newState: CartState = {
    items: newItems,
    total: calculateTotal(newItems),
  };

  cartStore.set(newState);
  saveCartToStorage(newState);

  // Save to Firestore if user is authenticated
  if (currentUserId) {
    saveCartToFirestore(currentUserId, newState);
  }
}

// Actualizar cantidad de un item
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
  saveCartToStorage(newState);

  // Save to Firestore if user is authenticated
  if (currentUserId) {
    saveCartToFirestore(currentUserId, newState);
  }
}

// Remover item del carrito
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
  saveCartToStorage(newState);

  if (removedItem) {
    logger.info('[CartStore] Item removed from cart', { productId: itemId });
    notify.info(`${removedItem.name} eliminado del carrito`);
  }

  // Save to Firestore if user is authenticated
  if (currentUserId) {
    saveCartToFirestore(currentUserId, newState);
  }
}

// Limpiar carrito
export function clearCart(): void {
  const currentState = cartStore.get();
  const itemCount = currentState.items.length;

  const newState: CartState = { items: [], total: 0 };
  cartStore.set(newState);
  saveCartToStorage(newState);

  if (itemCount > 0) {
    logger.info('[CartStore] Cart cleared', { itemCount });
    notify.info('Carrito vaciado');
  }

  // Save to Firestore if user is authenticated
  if (currentUserId) {
    saveCartToFirestore(currentUserId, newState);
  }
}

// Hook para usar el carrito en React
export function useCart(): CartState {
  return useStore(cartStore);
}

// Obtener cantidad total de items
export function getCartItemCount(): number {
  const state = cartStore.get();
  return state.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
}

// Verificar si un producto está en el carrito
export function isInCart(productId: string, variantId?: number): boolean {
  const state = cartStore.get();
  return state.items.some(
    (item: CartItem) => item.id === productId && item.variantId === variantId
  );
}
