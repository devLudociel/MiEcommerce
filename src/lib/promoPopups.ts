// src/lib/promoPopups.ts
// Sistema de popups promocionales

import { db } from './firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';

// ============================================================================
// TYPES
// ============================================================================

export type PopupType = 'modal' | 'banner' | 'slide-in';
export type PopupTrigger = 'immediate' | 'delay' | 'exit-intent' | 'scroll';
export type PopupPosition = 'center' | 'top' | 'bottom' | 'bottom-right' | 'bottom-left';

export interface PromoPopup {
  id: string;
  // Content
  title: string;
  message: string;
  imageUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
  // Appearance
  type: PopupType;
  position: PopupPosition;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  // Trigger
  trigger: PopupTrigger;
  triggerDelay?: number; // seconds for 'delay' trigger
  triggerScrollPercent?: number; // % for 'scroll' trigger
  // Schedule
  startDate?: Timestamp | null;
  endDate?: Timestamp | null;
  // Targeting
  showOnPages?: string[]; // Empty = all pages, or specific paths like ['/productos', '/']
  excludePages?: string[];
  showToLoggedIn?: boolean; // null = all, true = only logged in, false = only guests
  // Frequency
  showOnce: boolean; // If true, don't show again after dismissed
  showFrequency?: number; // Show every X hours (0 = every visit)
  // Status
  active: boolean;
  priority: number; // Higher = shown first if multiple popups qualify
  // Analytics
  impressions: number;
  clicks: number;
  dismissals: number;
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type PromoPopupInput = Omit<PromoPopup, 'id' | 'impressions' | 'clicks' | 'dismissals' | 'createdAt' | 'updatedAt'>;

// ============================================================================
// STORAGE KEY
// ============================================================================

const POPUP_STORAGE_KEY = 'dismissed_popups';
const POPUP_LAST_SHOWN_KEY = 'popup_last_shown';

interface DismissedPopups {
  [popupId: string]: number; // timestamp when dismissed
}

interface LastShownPopups {
  [popupId: string]: number; // timestamp when last shown
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

export function getDismissedPopups(): DismissedPopups {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(POPUP_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function setPopupDismissed(popupId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const dismissed = getDismissedPopups();
    dismissed[popupId] = Date.now();
    localStorage.setItem(POPUP_STORAGE_KEY, JSON.stringify(dismissed));
  } catch {
    // Ignore storage errors
  }
}

export function getLastShownPopups(): LastShownPopups {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(POPUP_LAST_SHOWN_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function setPopupLastShown(popupId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const lastShown = getLastShownPopups();
    lastShown[popupId] = Date.now();
    localStorage.setItem(POPUP_LAST_SHOWN_KEY, JSON.stringify(lastShown));
  } catch {
    // Ignore storage errors
  }
}

export function clearDismissedPopups(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(POPUP_STORAGE_KEY);
    localStorage.removeItem(POPUP_LAST_SHOWN_KEY);
  } catch {
    // Ignore
  }
}

// ============================================================================
// POPUP VISIBILITY LOGIC
// ============================================================================

export function shouldShowPopup(
  popup: PromoPopup,
  currentPath: string,
  isLoggedIn: boolean | null
): boolean {
  const now = Date.now();

  // Check if active
  if (!popup.active) return false;

  // Check date range
  if (popup.startDate) {
    const startTime = popup.startDate.toMillis();
    if (now < startTime) return false;
  }
  if (popup.endDate) {
    const endTime = popup.endDate.toMillis();
    if (now > endTime) return false;
  }

  // Check login state targeting
  if (popup.showToLoggedIn === true && !isLoggedIn) return false;
  if (popup.showToLoggedIn === false && isLoggedIn) return false;

  // Check page targeting
  if (popup.showOnPages && popup.showOnPages.length > 0) {
    const matchesPage = popup.showOnPages.some(page => {
      if (page === currentPath) return true;
      if (page.endsWith('*') && currentPath.startsWith(page.slice(0, -1))) return true;
      return false;
    });
    if (!matchesPage) return false;
  }

  // Check excluded pages
  if (popup.excludePages && popup.excludePages.length > 0) {
    const isExcluded = popup.excludePages.some(page => {
      if (page === currentPath) return true;
      if (page.endsWith('*') && currentPath.startsWith(page.slice(0, -1))) return true;
      return false;
    });
    if (isExcluded) return false;
  }

  // Check if dismissed (showOnce)
  if (popup.showOnce) {
    const dismissed = getDismissedPopups();
    if (dismissed[popup.id]) return false;
  }

  // Check frequency
  if (popup.showFrequency && popup.showFrequency > 0) {
    const lastShown = getLastShownPopups();
    const lastShownTime = lastShown[popup.id];
    if (lastShownTime) {
      const hoursSinceShown = (now - lastShownTime) / (1000 * 60 * 60);
      if (hoursSinceShown < popup.showFrequency) return false;
    }
  }

  return true;
}

// ============================================================================
// FIRESTORE OPERATIONS
// ============================================================================

export async function getActivePopups(): Promise<PromoPopup[]> {
  try {
    const q = query(
      collection(db, 'promo_popups'),
      where('active', '==', true)
    );
    const snapshot = await getDocs(q);
    const popups = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PromoPopup[];

    // Sort by priority (higher first)
    return popups.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  } catch (error) {
    console.error('[PromoPopups] Error loading popups:', error);
    return [];
  }
}

export async function getAllPopups(): Promise<PromoPopup[]> {
  try {
    const snapshot = await getDocs(collection(db, 'promo_popups'));
    const popups = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PromoPopup[];

    // Sort by priority and creation date
    return popups.sort((a, b) => {
      if (b.priority !== a.priority) return (b.priority || 0) - (a.priority || 0);
      return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
    });
  } catch (error) {
    console.error('[PromoPopups] Error loading all popups:', error);
    return [];
  }
}

export async function createPopup(input: PromoPopupInput): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'promo_popups'), {
    ...input,
    impressions: 0,
    clicks: 0,
    dismissals: 0,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updatePopup(id: string, updates: Partial<PromoPopupInput>): Promise<void> {
  const docRef = doc(db, 'promo_popups', id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function deletePopup(id: string): Promise<void> {
  await deleteDoc(doc(db, 'promo_popups', id));
}

export async function incrementPopupStat(id: string, stat: 'impressions' | 'clicks' | 'dismissals'): Promise<void> {
  try {
    const docRef = doc(db, 'promo_popups', id);
    // Get current value and increment
    const snapshot = await getDocs(query(collection(db, 'promo_popups'), where('__name__', '==', id)));
    if (!snapshot.empty) {
      const currentValue = snapshot.docs[0].data()[stat] || 0;
      await updateDoc(docRef, {
        [stat]: currentValue + 1,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error(`[PromoPopups] Error incrementing ${stat}:`, error);
  }
}

// ============================================================================
// DEFAULT POPUP TEMPLATES
// ============================================================================

export const POPUP_TEMPLATES: Partial<PromoPopupInput>[] = [
  {
    title: 'Bienvenido a nuestra tienda',
    message: 'Suscribete a nuestra newsletter y obtén un 10% de descuento en tu primera compra.',
    buttonText: 'Obtener descuento',
    type: 'modal',
    position: 'center',
    trigger: 'delay',
    triggerDelay: 5,
    showOnce: true,
    priority: 50,
  },
  {
    title: 'No te vayas todavia',
    message: 'Tenemos ofertas especiales esperandote. Usa el cupón QUEDATEAQUI para un 15% de descuento.',
    buttonText: 'Ver ofertas',
    type: 'modal',
    position: 'center',
    trigger: 'exit-intent',
    showOnce: true,
    priority: 100,
  },
  {
    title: 'Envio gratis',
    message: 'En pedidos superiores a 50 euros. Aprovecha ahora.',
    buttonText: 'Comprar ahora',
    type: 'banner',
    position: 'top',
    trigger: 'immediate',
    showOnce: false,
    showFrequency: 24,
    priority: 10,
  },
  {
    title: 'Oferta Flash',
    message: '24 horas de descuentos increibles. Hasta 50% en productos seleccionados.',
    buttonText: 'Ver productos',
    type: 'slide-in',
    position: 'bottom-right',
    trigger: 'scroll',
    triggerScrollPercent: 50,
    showOnce: false,
    showFrequency: 4,
    priority: 75,
  },
];
