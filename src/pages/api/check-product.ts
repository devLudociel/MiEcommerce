import type { APIRoute } from 'astro';
import { collection, query, where, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { loadCustomizationSchema } from '../../lib/customization/schemas';
import { rateLimitPersistent } from '../../lib/rateLimitPersistent';
import { logger } from '../../lib/logger';

// Type for product data from Firestore
interface ProductDocument {
  id: string;
  name: string;
  slug: string;
  categoryId?: string;
  subcategoryId?: string;
  customizationSchemaId?: string;
  tags?: string[];
}

export const GET: APIRoute = async ({ request, url }) => {
  // SECURITY: Rate limiting for unauthenticated endpoint
  const rateLimitResult = await rateLimitPersistent(request, 'check-product', {
    intervalMs: 60_000, // 1 minute
    max: 10, // 10 requests per minute per IP
  });

  if (!rateLimitResult.ok) {
    return new Response(
      JSON.stringify({
        error: 'Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde.',
        retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  try {
    const slug = url.searchParams.get('slug');
    const action = url.searchParams.get('action'); // 'check' or 'fix'

    if (!slug) {
      return new Response(JSON.stringify({ error: 'Missing slug parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Buscar producto
    const q = query(collection(db, 'products'), where('slug', '==', slug), limit(1));
    const snap = await getDocs(q);

    let productData: ProductDocument | null = null;
    let productId: string | null = null;

    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data();
      productId = docSnap.id;
      productData = {
        id: docSnap.id,
        name: data.name ?? '',
        slug: data.slug ?? '',
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        customizationSchemaId: data.customizationSchemaId,
        tags: data.tags,
      };
    }

    if (!productData || !productId) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Detectar schema ID
    const SCHEMA_ID_MAP: Record<string, string> = {
      camisetas: 'cat_camisetas',
      ropa: 'cat_camisetas',
      cuadros: 'cat_cuadros',
      marcos: 'cat_cuadros',
      arte: 'cat_cuadros',
      resina: 'cat_resina',
      figuras: 'cat_resina',
      esculturas: 'cat_resina',
      tazas: 'cat_tazas',
      taza: 'cat_tazas',
    };

    let detectedSchemaId: string | null = null;
    let detectionMethod: string = 'none';

    // Detectar por customizationSchemaId explícito
    if (productData.customizationSchemaId) {
      detectedSchemaId = productData.customizationSchemaId;
      detectionMethod = 'customizationSchemaId';
    }
    // Detectar por subcategoryId
    else {
      const subcategoryLower = productData.subcategoryId?.toLowerCase() || '';
      for (const [key, schemaId] of Object.entries(SCHEMA_ID_MAP)) {
        if (subcategoryLower.includes(key)) {
          detectedSchemaId = schemaId;
          detectionMethod = 'subcategoryId';
          break;
        }
      }
    }

    // Detectar por categoryId si no encontró en subcategoryId
    if (!detectedSchemaId) {
      const categoryLower = productData.categoryId?.toLowerCase() || '';
      for (const [key, schemaId] of Object.entries(SCHEMA_ID_MAP)) {
        if (categoryLower.includes(key)) {
          detectedSchemaId = schemaId;
          detectionMethod = 'categoryId';
          break;
        }
      }
    }

    // Detectar por tags
    if (!detectedSchemaId) {
      const tags = productData.tags?.map((t: string) => t.toLowerCase()) || [];
      for (const tag of tags) {
        if (SCHEMA_ID_MAP[tag]) {
          detectedSchemaId = SCHEMA_ID_MAP[tag];
          detectionMethod = 'tags';
          break;
        }
      }
    }

    // 3. Verificar si el schema existe en Firebase
    let schemaExists = false;
    let schemaFields = 0;
    if (detectedSchemaId) {
      try {
        const schema = await loadCustomizationSchema(detectedSchemaId);
        if (schema) {
          schemaExists = true;
          schemaFields = schema.schema.fields.length;
        }
      } catch (e) {
        logger.error('[check-product] Error loading schema:', e);
      }
    }

    // 4. Si action=fix, agregar el campo customizationSchemaId
    if (action === 'fix' && detectedSchemaId && !productData.customizationSchemaId) {
      try {
        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, {
          customizationSchemaId: detectedSchemaId,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Product updated successfully',
            product: {
              id: productId,
              name: productData.name,
              slug: productData.slug,
              categoryId: productData.categoryId,
              subcategoryId: productData.subcategoryId,
              customizationSchemaId: detectedSchemaId,
              tags: productData.tags,
            },
            schema: {
              detected: true,
              schemaId: detectedSchemaId,
              detectionMethod,
              exists: schemaExists,
              fieldsCount: schemaFields,
            },
            action: 'fixed',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (e: unknown) {
        logger.error('[check-product] Failed to update product:', e);
        // SECURITY FIX: Don't expose error details in production
        return new Response(
          JSON.stringify({
            error: 'Failed to update product',
            details: import.meta.env.DEV ? (e instanceof Error ? e.message : undefined) : undefined,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 5. Retornar información
    return new Response(
      JSON.stringify({
        success: true,
        product: {
          id: productId,
          name: productData.name,
          slug: productData.slug,
          categoryId: productData.categoryId,
          subcategoryId: productData.subcategoryId,
          customizationSchemaId: productData.customizationSchemaId,
          tags: productData.tags,
        },
        schema: {
          detected: !!detectedSchemaId,
          schemaId: detectedSchemaId,
          detectionMethod,
          exists: schemaExists,
          fieldsCount: schemaFields,
        },
        recommendations: detectedSchemaId
          ? schemaExists
            ? 'Product is correctly configured! It should use the dynamic customizer.'
            : `Schema ID detected (${detectedSchemaId}) but schema not found in Firebase. Create it in /admin/customization`
          : 'No schema detected. Update product categoryId/subcategoryId to include: camisetas, cuadros, resina, or tazas',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    logger.error('[check-product] Internal server error:', error);
    // SECURITY FIX: Don't expose error details in production
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
