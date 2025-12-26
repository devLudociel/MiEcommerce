// src/components/admin/AdminThemesPanel.tsx
// Panel de administración para gestionar temáticas de productos

import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Upload,
  Loader,
  Palette,
  Image,
  Eye,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from 'lucide-react';
import type { Theme, ThemeCategoryImage, ThemeVariant, CreateThemeInput } from '../../lib/themes';
import {
  getAllThemes,
  createTheme,
  updateTheme,
  deleteTheme,
  addThemeVariant,
  removeThemeVariant,
  removeThemeCategoryImage,
  getThemeVariantsForCategory,
} from '../../lib/themes';
import { categories } from '../../data/categories';
import { storage, auth } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

// Flatten categories for easy selection
const flatCategories = categories.flatMap((cat) => [
  { id: cat.id, name: cat.name, slug: cat.slug, isParent: true },
  ...cat.subcategories.map((sub) => ({
    id: sub.id,
    name: `${cat.name} > ${sub.name}`,
    slug: sub.slug,
    isParent: false,
  })),
]);

export default function AdminThemesPanel() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});

  // Create form state
  const [newTheme, setNewTheme] = useState<Partial<CreateThemeInput>>({
    name: '',
    description: '',
    badge: '',
    priceModifier: 0,
    active: true,
    categoryImages: [],
  });

  const { confirm, ConfirmDialog } = useConfirmDialog();

  // Load themes on mount
  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    setLoading(true);
    try {
      const data = await getAllThemes();
      setThemes(data);
    } catch (error) {
      logger.error('[AdminThemesPanel] Error loading themes:', error);
      notify.error('Error al cargar las temáticas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTheme = async () => {
    if (!newTheme.name?.trim()) {
      notify.error('El nombre de la temática es obligatorio');
      return;
    }

    try {
      const created = await createTheme({
        name: newTheme.name,
        slug: newTheme.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, ''),
        description: newTheme.description || '',
        badge: newTheme.badge || '',
        priceModifier: newTheme.priceModifier || 0,
        active: newTheme.active ?? true,
        order: themes.length,
        categoryImages: [],
      });

      setThemes([...themes, created]);
      setNewTheme({
        name: '',
        description: '',
        badge: '',
        priceModifier: 0,
        active: true,
        categoryImages: [],
      });
      setShowCreateForm(false);
      // Expand the new theme so user can add images
      setExpandedThemes({ ...expandedThemes, [created.id]: true });
      notify.success(`Temática "${created.name}" creada`);
    } catch (error) {
      logger.error('[AdminThemesPanel] Error creating theme:', error);
      notify.error('Error al crear la temática');
    }
  };

  const handleUpdateTheme = async (theme: Theme, updates: Partial<Theme>) => {
    try {
      await updateTheme(theme.id, updates);
      setThemes(themes.map((t) => (t.id === theme.id ? { ...t, ...updates } : t)));
      notify.success('Temática actualizada');
    } catch (error) {
      logger.error('[AdminThemesPanel] Error updating theme:', error);
      notify.error('Error al actualizar la temática');
    }
  };

  const handleDeleteTheme = async (theme: Theme) => {
    const confirmed = await confirm({
      title: '¿Eliminar temática?',
      message: `¿Estás seguro de eliminar "${theme.name}"? Esta acción no se puede deshacer.`,
      type: 'warning',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      await deleteTheme(theme.id);
      setThemes(themes.filter((t) => t.id !== theme.id));
      notify.success(`Temática "${theme.name}" eliminada`);
    } catch (error) {
      logger.error('[AdminThemesPanel] Error deleting theme:', error);
      notify.error('Error al eliminar la temática');
    }
  };

  const toggleExpanded = (themeId: string) => {
    setExpandedThemes({
      ...expandedThemes,
      [themeId]: !expandedThemes[themeId],
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-purple-500" />
        <span className="ml-3 text-gray-600">Cargando temáticas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Palette className="w-7 h-7 text-purple-500" />
            Gestión de Temáticas
          </h2>
          <p className="text-gray-600 mt-1">
            Administra las temáticas disponibles para tus productos. Cada temática puede tener
            diferentes imágenes según la categoría del producto.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Temática
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
          <h3 className="font-bold text-lg text-purple-900 mb-4">Crear Nueva Temática</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                value={newTheme.name || ''}
                onChange={(e) => setNewTheme({ ...newTheme, name: e.target.value })}
                placeholder="Ej: Princesas, Dinosaurios..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Badge (opcional)
              </label>
              <input
                type="text"
                value={newTheme.badge || ''}
                onChange={(e) => setNewTheme({ ...newTheme, badge: e.target.value })}
                placeholder="Ej: Popular, Nuevo..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción (opcional)
              </label>
              <input
                type="text"
                value={newTheme.description || ''}
                onChange={(e) => setNewTheme({ ...newTheme, description: e.target.value })}
                placeholder="Descripción breve de la temática"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio extra (€)
              </label>
              <input
                type="number"
                value={newTheme.priceModifier || 0}
                onChange={(e) =>
                  setNewTheme({ ...newTheme, priceModifier: parseFloat(e.target.value) || 0 })
                }
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="newThemeActive"
              checked={newTheme.active ?? true}
              onChange={(e) => setNewTheme({ ...newTheme, active: e.target.checked })}
              className="w-4 h-4 text-purple-500 rounded focus:ring-purple-500"
            />
            <label htmlFor="newThemeActive" className="text-sm font-medium text-gray-700">
              Temática activa
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreateTheme}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              Crear Temática
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Themes List */}
      {themes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <Palette className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">No hay temáticas creadas</h3>
          <p className="text-gray-500 mb-4">Crea tu primera temática para empezar</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Crear Primera Temática
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              expanded={expandedThemes[theme.id] || false}
              onToggleExpanded={() => toggleExpanded(theme.id)}
              onUpdate={(updates) => handleUpdateTheme(theme, updates)}
              onDelete={() => handleDeleteTheme(theme)}
              onRefresh={loadThemes}
            />
          ))}
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
}

