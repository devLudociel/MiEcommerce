import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { logger } from '../lib/logger';

export interface WishlistItem {
  id: string | number;
  name: string;
  price?: number;
  image?: string;
}

const WL_STORAGE_PREFIX = 'wishlist';
const WL_GUEST_KEY = `${WL_STORAGE_PREFIX}:guest`;
const WL_EVENT = 'wishlist:change';

const getWishlistStorageKey = (userId?: string | null) =>
  userId ? `${WL_STORAGE_PREFIX}:${userId}` : WL_GUEST_KEY;

// Track current user ID
let currentUserId: string | null = null;

type WishlistChangeDetail = {
  userId: string | null;
};

function readWishlist(userId?: string | null): WishlistItem[] {
  if (typeof window === 'undefined') return [];
  const storageKey = getWishlistStorageKey(userId);
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeWishlist(
  items: WishlistItem[],
  userId?: string | null,
  options?: { skipRemote?: boolean }
) {
  if (typeof window === 'undefined') return;
  const targetUserId = userId ?? currentUserId;
  const storageKey = getWishlistStorageKey(targetUserId);
  localStorage.setItem(storageKey, JSON.stringify(items));
  window.dispatchEvent(
    new CustomEvent<WishlistChangeDetail>(WL_EVENT, {
      detail: { userId: targetUserId ?? null },
    })
  );

  // Save to Firestore if user is authenticated
  if (!options?.skipRemote && targetUserId) {
    saveWishlistToFirestore(targetUserId, items);
  }
}

// Save wishlist to Firestore for authenticated users
const saveWishlistToFirestore = async (userId: string, items: WishlistItem[]): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        wishlist: items,
        updatedAt: new Date(),
      },
      { merge: true }
    );
    logger.debug('[WishlistStore] Wishlist saved to Firestore', {
      userId,
      itemCount: items.length,
    });
  } catch (error) {
    logger.error('[WishlistStore] Error saving wishlist to Firestore', error);
  }
};

// Load wishlist from Firestore for authenticated users
const loadWishlistFromFirestore = async (userId: string): Promise<WishlistItem[] | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const wishlist = data.wishlist || [];
      logger.debug('[WishlistStore] Wishlist loaded from Firestore', {
        userId,
        itemCount: wishlist.length,
      });
      return wishlist;
    }
  } catch (error) {
    logger.error('[WishlistStore] Error loading wishlist from Firestore', error);
  }
  return null;
};

// Sync wishlist when user logs in or out
export const syncWishlistWithUser = async (userId: string | null): Promise<void> => {
  if (userId === currentUserId) {
    // Same user, no need to sync
    return;
  }

  const previousUserId = currentUserId;

  logger.info('[WishlistStore] Syncing wishlist with user', {
    userId,
    previousUserId,
  });

  if (userId) {
    // User logged in
    const storedWishlist = readWishlist(userId);
    const guestWishlist = readWishlist(null);
    const firestoreWishlist = await loadWishlistFromFirestore(userId);

    let source: 'firestore' | 'stored' | 'guest' | 'empty' = 'empty';
    let resolvedWishlist: WishlistItem[] = [];

    if (firestoreWishlist && firestoreWishlist.length > 0) {
      resolvedWishlist = firestoreWishlist;
      source = 'firestore';
      logger.info('[WishlistStore] Using Firestore wishlist', {
        userId,
        itemCount: firestoreWishlist.length,
      });
    } else if (storedWishlist.length > 0) {
      resolvedWishlist = storedWishlist;
      source = 'stored';
      logger.info('[WishlistStore] Using locally stored wishlist for user', {
        userId,
        itemCount: storedWishlist.length,
      });
    } else if (guestWishlist.length > 0) {
      resolvedWishlist = guestWishlist;
      source = 'guest';
      logger.info('[WishlistStore] Promoting guest wishlist to user', {
        userId,
        itemCount: guestWishlist.length,
      });
    } else {
      logger.info('[WishlistStore] No wishlist data found, starting empty', { userId });
    }

    const skipRemote = source === 'firestore' || source === 'empty';
    writeWishlist(resolvedWishlist, userId, { skipRemote });

    if (source === 'guest') {
      writeWishlist([], null, { skipRemote: true });
    }
  } else {
    // User logged out - clear wishlist to prevent showing previous user's items
    writeWishlist([], null, { skipRemote: true });
    logger.info('[WishlistStore] Switched to guest wishlist after logout', {
      previousUserId,
    });
  }

  currentUserId = userId;
};

export function getWishlist(): WishlistItem[] {
  return readWishlist(currentUserId);
}

export function toggleWishlist(item: WishlistItem) {
  const items = readWishlist(currentUserId);
  const exists = items.some((i) => i.id === item.id);
  const next = exists ? items.filter((i) => i.id !== item.id) : [...items, item];
  writeWishlist(next);
}

export function removeFromWishlist(id: WishlistItem['id']) {
  writeWishlist(readWishlist(currentUserId).filter((i) => i.id !== id));
}

export function clearWishlist() {
  writeWishlist([]);
}

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>(() => readWishlist(currentUserId));

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<WishlistChangeDetail>;
      const targetUserId = customEvent.detail?.userId ?? currentUserId;
      setItems(readWishlist(targetUserId));
    };

    window.addEventListener(WL_EVENT, handler as EventListener);
    setItems(readWishlist(currentUserId));
    return () => window.removeEventListener(WL_EVENT, handler as EventListener);
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
