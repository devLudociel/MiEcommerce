import React, { useState, useEffect } from 'react';
import { Save, Trash2, Copy, ExternalLink, Star, StarOff, Loader, ShoppingBag } from 'lucide-react';
import type { SavedDesign } from '../../types/customization';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';
import { useAuth } from '../hooks/useAuth';

export default function SavedDesignsPanel() {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState<SavedDesign | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDesigns();
    }
  }, [user]);

  const fetchDesigns = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/designs/get-user-designs');
      if (response.ok) {
        const data = await response.json();
        setDesigns(data.designs || []);
      } else {
        logger.error('[SavedDesigns] Error fetching designs');
      }
    } catch (error) {
      logger.error('[SavedDesigns] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (designId: string, currentFavorite: boolean) => {
    try {
      const response = await fetch('/api/designs/toggle-favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId, isFavorite: !currentFavorite }),
      });

      if (response.ok) {
        setDesigns((prev) =>
          prev.map((d) => (d.id === designId ? { ...d, isFavorite: !currentFavorite } : d))
        );
        notify.success(currentFavorite ? 'Eliminado de favoritos' : 'Añadido a favoritos');
      }
    } catch (error) {
      logger.error('[SavedDesigns] Error toggling favorite:', error);
      notify.error('Error al actualizar favorito');
    }
  };

  const handleDelete = async (designId: string) => {
    setDeletingId(designId);
    try {
      const response = await fetch('/api/designs/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId }),
      });

      if (response.ok) {
        setDesigns((prev) => prev.filter((d) => d.id !== designId));
        notify.success('Diseño eliminado correctamente');
        setShowDeleteModal(false);
        setSelectedDesign(null);
      } else {
        notify.error('Error al eliminar el diseño');
      }
    } catch (error) {
      logger.error('[SavedDesigns] Error deleting:', error);
      notify.error('Error al eliminar el diseño');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUseInProduct = (design: SavedDesign) => {
    // Navigate to product page with design ID
    window.location.href = `/productos/${design.originalProductId}?loadDesign=${design.id}`;
  };

  const handleUseInOtherProduct = (design: SavedDesign) => {
    // Navigate to category page to select product
    window.location.href = `/productos?category=${design.originalCategory}&applyDesign=${design.id}`;
  };

  const handleDuplicate = async (designId: string) => {
    try {
      const response = await fetch('/api/designs/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId }),
      });

      if (response.ok) {
        await response.json();
        notify.success('Diseño duplicado correctamente');
        fetchDesigns(); // Refresh list
      } else {
        notify.error('Error al duplicar el diseño');
      }
    } catch (error) {
      logger.error('[SavedDesigns] Error duplicating:', error);
      notify.error('Error al duplicar el diseño');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (designs.length === 0) {
    return (
      <div className="text-center py-12">
        <Save className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No tienes diseños guardados</h3>
        <p className="text-gray-500 mb-6">
          Personaliza un producto y guarda tu diseño para usarlo más tarde
        </p>
        <a
          href="/productos"
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
        >
          <ShoppingBag className="w-5 h-5" />
          Explorar Productos
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mis Diseños Guardados</h2>
        <p className="text-gray-600">
          Gestiona tus diseños personalizados y úsalos en diferentes productos
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
          <p className="text-sm text-purple-600 font-medium mb-1">Total de diseños</p>
          <p className="text-3xl font-bold text-purple-700">{designs.length}</p>
        </div>
        <div className="bg-gradient-to-r from-pink-50 to-pink-100 p-4 rounded-lg">
          <p className="text-sm text-pink-600 font-medium mb-1">Favoritos</p>
          <p className="text-3xl font-bold text-pink-700">
            {designs.filter((d) => d.isFavorite).length}
          </p>
        </div>
        <div className="bg-gradient-to-r from-cyan-50 to-cyan-100 p-4 rounded-lg">
          <p className="text-sm text-cyan-600 font-medium mb-1">Más usado</p>
          <p className="text-3xl font-bold text-cyan-700">
            {Math.max(...designs.map((d) => d.usageCount), 0)}
          </p>
        </div>
      </div>

      {/* Designs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {designs.map((design) => (
          <DesignCard
            key={design.id}
            design={design}
            onToggleFavorite={handleToggleFavorite}
            onDelete={(d) => {
              setSelectedDesign(d);
              setShowDeleteModal(true);
            }}
            onDuplicate={handleDuplicate}
            onUseInProduct={handleUseInProduct}
            onUseInOtherProduct={handleUseInOtherProduct}
          />
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedDesign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar diseño?</h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que quieres eliminar "{selectedDesign.name}"? Esta acción no se puede
              deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedDesign(null);
                }}
                disabled={deletingId !== null}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(selectedDesign.id)}
                disabled={deletingId !== null}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingId ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DESIGN CARD COMPONENT
// ============================================================================

interface DesignCardProps {
  design: SavedDesign;
  onToggleFavorite: (id: string, currentFavorite: boolean) => void;
  onDelete: (design: SavedDesign) => void;
  onDuplicate: (id: string) => void;
  onUseInProduct: (design: SavedDesign) => void;
  onUseInOtherProduct: (design: SavedDesign) => void;
}

function DesignCard({
  design,
  onToggleFavorite,
  onDelete,
  onDuplicate,
  onUseInProduct,
  onUseInOtherProduct,
}: DesignCardProps) {
  return (
    <div className="group bg-white rounded-lg border-2 border-gray-200 hover:border-purple-400 transition-all overflow-hidden hover:shadow-lg">
      {/* Thumbnail */}
      <div className="relative aspect-square bg-gray-100">
        {design.thumbnail ? (
          <img
            src={design.thumbnail}
            alt={design.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Save className="w-12 h-12 text-gray-300" />
          </div>
        )}

        {/* Favorite Badge */}
        <button
          onClick={() => onToggleFavorite(design.id, design.isFavorite)}
          className="absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
        >
          {design.isFavorite ? (
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          ) : (
            <StarOff className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Usage Count */}
        {design.usageCount > 0 && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs font-medium rounded-full">
            Usado {design.usageCount}x
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">{design.name}</h4>
        <p className="text-xs text-gray-500 mb-3">
          {new Date(design.createdAt.seconds * 1000).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </p>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => onUseInProduct(design)}
            className="w-full px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Usar en {design.originalProductId ? 'este' : 'un'} Producto
          </button>
          <button
            onClick={() => onUseInOtherProduct(design)}
            className="w-full px-3 py-2 border-2 border-purple-500 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            Usar en Otro Producto
          </button>
        </div>

        {/* More Options */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between">
          <button
            onClick={() => onDuplicate(design.id)}
            className="text-xs text-gray-600 hover:text-purple-600 flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            Duplicar
          </button>
          <button
            onClick={() => onDelete(design)}
            className="text-xs text-gray-600 hover:text-red-600 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
