// src/store/cartStore.ts
import { atom } from 'nanostores';
import { logger } from '../lib/logger';

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
  }
};

// Calcular total del carrito
const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
};

// Atom del carrito
export const cartStore = atom<CartState>(loadCartFromStorage());

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
  } else {
    // Si no existe, agregarlo
    newItems = [...currentState.items, item];
    logger.info('[CartStore] New item added to cart', {
      productId: item.id,
      productName: item.name,
      price: item.price,
      quantity: item.quantity,
    });
  }

  const newState: CartState = {
    items: newItems,
    total: calculateTotal(newItems),
  };

  cartStore.set(newState);
  saveCartToStorage(newState);
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
}

// Remover item del carrito
export function removeFromCart(itemId: string, variantId?: number): void {
  const currentState = cartStore.get();

  const newItems = currentState.items.filter(
    (item: CartItem) => !(item.id === itemId && item.variantId === variantId)
  );

  const newState: CartState = {
    items: newItems,
    total: calculateTotal(newItems),
  };

  cartStore.set(newState);
  saveCartToStorage(newState);
}

// Limpiar carrito
export function clearCart(): void {
  const newState: CartState = { items: [], total: 0 };
  cartStore.set(newState);
  saveCartToStorage(newState);
}

// Hook para usar el carrito en React
export function useCart(): CartState {
  return cartStore.get();
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