// ============================================================================
// THEME CARD COMPONENT
// ============================================================================

interface ThemeCardProps {
  theme: Theme;
  expanded: boolean;
  onToggleExpanded: () => void;
  onUpdate: (updates: Partial<Theme>) => void;
  onDelete: () => void;
  onRefresh: () => void;
}

function ThemeCard({
  theme,
  expanded,
  onToggleExpanded,
  onUpdate,
  onDelete,
  onRefresh,
}: ThemeCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: theme.name,
    description: theme.description || '',
    badge: theme.badge || '',
    priceModifier: theme.priceModifier || 0,
  });

  const handleSaveEdit = () => {
    onUpdate(editForm);
    setIsEditing(false);
  };

  return (
    <div
      className={`border-2 rounded-xl overflow-hidden transition-all ${
        theme.active ? 'border-gray-200' : 'border-gray-300 bg-gray-50 opacity-75'
      }`}
    >
      {/* Header */}
      <div className="p-4 bg-white flex items-center gap-4">
        <button
          onClick={onToggleExpanded}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {/* Theme Preview */}
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {theme.categoryImages?.[0]?.imageUrl ? (
            <img
              src={theme.categoryImages[0].imageUrl}
              alt={theme.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Palette className="w-8 h-8 text-purple-400" />
          )}
        </div>

        {/* Theme Info */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 font-bold"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editForm.badge}
                  onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}
                  placeholder="Badge"
                  className="w-24 px-2 py-1 text-xs border border-gray-300 rounded"
                />
                <input
                  type="number"
                  value={editForm.priceModifier}
                  onChange={(e) =>
                    setEditForm({ ...editForm, priceModifier: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Precio extra"
                  className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-bold text-gray-900 truncate flex items-center gap-2">
                {theme.name}
                {theme.badge && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    {theme.badge}
                  </span>
                )}
                {!theme.active && (
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    Inactiva
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {theme.categoryImages?.length || 0} categorías configuradas
                {theme.priceModifier > 0 && (
                  <span className="ml-2 text-green-600">+€{theme.priceModifier.toFixed(2)}</span>
                )}
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveEdit}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Guardar"
              >
                <Save className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Cancelar"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onUpdate({ active: !theme.active })}
                className={`p-2 rounded-lg transition-colors ${
                  theme.active
                    ? 'text-green-600 hover:bg-green-50'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
                title={theme.active ? 'Desactivar' : 'Activar'}
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                title="Editar"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={onDelete}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Content - Category Images */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Image className="w-4 h-4" />
            Imágenes por Categoría de Producto
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            Agrega imágenes de esta temática para diferentes categorías de productos. Cuando un
            cliente personalice un producto de esa categoría, verá la imagen correspondiente.
          </p>

          <CategoryImagesEditor theme={theme} onRefresh={onRefresh} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CATEGORY IMAGES EDITOR (con soporte para múltiples variantes)
// ============================================================================

interface CategoryImagesEditorProps {
  theme: Theme;
  onRefresh: () => void;
}

function CategoryImagesEditor({ theme, onRefresh }: CategoryImagesEditorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [variantName, setVariantName] = useState<string>('');
  const [uploading, setUploading] = useState<'thumbnail' | 'preview' | null>(null);
  const [newVariant, setNewVariant] = useState<Partial<ThemeVariant>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);

  const handleUploadImage = async (file: File, type: 'imageUrl' | 'previewImage') => {
    const user = auth.currentUser;
    if (!user) {
      notify.error('Debes iniciar sesión para subir imágenes');
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      notify.error('Solo se permiten imágenes (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify.error('La imagen debe pesar menos de 5MB');
      return;
    }

    setUploading(type === 'imageUrl' ? 'thumbnail' : 'preview');

    try {
      const timestamp = Date.now();
      const prefix = type === 'previewImage' ? 'preview_' : 'thumb_';
      const fileName = `${prefix}${timestamp}_${file.name}`;
      const storageRef = ref(storage, `themes/${user.uid}/${theme.id}/${fileName}`);

      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setNewVariant({ ...newVariant, [type]: downloadURL });
      notify.success(type === 'imageUrl' ? 'Miniatura subida' : 'Preview subido');
    } catch (error) {
      logger.error('[CategoryImagesEditor] Error uploading:', error);
      notify.error('Error al subir la imagen');
    } finally {
      setUploading(null);
    }
  };

  const handleSaveVariant = async () => {
    if (!selectedCategory) {
      notify.error('Selecciona una categoría');
      return;
    }

    if (!variantName.trim()) {
      notify.error('Escribe un nombre para la variante (ej: Mickey, Frozen, etc.)');
      return;
    }

    if (!newVariant.imageUrl || !newVariant.previewImage) {
      notify.error('Debes subir ambas imágenes (miniatura y preview)');
      return;
    }

    const category = flatCategories.find((c) => c.id === selectedCategory);
    if (!category) return;

    try {
      await addThemeVariant(theme.id, selectedCategory, category.name, {
        name: variantName.trim(),
        imageUrl: newVariant.imageUrl,
        previewImage: newVariant.previewImage,
      });

      // Reset form but keep category selected for adding more variants
      setVariantName('');
      setNewVariant({});
      onRefresh();
      notify.success(`Variante "${variantName}" añadida a "${category.name}"`);
    } catch (error) {
      logger.error('[CategoryImagesEditor] Error saving variant:', error);
      notify.error('Error al guardar la variante');
    }
  };

  const handleRemoveVariant = async (categoryId: string, variantId: string) => {
    try {
      await removeThemeVariant(theme.id, categoryId, variantId);
      onRefresh();
      notify.success('Variante eliminada');
    } catch (error) {
      logger.error('[CategoryImagesEditor] Error removing variant:', error);
      notify.error('Error al eliminar la variante');
    }
  };

  const handleRemoveCategory = async (categoryId: string) => {
    try {
      await removeThemeCategoryImage(theme.id, categoryId);
      onRefresh();
      notify.success('Categoría y todas sus variantes eliminadas');
    } catch (error) {
      logger.error('[CategoryImagesEditor] Error removing category:', error);
      notify.error('Error al eliminar la categoría');
    }
  };

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategories({
      ...expandedCategories,
      [categoryId]: !expandedCategories[categoryId],
    });
  };

  // Get variants count for display
  const getTotalVariants = (ci: ThemeCategoryImage) => {
    if (ci.variants && ci.variants.length > 0) {
      return ci.variants.length;
    }
    // Legacy format
    if (ci.imageUrl && ci.previewImage) {
      return 1;
    }
    return 0;
  };

  return (
    <div className="space-y-4">
      {/* Existing Categories with Variants */}
      {theme.categoryImages && theme.categoryImages.length > 0 && (
        <div className="space-y-3 mb-6">
          {theme.categoryImages.map((ci) => {
            const variants = getThemeVariantsForCategory(theme, ci.categoryId);
            const isExpanded = expandedCategories[ci.categoryId];

            return (
              <div
                key={ci.categoryId}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Category Header */}
                <div
                  className="flex items-center gap-3 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleCategoryExpanded(ci.categoryId)}
                >
                  <button className="p-1">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {/* Show first variant thumbnail as category preview */}
                  {variants[0]?.imageUrl && (
                    <img
                      src={variants[0].imageUrl}
                      alt={ci.categoryName}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                  )}

                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 text-sm">{ci.categoryName}</h5>
                    <p className="text-xs text-gray-500">
                      {getTotalVariants(ci)} variante{getTotalVariants(ci) !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCategory(ci.categoryId);
                    }}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar categoría completa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Variants List (expanded) */}
                {isExpanded && (
                  <div className="p-3 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {variants.map((variant) => (
                        <div key={variant.id} className="bg-gray-50 rounded-lg p-2 relative group">
                          <img
                            src={variant.imageUrl}
                            alt={variant.name}
                            className="w-full aspect-square rounded object-cover mb-2"
                          />
                          <p className="text-xs font-medium text-gray-700 text-center truncate">
                            {variant.name}
                          </p>
                          <div className="flex justify-center gap-2 mt-1">
                            <a
                              href={variant.previewImage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline"
                            >
                              Preview
                            </a>
                            <button
                              onClick={() => handleRemoveVariant(ci.categoryId, variant.id)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Quick add button inside category */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCategory(ci.categoryId);
                          setExpandedCategories({ ...expandedCategories, [ci.categoryId]: true });
                        }}
                        className="bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg p-2 flex flex-col items-center justify-center aspect-square hover:bg-purple-100 transition-colors"
                      >
                        <Plus className="w-6 h-6 text-purple-500 mb-1" />
                        <span className="text-xs text-purple-600 font-medium">Añadir</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Variant Form */}
      <div className="bg-white rounded-lg border-2 border-dashed border-purple-300 p-4">
        <h5 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Añadir Nueva Variante
        </h5>
        <p className="text-sm text-gray-500 mb-4">
          Añade variantes a cualquier categoría. Por ejemplo: Mickey, Minnie, Frozen dentro de
          Disney &gt; Cajas.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Category Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría de Producto
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Seleccionar categoría...</option>
              {flatCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Variant Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Variante
            </label>
            <input
              type="text"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              placeholder="Ej: Mickey, Frozen, Moana..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {selectedCategory && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Thumbnail Upload */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Image className="w-4 h-4" />
                Miniatura (para el selector)
              </label>
              {newVariant.imageUrl ? (
                <div className="flex items-center gap-2">
                  <img
                    src={newVariant.imageUrl}
                    alt="Miniatura"
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => setNewVariant({ ...newVariant, imageUrl: undefined })}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    ref={thumbnailInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file, 'imageUrl');
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={uploading === 'thumbnail'}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uploading === 'thumbnail' ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Subir Miniatura
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Preview Upload */}
            <div className="bg-green-50 p-3 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Eye className="w-4 h-4" />
                Preview (imagen del producto)
              </label>
              {newVariant.previewImage ? (
                <div className="flex items-center gap-2">
                  <img
                    src={newVariant.previewImage}
                    alt="Preview"
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => setNewVariant({ ...newVariant, previewImage: undefined })}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    ref={previewInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file, 'previewImage');
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => previewInputRef.current?.click()}
                    disabled={uploading === 'preview'}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uploading === 'preview' ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Subir Preview
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {selectedCategory && variantName && newVariant.imageUrl && newVariant.previewImage && (
          <div className="mt-4">
            <button
              onClick={handleSaveVariant}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar Variante "{variantName}"
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
