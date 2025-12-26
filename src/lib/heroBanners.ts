// src/lib/heroBanners.ts
// Sistema de gestión de banners del carrusel hero

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
  type Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// ============================================================================
// TYPES
// ============================================================================

export type AccentColor = 'cyan' | 'magenta' | 'yellow' | 'rainbow';

export interface HeroBanner {
  id: string;
  // Content
  title: string;
  subtitle: string;
  description: string;
  // CTA buttons
  ctaPrimaryText: string;
  ctaPrimaryUrl: string;
  ctaSecondaryText: string;
  ctaSecondaryUrl: string;
  // Appearance
  backgroundImage: string;
  accentColor: AccentColor;
  // Status & Order
  active: boolean;
  order: number;
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type HeroBannerInput = Omit<HeroBanner, 'id' | 'createdAt' | 'updatedAt'>;

// ============================================================================
// COLLECTION NAME
// ============================================================================

const COLLECTION_NAME = 'hero_banners';

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Obtener todos los banners ordenados por orden
 */
export async function getAllBanners(): Promise<HeroBanner[]> {
  try {
    const bannersRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(bannersRef);

    const banners = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as HeroBanner
    );

    // Ordenar en el cliente para evitar problemas de índices
    return banners.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.error('Error fetching banners:', error);
    return [];
  }
}

/**
 * Obtener solo los banners activos (para el frontend)
 * Nota: Filtramos y ordenamos en el cliente para evitar necesitar índices en Firestore
 */
export async function getActiveBanners(): Promise<HeroBanner[]> {
  try {
    const bannersRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(bannersRef);

    const allBanners = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as HeroBanner
    );

    // Filtrar activos y ordenar en el cliente
    return allBanners
      .filter((banner) => banner.active === true)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    console.error('Error fetching active banners:', error);
    return [];
  }
}

/**
 * Suscripción en tiempo real a los banners (para el admin)
 */
export function subscribeToBanners(callback: (banners: HeroBanner[]) => void): Unsubscribe {
  const bannersRef = collection(db, COLLECTION_NAME);

  return onSnapshot(
    bannersRef,
    (snapshot) => {
      const banners = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as HeroBanner
      );
      // Ordenar en el cliente
      banners.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      callback(banners);
    },
    (error) => {
      console.error('Error in banners subscription:', error);
    }
  );
}

/**
 * Crear un nuevo banner
 */
export async function createBanner(input: HeroBannerInput): Promise<string> {
  try {
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...input,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating banner:', error);
    throw error;
  }
}

/**
 * Actualizar un banner existente
 */
export async function updateBanner(id: string, updates: Partial<HeroBannerInput>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating banner:', error);
    throw error;
  }
}

/**
 * Eliminar un banner
 */
export async function deleteBanner(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting banner:', error);
    throw error;
  }
}

/**
 * Toggle activo/inactivo
 */
export async function toggleBannerActive(id: string, active: boolean): Promise<void> {
  await updateBanner(id, { active });
}

/**
 * Reordenar banners
 */
export async function reorderBanners(bannerIds: string[]): Promise<void> {
  try {
    const updates = bannerIds.map((id, index) => updateBanner(id, { order: index }));
    await Promise.all(updates);
  } catch (error) {
    console.error('Error reordering banners:', error);
    throw error;
  }
}

// ============================================================================
// IMAGE UPLOAD
// ============================================================================

/**
 * Subir imagen de banner a Firebase Storage
 */
export async function uploadBannerImage(file: File): Promise<string> {
  try {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;
    const storageRef = ref(storage, `banners/${fileName}`);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    return url;
  } catch (error) {
    console.error('Error uploading banner image:', error);
    throw error;
  }
}

/**
 * Eliminar imagen de banner de Firebase Storage
 */
