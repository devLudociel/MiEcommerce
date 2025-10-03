import { useEffect, useState } from 'react';

export interface WishlistItem {
  id: string | number;
  name: string;
  price?: number;
  image?: string;
}

const WL_KEY = 'wishlist:v1';
const WL_EVENT = 'wishlist:change';

function readWishlist(): WishlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeWishlist(items: WishlistItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WL_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(WL_EVENT));
}

export function getWishlist(): WishlistItem[] {
  return readWishlist();
}

export function toggleWishlist(item: WishlistItem) {
  const items = readWishlist();
  const exists = items.some((i) => i.id === item.id);
  const next = exists ? items.filter((i) => i.id !== item.id) : [...items, item];
  writeWishlist(next);
}

export function removeFromWishlist(id: WishlistItem['id']) {
  writeWishlist(readWishlist().filter((i) => i.id !== id));
}

export function clearWishlist() {
  writeWishlist([]);
}

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>(() => readWishlist());

  useEffect(() => {
    const onChange = () => setItems(readWishlist());
    window.addEventListener(WL_EVENT, onChange as EventListener);
    setItems(readWishlist());
    return () => window.removeEventListener(WL_EVENT, onChange as EventListener);
  }, []);

  const count = items.length;

  return {
    items,
    count,
    toggle: toggleWishlist,
    remove: removeFromWishlist,
    clear: clearWishlist,
  } as const;
}

