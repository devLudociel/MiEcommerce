import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Download, FileArchive, Image as ImageIcon, FileText, Package } from 'lucide-react';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import { logger } from '../../lib/logger';

interface DigitalProduct {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  images: string[];
  slug: string;
  tags: string[];
  featured: boolean;
  digitalFiles?: Array<{
    id: string;
    name: string;
    format: 'image' | 'pdf' | 'zip' | 'other';
  }>;
  createdAt?: any; // Firestore Timestamp
}

export default function DigitalProductsGrid() {
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'featured'>('all');

  useEffect(() => {
    loadDigitalProducts();
  }, []);

  const loadDigitalProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.debug('[DigitalProductsGrid] Loading digital products');

      // Query without orderBy to avoid needing composite index
      const q = query(
        collection(db, 'products'),
        where('active', '==', true),
        where('isDigital', '==', true)
      );

      const snapshot = await getDocs(q);
      logger.info(`[DigitalProductsGrid] Found ${snapshot.docs.length} documents`);

      const items: DigitalProduct[] = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          logger.debug(`[DigitalProductsGrid] Product ${doc.id}:`, {
            name: data.name,
            isDigital: data.isDigital,
            active: data.active,
            category: data.category,
          });
          return {
            id: doc.id,
            name: data.name || 'Producto Digital',
            description: data.description || '',
            basePrice: Number(data.basePrice) || 0,
            images: data.images || [],
            slug: data.slug || doc.id,
            tags: data.tags || [],
            featured: data.featured || false,
            digitalFiles: data.digitalFiles || [],
            createdAt: data.createdAt, // Keep for sorting
          };
        })
        .sort((a, b) => {
          // Sort by createdAt descending (newest first)
          if (a.createdAt && b.createdAt) {
            return b.createdAt.seconds - a.createdAt.seconds;
          }
          return 0;
        });

      setProducts(items);
      logger.info(`[DigitalProductsGrid] Loaded ${items.length} digital products`);
    } catch (error) {
      logger.error('[DigitalProductsGrid] Error loading products', error);
      setError(error instanceof Error ? error.message : 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = filter === 'featured' ? products.filter((p) => p.featured) : products;

  const getFileIcon = (format: string) => {
    switch (format) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'pdf':
        return <FileText className="w-4 h-4" />;
      case 'zip':
        return <FileArchive className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mb-4"></div>
          <p className="text-gray-600">Cargando productos digitales...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-red-900 mb-2">Error al cargar productos</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadDigitalProducts}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <Download className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No hay productos digitales disponibles
        </h3>
        <p className="text-gray-600 mb-4">
          Los productos deben tener el campo{' '}
          <code className="bg-gray-100 px-2 py-1 rounded">isDigital: true</code> en Firestore.
        </p>
        <p className="text-gray-500 text-sm">
          Crea productos digitales desde el{' '}
          <a href="/admin/digital-products" className="text-cyan-600 hover:underline">
            panel de administración
          </a>
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos ({products.length})
          </button>
          <button
            onClick={() => setFilter('featured')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'featured'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⭐ Destacados ({products.filter((p) => p.featured).length})
          </button>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <a
            key={product.id}
            href={`/producto/${product.slug}`}
            className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
          >
            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-gray-100">
              <img
                src={product.images[0] || FALLBACK_IMG_400x300}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              {product.featured && (
                <div className="absolute top-3 left-3 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded">
                  ⭐ Destacado
                </div>
              )}
              <div className="absolute top-3 right-3 bg-cyan-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                <Download className="w-3 h-3" />
                Digital
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-cyan-600 transition-colors">
                {product.name}
              </h3>

              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>

              {/* Files Info */}
              {product.digitalFiles && product.digitalFiles.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {product.digitalFiles.slice(0, 3).map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                    >
                      {getFileIcon(file.format)}
                      <span className="uppercase">{file.format}</span>
                    </div>
                  ))}
                  {product.digitalFiles.length > 3 && (
                    <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      +{product.digitalFiles.length - 3} más
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {product.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="text-xs bg-cyan-50 text-cyan-700 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Price */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-2xl font-bold text-cyan-600">
                  €{product.basePrice.toFixed(2)}
                </span>
                <span className="text-xs text-gray-500">Descarga instantánea</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
