import { useEffect, useState } from 'react';

export interface CartItem {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variantId?: string | number;
  variantName?: string;
  options?: Record<string, string> | string[];
}

const CART_KEY = 'cart:v1';
const CART_EVENT = 'cart:change';

function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

export function getCartItems(): CartItem[] {
  return readCart();
}

export function addToCart(item: CartItem) {
  const items = readCart();
  const idx = items.findIndex(
    (i) => i.id === item.id && (i.variantId ?? null) === (item.variantId ?? null)
  );
  if (idx >= 0) {
    items[idx].quantity += item.quantity;
  } else {
    items.push({ ...item });
  }
  writeCart(items);
}

export function updateQuantity(
  id: CartItem['id'],
  quantity: number,
  variantId?: CartItem['variantId']
) {
  const items = readCart();
  const idx = items.findIndex(
    (i) => i.id === id && (i.variantId ?? null) === (variantId ?? null)
  );
  if (idx >= 0) {
    items[idx].quantity = Math.max(0, quantity);
  }
  writeCart(items.filter((i) => i.quantity > 0));
}

export function removeFromCart(id: CartItem['id'], variantId?: CartItem['variantId']) {
  const next = readCart().filter(
    (i) => !(i.id === id && (i.variantId ?? null) === (variantId ?? null))
  );
  writeCart(next);
}

export function clearCart() {
  writeCart([]);
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => readCart());

  useEffect(() => {
    const onChange = () => setItems(readCart());
    window.addEventListener(CART_EVENT, onChange as EventListener);
    // Hydrate on mount in case it changed before subscription
    setItems(readCart());
    return () => window.removeEventListener(CART_EVENT, onChange as EventListener);
  }, []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    items,
    total,
    count,
    add: addToCart,
    update: updateQuantity,
    remove: removeFromCart,
    clear: clearCart,
  } as const;
}
