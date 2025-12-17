import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Tag,
  Sparkles,
  Star,
  Zap,
  Clock,
  Gift,
} from 'lucide-react';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import type { ProductTag, SpecialTagType } from '../../types/firebase';
import { TAG_COLOR_PRESETS } from '../../types/firebase';

// ============================================================================
// TIPOS LOCALES
// ============================================================================

interface LocalTag extends Omit<ProductTag, 'createdAt' | 'updatedAt'> {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const SPECIAL_TAG_TYPES: { value: SpecialTagType; label: string; icon: React.ReactNode; defaultColor: string }[] = [
  { value: 'nuevo', label: 'Nuevo', icon: <Sparkles className="w-4 h-4" />, defaultColor: '#22C55E' },
  { value: 'oferta', label: 'Oferta', icon: <Zap className="w-4 h-4" />, defaultColor: '#EF4444' },
  { value: 'destacado', label: 'Destacado', icon: <Star className="w-4 h-4" />, defaultColor: '#F59E0B' },
  { value: 'exclusivo', label: 'Exclusivo', icon: <Gift className="w-4 h-4" />, defaultColor: '#A855F7' },
  { value: 'limitado', label: 'Limitado', icon: <Clock className="w-4 h-4" />, defaultColor: '#EC4899' },
  { value: 'custom', label: 'Personalizado', icon: <Tag className="w-4 h-4" />, defaultColor: '#6B7280' },
];

const EMOJI_OPTIONS = ['✨', '🔥', '⭐', '💎', '🎁', '🏷️', '💯', '🆕', '💥', '🎉', '❤️', '👑'];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AdminTagsPanel() {
  const [tags, setTags] = useState<LocalTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<LocalTag | null>(null);
  const [formData, setFormData] = useState<Partial<LocalTag>>({});
  const [filter, setFilter] = useState<SpecialTagType | 'all'>('all');

  const { confirm, ConfirmDialog } = useConfirmDialog();

  // ============================================================================
  // CARGAR DATOS
  // ============================================================================

  useEffect(() => {
    const unsubTags = onSnapshot(collection(db, 'productTags'), (snapshot) => {
      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as LocalTag;
      });
      setTags(items.sort((a, b) => (b.priority || 0) - (a.priority || 0)));
      setLoading(false);
    });

    return () => unsubTags();
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleNew = () => {
    setEditingTag(null);
    setFormData({
      name: '',
      slug: '',
      color: '#3B82F6',
      textColor: '#FFFFFF',
      icon: '🏷️',
      type: 'custom',
      description: '',
      priority: 10,
      active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (tag: LocalTag) => {
    setEditingTag(tag);
    setFormData({ ...tag });
    setShowModal(true);
  };

  const handleDelete = async (tag: LocalTag) => {
    const confirmed = await confirm({
      title: '¿Eliminar etiqueta?',
      message: `¿Estás seguro de que quieres eliminar "${tag.name}"? Los productos que la usen perderán esta etiqueta.`,
      type: 'warning',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'productTags', tag.id));
      notify.success('Etiqueta eliminada');
      logger.info('[AdminTagsPanel] Tag deleted', { id: tag.id });
    } catch (error) {
      logger.error('[AdminTagsPanel] Error deleting tag', error);
      notify.error('Error al eliminar etiqueta');
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      notify.warning('El nombre es obligatorio');
      return;
    }

    // Generate slug if empty
    const slug = formData.slug || formData.name.toLowerCase()
      .replace(/[áàäâã]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöôõ]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    try {
      const tagData = {
        name: formData.name,
        slug,
        color: formData.color || '#3B82F6',
        textColor: formData.textColor || '#FFFFFF',
        icon: formData.icon || '',
        type: formData.type || 'custom',
        description: formData.description || '',
        priority: formData.priority || 10,
        active: formData.active ?? true,
        updatedAt: Timestamp.now(),
      };

      if (editingTag) {
        await updateDoc(doc(db, 'productTags', editingTag.id), tagData);
        notify.success('Etiqueta actualizada');
        logger.info('[AdminTagsPanel] Tag updated', { id: editingTag.id });
      } else {
        await addDoc(collection(db, 'productTags'), {
          ...tagData,
          createdAt: Timestamp.now(),
        });
        notify.success('Etiqueta creada');
        logger.info('[AdminTagsPanel] Tag created');
      }

      setShowModal(false);
    } catch (error) {
      logger.error('[AdminTagsPanel] Error saving tag', error);
      notify.error('Error al guardar etiqueta');
    }
  };

  const toggleActive = async (tag: LocalTag) => {
    try {
      await updateDoc(doc(db, 'productTags', tag.id), {
        active: !tag.active,
        updatedAt: Timestamp.now(),
      });
      notify.success(tag.active ? 'Etiqueta desactivada' : 'Etiqueta activada');
    } catch (error) {
      logger.error('[AdminTagsPanel] Error toggling tag', error);
      notify.error('Error al cambiar estado');
    }
  };

  const createDefaultTags = async () => {
    const defaultTags = [
      { name: 'Nuevo', slug: 'nuevo', color: '#22C55E', textColor: '#FFFFFF', icon: '✨', type: 'nuevo' as SpecialTagType, priority: 100 },
      { name: 'Oferta', slug: 'oferta', color: '#EF4444', textColor: '#FFFFFF', icon: '🔥', type: 'oferta' as SpecialTagType, priority: 90 },
      { name: 'Destacado', slug: 'destacado', color: '#F59E0B', textColor: '#000000', icon: '⭐', type: 'destacado' as SpecialTagType, priority: 80 },
      { name: 'Exclusivo', slug: 'exclusivo', color: '#A855F7', textColor: '#FFFFFF', icon: '💎', type: 'exclusivo' as SpecialTagType, priority: 70 },
      { name: 'Últimas Unidades', slug: 'ultimas-unidades', color: '#EC4899', textColor: '#FFFFFF', icon: '⏰', type: 'limitado' as SpecialTagType, priority: 60 },
      { name: 'Best Seller', slug: 'best-seller', color: '#3B82F6', textColor: '#FFFFFF', icon: '👑', type: 'custom' as SpecialTagType, priority: 50 },
    ];

    try {
      for (const tag of defaultTags) {
        // Check if already exists
        const exists = tags.some(t => t.slug === tag.slug);
        if (!exists) {
          await addDoc(collection(db, 'productTags'), {
            ...tag,
            description: '',
            active: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        }
      }
      notify.success('Etiquetas predeterminadas creadas');
    } catch (error) {
      logger.error('[AdminTagsPanel] Error creating default tags', error);
      notify.error('Error al crear etiquetas');
    }
  };

  // ============================================================================
  // FILTRADO
  // ============================================================================

  const filteredTags = filter === 'all'
    ? tags
    : tags.filter(tag => tag.type === filter);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Etiquetas de Productos</h2>
          <p className="text-gray-500">Gestiona etiquetas con colores personalizados</p>
        </div>
        <div className="flex gap-2">
          {tags.length === 0 && (
            <button
              onClick={createDefaultTags}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Crear predeterminadas
            </button>
          )}
          <button
            onClick={handleNew}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            Nueva Etiqueta
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas ({tags.length})
        </button>
        {SPECIAL_TAG_TYPES.map((type) => {
          const count = tags.filter(t => t.type === type.value).length;
          return (
            <button
              key={type.value}
              onClick={() => setFilter(type.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === type.value
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.icon}
              {type.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Lista de etiquetas */}
      {filteredTags.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <Tag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay etiquetas</h3>
          <p className="text-gray-500 mb-4">Crea etiquetas para categorizar tus productos</p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-5 h-5" />
            Crear Etiqueta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              className={`bg-white rounded-xl border-2 p-4 transition-all ${
                tag.active ? 'border-gray-200' : 'border-gray-100 opacity-50'
              }`}
            >
              {/* Preview de la etiqueta */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
                  style={{ backgroundColor: tag.color, color: tag.textColor }}
                >
                  {tag.icon && <span>{tag.icon}</span>}
                  {tag.name}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(tag)}
                    className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tag)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Slug:</span>
                  <code className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{tag.slug}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipo:</span>
                  <span className="text-gray-700">{SPECIAL_TAG_TYPES.find(t => t.value === tag.type)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Prioridad:</span>
                  <span className="text-gray-700">{tag.priority}</span>
                </div>
              </div>

              {/* Toggle */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {tag.active ? 'Activa' : 'Inactiva'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tag.active}
                    onChange={() => toggleActive(tag)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">
                {editingTag ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              {/* Preview */}
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
                <span
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-base font-semibold"
                  style={{ backgroundColor: formData.color, color: formData.textColor }}
                >
                  {formData.icon && <span>{formData.icon}</span>}
                  {formData.name || 'Etiqueta'}
                </span>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Ej: Nuevo, Oferta, Best Seller"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Se genera automáticamente"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de etiqueta
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SPECIAL_TAG_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        type: type.value,
                        color: type.defaultColor,
                        textColor: type.defaultColor === '#F59E0B' || type.defaultColor === '#EAB308' ? '#000000' : '#FFFFFF'
                      })}
                      className={`flex items-center gap-2 p-2 rounded-lg border-2 text-sm transition-all ${
                        formData.type === type.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {type.icon}
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icono/Emoji */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icono (emoji)
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                      className={`w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition-all ${
                        formData.icon === emoji
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: '' })}
                    className={`w-10 h-10 rounded-lg border-2 text-xs flex items-center justify-center transition-all ${
                      !formData.icon
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    Sin
                  </button>
                </div>
              </div>

              {/* Colores */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color de fondo
                </label>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.bg}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: preset.bg, textColor: preset.text })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === preset.bg
                          ? 'border-gray-800 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.bg }}
                      title={preset.name}
                    />
                  ))}
                </div>
                <div className="mt-2 flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Fondo (hex)</label>
                    <input
                      type="color"
                      value={formData.color || '#3B82F6'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Texto (hex)</label>
                    <input
                      type="color"
                      value={formData.textColor || '#FFFFFF'}
                      onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioridad (mayor = primero)
                </label>
                <input
                  type="number"
                  value={formData.priority || 10}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 10 })}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Activo */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active ?? true}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Etiqueta activa</span>
              </label>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Save className="w-4 h-4" />
                {editingTag ? 'Guardar Cambios' : 'Crear Etiqueta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
