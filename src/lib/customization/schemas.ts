// src/lib/customization/schemas.ts
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import type { CustomizationSchema } from '../../types/customization';

// Simple console logger for server-side code (avoids import issues)
const logger = {
  info: (msg: string, data?: unknown) => console.log(`[INFO] ${msg}`, data ?? ''),
  warn: (msg: string, data?: unknown) => console.warn(`[WARN] ${msg}`, data ?? ''),
  error: (msg: string, error?: unknown) => console.error(`[ERROR] ${msg}`, error ?? ''),
  debug: (msg: string, data?: unknown) => console.log(`[DEBUG] ${msg}`, data ?? ''),
};

export interface StoredSchema {
  schema: CustomizationSchema;
  categoryId: string;
  categoryName: string;
  updatedAt: Date;
  createdAt: Date;
}

/**
 * Saves a customization schema for a category
 */
export async function saveCustomizationSchema(
  categoryId: string,
  categoryName: string,
  schema: CustomizationSchema
): Promise<void> {
  try {
    const schemaRef = doc(db, 'customization_schemas', categoryId);

    // Check if schema already exists to preserve createdAt
    const existingDoc = await getDoc(schemaRef);
    const createdAt = existingDoc.exists()
      ? existingDoc.data().createdAt
      : Timestamp.now();

    await setDoc(schemaRef, {
      schema,
      categoryId,
      categoryName,
      updatedAt: Timestamp.now(),
      createdAt,
    });

    logger.info('[saveCustomizationSchema] Schema saved successfully', { categoryId, categoryName });
  } catch (error) {
    logger.error('[saveCustomizationSchema] Error saving schema', error);
    throw new Error('Error al guardar el esquema de personalización');
  }
}

/**
 * Loads a customization schema for a category
 */
export async function loadCustomizationSchema(categoryId: string): Promise<StoredSchema | null> {
  try {
    const schemaRef = doc(db, 'customization_schemas', categoryId);
    const schemaDoc = await getDoc(schemaRef);

    if (!schemaDoc.exists()) {
      logger.warn('[loadCustomizationSchema] Schema not found', { categoryId });
      return null;
    }

    const data = schemaDoc.data();
    return {
      schema: data.schema,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  } catch (error) {
    logger.error('[loadCustomizationSchema] Error loading schema', error);
    throw new Error('Error al cargar el esquema de personalización');
  }
}

/**
 * Loads all customization schemas
 */
export async function loadAllCustomizationSchemas(): Promise<Record<string, StoredSchema>> {
  try {
    const schemasRef = collection(db, 'customization_schemas');
    const snapshot = await getDocs(schemasRef);

    const schemas: Record<string, StoredSchema> = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      schemas[doc.id] = {
        schema: data.schema,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });

    logger.info('[loadAllCustomizationSchemas] Loaded schemas', { count: Object.keys(schemas).length });
    return schemas;
  } catch (error) {
    logger.error('[loadAllCustomizationSchemas] Error loading schemas', error);
    throw new Error('Error al cargar los esquemas de personalización');
  }
}

/**
 * Deletes a customization schema
 */
export async function deleteCustomizationSchema(categoryId: string): Promise<void> {
  try {
    const schemaRef = doc(db, 'customization_schemas', categoryId);
    await deleteDoc(schemaRef);
    logger.info('[deleteCustomizationSchema] Schema deleted', { categoryId });
  } catch (error) {
    logger.error('[deleteCustomizationSchema] Error deleting schema', error);
    throw new Error('Error al eliminar el esquema de personalización');
  }
}

/**
 * Gets the customization schema for a product
 * First checks if the product has a custom schema ID
 * If not, falls back to the category's schema
 */
export async function getSchemaForProduct(
  productId: string,
  categoryId: string
): Promise<CustomizationSchema | null> {
  try {
    // First, check if the product has a custom schema ID
    const productRef = doc(db, 'products', productId);
    const productDoc = await getDoc(productRef);

    if (productDoc.exists()) {
      const productData = productDoc.data();

      // If product has a custom schema ID, use that
      if (productData.customizationSchemaId) {
        const customSchema = await loadCustomizationSchema(productData.customizationSchemaId);
        if (customSchema) {
          logger.debug('[getSchemaForProduct] Using custom schema', {
            productId,
            schemaId: productData.customizationSchemaId
          });
          return customSchema.schema;
        }
      }
    }

    // Fall back to category schema
    const categorySchema = await loadCustomizationSchema(categoryId);
    if (categorySchema) {
      logger.debug('[getSchemaForProduct] Using category schema', { productId, categoryId });
      return categorySchema.schema;
    }

    logger.warn('[getSchemaForProduct] No schema found', { productId, categoryId });
    return null;
  } catch (error) {
    logger.error('[getSchemaForProduct] Error getting schema for product', error);
    return null;
  }
}
