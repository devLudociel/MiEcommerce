import { useEffect, useState } from 'react';
import { logger } from '../lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface CompareItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image?: string;
  category?: string;
  description?: string;
  features?: string[];
  tags?: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COMPARE_STORAGE_KEY = 'compare:items';
const COMPARE_EVENT = 'compare:change';
const MAX_COMPARE_ITEMS = 4; // Maximum items to compare at once

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

function readCompareItems(): CompareItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCompareItems(items: CompareItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(COMPARE_EVENT));
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Add a product to the comparison list
 * @returns true if added, false if already at max
 */
export function addToCompare(item: CompareItem): boolean {
  const items = readCompareItems();

  // Check if already in list
  if (items.some((i) => i.id === item.id)) {
    logger.info('[Compare] Item already in compare list', { id: item.id });
    return true;
  }

  // Check max limit
  if (items.length >= MAX_COMPARE_ITEMS) {
    logger.warn('[Compare] Max compare items reached', { max: MAX_COMPARE_ITEMS });
    return false;
  }

  const newItems = [...items, item];
  writeCompareItems(newItems);
  logger.info('[Compare] Added to compare', { id: item.id, total: newItems.length });
  return true;
}

/**
 * Remove a product from the comparison list
 */
export function removeFromCompare(productId: string): void {
  const items = readCompareItems();
  const newItems = items.filter((i) => i.id !== productId);
  writeCompareItems(newItems);
  logger.info('[Compare] Removed from compare', { id: productId, total: newItems.length });
}

/**
 * Toggle a product in/out of the comparison list
 * @returns { added: boolean, atMax: boolean }
 */
export function toggleCompare(item: CompareItem): { added: boolean; atMax: boolean } {
  const items = readCompareItems();
  const exists = items.some((i) => i.id === item.id);

  if (exists) {
    removeFromCompare(item.id);
    return { added: false, atMax: false };
  } else {
    const success = addToCompare(item);
    return { added: success, atMax: !success };
  }
}

/**
 * Clear all items from the comparison list
 */
export function clearCompare(): void {
  writeCompareItems([]);
  logger.info('[Compare] Cleared all items');
}

/**
 * Check if a product is in the comparison list
 */
export function isInCompare(productId: string): boolean {
  const items = readCompareItems();
  return items.some((i) => i.id === productId);
}

/**
 * Get all items in the comparison list
 */
export function getCompareItems(): CompareItem[] {
  return readCompareItems();
}

/**
 * Get comparison count
 */
export function getCompareCount(): number {
  return readCompareItems().length;
}

/**
 * Get max compare items constant
 */
export function getMaxCompareItems(): number {
  return MAX_COMPARE_ITEMS;
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * React hook to use the comparison store
 */
export function useCompare() {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Initial load
    setItems(readCompareItems());
    setIsLoaded(true);

    // Listen for changes
    const handleChange = () => {
      setItems(readCompareItems());
    };

    window.addEventListener(COMPARE_EVENT, handleChange);
    return () => window.removeEventListener(COMPARE_EVENT, handleChange);
  }, []);

  return {
    items,
    count: items.length,
    isLoaded,
    maxItems: MAX_COMPARE_ITEMS,
    isFull: items.length >= MAX_COMPARE_ITEMS,
    add: addToCompare,
    remove: removeFromCompare,
    toggle: toggleCompare,
    clear: clearCompare,
    isInCompare: (id: string) => items.some((i) => i.id === id),
  };
}
