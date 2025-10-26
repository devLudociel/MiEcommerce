import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { serverTimestamp } from 'firebase/firestore';

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
}

export async function getUserData(uid: string): Promise<UserDataDoc | null> {
  const snap = await getDoc(userDocRef(uid));
  return snap.exists() ? (snap.data() as UserDataDoc) : null;
}

export async function upsertProfile(uid: string, profile: UserProfile) {
  await updateDoc(userDocRef(uid), { profile });
}

export async function saveAddresses(uid: string, addresses: Address[]) {
  await updateDoc(userDocRef(uid), { addresses });
}

export async function saveWishlist(uid: string, wishlist: UserDataDoc['wishlist']) {
  await updateDoc(userDocRef(uid), { wishlist });
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
  await updateDoc(userDocRef(uid), { taxIds });
}

export async function updateUserSettings(uid: string, patch: Partial<UserDataDoc>) {
  await updateDoc(userDocRef(uid), patch as any);
}
