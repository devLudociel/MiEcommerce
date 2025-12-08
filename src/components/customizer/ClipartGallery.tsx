import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image as ImageIcon, Search, X, Sparkles } from 'lucide-react';
import type { Clipart } from '../../types/customization';
import { logger } from '../../lib/logger';

interface ClipartGalleryProps {
  onSelectClipart: (clipart: Clipart) => void;
  onClose?: () => void;
}

const CATEGORIES = [
  'Todos',
  'Iconos',
  'Animales',
  'Deportes',
  'Naturaleza',
  'Celebraciones',
  'Profesiones',
  'Emojis',
  'Formas',
  'Marcos',
];

export default function ClipartGallery({ onSelectClipart, onClose }: ClipartGalleryProps) {
  const [cliparts, setCliparts] = useState<Clipart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch cliparts from API
  useEffect(() => {
    fetchCliparts();
  }, [selectedCategory, page]);

  const fetchCliparts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: selectedCategory !== 'Todos' ? selectedCategory : '',
        page: page.toString(),
        limit: '20',
      });

      const response = await fetch(`/api/cliparts/get-all?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (page === 1) {
          setCliparts(data.cliparts || []);
        } else {
          setCliparts((prev) => [...prev, ...(data.cliparts || [])]);
        }
        setHasMore(data.hasMore || false);
      } else {
        logger.error('[ClipartGallery] Error fetching cliparts:', await response.text());
      }
    } catch (error) {
      logger.error('[ClipartGallery] Error fetching cliparts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Infinite scroll observer
  useEffect(() => {
    if (loading || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore]);

  // Filter cliparts by search query
  const filteredCliparts = cliparts.filter((clipart) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      clipart.name.toLowerCase().includes(query) ||
      clipart.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const handleSelectClipart = async (clipart: Clipart) => {
    // Track usage
    try {
      await fetch('/api/cliparts/increment-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clipartId: clipart.id }),
      });
    } catch (error) {
      logger.warn('[ClipartGallery] Failed to track clipart usage:', error);
    }

    onSelectClipart(clipart);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
    setCliparts([]);
  };

  return (
    <div className="bg-white rounded-xl border-2 border-pink-200 overflow-hidden max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Galería de Cliparts
            </h3>
            <p className="text-pink-100 mt-1">
              Añade elementos visuales a tu diseño sin necesidad de subirlos
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar cliparts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-transparent focus:border-white focus:outline-none"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="px-4 py-3 border-b bg-gray-50 overflow-x-auto flex-shrink-0">
        <div className="flex gap-2 min-w-max">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-pink-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Cliparts Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && page === 1 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando cliparts...</p>
            </div>
          </div>
        ) : filteredCliparts.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">No se encontraron cliparts</h4>
            <p className="text-gray-500">
              {searchQuery ? 'Intenta con otra búsqueda' : 'Aún no hay cliparts en esta categoría'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {filteredCliparts.map((clipart) => (
                <ClipartCard
                  key={clipart.id}
                  clipart={clipart}
                  onSelect={() => handleSelectClipart(clipart)}
                />
              ))}
            </div>

            {/* Load More Trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Cargando más...</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Stats */}
      {filteredCliparts.length > 0 && (
        <div className="px-6 py-3 bg-pink-50 border-t text-sm text-pink-700 text-center flex-shrink-0">
          <Sparkles className="w-4 h-4 inline mr-1" />
          {filteredCliparts.length} cliparts disponibles
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CLIPART CARD COMPONENT
// ============================================================================

interface ClipartCardProps {
  clipart: Clipart;
  onSelect: () => void;
}

function ClipartCard({ clipart, onSelect }: ClipartCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      onClick={onSelect}
      className="group aspect-square bg-white rounded-lg border-2 border-gray-200 hover:border-pink-400 transition-all overflow-hidden cursor-pointer hover:shadow-lg relative"
    >
      {/* Thumbnail */}
      <div className="w-full h-full p-2 flex items-center justify-center bg-gray-50">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse bg-gray-200 w-full h-full"></div>
          </div>
        )}
        {imageError ? (
          <ImageIcon className="w-8 h-8 text-gray-300" />
        ) : (
          <img
            src={clipart.thumbnailUrl || clipart.imageUrl}
            alt={clipart.name}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`max-w-full max-h-full object-contain transition-all duration-300 ${
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            } group-hover:scale-110`}
          />
        )}
      </div>

      {/* Hover Overlay with Name */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-2">
        <p className="text-white text-xs font-medium text-center line-clamp-2">{clipart.name}</p>
      </div>

      {/* Premium Badge */}
      {clipart.isPremium && (
        <div className="absolute top-1 right-1 bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded text-xs font-bold">
          PRO
        </div>
      )}

      {/* Format Badge */}
      <div className="absolute top-1 left-1 bg-white/90 text-gray-700 px-1.5 py-0.5 rounded text-xs font-medium uppercase">
        {clipart.format}
      </div>
    </div>
  );
}
