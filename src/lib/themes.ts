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
 * Una variante/diseño específico dentro de una temática para una categoría
 * Ej: "Mickey", "Minnie", "Frozen" dentro de Disney > Cajas
 */
export interface ThemeVariant {
  id: string;              // ID único de la variante
  name: string;            // Nombre de la variante (ej: "Mickey", "Minnie")
  imageUrl: string;        // Miniatura para mostrar en el selector
  previewImage: string;    // Imagen grande del producto con el diseño aplicado
  order?: number;          // Orden de visualización
}

/**
 * Imágenes de una temática para una categoría de producto específica
 * Ahora soporta MÚLTIPLES variantes por categoría
 */
export interface ThemeCategoryImage {
  categoryId: string;      // ID de la categoría de producto (ej: "tazas", "cajas")
  categoryName: string;    // Nombre legible (ej: "Tazas", "Cajas de Chuches")
  variants: ThemeVariant[]; // Múltiples variantes para esta categoría
  // Campos legacy para compatibilidad (se usan si variants está vacío)
  imageUrl?: string;       // Miniatura para mostrar en el selector
  previewImage?: string;   // Imagen grande del producto con el diseño aplicado
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
 * Agregar o actualizar imagen de una categoría en una temática (legacy - una imagen por categoría)
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
 * Agregar una nueva variante a una categoría en una temática
 */
export async function addThemeVariant(
  themeId: string,
  categoryId: string,
  categoryName: string,
  variant: Omit<ThemeVariant, 'id' | 'order'>
): Promise<ThemeVariant> {
  const theme = await getThemeById(themeId);
  if (!theme) {
    throw new Error(`Theme not found: ${themeId}`);
  }

  // Buscar si ya existe la categoría
  const existingIndex = theme.categoryImages?.findIndex(
    ci => ci.categoryId === categoryId
  ) ?? -1;

  const newVariant: ThemeVariant = {
    id: `${categoryId}_${Date.now()}`,
    name: variant.name,
    imageUrl: variant.imageUrl,
    previewImage: variant.previewImage,
    order: 0,
  };

  let updatedImages: ThemeCategoryImage[];

  if (existingIndex >= 0) {
    // Añadir variante a categoría existente
    updatedImages = [...theme.categoryImages];
    const existingCategory = updatedImages[existingIndex];
    const variants = existingCategory.variants || [];
    newVariant.order = variants.length;
    updatedImages[existingIndex] = {
      ...existingCategory,
      variants: [...variants, newVariant],
    };
  } else {
    // Crear nueva categoría con la variante
    updatedImages = [...(theme.categoryImages || []), {
      categoryId,
      categoryName,
      variants: [newVariant],
    }];
  }

  await updateTheme(themeId, { categoryImages: updatedImages });
  logger.info('[Themes] Variant added to theme:', themeId, categoryId, newVariant.name);
  return newVariant;
}

/**
 * Actualizar una variante específica
 */
export async function updateThemeVariant(
  themeId: string,
  categoryId: string,
  variantId: string,
  updates: Partial<Omit<ThemeVariant, 'id'>>
): Promise<void> {
  const theme = await getThemeById(themeId);
  if (!theme) {
    throw new Error(`Theme not found: ${themeId}`);
  }

  const categoryIndex = theme.categoryImages?.findIndex(
    ci => ci.categoryId === categoryId
  ) ?? -1;

  if (categoryIndex < 0) {
    throw new Error(`Category not found: ${categoryId}`);
  }

  const updatedImages = [...theme.categoryImages];
  const category = updatedImages[categoryIndex];
  const variantIndex = category.variants?.findIndex(v => v.id === variantId) ?? -1;

  if (variantIndex < 0) {
    throw new Error(`Variant not found: ${variantId}`);
  }

  category.variants[variantIndex] = {
    ...category.variants[variantIndex],
    ...updates,
  };

  await updateTheme(themeId, { categoryImages: updatedImages });
  logger.info('[Themes] Variant updated:', themeId, categoryId, variantId);
}

/**
 * Eliminar una variante específica
 */
export async function removeThemeVariant(
  themeId: string,
  categoryId: string,
  variantId: string
): Promise<void> {
  const theme = await getThemeById(themeId);
  if (!theme) {
    throw new Error(`Theme not found: ${themeId}`);
  }

  const categoryIndex = theme.categoryImages?.findIndex(
    ci => ci.categoryId === categoryId
  ) ?? -1;

  if (categoryIndex < 0) {
    throw new Error(`Category not found: ${categoryId}`);
  }

  const updatedImages = [...theme.categoryImages];
  const category = updatedImages[categoryIndex];
  const newVariants = category.variants?.filter(v => v.id !== variantId) || [];

  if (newVariants.length === 0) {
    // Si no quedan variantes, eliminar la categoría completa
    updatedImages.splice(categoryIndex, 1);
  } else {
    updatedImages[categoryIndex] = {
      ...category,
      variants: newVariants,
    };
  }

  await updateTheme(themeId, { categoryImages: updatedImages });
  logger.info('[Themes] Variant removed:', themeId, categoryId, variantId);
}

/**
 * Eliminar imagen de una categoría en una temática (elimina todas las variantes)
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
 * Obtener todas las variantes de una temática para una categoría específica
 */
export function getThemeVariantsForCategory(
  theme: Theme,
  categoryId: string
): ThemeVariant[] {
  const categoryImage = theme.categoryImages?.find(ci => ci.categoryId === categoryId);
  if (!categoryImage) return [];

  // Si tiene variantes, devolverlas
  if (categoryImage.variants && categoryImage.variants.length > 0) {
    return categoryImage.variants;
  }

  // Compatibilidad legacy: si tiene imageUrl/previewImage sin variants
  if (categoryImage.imageUrl && categoryImage.previewImage) {
    return [{
      id: `${categoryId}_legacy`,
      name: theme.name,
      imageUrl: categoryImage.imageUrl,
      previewImage: categoryImage.previewImage,
    }];
  }

  return [];
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
