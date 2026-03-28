// src/lib/configurators.ts
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ProductConfigurator } from '../types/configurator';

const COLLECTION = 'product_configurators';

export interface StoredConfigurator {
  id: string;
  name: string;
  description?: string;
  configurator: ProductConfigurator;
  updatedAt: Date;
  createdAt: Date;
}

export async function saveConfigurator(
  id: string,
  name: string,
  configurator: ProductConfigurator,
  description?: string
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  const existing = await getDoc(ref);
  const createdAt = existing.exists() ? existing.data().createdAt : Timestamp.now();

  // Strip undefined values — Firestore rejects them
  const cleanConfigurator = JSON.parse(JSON.stringify(configurator));

  await setDoc(ref, {
    name,
    description: description || '',
    configurator: cleanConfigurator,
    updatedAt: Timestamp.now(),
    createdAt,
  });
}

export async function loadAllConfigurators(): Promise<StoredConfigurator[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      description: data.description || '',
      configurator: data.configurator,
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  });
}

export async function loadConfigurator(id: string): Promise<StoredConfigurator | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    description: data.description || '',
    configurator: data.configurator,
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}

export async function deleteConfigurator(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
