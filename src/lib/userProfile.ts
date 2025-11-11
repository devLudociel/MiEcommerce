import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { serverTimestamp } from 'firebase/firestore';
import { withRetry } from './resilience';

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface Address {
  id: string;
  label?: string; // "Casa", "Trabajo", etc.
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
  // Campos detallados (opcionales) para UX local
  street?: string; // Calle
  number?: string; // Número
  floor?: string; // Piso
  apartment?: string; // Depto/Puerta
  locality?: string; // Población / Localidad
  notes?: string; // Notas de entrega
}

export interface TaxId {
  id: string;
  label?: string;
  value: string; // CUIT/CIF/NIF
  country?: string;
}

export interface UserDataDoc {
  email: string;
  displayName?: string;
  createdAt?: any;
  profile?: UserProfile;
  addresses?: Address[];
  wishlist?: Array<{ id: string; name: string; price?: number; image?: string }>;
  taxIds?: TaxId[];
  whiteLabelShipping?: boolean;
  creditBalance?: number;
}

export function userDocRef(uid: string) {
  return doc(db, 'users', uid);
}

export async function ensureUserDoc(uid: string, email: string, displayName?: string) {
  await withRetry(
    async () => {
      const ref = userDocRef(uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const data: UserDataDoc = {
          email,
          displayName,
          createdAt: serverTimestamp(),
          profile: {},
          addresses: [],
          wishlist: [],
          taxIds: [],
          whiteLabelShipping: false,
          creditBalance: 0,
        };
        await setDoc(ref, data);
      }
    },
    { context: 'Ensure user document', maxAttempts: 3 }
  );
}

export async function getUserData(uid: string): Promise<UserDataDoc | null> {
  return withRetry(
    async () => {
      const snap = await getDoc(userDocRef(uid));
      return snap.exists() ? (snap.data() as UserDataDoc) : null;
    },
    { context: 'Get user data', maxAttempts: 3 }
  );
}

export async function upsertProfile(uid: string, profile: UserProfile) {
  await withRetry(
    async () => updateDoc(userDocRef(uid), { profile }),
    { context: 'Update user profile', maxAttempts: 3 }
  );
}

export async function saveAddresses(uid: string, addresses: Address[]) {
  await withRetry(
    async () => updateDoc(userDocRef(uid), { addresses }),
    { context: 'Save addresses', maxAttempts: 3 }
  );
}

export async function saveWishlist(uid: string, wishlist: UserDataDoc['wishlist']) {
  await withRetry(
    async () => updateDoc(userDocRef(uid), { wishlist }),
    { context: 'Save wishlist', maxAttempts: 3 }
  );
}

export async function getAddresses(uid: string): Promise<Address[]> {
  const d = await getUserData(uid);
  return d?.addresses ?? [];
}

export async function getDefaultAddresses(
  uid: string
): Promise<{ shipping: Address | null; billing: Address | null }> {
  const list = await getAddresses(uid);
  const shipping = list.find((a) => a.isDefaultShipping) || null;
  const billing = list.find((a) => a.isDefaultBilling) || null;
  return { shipping, billing };
}

export async function saveTaxIds(uid: string, taxIds: TaxId[]) {
  await withRetry(
    async () => updateDoc(userDocRef(uid), { taxIds }),
    { context: 'Save tax IDs', maxAttempts: 3 }
  );
}

export async function updateUserSettings(uid: string, patch: Partial<UserDataDoc>) {
  await withRetry(
    async () => updateDoc(userDocRef(uid), patch as any),
    { context: 'Update user settings', maxAttempts: 3 }
  );
}
