// src/components/sections/BestSellers.tsx
import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import { logger } from '../../lib/logger';

interface Product {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  slug?: string;
  salesCount: number;
  rating: number;
}

export default function BestSellers() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const loadBestSellers = async () => {
      try {
        setLoading(true);
        // Fetch active products without orderBy to avoid needing a composite index
        const q = query(
          collection(db, 'products'),
          where('active', '==', true),
          limit(20) // Get more products to sort client-side
        );

        const snapshot = await getDocs(q);
        const items: Product[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Producto',
            price: Number(data.basePrice) || 0,
            salePrice: data.salePrice ? Number(data.salePrice) : undefined,
            image: (data.images && data.images[0]) || FALLBACK_IMG_400x300,
            slug: data.slug || doc.id,
            salesCount: data.salesCount || 0,
            rating: data.rating || 4.5,
          };
        });

        // Sort by salesCount client-side and take top 6
        const sortedItems = items
          .sort((a, b) => b.salesCount - a.salesCount)
          .slice(0, 6);

        setProducts(sortedItems);
        logger.info('[BestSellers] Loaded products', { count: sortedItems.length });
      } catch (error) {
        logger.error('[BestSellers] Error loading products', error);
      } finally {
        setLoading(false);
      }
    };

    loadBestSellers();
  }, []);

  // Auto-rotate products every 4 seconds
  useEffect(() => {
    if (products.length === 0) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % products.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [products.length]);

  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-96 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-cyan-50 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-cyan-200 to-blue-200 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block mb-4">
            <span className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold uppercase tracking-wider rounded-full shadow-lg">
              🔥 Los más vendidos
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Favoritos de nuestros clientes
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Los productos más populares que nuestros clientes adoran
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {products.map((product, index) => (
            <a
              key={product.id}
              href={`/producto/${product.slug}`}
              className={`group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 ${
                activeIndex === index ? 'ring-4 ring-cyan-400 ring-opacity-50' : ''
              }`}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Rank Badge */}
              <div className="absolute top-2 left-2 z-10">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm font-bold">#{index + 1}</span>
                </div>
              </div>

              {/* Sale Badge */}
              {product.salePrice && (
                <div className="absolute top-2 right-2 z-10">
                  <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                    -{Math.round((1 - product.salePrice / product.price) * 100)}%
                  </span>
                </div>
              )}

              {/* Product Image */}
              <div className="relative h-32 md:h-48 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                {/* Quick view button on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="px-3 py-1 bg-white text-gray-800 text-xs font-semibold rounded-full shadow-lg">
                    Ver detalles
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-3 md:p-4">
                {/* Rating */}
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-3 h-3 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Name */}
                <h3 className="text-sm md:text-base font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-cyan-600 transition-colors">
                  {product.name}
                </h3>

                {/* Price */}
                <div className="flex flex-col gap-1">
                  {product.salePrice ? (
                    <>
                      <span className="text-lg md:text-xl font-bold text-red-600">
                        €{product.salePrice.toFixed(2)}
                      </span>
                      <span className="text-xs md:text-sm text-gray-400 line-through">
                        €{product.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg md:text-xl font-bold text-cyan-600">
                      €{product.price.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Sales count */}
                <div className="mt-2 text-xs text-gray-500">
                  {product.salesCount} vendidos
                </div>
              </div>

              {/* Shine effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 opacity-20"></div>
              </div>
            </a>
          ))}
        </div>

        {/* Navigation Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {products.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`transition-all duration-300 rounded-full ${
                index === activeIndex
                  ? 'bg-cyan-500 w-8 h-3'
                  : 'bg-gray-300 w-3 h-3 hover:bg-gray-400'
              }`}
              aria-label={`Destacar producto ${index + 1}`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <div className="text-center mt-12">
          <a
            href="/productos"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-full hover:from-cyan-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <span>Ver todos los productos</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
