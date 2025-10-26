import { useState, useEffect } from 'react';
import { db, getProductReviewStats } from '../../lib/firebase';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  salePrice?: number;
  image: string;
  images?: string[];
  category: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  slug?: string;
  onSale: boolean;
}

export default function ProductGridOfertas() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query only products that are on sale
      const q = query(
        collection(db, 'products'),
        where('active', '==', true),
        where('onSale', '==', true)
      );

      const snap = await getDocs(q);

      const productsPromises = snap.docs.map(async (d: any) => {
        const data = d.data() || {};

        // Load review statistics
        let reviewStats = { averageRating: 0, totalReviews: 0 };
        try {
          const stats = await getProductReviewStats(d.id);
          reviewStats = {
            averageRating: stats.averageRating,
            totalReviews: stats.totalReviews,
          };
        } catch (reviewError) {
          console.error(`Error loading reviews for ${d.id}:`, reviewError);
        }

        return {
          id: d.id,
          name: data.name || 'Producto',
          description: data.description || '',
          basePrice: Number(data.basePrice) || 0,
          salePrice: data.salePrice ? Number(data.salePrice) : undefined,
          image: (data.images && data.images[0]) || FALLBACK_IMG_400x300,
          images: data.images || [],
          category: data.category || 'general',
          rating: reviewStats.averageRating,
          reviews: reviewStats.totalReviews,
          inStock: !!data.active,
          slug: data.slug || d.id,
          onSale: !!data.onSale,
        } as Product;
      });

      const list = await Promise.all(productsPromises);
      setProducts(list);
    } catch (e: any) {
      console.error('[ProductGridOfertas] Error:', e);
      setError(e?.message || 'Error cargando productos en oferta');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-red-500 border-r-transparent mb-4"></div>
          <p className="text-gray-600">Cargando ofertas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl p-12 text-center">
          <div className="text-6xl mb-4">🔥</div>
          <h2 className="text-3xl font-black text-gray-800 mb-4">
            No hay ofertas activas en este momento
          </h2>
          <p className="text-gray-600 mb-6">
            Vuelve pronto para encontrar increíbles descuentos en nuestros productos
          </p>
          <a
            href="/"
            className="inline-block bg-gradient-to-r from-cyan-500 to-magenta-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-xl transition-all"
          >
            Ver todos los productos
          </a>
        </div>
      </div>
    );
  }

  return (
    <section className="py-12 bg-gradient-to-b from-red-50 to-orange-50">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block bg-red-500 text-white px-6 py-2 rounded-full text-sm font-bold mb-4">
            🔥 {products.length} OFERTAS ACTIVAS
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6 text-gradient-rainbow">
            Productos en Oferta
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Aprovecha nuestros mejores descuentos antes de que se agoten
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products.map((product) => {
            const discountPercentage = product.salePrice
              ? Math.round((1 - product.salePrice / product.basePrice) * 100)
              : 0;

            return (
              <a
                key={product.id}
                href={`/producto?${product.slug ? 'slug=' + product.slug : 'id=' + product.id}`}
                className="group block relative bg-white rounded-3xl overflow-hidden shadow-lg transform transition-all duration-500 hover:scale-105 hover:shadow-2xl"
              >
                {/* Discount Badge */}
                <div className="absolute top-4 left-4 z-30">
                  <span className="px-4 py-2 text-sm font-bold bg-red-500 text-white rounded-full shadow-lg">
                    -{discountPercentage}%
                  </span>
                </div>

                {/* Product Image */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-70 transition-opacity duration-300" />
                </div>

                {/* Product Info */}
                <div className="p-6">
                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    {product.rating > 0 ? (
                      <span className="text-sm text-gray-500">
                        {product.rating.toFixed(1)} ({product.reviews})
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Sin reseñas</span>
                    )}
                  </div>

                  {/* Category */}
                  <p className="text-sm text-gray-500 uppercase tracking-wider font-medium mb-2">
                    {product.category}
                  </p>

                  {/* Name */}
                  <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-red-600 transition-colors">
                    {product.name}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>

                  {/* Price */}
                  <div className="flex items-center gap-3">
                    {product.salePrice ? (
                      <>
                        <span className="text-2xl font-bold text-red-600">
                          €{product.salePrice.toFixed(2)}
                        </span>
                        <span className="text-lg text-gray-400 line-through">
                          €{product.basePrice.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-red-600">
                        €{product.basePrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <a
            href="/ofertas"
            className="inline-block bg-white text-red-600 px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transition-all border-2 border-red-200"
          >
            Ver todas las promociones →
          </a>
        </div>
      </div>
    </section>
  );
}
