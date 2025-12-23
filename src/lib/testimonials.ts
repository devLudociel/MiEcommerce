// src/lib/testimonials.ts
// Sistema de gestión de testimonios y estadísticas

import { db, storage } from './firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

// ============================================================================
// TYPES
// ============================================================================

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  image: string; // emoji or image URL
  rating: number; // 1-5
  text: string;
  date: string;
  order: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SocialStat {
  id: string;
  value: string;
  label: string;
  icon: string;
  order: number;
  active: boolean;
}

export type TestimonialInput = Omit<Testimonial, 'id' | 'createdAt' | 'updatedAt'>;
export type SocialStatInput = Omit<SocialStat, 'id'>;

// ============================================================================
// COLLECTION NAMES
// ============================================================================

const TESTIMONIALS_COLLECTION = 'testimonials';
const STATS_COLLECTION = 'social_stats';

// ============================================================================
// TESTIMONIAL CRUD
// ============================================================================

export async function getAllTestimonials(): Promise<Testimonial[]> {
  try {
    const ref = collection(db, TESTIMONIALS_COLLECTION);
    const snapshot = await getDocs(ref);

    const testimonials = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Testimonial));

    return testimonials.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return [];
  }
}

export async function getActiveTestimonials(): Promise<Testimonial[]> {
  try {
    const ref = collection(db, TESTIMONIALS_COLLECTION);
    const snapshot = await getDocs(ref);

    const testimonials = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Testimonial));

    return testimonials
      .filter(t => t.active === true)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.error('Error fetching active testimonials:', error);
    return [];
  }
}

export function subscribeToTestimonials(callback: (testimonials: Testimonial[]) => void): Unsubscribe {
  const testimonialRef = collection(db, TESTIMONIALS_COLLECTION);

  return onSnapshot(testimonialRef, (snapshot) => {
    const testimonials = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Testimonial));
    testimonials.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    callback(testimonials);
  }, (error) => {
    console.error('Error in testimonials subscription:', error);
  });
}

export async function createTestimonial(input: TestimonialInput): Promise<string> {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, TESTIMONIALS_COLLECTION), {
      ...input,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating testimonial:', error);
    throw error;
  }
}

export async function updateTestimonial(id: string, updates: Partial<TestimonialInput>): Promise<void> {
  try {
    const docRef = doc(db, TESTIMONIALS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    throw error;
  }
}

export async function deleteTestimonial(id: string): Promise<void> {
  try {
    const docRef = doc(db, TESTIMONIALS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    throw error;
  }
}

// ============================================================================
// STATS CRUD
// ============================================================================

export async function getAllStats(): Promise<SocialStat[]> {
  try {
    const ref = collection(db, STATS_COLLECTION);
    const snapshot = await getDocs(ref);

    const stats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SocialStat));

    return stats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.error('Error fetching stats:', error);
    return [];
  }
}

export async function getActiveStats(): Promise<SocialStat[]> {
  try {
    const ref = collection(db, STATS_COLLECTION);
    const snapshot = await getDocs(ref);

    const stats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SocialStat));

    return stats
      .filter(s => s.active === true)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.error('Error fetching active stats:', error);
    return [];
  }
}

export function subscribeToStats(callback: (stats: SocialStat[]) => void): Unsubscribe {
  const statsRef = collection(db, STATS_COLLECTION);

  return onSnapshot(statsRef, (snapshot) => {
    const stats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SocialStat));
    stats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    callback(stats);
  }, (error) => {
    console.error('Error in stats subscription:', error);
  });
}

export async function createStat(input: SocialStatInput): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, STATS_COLLECTION), input);
    return docRef.id;
  } catch (error) {
    console.error('Error creating stat:', error);
    throw error;
  }
}

export async function updateStat(id: string, updates: Partial<SocialStatInput>): Promise<void> {
  try {
    const docRef = doc(db, STATS_COLLECTION, id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating stat:', error);
    throw error;
  }
}

export async function deleteStat(id: string): Promise<void> {
  try {
    const docRef = doc(db, STATS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting stat:', error);
    throw error;
  }
}

// ============================================================================
// IMAGE UPLOAD
// ============================================================================

export async function uploadTestimonialImage(file: File): Promise<string> {
  try {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;
    const storageRef = ref(storage, `testimonials/${fileName}`);

    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error uploading testimonial image:', error);
    throw error;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

export async function getNextTestimonialOrder(): Promise<number> {
  const testimonials = await getAllTestimonials();
  if (testimonials.length === 0) return 0;
  return Math.max(...testimonials.map(t => t.order ?? 0)) + 1;
}

export async function getNextStatOrder(): Promise<number> {
  const stats = await getAllStats();
  if (stats.length === 0) return 0;
  return Math.max(...stats.map(s => s.order ?? 0)) + 1;
}

// ============================================================================
// MIGRATION - Default Data
// ============================================================================

export const DEFAULT_TESTIMONIALS: Omit<TestimonialInput, 'order'>[] = [
  {
    name: 'María González',
    role: 'Cliente verificada',
    image: '👩',
    rating: 5,
    text: '¡Increíble calidad! Pedí camisetas personalizadas para mi equipo y quedaron perfectas. El servicio de atención fue excepcional.',
    date: 'Hace 2 semanas',
    active: true,
  },
  {
    name: 'Carlos Rodríguez',
    role: 'Compra verificada',
    image: '👨',
    rating: 5,
    text: 'La impresión 3D de mi proyecto superó mis expectativas. Detalles perfectos y entrega rápida. ¡Totalmente recomendado!',
    date: 'Hace 1 mes',
    active: true,
  },
  {
    name: 'Ana Martínez',
    role: 'Cliente frecuente',
    image: '👩‍🦰',
    rating: 5,
    text: 'Llevo años comprando aquí. Nunca me han fallado. Calidad premium, precios justos y un trato siempre amable.',
    date: 'Hace 3 días',
    active: true,
  },
];

export const DEFAULT_STATS: Omit<SocialStatInput, 'order'>[] = [
  { value: '1,500+', label: 'Clientes Satisfechos', icon: '😊', active: true },
  { value: '5,000+', label: 'Productos Entregados', icon: '📦', active: true },
  { value: '4.8/5', label: 'Valoración Media', icon: '⭐', active: true },
  { value: '98%', label: 'Tasa de Satisfacción', icon: '💯', active: true },
];

export async function migrateDefaultTestimonials(): Promise<void> {
  const existingTestimonials = await getAllTestimonials();
  const existingStats = await getAllStats();

  if (existingTestimonials.length === 0) {
    console.log('Creating default testimonials...');
    for (let i = 0; i < DEFAULT_TESTIMONIALS.length; i++) {
      await createTestimonial({ ...DEFAULT_TESTIMONIALS[i], order: i });
    }
  }

  if (existingStats.length === 0) {
    console.log('Creating default stats...');
    for (let i = 0; i < DEFAULT_STATS.length; i++) {
      await createStat({ ...DEFAULT_STATS[i], order: i });
    }
  }

  console.log('Testimonials migration complete!');
}
