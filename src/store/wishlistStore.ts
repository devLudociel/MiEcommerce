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

const WL_KEY = 'wishlist:v1';
const WL_EVENT = 'wishlist:change';

// Track current user ID
let currentUserId: string | null = null;

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

  // Save to Firestore if user is authenticated
  if (currentUserId) {
    saveWishlistToFirestore(currentUserId, items);
  }
}

// Save wishlist to Firestore for authenticated users
const saveWishlistToFirestore = async (
  userId: string,
  items: WishlistItem[]
): Promise<void> => {
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

  logger.info('[WishlistStore] Syncing wishlist with user', {
    userId,
    previousUserId: currentUserId,
  });

  if (userId) {
    // User logged in
    const localWishlist = readWishlist();
    const firestoreWishlist = await loadWishlistFromFirestore(userId);

    if (firestoreWishlist && firestoreWishlist.length > 0) {
      // User has wishlist in Firestore, load it
      writeWishlist(firestoreWishlist);
      logger.info('[WishlistStore] Loaded wishlist from Firestore', {
        itemCount: firestoreWishlist.length,
      });
    } else if (localWishlist.length > 0) {
      // User has local wishlist but nothing in Firestore, save local to Firestore
      await saveWishlistToFirestore(userId, localWishlist);
      logger.info('[WishlistStore] Migrated local wishlist to Firestore', {
        itemCount: localWishlist.length,
      });
    }
  } else {
    // User logged out - clear wishlist to prevent showing previous user's items
    writeWishlist([]);
    logger.info('[WishlistStore] Cleared wishlist after logout');
  }

  currentUserId = userId;
};

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
