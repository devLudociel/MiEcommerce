// src/lib/themes.ts
// Sistema centralizado de temáticas para productos

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
import { logger } from './logger';

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Imagen de una temática para una categoría de producto específica
 */
export interface ThemeCategoryImage {
  categoryId: string;      // ID de la categoría de producto (ej: "tazas", "cajas")
  categoryName: string;    // Nombre legible (ej: "Tazas", "Cajas de Chuches")
  imageUrl: string;        // Miniatura para mostrar en el selector
  previewImage: string;    // Imagen grande del producto con el diseño aplicado
}

/**
 * Temática global que puede aplicarse a múltiples categorías de productos
 */
export interface Theme {
  id: string;
  name: string;            // Nombre de la temática (ej: "Princesas", "Dinosaurios")
  slug: string;            // Slug URL-friendly
  description?: string;    // Descripción opcional
  badge?: string;          // Badge opcional (ej: "Popular", "Nuevo")
  priceModifier?: number;  // Precio extra por usar esta temática
  order?: number;          // Orden de visualización
  active: boolean;         // Si está activa o no
  categoryImages: ThemeCategoryImage[]; // Imágenes por categoría de producto
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Input para crear una nueva temática
 */
export type CreateThemeInput = Omit<Theme, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Input para actualizar una temática existente
 */
export type UpdateThemeInput = Partial<Omit<Theme, 'id' | 'createdAt' | 'updatedAt'>>;

// ============================================================================
// COLECCIÓN
// ============================================================================

const themesCollection = collection(db, 'themes');

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Crear una nueva temática
 */
export async function createTheme(data: CreateThemeInput): Promise<Theme> {
  const docRef = doc(themesCollection);
  const now = Timestamp.now();

  const theme: Theme = {
    id: docRef.id,
    ...data,
    slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef, theme);
  logger.info('[Themes] Theme created:', theme.id, theme.name);
  return theme;
}

/**
 * Obtener todas las temáticas
 */
export async function getAllThemes(): Promise<Theme[]> {
  const q = query(themesCollection, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Theme);
}

/**
 * Obtener solo las temáticas activas
 */
export async function getActiveThemes(): Promise<Theme[]> {
  const q = query(
    themesCollection,
    where('active', '==', true),
    orderBy('order', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Theme);
}

/**
 * Obtener una temática por ID
 */
export async function getThemeById(id: string): Promise<Theme | null> {
  const docRef = doc(themesCollection, id);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as Theme;
}

/**
 * Obtener temáticas que tienen imágenes para una categoría específica
 */
export async function getThemesForCategory(categoryId: string): Promise<Theme[]> {
  // Primero obtenemos todas las temáticas activas
  const themes = await getActiveThemes();

  // Filtramos las que tienen imagen para esta categoría
  return themes.filter(theme =>
    theme.categoryImages?.some(ci => ci.categoryId === categoryId)
  );
}

/**
 * Actualizar una temática
 */
export async function updateTheme(id: string, updates: UpdateThemeInput): Promise<void> {
  const docRef = doc(themesCollection, id);

  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });

  logger.info('[Themes] Theme updated:', id);
}

/**
 * Agregar o actualizar imagen de una categoría en una temática
 */
export async function setThemeCategoryImage(
  themeId: string,
  categoryImage: ThemeCategoryImage
): Promise<void> {
  const theme = await getThemeById(themeId);
  if (!theme) {
    throw new Error(`Theme not found: ${themeId}`);
  }

  // Buscar si ya existe una imagen para esta categoría
  const existingIndex = theme.categoryImages?.findIndex(
    ci => ci.categoryId === categoryImage.categoryId
  ) ?? -1;

  let updatedImages: ThemeCategoryImage[];

  if (existingIndex >= 0) {
    // Actualizar existente
    updatedImages = [...theme.categoryImages];
    updatedImages[existingIndex] = categoryImage;
  } else {
    // Agregar nueva
    updatedImages = [...(theme.categoryImages || []), categoryImage];
  }

  await updateTheme(themeId, { categoryImages: updatedImages });
  logger.info('[Themes] Category image updated for theme:', themeId, categoryImage.categoryId);
}

/**
 * Eliminar imagen de una categoría en una temática
 */
export async function removeThemeCategoryImage(
  themeId: string,
  categoryId: string
): Promise<void> {
  const theme = await getThemeById(themeId);
  if (!theme) {
    throw new Error(`Theme not found: ${themeId}`);
  }

  const updatedImages = theme.categoryImages?.filter(
    ci => ci.categoryId !== categoryId
  ) || [];

  await updateTheme(themeId, { categoryImages: updatedImages });
  logger.info('[Themes] Category image removed from theme:', themeId, categoryId);
}

/**
 * Eliminar una temática
 */
export async function deleteTheme(id: string): Promise<void> {
  const docRef = doc(themesCollection, id);
  await deleteDoc(docRef);
  logger.info('[Themes] Theme deleted:', id);
}

/**
 * Reordenar temáticas
 */
export async function reorderThemes(themeIds: string[]): Promise<void> {
  const updates = themeIds.map((id, index) =>
    updateTheme(id, { order: index })
  );

  await Promise.all(updates);
  logger.info('[Themes] Themes reordered');
}
