// src/lib/pages.ts
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

export interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaDescription?: string;
  type: 'page' | 'blog' | 'gallery';
  status: 'draft' | 'published';
  featuredImage?: string;
  author?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
}

export interface BlogPost extends Page {
  type: 'blog';
  excerpt?: string;
  tags?: string[];
  category?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  category?: string;
  tags?: string[];
  createdAt: Timestamp;
}

const pagesCollection = collection(db, 'pages');
const galleryCollection = collection(db, 'gallery');

// ============================================================================
// PAGES CRUD
// ============================================================================

export async function createPage(pageData: Omit<Page, 'id' | 'createdAt' | 'updatedAt'>) {
  const docRef = doc(pagesCollection);
  const now = Timestamp.now();

  const page: Page = {
    id: docRef.id,
    ...pageData,
    createdAt: now,
    updatedAt: now,
  };

  if (pageData.status === 'published' && !pageData.publishedAt) {
    (page as any).publishedAt = now;
  }

  await setDoc(docRef, page);
  return page;
}

export async function updatePage(id: string, updates: Partial<Page>) {
  const docRef = doc(pagesCollection, id);
  const updateData = {
    ...updates,
    updatedAt: Timestamp.now(),
  };

  if (updates.status === 'published' && !updates.publishedAt) {
    (updateData as any).publishedAt = Timestamp.now();
  }

  await updateDoc(docRef, updateData);
}

export async function deletePage(id: string) {
  await deleteDoc(doc(pagesCollection, id));
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const q = query(pagesCollection, where('slug', '==', slug), where('status', '==', 'published'));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  return snapshot.docs[0].data() as Page;
}

