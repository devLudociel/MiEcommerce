// src/components/customizers/ProductCustomizer.tsx
import { useEffect, useState, Suspense, lazy } from 'react';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { ProductAttributeValue } from '../../data/productAttributes';

// PERFORMANCE: Lazy load customizer components for code splitting
// Only the needed customizer will be loaded, reducing initial bundle size
const ShirtCustomizer = lazy(() => import('./ShirtCustomizer.tsx'));
const FrameCustomizer = lazy(() => import('./FrameCustomizer.tsx'));
const ResinCustomizer = lazy(() => import('./ResinCustomizer.tsx'));

interface FirebaseProduct {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  basePrice: number;
  images: string[];
  attributes: ProductAttributeValue[];
  tags: string[];
  featured: boolean;
  slug: string;
  active: boolean;
  customizerType?: 'shirt' | 'frame' | 'resin' | 'default'; // Campo para especificar tipo
}

interface Props {
  slug?: string;
}

// Mapeo de categorías/subcategorías a tipos de personalizador
const CUSTOMIZER_TYPE_MAP: Record<string, 'shirt' | 'frame' | 'resin' | 'default'> = {
  // Por subcategoryId
  ropa: 'shirt',
  camisetas: 'shirt',
  sudaderas: 'shirt',
  polos: 'shirt',
  cuadros: 'frame',
  marcos: 'frame',
  arte: 'frame',
  figuras: 'resin',
  resina: 'resin',
  esculturas: 'resin',
  // Añade más según tus subcategorías
};

// Detectar tipo de personalizador basado en el producto
function detectCustomizerType(product: FirebaseProduct): 'shirt' | 'frame' | 'resin' | 'default' {
  // 1. Si el producto tiene el campo customizerType, usarlo
  if (product.customizerType) {
    return product.customizerType;
  }

  // 2. Buscar en el mapeo por subcategoryId
  const subcategoryLower = product.subcategoryId?.toLowerCase() || '';
  for (const [key, type] of Object.entries(CUSTOMIZER_TYPE_MAP)) {
    if (subcategoryLower.includes(key)) {
      return type;
    }
  }

  // 3. Buscar en tags
  const tags = product.tags?.map((t) => t.toLowerCase()) || [];
  for (const tag of tags) {
    if (CUSTOMIZER_TYPE_MAP[tag]) {
      return CUSTOMIZER_TYPE_MAP[tag];
    }
  }

  // 4. Buscar en el nombre del producto
  const nameLower = product.name?.toLowerCase() || '';
  for (const [key, type] of Object.entries(CUSTOMIZER_TYPE_MAP)) {
    if (nameLower.includes(key)) {
      return type;
    }
  }

  // 5. Por defecto, usar personalizador de camisetas (el más común)
  return 'default';
}

export default function ProductCustomizer({ slug }: Props) {
  const [product, setProduct] = useState<FirebaseProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customizerType, setCustomizerType] = useState<'shirt' | 'frame' | 'resin' | 'default'>(
    'default'
  );

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
          } catch {}
        }

        if (!productData) {
          setError('Producto no encontrado');
          return;
        }

        setProduct(productData);

        // Detectar automáticamente el tipo de personalizador
        const type = detectCustomizerType(productData);
        setCustomizerType(type);

        console.log('🎨 Tipo de personalizador detectado:', type);
      } catch (e: any) {
        setError(e?.message || 'Error cargando producto');
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

  // PERFORMANCE: Render customizer with Suspense for lazy loading
  // Only the selected customizer will be loaded and rendered
  const CustomizerComponent = (() => {
    switch (customizerType) {
      case 'shirt':
        return <ShirtCustomizer product={product} />;
      case 'frame':
        return <FrameCustomizer product={product} />;
      case 'resin':
        return <ResinCustomizer product={product} />;
      default:
        return <ShirtCustomizer product={product} />;
    }
  })();

  return (
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
      {CustomizerComponent}
    </Suspense>
  );
}
