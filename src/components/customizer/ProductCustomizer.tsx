// src/components/customizers/ProductCustomizer.tsx
import { useEffect, useState, Suspense, lazy } from 'react';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { ProductAttributeValue } from '../../data/productAttributes';
import type { CustomizationSchema } from '../../types/customization';
import { logger } from '../../lib/logger';
import { getSchemaForProduct } from '../../lib/customization/schemas';
import CustomizerErrorBoundary from './CustomizerErrorBoundary';

// PERFORMANCE: Lazy load customizers for code splitting
const DynamicCustomizer = lazy(() => import('./DynamicCustomizer.tsx'));
const StepWizardCustomizer = lazy(() => import('./StepWizardCustomizer'));
const SimpleMugCustomizer = lazy(() => import('./mug/SimpleMugCustomizer'));

interface FirebaseProduct {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  basePrice: number;
  onSale?: boolean;
  salePrice?: number;
  images: string[];
  attributes: ProductAttributeValue[];
  tags: string[];
  featured: boolean;
  slug: string;
  active: boolean;
  customizationSchemaId?: string; // ID del schema de personalización (si existe)
}

interface Props {
  slug?: string;
  /** Force wizard mode (step-by-step) regardless of screen size */
  forceWizard?: boolean;
}

/**
 * Mapeo de categorías/subcategorías a IDs de schemas dinámicos
 * Estos IDs deben coincidir con los documentos en Firestore (customization_schemas collection)
 */
const SCHEMA_ID_MAP: Record<string, string> = {
  // Mapeo de subcategoryId/categoryId a schema IDs
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
  // Añade más según tus categorías
};

// Detectar el schema ID apropiado para el producto
function detectSchemaId(product: FirebaseProduct): string | null {
  // 1. Si el producto tiene customizationSchemaId explícito, usar ese
  if (product.customizationSchemaId) {
    return product.customizationSchemaId;
  }

  // 2. Buscar en subcategoryId
  const subcategoryLower = product.subcategoryId?.toLowerCase() || '';
  for (const [key, schemaId] of Object.entries(SCHEMA_ID_MAP)) {
    if (subcategoryLower.includes(key)) {
      return schemaId;
    }
  }

  // 3. Buscar en categoryId
  const categoryLower = product.categoryId?.toLowerCase() || '';
  for (const [key, schemaId] of Object.entries(SCHEMA_ID_MAP)) {
    if (categoryLower.includes(key)) {
      return schemaId;
    }
  }

  // 4. Buscar en tags
  const tags = product.tags?.map((t) => t.toLowerCase()) || [];
  for (const tag of tags) {
    if (SCHEMA_ID_MAP[tag]) {
      return SCHEMA_ID_MAP[tag];
    }
  }

  return null;
}

export default function ProductCustomizer({ slug, forceWizard }: Props) {
  const [product, setProduct] = useState<FirebaseProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dynamicSchema, setDynamicSchema] = useState<CustomizationSchema | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen for responsive customizer selection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);

        if (!slug) {
          setError('No se especificó el producto');
          return;
        }

        // Intentar buscar por slug
        const q = query(collection(db, 'products'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);

        let productData: FirebaseProduct | null = null;
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          productData = { id: docSnap.id, ...docSnap.data() } as FirebaseProduct;
        } else {
          // Intentar buscar por ID
          try {
            const ref = doc(db, 'products', slug);
            const docSnap = await getDoc(ref);
            if (docSnap.exists()) {
              productData = { id: docSnap.id, ...docSnap.data() } as FirebaseProduct;
            }
          } catch (e) {
            // Fallback search by ID failed - product may not exist
            logger.debug('[ProductCustomizer] Product not found by ID either:', e);
          }
        }

        if (!productData) {
          setError('Producto no encontrado');
          return;
        }

        setProduct(productData);

        // Intentar cargar esquema dinámico desde Firebase
        const schemaId = detectSchemaId(productData);
        if (schemaId) {
          logger.debug('[ProductCustomizer] Buscando schema dinámico:', schemaId);
          try {
            const schema = await getSchemaForProduct(productData.id, schemaId);
            if (schema) {
              setDynamicSchema(schema);
              logger.info('[ProductCustomizer] Schema dinámico cargado', {
                schemaId,
                fieldsCount: schema.fields.length,
              });
            } else {
              logger.warn('[ProductCustomizer] No se encontró schema dinámico para:', schemaId);
              setError(
                `Este producto no tiene configuración de personalización. Schema ID: ${schemaId} no encontrado.`
              );
            }
          } catch (schemaError) {
            logger.error('[ProductCustomizer] Error cargando schema dinámico', schemaError);
            setError(
              'Error al cargar la configuración de personalización. Intenta nuevamente más tarde.'
            );
          }
        } else {
          logger.warn('[ProductCustomizer] No schema ID detectado para producto:', productData.id);
          setError('Este producto no tiene configuración de personalización disponible.');
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error cargando producto');
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="loading-spinner mb-4" />
          <p className="text-gray-600">Cargando personalizador...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Producto no encontrado</h2>
          <p className="text-gray-600 mb-6">{error || 'No se pudo cargar el producto'}</p>
          <a
            href="/"
            className="px-6 py-3 bg-gradient-primary text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  // Renderizar DynamicCustomizer si hay schema cargado
  if (!dynamicSchema) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Personalización no configurada</h2>
          <p className="text-gray-600 mb-4">
            Este producto aún no tiene un schema de personalización configurado.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Si eres administrador, ve a la sección de administración para configurar el schema de
            este producto.
          </p>
          <a
            href={`/producto/${product?.slug || product?.id}`}
            className="px-6 py-3 bg-gradient-primary text-white rounded-xl font-bold hover:shadow-lg transition-all inline-block"
          >
            Volver al producto
          </a>
        </div>
      </div>
    );
  }

  logger.info('[ProductCustomizer] Renderizando DynamicCustomizer', {
    productId: product.id,
    productName: product.name,
    basePrice: product.basePrice,
    schemaFieldsCount: dynamicSchema.fields.length,
    schemaFields: dynamicSchema.fields.map((f) => ({
      id: f.id,
      label: f.label,
      type: f.fieldType,
    })),
  });

  // Detectar si es un producto de tazas para usar MugCustomizer
  const schemaId = detectSchemaId(product);
  const isMugProduct = schemaId === 'cat_tazas';

  // Determinar qué customizer usar:
  // - Tazas siempre usan SimpleMugCustomizer (optimizado para tazas)
  // - En móvil/tablet (<lg) o si forceWizard, usar StepWizardCustomizer
  // - En desktop, usar DynamicCustomizer tradicional
  const useWizard = !isMugProduct && (forceWizard || isMobile);

  logger.info('[ProductCustomizer] Seleccionando customizer', {
    productId: product.id,
    isMugProduct,
    isMobile,
    forceWizard,
    useWizard,
    customizer: isMugProduct
      ? 'SimpleMugCustomizer'
      : useWizard
        ? 'StepWizardCustomizer'
        : 'DynamicCustomizer',
  });

  return (
    <CustomizerErrorBoundary>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
            <div className="text-center">
              <div className="loading-spinner mb-4" />
              <p className="text-gray-600">Cargando herramientas de personalización...</p>
            </div>
          </div>
        }
      >
        {isMugProduct ? (
          <SimpleMugCustomizer product={product} />
        ) : useWizard ? (
          <StepWizardCustomizer product={product} schema={dynamicSchema} />
        ) : (
          <DynamicCustomizer product={product} schema={dynamicSchema} />
        )}
      </Suspense>
    </CustomizerErrorBoundary>
  );
}