export async function deleteBannerImage(imageUrl: string): Promise<void> {
  try {
    // Extraer el path del URL de Firebase Storage
    const urlObj = new URL(imageUrl);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
    if (pathMatch) {
      const path = decodeURIComponent(pathMatch[1]);
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    }
  } catch (error) {
    console.error('Error deleting banner image:', error);
    // No lanzar error, puede que la imagen ya no exista
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Obtener el siguiente número de orden disponible
 */
export async function getNextOrder(): Promise<number> {
  const banners = await getAllBanners();
  if (banners.length === 0) return 0;
  return Math.max(...banners.map((b) => b.order)) + 1;
}

/**
 * Mover banner hacia arriba en el orden
 */
export async function moveBannerUp(bannerId: string): Promise<void> {
  const banners = await getAllBanners();
  const index = banners.findIndex((b) => b.id === bannerId);

  if (index > 0) {
    const prevBanner = banners[index - 1];
    const currentBanner = banners[index];

    await Promise.all([
      updateBanner(currentBanner.id, { order: prevBanner.order }),
      updateBanner(prevBanner.id, { order: currentBanner.order }),
    ]);
  }
}

/**
 * Mover banner hacia abajo en el orden
 */
export async function moveBannerDown(bannerId: string): Promise<void> {
  const banners = await getAllBanners();
  const index = banners.findIndex((b) => b.id === bannerId);

  if (index < banners.length - 1) {
    const nextBanner = banners[index + 1];
    const currentBanner = banners[index];

    await Promise.all([
      updateBanner(currentBanner.id, { order: nextBanner.order }),
      updateBanner(nextBanner.id, { order: currentBanner.order }),
    ]);
  }
}

// ============================================================================
// DEFAULT BANNER DATA (for initial migration)
// ============================================================================

export const DEFAULT_BANNERS: Omit<HeroBannerInput, 'order'>[] = [
  {
    title: 'Tecnología del Futuro',
    subtitle: 'Nueva Colección 2025',
    description: 'Descubre los productos más innovadores con diseño futurista y calidad premium',
    ctaPrimaryText: 'Explorar Ahora',
    ctaPrimaryUrl: '/productos',
    ctaSecondaryText: 'Ver Catálogo',
    ctaSecondaryUrl: '/productos',
    backgroundImage:
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
    accentColor: 'cyan',
    active: true,
  },
  {
    title: 'Estilo Único',
    subtitle: 'Edición Limitada',
    description: 'Productos exclusivos que combinan elegancia, funcionalidad y diseño vanguardista',
    ctaPrimaryText: 'Comprar Ya',
    ctaPrimaryUrl: '/productos',
    ctaSecondaryText: 'Más Info',
    ctaSecondaryUrl: '/como-funciona',
    backgroundImage:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop',
    accentColor: 'magenta',
    active: true,
  },
  {
    title: 'Ofertas Increíbles',
    subtitle: 'Hasta 70% de Descuento',
    description: 'No te pierdas nuestras ofertas especiales en los mejores productos seleccionados',
    ctaPrimaryText: 'Ver Ofertas',
    ctaPrimaryUrl: '/ofertas',
    ctaSecondaryText: 'Suscribirse',
    ctaSecondaryUrl: '/cuenta',
    backgroundImage:
      'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1920&h=1080&fit=crop',
    accentColor: 'yellow',
    active: true,
  },
  {
    title: 'Experiencia Premium',
    subtitle: 'Calidad Garantizada',
    description:
      'Productos premium con la mejor calidad, diseño excepcional y servicio al cliente 24/7',
    ctaPrimaryText: 'Descubrir',
    ctaPrimaryUrl: '/productos',
    ctaSecondaryText: 'Contactar',
    ctaSecondaryUrl: '/contacto',
    backgroundImage:
      'https://images.unsplash.com/photo-1560472355-536de3962603?w=1920&h=1080&fit=crop',
    accentColor: 'rainbow',
    active: true,
  },
];

/**
 * Migrar banners por defecto a Firebase (ejecutar una vez)
 */
export async function migrateDefaultBanners(): Promise<void> {
  const existing = await getAllBanners();
  if (existing.length > 0) {
    console.log('Banners already exist, skipping migration');
    return;
  }

  console.log('Migrating default banners...');
  for (let i = 0; i < DEFAULT_BANNERS.length; i++) {
    await createBanner({
      ...DEFAULT_BANNERS[i],
      order: i,
    });
  }
  console.log('Migration complete!');
}
