import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getSchemaForProduct, loadCustomizationSchema } from '../../lib/customization/schemas';
import type { CustomizationSchema } from '../../types/customization';

interface ProductDebugPanelProps {
  slug: string;
}

interface ProductData {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  subcategoryId: string;
  tags: string[];
  customizerType?: string;
  customizationSchemaId?: string;
  [key: string]: string | string[] | undefined;
}

export default function ProductDebugPanel({ slug }: ProductDebugPanelProps) {
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [detectedSchemaId, setDetectedSchemaId] = useState<string | null>(null);
  const [loadedSchema, setLoadedSchema] = useState<CustomizationSchema | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function debugProduct() {
      try {
        setLoading(true);
        setError(null);

        // 1. Buscar producto por slug
        const q = query(collection(db, 'products'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);

        let productData: ProductData | null = null;
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          productData = { id: docSnap.id, ...docSnap.data() } as ProductData;
        } else {
          // Intentar por ID
          try {
            const ref = doc(db, 'products', slug);
            const docSnap = await getDoc(ref);
            if (docSnap.exists()) {
              productData = { id: docSnap.id, ...docSnap.data() } as ProductData;
            }
          } catch (e) {
            // Fallback search by ID failed - product may not exist
            console.debug('[ProductDebugPanel] Product not found by ID:', e);
          }
        }

        if (!productData) {
          setError('Producto no encontrado');
          return;
        }

        setProduct(productData);

        // 2. Detectar schema ID usando la misma lógica que ProductCustomizer
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

        let schemaId: string | null = null;

        // 2.1 CustomizationSchemaId explícito
        if (productData.customizationSchemaId) {
          schemaId = productData.customizationSchemaId;
        }

        // 2.2 Buscar en subcategoryId
        if (!schemaId) {
          const subcategoryLower = productData.subcategoryId?.toLowerCase() || '';
          for (const [key, id] of Object.entries(SCHEMA_ID_MAP)) {
            if (subcategoryLower.includes(key)) {
              schemaId = id;
              break;
            }
          }
        }

        // 2.3 Buscar en categoryId
        if (!schemaId) {
          const categoryLower = productData.categoryId?.toLowerCase() || '';
          for (const [key, id] of Object.entries(SCHEMA_ID_MAP)) {
            if (categoryLower.includes(key)) {
              schemaId = id;
              break;
            }
          }
        }

        // 2.4 Buscar en tags
        if (!schemaId) {
          const tags = productData.tags?.map((t) => t.toLowerCase()) || [];
          for (const tag of tags) {
            if (SCHEMA_ID_MAP[tag]) {
              schemaId = SCHEMA_ID_MAP[tag];
              break;
            }
          }
        }

        setDetectedSchemaId(schemaId);

        // 3. Intentar cargar schema desde Firebase
        if (schemaId) {
          try {
            const schema = await getSchemaForProduct(productData.id, schemaId);
            setLoadedSchema(schema);
          } catch (e) {
            console.error('Error loading schema:', e);
          }
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }

    debugProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Analizando producto...</span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
        <div className="text-2xl mb-2">❌</div>
        <h3 className="text-lg font-bold text-red-900 mb-2">Error</h3>
        <p className="text-red-700">{error || 'Producto no encontrado'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Datos del Producto */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📦 Datos del Producto</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-semibold text-gray-600">ID:</span>
            <p className="text-gray-900 font-mono text-sm">{product.id}</p>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-600">Nombre:</span>
            <p className="text-gray-900">{product.name}</p>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-600">Slug:</span>
            <p className="text-gray-900 font-mono text-sm">{product.slug}</p>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-600">Category ID:</span>
            <p className="text-gray-900 font-mono text-sm">{product.categoryId || '(vacío)'}</p>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-600">Subcategory ID:</span>
            <p className="text-gray-900 font-mono text-sm">{product.subcategoryId || '(vacío)'}</p>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-600">Tags:</span>
            <p className="text-gray-900 text-sm">
              {product.tags?.length > 0 ? product.tags.join(', ') : '(vacío)'}
            </p>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-600">Customizer Type:</span>
            <p className="text-gray-900 font-mono text-sm">
              {product.customizerType || '(no especificado)'}
            </p>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-600">Customization Schema ID:</span>
            <p className="text-gray-900 font-mono text-sm">
              {product.customizationSchemaId || '(no especificado)'}
            </p>
          </div>
        </div>
      </div>

      {/* Schema Detectado */}
      <div
        className={`rounded-xl shadow-lg p-6 ${
          detectedSchemaId ? 'bg-green-50 border-2 border-green-200' : 'bg-orange-50 border-2 border-orange-200'
        }`}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {detectedSchemaId ? '✅ Schema Detectado' : '⚠️ No se Detectó Schema'}
        </h2>

        {detectedSchemaId ? (
          <div>
            <p className="text-green-800 mb-2">
              Se detectó el schema ID: <code className="bg-green-100 px-2 py-1 rounded font-mono">{detectedSchemaId}</code>
            </p>
            <p className="text-sm text-green-700">
              El producto debería usar el customizer dinámico con este schema.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-orange-800 mb-4">
              No se pudo detectar un schema ID para este producto. Está usando el customizer tradicional (fallback).
            </p>
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <p className="text-sm font-semibold text-gray-900 mb-2">💡 Soluciones:</p>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>
                  • Verifica que <code className="bg-gray-100 px-1 rounded">categoryId</code> o{' '}
                  <code className="bg-gray-100 px-1 rounded">subcategoryId</code> contenga una de estas palabras:
                  camisetas, ropa, cuadros, marcos, resina, figuras, tazas
                </li>
                <li>
                  • O agrega un campo <code className="bg-gray-100 px-1 rounded">customizationSchemaId</code> con el ID del schema (ej: "cat_camisetas")
                </li>
                <li>• O agrega tags que contengan esas palabras clave</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Schema Cargado */}
      <div
        className={`rounded-xl shadow-lg p-6 ${
          loadedSchema ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 border-2 border-gray-200'
        }`}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {loadedSchema ? '🎨 Schema Cargado desde Firebase' : '📭 No hay Schema en Firebase'}
        </h2>

        {loadedSchema ? (
          <div>
            <p className="text-blue-800 mb-3">
              ✅ Se cargó exitosamente el schema desde Firebase con{' '}
              <strong>{loadedSchema.fields.length} campos</strong>
            </p>

            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <p className="text-sm font-semibold text-gray-900 mb-3">Campos configurados:</p>
              <div className="space-y-2">
                {loadedSchema.fields.map((field, idx) => (
                  <div key={field.id} className="flex items-start gap-2 text-sm">
                    <span className="font-bold text-gray-600">{idx + 1}.</span>
                    <div className="flex-1">
                      <span className="font-semibold text-gray-900">{field.label}</span>
                      <span className="text-gray-500 ml-2">
                        ({field.fieldType})
                        {field.required && <span className="text-red-600 ml-1">*</span>}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3 bg-green-100 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Estado:</strong> Este producto debería mostrar el DynamicCustomizer con los campos configurados. ✅
              </p>
            </div>
          </div>
        ) : detectedSchemaId ? (
          <div>
            <p className="text-gray-700 mb-4">
              ⚠️ Se detectó el schema ID <code className="bg-gray-200 px-2 py-1 rounded font-mono">{detectedSchemaId}</code>,
              pero no existe en Firebase.
            </p>
            <div className="bg-white rounded-lg p-4 border border-gray-300">
              <p className="text-sm font-semibold text-gray-900 mb-2">💡 Solución:</p>
              <p className="text-sm text-gray-700 mb-3">
                Ve a <strong>/admin/customization</strong> y configura el schema para esta categoría.
              </p>
              <a
                href="/admin/customization"
                className="inline-block px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors text-sm"
              >
                Ir al Admin Panel →
              </a>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-700">
              No se puede cargar ningún schema porque no se detectó un schema ID para este producto.
            </p>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">🛠️ Acciones</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/personalizar/${slug}`}
            target="_blank"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Ver Página de Personalización →
          </a>
          <a
            href="/admin/customization"
            className="px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors"
          >
            Configurar Schemas →
          </a>
        </div>
      </div>
    </div>
  );
}
