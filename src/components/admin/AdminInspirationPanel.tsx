import { useEffect, useState } from 'react';
import { db, storage } from '../../lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { Plus, X, Upload, Search, Filter, Edit2, Trash2, Eye, Image } from 'lucide-react';
import type { InspirationImage } from '../../types/firebase';
import { INSPIRATION_CATEGORIES, INSPIRATION_TAGS } from '../../types/firebase';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AdminInspirationPanel() {
  const [images, setImages] = useState<InspirationImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingImage, setEditingImage] = useState<InspirationImage | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<InspirationImage>>({
    title: '',
    description: '',
    categorySlug: '',
    subcategorySlug: '',
    tags: [],
    active: true,
    featured: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Filter state
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    const q = query(collection(db, 'inspiration_images'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const imagesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as InspirationImage[];
        setImages(imagesData);
        setLoading(false);
      },
      (error) => {
        logger.error('[AdminInspiration] Error loading images', error);
        notify.error('Error al cargar imágenes');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleNewImage = () => {
    setEditingImage(null);
    setFormData({
      title: '',
      description: '',
      categorySlug: INSPIRATION_CATEGORIES[0]?.slug || '',
      subcategorySlug: '',
      tags: [],
      active: true,
      featured: false,
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowModal(true);
  };

  const handleEdit = (image: InspirationImage) => {
    setEditingImage(image);
    setFormData({
      title: image.title,
      description: image.description || '',
      categorySlug: image.categorySlug,
      subcategorySlug: image.subcategorySlug || '',
      tags: image.tags || [],
      active: image.active,
      featured: image.featured,
    });
    setPreviewUrl(image.imageUrl);
    setSelectedFile(null);
    setShowModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = formData.tags || [];
    if (currentTags.includes(tag)) {
      setFormData({ ...formData, tags: currentTags.filter((t) => t !== tag) });
    } else {
      setFormData({ ...formData, tags: [...currentTags, tag] });
    }
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      notify.error('El título es obligatorio');
      return;
    }
    if (!formData.categorySlug) {
      notify.error('Selecciona una categoría');
      return;
    }
    if (!editingImage && !selectedFile) {
      notify.error('Selecciona una imagen');
      return;
    }

    try {
      setUploading(true);
      let imageUrl = editingImage?.imageUrl || '';

      // Upload new image if selected
      if (selectedFile) {
        const fileName = `inspiration/${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, selectedFile);
        imageUrl = await getDownloadURL(storageRef);

        // Delete old image if editing
        if (editingImage?.imageUrl) {
          try {
            const oldRef = ref(storage, editingImage.imageUrl);
            await deleteObject(oldRef);
          } catch {
            // Ignore if old image doesn't exist
          }
        }
      }

      const data = {
        title: formData.title?.trim(),
        description: formData.description?.trim() || '',
        categorySlug: formData.categorySlug,
        subcategorySlug: formData.subcategorySlug || '',
        tags: formData.tags || [],
        active: formData.active !== false,
        featured: !!formData.featured,
        imageUrl,
        updatedAt: Timestamp.now(),
      };

      if (editingImage?.id) {
        await updateDoc(doc(db, 'inspiration_images', editingImage.id), data);
        notify.success('Imagen actualizada');
      } else {
        await addDoc(collection(db, 'inspiration_images'), {
          ...data,
          viewCount: 0,
          createdAt: Timestamp.now(),
        });
        notify.success('Imagen añadida');
      }

      setShowModal(false);
    } catch (error) {
      logger.error('[AdminInspiration] Error saving image', error);
      notify.error('Error al guardar imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (image: InspirationImage) => {
    if (!confirm(`¿Eliminar "${image.title}"?`)) return;

    try {
      // Delete from Storage
      if (image.imageUrl) {
        try {
          const storageRef = ref(storage, image.imageUrl);
          await deleteObject(storageRef);
        } catch {
          // Ignore if file doesn't exist
        }
      }

      // Delete from Firestore
      await deleteDoc(doc(db, 'inspiration_images', image.id!));
      notify.success('Imagen eliminada');
    } catch (error) {
      logger.error('[AdminInspiration] Error deleting image', error);
      notify.error('Error al eliminar');
    }
  };

  const handleToggleActive = async (image: InspirationImage) => {
    try {
      await updateDoc(doc(db, 'inspiration_images', image.id!), {
        active: !image.active,
        updatedAt: Timestamp.now(),
      });
      notify.success(image.active ? 'Imagen desactivada' : 'Imagen activada');
    } catch (error) {
      logger.error('[AdminInspiration] Error toggling active', error);
      notify.error('Error al cambiar estado');
    }
  };

  // ============================================================================
  // FILTERED DATA
  // ============================================================================

  const filteredImages = images.filter((img) => {
    if (filterCategory && img.categorySlug !== filterCategory) return false;
    if (filterTag && !img.tags?.includes(filterTag)) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !img.title.toLowerCase().includes(search) &&
        !img.description?.toLowerCase().includes(search)
      )
        return false;
    }
    return true;
  });

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Galería de Inspiración</h2>
          <p className="text-gray-600 mt-1">
            {images.length} imágenes • Se muestran automáticamente en productos relacionados
          </p>
        </div>
        <button
          onClick={handleNewImage}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Imagen
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          <option value="">Todas las categorías</option>
          {INSPIRATION_CATEGORIES.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>

        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          <option value="">Todos los tags</option>
          {INSPIRATION_TAGS.map((tag) => (
            <option key={tag} value={tag}>
              #{tag}
            </option>
          ))}
        </select>
      </div>

      {/* Images Grid */}
      {filteredImages.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">No hay imágenes</h3>
          <p className="text-gray-500 mt-1">Añade imágenes de inspiración para tus clientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className={`group relative bg-white rounded-xl overflow-hidden shadow-sm border transition-all hover:shadow-lg ${
                !image.active ? 'opacity-50' : ''
              }`}
            >
              <div className="aspect-square">
                <img
                  src={image.imageUrl}
                  alt={image.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => handleEdit(image)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => handleToggleActive(image)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100"
                  title={image.active ? 'Desactivar' : 'Activar'}
                >
                  <Eye className={`w-4 h-4 ${image.active ? 'text-green-500' : 'text-gray-400'}`} />
                </button>
                <button
                  onClick={() => handleDelete(image)}
                  className="p-2 bg-white rounded-full hover:bg-gray-100"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="font-medium text-gray-800 text-sm truncate">{image.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {INSPIRATION_CATEGORIES.find((c) => c.slug === image.categorySlug)?.icon}
                  </span>
                  <span className="text-xs text-gray-500">{image.tags?.length || 0} tags</span>
                  {image.featured && <span className="text-xs text-yellow-500">⭐</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  {editingImage ? 'Editar Imagen' : 'Nueva Imagen de Inspiración'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Imagen</label>
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-xl"
                      />
                      <button
                        onClick={() => {
                          setPreviewUrl(null);
                          setSelectedFile(null);
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-purple-400">
                      <Upload className="w-10 h-10 text-gray-400 mb-2" />
                      <p className="text-gray-600">Click para subir imagen</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: Camiseta con logo empresarial"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción más detallada..."
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría *
                  </label>
                  <select
                    value={formData.categorySlug || ''}
                    onChange={(e) => setFormData({ ...formData, categorySlug: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Selecciona categoría</option>
                    {INSPIRATION_CATEGORIES.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (para matching automático)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INSPIRATION_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          formData.tags?.includes(tag)
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Options */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active !== false}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 text-purple-500 rounded"
                    />
                    <span className="text-sm text-gray-700">Activa</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      className="w-4 h-4 text-yellow-500 rounded"
                    />
                    <span className="text-sm text-gray-700">⭐ Destacada</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={uploading}
                  className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                >
                  {uploading ? 'Guardando...' : editingImage ? 'Guardar cambios' : 'Añadir imagen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
