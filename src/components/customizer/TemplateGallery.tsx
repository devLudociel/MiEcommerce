import React, { useState, useEffect } from 'react';
import { Sparkles, Search, Star, Crown, X } from 'lucide-react';
import type { DesignTemplate, CustomizationValue } from '../../types/customization';
import { logger } from '../../lib/logger';

interface TemplateGalleryProps {
  categoryId: string;
  onSelectTemplate: (template: DesignTemplate) => void;
  onClose?: () => void;
}

export default function TemplateGallery({
  categoryId,
  onSelectTemplate,
  onClose,
}: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'name'>('popular');

  // Fetch templates from API
  useEffect(() => {
    fetchTemplates();
  }, [categoryId]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/templates/get-by-category?category=${categoryId}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        logger.error('[TemplateGallery] Error fetching templates:', await response.text());
      }
    } catch (error) {
      logger.error('[TemplateGallery] Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique subcategories
  const subcategories = ['all', ...Array.from(new Set(templates.map((t) => t.subcategory)))];

  // Filter and sort templates
  const filteredTemplates = templates
    .filter((template) => {
      // Filter by subcategory
      if (selectedSubcategory !== 'all' && template.subcategory !== selectedSubcategory) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.popularity - a.popularity;
        case 'recent':
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const handleSelectTemplate = async (template: DesignTemplate) => {
    // Track usage
    try {
      await fetch('/api/templates/increment-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      });
    } catch (error) {
      logger.warn('[TemplateGallery] Failed to track template usage:', error);
    }

    onSelectTemplate(template);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando plantillas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              Plantillas Predefinidas
            </h3>
            <p className="text-purple-100 mt-1">
              Comienza con un diseño profesional y personalízalo a tu gusto
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
            placeholder="Buscar plantillas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-transparent focus:border-white focus:outline-none"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-3 items-center">
        {/* Subcategory Filter */}
        <div className="flex gap-2 flex-wrap">
          {subcategories.map((subcat) => (
            <button
              key={subcat}
              onClick={() => setSelectedSubcategory(subcat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedSubcategory === subcat
                  ? 'bg-purple-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
            >
              {subcat === 'all' ? 'Todas' : subcat}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'popular' | 'recent' | 'name')}
          className="ml-auto px-4 py-2 rounded-lg border bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="popular">Más populares</option>
          <option value="recent">Más recientes</option>
          <option value="name">Por nombre</option>
        </select>
      </div>

      {/* Templates Grid */}
      <div className="p-6">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-700 mb-2">
              No se encontraron plantillas
            </h4>
            <p className="text-gray-500">
              {searchQuery
                ? 'Intenta con otra búsqueda'
                : 'Aún no hay plantillas disponibles para esta categoría'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => handleSelectTemplate(template)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {filteredTemplates.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-600">
          Mostrando {filteredTemplates.length} de {templates.length} plantillas
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TEMPLATE CARD COMPONENT
// ============================================================================

interface TemplateCardProps {
  template: DesignTemplate;
  onSelect: () => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="group bg-white rounded-lg border-2 border-gray-200 hover:border-purple-400 transition-all overflow-hidden cursor-pointer hover:shadow-lg">
      {/* Thumbnail */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse bg-gray-200 w-full h-full"></div>
          </div>
        )}
        <img
          src={template.thumbnail}
          alt={template.name}
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-300 ${
            imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          } group-hover:scale-110`}
        />

        {/* Premium Badge */}
        {template.isPremium && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
            <Crown className="w-3 h-3" />
            Premium
          </div>
        )}

        {/* Popularity Badge */}
        {template.popularity > 0 && (
          <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {template.popularity}
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
          <button
            onClick={onSelect}
            className="px-6 py-2 bg-white text-purple-600 font-bold rounded-lg hover:bg-purple-50 transform translate-y-2 group-hover:translate-y-0 transition-all shadow-lg"
          >
            Usar Plantilla
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
          {template.name}
        </h4>
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{template.description}</p>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