export async function getPageById(id: string): Promise<Page | null> {
  const docRef = doc(pagesCollection, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return docSnap.data() as Page;
}

export async function getAllPages(type?: 'page' | 'blog' | 'gallery'): Promise<Page[]> {
  // Get all pages without filtering to avoid index requirements
  const q = query(pagesCollection);
  const snapshot = await getDocs(q);
  const allPages = snapshot.docs.map((doc) => doc.data() as Page);

  // Filter by type in memory if specified
  let filtered = allPages;
  if (type) {
    filtered = allPages.filter((page) => page.type === type);
  }

  // Sort by createdAt in memory
  filtered.sort((a, b) => {
    const dateA = a.createdAt.seconds;
    const dateB = b.createdAt.seconds;
    return dateB - dateA; // Descending order
  });

  return filtered;
}

export async function getPublishedPages(type?: 'page' | 'blog' | 'gallery'): Promise<Page[]> {
  // Get all pages and filter in memory to avoid complex index requirements
  const allPages = await getAllPages(type);

  // Filter only published pages
  const publishedPages = allPages.filter((page) => page.status === 'published');

  // Sort by publishedAt (or createdAt if publishedAt is missing)
  publishedPages.sort((a, b) => {
    const dateA = a.publishedAt?.seconds || a.createdAt.seconds;
    const dateB = b.publishedAt?.seconds || b.createdAt.seconds;
    return dateB - dateA; // Descending order
  });

  return publishedPages;
}

// ============================================================================
// BLOG SPECIFIC
// ============================================================================

export async function getBlogPosts(limit?: number): Promise<BlogPost[]> {
  // Use getPublishedPages which already handles the filtering in memory
  const publishedBlogPages = await getPublishedPages('blog');
  const posts = publishedBlogPages as BlogPost[];

  if (limit) {
    return posts.slice(0, limit);
  }

  return posts;
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const page = await getPageBySlug(slug);
  if (!page || page.type !== 'blog') return null;
  return page as BlogPost;
}

// ============================================================================
// GALLERY SPECIFIC
// ============================================================================

export async function createGalleryItem(
  itemData: Omit<GalleryItem, 'id' | 'createdAt'>
): Promise<GalleryItem> {
  const docRef = doc(galleryCollection);

  const item: GalleryItem = {
    id: docRef.id,
    ...itemData,
    createdAt: Timestamp.now(),
  };

  await setDoc(docRef, item);
  return item;
}

export async function updateGalleryItem(id: string, updates: Partial<GalleryItem>) {
  await updateDoc(doc(galleryCollection, id), updates);
}

export async function deleteGalleryItem(id: string) {
  await deleteDoc(doc(galleryCollection, id));
}

export async function getAllGalleryItems(): Promise<GalleryItem[]> {
  const q = query(galleryCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as GalleryItem);
}

export async function getGalleryItemsByCategory(category: string): Promise<GalleryItem[]> {
  const q = query(
    galleryCollection,
    where('category', '==', category),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as GalleryItem);
}

// ============================================================================
// DEFAULT PAGES
// ============================================================================

export const DEFAULT_PAGES = [
  {
    slug: 'sobre-nosotros',
    title: 'Sobre Nosotros',
    content: `
# Sobre ImprimeArte

Somos una empresa especializada en **impresión y personalización** ubicada en Santa Cruz de Tenerife.

## Nuestra Historia

Desde 2020, hemos estado ayudando a personas y empresas a dar vida a sus ideas creativas.

## Nuestros Servicios

- Impresión 3D en resina y filamento
- Estampado textil DTF
- Sublimación en productos personalizados
- Corte y grabado láser
- Diseño gráfico profesional

## Calidad Garantizada

Utilizamos solo materiales de primera calidad y la tecnología más avanzada.
    `.trim(),
    metaDescription:
      'Conoce ImprimeArte, especialistas en impresión y personalización en Tenerife.',
    type: 'page' as const,
    status: 'published' as const,
  },
  {
    slug: 'faq',
    title: 'Preguntas Frecuentes',
    content: `
# Preguntas Frecuentes

## ¿Cuánto tiempo tarda un pedido?

Los pedidos estándar tardan entre 3-5 días hábiles. Los pedidos personalizados pueden tardar 5-7 días.

## ¿Hacen envíos a toda España?

Sí, enviamos a toda España y Canarias.

## ¿Puedo cancelar mi pedido?

Puedes cancelar tu pedido antes de que entre en producción.

## ¿Ofrecen descuentos por volumen?

Sí, ofrecemos descuentos para pedidos grandes. Contacta con nosotros.
    `.trim(),
    metaDescription: 'Respuestas a las preguntas más frecuentes sobre nuestros servicios.',
    type: 'page' as const,
    status: 'published' as const,
  },
  {
    slug: 'contacto',
    title: 'Contacto',
    content: `
# Contacto

## Información de Contacto

**Teléfono:** 645 341 452
**Email:** info@imprimarte.com
**Dirección:** Santa Cruz de Tenerife, España

## Horario de Atención

- Lunes a Viernes: 9:00 - 18:00
- Sábados: 10:00 - 14:00
- Domingos: Cerrado

## Redes Sociales

Síguenos en Instagram, Facebook y TikTok: @imprimarte
    `.trim(),
    metaDescription: 'Ponte en contacto con ImprimeArte. Teléfono, email y redes sociales.',
    type: 'page' as const,
    status: 'published' as const,
  },
  {
    slug: 'privacidad',
    title: 'Política de Privacidad',
    content: `
# Política de Privacidad

Última actualización: 29 de noviembre de 2025

## Datos que Recopilamos

Recopilamos información necesaria para procesar tus pedidos:
- Nombre y apellidos
- Email
- Dirección de envío
- Teléfono

## Uso de los Datos

Utilizamos tus datos únicamente para:
- Procesar y enviar tus pedidos
- Comunicarnos contigo sobre tu pedido
- Enviarte ofertas (si te has suscrito)

## Seguridad

Todos los datos se almacenan de forma segura con encriptación.

## Tus Derechos

Puedes solicitar acceso, modificación o eliminación de tus datos en cualquier momento.
    `.trim(),
    metaDescription: 'Política de privacidad y protección de datos de ImprimeArte.',
    type: 'page' as const,
    status: 'published' as const,
  },
];
