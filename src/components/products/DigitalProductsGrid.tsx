import { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  Download,
  FileArchive,
  Image as ImageIcon,
  FileText,
  Package,
  Search,
  Filter,
  X,
  Star,
  Sparkles,
  Zap,
  ShoppingCart,
  Eye,
  Loader,
} from 'lucide-react';
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
  createdAt?: any;
}

type FilterType = 'all' | 'featured' | 'popular';
type SortType = 'newest' | 'price-low' | 'price-high' | 'name';

export default function DigitalProductsGrid() {
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadDigitalProducts();
  }, []);

  const loadDigitalProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      logger.debug('[DigitalProductsGrid] Loading digital products');

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
            createdAt: data.createdAt,
          };
        })
        .sort((a, b) => {
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

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    products.forEach((p) => p.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply filter type
    if (filter === 'featured') {
      filtered = filtered.filter((p) => p.featured);
    }

    // Apply tag filters
    if (selectedTags.length > 0) {
      filtered = filtered.filter((p) =>
        selectedTags.every((tag) => p.tags.includes(tag))
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.basePrice - b.basePrice;
        case 'price-high':
          return b.basePrice - a.basePrice;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
        default:
          if (a.createdAt && b.createdAt) {
            return b.createdAt.seconds - a.createdAt.seconds;
          }
          return 0;
      }
    });

    return sorted;
  }, [products, searchQuery, filter, selectedTags, sortBy]);

  const getFileIcon = (format: string, className = 'w-4 h-4') => {
    switch (format) {
      case 'image':
        return <ImageIcon className={className} />;
      case 'pdf':
        return <FileText className={className} />;
      case 'zip':
        return <FileArchive className={className} />;
      default:
        return <Package className={className} />;
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader className="w-12 h-12 animate-spin text-cyan-600 mb-4" />
        <p className="text-gray-600">Cargando productos digitales...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-red-900 mb-2">
            Error al cargar productos
          </h3>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={loadDigitalProducts}
            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-full flex items-center justify-center">
            <Download className="w-12 h-12 text-cyan-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            No hay productos digitales disponibles
          </h3>
          <p className="text-gray-600 mb-4 leading-relaxed">
            Los productos digitales aparecerán aquí una vez que sean creados.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 mb-6">
            <p className="mb-2">
              Los productos deben tener el campo{' '}
              <code className="bg-white px-2 py-1 rounded font-mono text-cyan-600">
                isDigital: true
              </code>{' '}
              en Firestore.
            </p>
            <p>
              Crea productos digitales desde el{' '}
              <a
                href="/admin/digital-products"
                className="text-cyan-600 hover:underline font-medium"
              >
                panel de administración
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl p-6 md:p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
            <Download className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black">Productos Digitales</h1>
            <p className="text-cyan-100">
              {products.length} producto{products.length !== 1 ? 's' : ''} disponible
              {products.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-medium">Descarga</span>
            </div>
            <p className="text-xl font-bold">Instantánea</p>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-medium">Acceso</span>
            </div>
            <p className="text-xl font-bold">Ilimitado</p>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4" />
              <span className="text-xs font-medium">Calidad</span>
            </div>
            <p className="text-xl font-bold">Premium</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, descripción o etiquetas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 font-medium transition-all ${
              showFilters || filter !== 'all' || selectedTags.length > 0
                ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                : 'border-gray-300 hover:border-gray-400 text-gray-700'
            }`}
          >
            <Filter className="w-5 h-5" />
            <span className="hidden md:inline">Filtros</span>
            {(filter !== 'all' || selectedTags.length > 0) && (
              <span className="w-6 h-6 bg-cyan-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                {(filter !== 'all' ? 1 : 0) + selectedTags.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="space-y-4 pt-4 border-t border-gray-200 animate-in slide-in-from-top duration-200">
            {/* Quick Filters */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Tipo de Producto
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(['all', 'featured'] as FilterType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                      filter === type
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'all' && (
                      <>
                        <Package className="w-4 h-4" />
                        Todos
                      </>
                    )}
                    {type === 'featured' && (
                      <>
                        <Star className="w-4 h-4" />
                        Destacados
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tag Filters */}
            {allTags.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Etiquetas
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-cyan-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="w-full md:w-auto px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none text-sm font-medium"
              >
                <option value="newest">Más reciente</option>
                <option value="price-low">Precio: Menor a Mayor</option>
                <option value="price-high">Precio: Mayor a Menor</option>
                <option value="name">Nombre (A-Z)</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(filter !== 'all' || selectedTags.length > 0 || searchQuery) && (
              <button
                onClick={() => {
                  setFilter('all');
                  setSelectedTags([]);
                  setSearchQuery('');
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-colors"
              >
                Limpiar todos los filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      {(searchQuery || filter !== 'all' || selectedTags.length > 0) && (
        <div className="flex items-center justify-between px-4 py-3 bg-cyan-50 border border-cyan-200 rounded-lg">
          <p className="text-cyan-800 font-medium">
            {filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''}{' '}
            encontrado{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No se encontraron productos
          </h3>
          <p className="text-gray-600 mb-6">
            Intenta cambiar los filtros o el término de búsqueda
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilter('all');
              setSelectedTags([]);
            }}
            className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <a
              key={product.id}
              href={`/producto/${product.slug}`}
              className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-cyan-300"
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                <img
                  src={product.images[0] || FALLBACK_IMG_400x300}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />

                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-white rounded-full p-3 transform scale-75 group-hover:scale-100 transition-transform">
                    <Eye className="w-6 h-6 text-cyan-600" />
                  </div>
                </div>

                {/* Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                  {product.featured && (
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                      <Star className="w-3 h-3 fill-current" />
                      Destacado
                    </div>
                  )}
                  <div className="ml-auto bg-cyan-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                    <Download className="w-3 h-3" />
                    Digital
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-cyan-600 transition-colors">
                  {product.name}
                </h3>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>

                {/* Files Info */}
                {product.digitalFiles && product.digitalFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {product.digitalFiles.slice(0, 3).map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 text-xs bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200"
                      >
                        {getFileIcon(file.format, 'w-3.5 h-3.5')}
                        <span className="uppercase font-medium">{file.format}</span>
                      </div>
                    ))}
                    {product.digitalFiles.length > 3 && (
                      <div className="text-xs bg-cyan-50 text-cyan-700 px-3 py-1.5 rounded-lg font-medium border border-cyan-200">
                        +{product.digitalFiles.length - 3} más
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                {product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {product.tags.slice(0, 2).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                    {product.tags.length > 2 && (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        +{product.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* Price and CTA */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div>
                    <span className="text-2xl font-black text-cyan-600">
                      €{product.basePrice.toFixed(2)}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">Descarga instantánea</p>
                  </div>
                  <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-cyan-900 mb-2 text-lg">
              ¿Por qué comprar productos digitales?
            </h4>
            <ul className="space-y-2 text-sm text-cyan-800">
              <li className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                <span>Descarga instantánea después de la compra</span>
              </li>
              <li className="flex items-start gap-2">
                <Download className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                <span>Acceso ilimitado y permanente desde tu biblioteca</span>
              </li>
              <li className="flex items-start gap-2">
                <Star className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                <span>Archivos de alta calidad listos para usar</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
