// src/components/pages/OccasionPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ProductGrid from '../products/ProductGrid';
import { occasions, occasionsBySlug, occasionColorClasses } from '../../data/occasions';

interface OccasionPageProps {
  slug: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  salePrice?: number;
  onSale?: boolean;
  images: string[];
  tags: string[];
  featured: boolean;
  slug: string;
  active: boolean;
  occasions?: string[];
  category?: string;
}

type SortBy = 'featured' | 'price-asc' | 'price-desc' | 'newest';

const OccasionPage: React.FC<OccasionPageProps> = ({ slug }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>('featured');

  const occasion = occasionsBySlug.get(slug);
  const colors = occasionColorClasses[occasion?.color ?? 'cyan'] ?? occasionColorClasses['cyan'];

  useEffect(() => {
    if (!slug) return;

    setLoading(true);

    const productQuery = query(
      collection(db, 'products'),
      where('occasions', 'array-contains', slug),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(
      productQuery,
      (snapshot) => {
        const productList: Product[] = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Product
        );
        setProducts(productList);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [slug]);

  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    switch (sortBy) {
      case 'price-asc':
        return sorted.sort((a, b) => (a.salePrice ?? a.basePrice) - (b.salePrice ?? b.basePrice));
      case 'price-desc':
        return sorted.sort((a, b) => (b.salePrice ?? b.basePrice) - (a.salePrice ?? a.basePrice));
      case 'newest':
        return sorted.reverse();
      case 'featured':
      default:
        return sorted.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
  }, [products, sortBy]);

  if (!occasion) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Ocasión no encontrada.</p>
        <a href="/" className="mt-4 inline-block text-cyan-600 hover:underline">
          Volver al inicio
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero de la ocasión */}
      <div className={`${colors.bg} border-b ${colors.border}`}>
        <div className="container mx-auto px-4 py-10">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-4">
            <a href="/" className="hover:text-gray-700">Inicio</a>
            <span className="mx-2">›</span>
            <a href="/ocasiones" className="hover:text-gray-700">Ocasiones</a>
            <span className="mx-2">›</span>
            <span className={colors.text}>{occasion.name}</span>
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-5xl">{occasion.icon}</span>
            <div>
              <h1 className={`text-3xl font-bold ${colors.text}`}>{occasion.name}</h1>
              <p className="text-gray-600 mt-1">{occasion.description}</p>
              {occasion.date && (
                <p className="text-sm text-gray-500 mt-1">📅 {occasion.date}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Otras ocasiones */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-3 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-xs text-gray-500 font-medium mr-1">Otras ocasiones:</span>
            {occasions
              .filter((o) => o.slug !== slug)
              .slice(0, 8)
              .map((o) => {
                const c = occasionColorClasses[o.color] ?? occasionColorClasses['cyan'];
                return (
                  <a
                    key={o.slug}
                    href={`/ocasion/${o.slug}`}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border} ${c.hover} transition-colors whitespace-nowrap`}
                  >
                    <span>{o.icon}</span>
                    <span>{o.name}</span>
                  </a>
                );
              })}
            <a
              href="/ocasiones"
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              Ver todas →
            </a>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-8">
        {/* Controles */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600">
            {loading ? 'Buscando productos...' : (
              <>
                <span className="font-semibold text-gray-800">{sortedProducts.length}</span>{' '}
                producto{sortedProducts.length !== 1 ? 's' : ''} para{' '}
                <span className={`font-semibold ${colors.text}`}>{occasion.name}</span>
              </>
            )}
          </p>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
          >
            <option value="featured">Destacados primero</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="newest">Más recientes</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-3" />
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">{occasion.icon}</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Próximamente productos para {occasion.name}
            </h2>
            <p className="text-gray-500 mb-6">
              Estamos preparando diseños especiales. Mientras tanto, explora nuestro catálogo.
            </p>
            <a
              href="/productos"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium"
            >
              Ver todos los productos
            </a>
          </div>
        ) : (
          <ProductGrid products={sortedProducts} />
        )}
      </div>
    </div>
  );
};

export default OccasionPage;
