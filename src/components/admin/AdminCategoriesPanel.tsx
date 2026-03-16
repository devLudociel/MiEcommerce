import { useEffect, useRef, useState } from 'react';
import { db, storage } from '../../lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { Plus, Edit2, Trash2, X, Save, Download, ImageIcon } from 'lucide-react';
import { categories as navbarCategories } from '../../data/categories';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

const MAIN_CATEGORY_DEFINITIONS = navbarCategories.map(({ id, name, slug }) => ({
  id,
  name,
  slug,
}));
const MAIN_CATEGORY_SLUGS = new Set(MAIN_CATEGORY_DEFINITIONS.map((category) => category.slug));
const MAIN_CATEGORY_ORDER = new Map(
  MAIN_CATEGORY_DEFINITIONS.map((category, index) => [category.slug, index])
);

const sortByMainCategoryOrder = (items: Category[]) =>
  [...items].sort(
    (a, b) =>
      (MAIN_CATEGORY_ORDER.get(a.slug) ?? Number.MAX_SAFE_INTEGER) -
      (MAIN_CATEGORY_ORDER.get(b.slug) ?? Number.MAX_SAFE_INTEGER)
  );

export default function AdminCategoriesPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { confirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        const cats = snapshot.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .filter((category) => MAIN_CATEGORY_SLUGS.has(category.slug)) as Category[];
        setCategories(sortByMainCategoryOrder(cats));
        setLoading(false);
      },
      (error) => {
        logger.error('[AdminCategories] Error loading categories', error);
        notify.error('Error al cargar categorías');
        setLoading(false);
      }
    );

    return () => unsubCategories();
  }, []);

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', slug: '', description: '', image: '' });
    setShowModal(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image: category.image || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: '¿Eliminar categoría?',
      message: '¿Seguro que quieres eliminar esta categoría? Esta acción no se puede deshacer.',
      type: 'warning',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'categories', id));
      notify.success('Categoría eliminada');
    } catch (error) {
      logger.error('[AdminCategories] Error deleting category', error);
      notify.error('Error al eliminar categoría');
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploadingImage(true);
    try {
      const fileName = `categories/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData((prev) => ({ ...prev, image: url }));
      notify.success('Imagen subida correctamente');
    } catch (error) {
      logger.error('[AdminCategories] Error uploading image', error);
      notify.error('Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      notify.error('Completa los campos obligatorios');
      return;
    }

    try {
      const data = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || '',
        image: formData.image || '',
        updatedAt: Timestamp.now(),
      };

      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), data);
        notify.success('Categoría actualizada');
      } else {
        await addDoc(collection(db, 'categories'), {
          ...data,
          createdAt: Timestamp.now(),
        });
        notify.success('Categoría creada');
      }

      setShowModal(false);
    } catch (error) {
      logger.error('[AdminCategories] Error saving category', error);
      notify.error('Error al guardar categoría');
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  const importNavbarCategories = async () => {
    const confirmed = await confirm({
      title: '¿Importar categorías?',
      message:
        '¿Importar las 9 categorías principales del navbar? Esto creará las que no existan.',
      type: 'info',
      confirmText: 'Importar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      const batch = writeBatch(db);
      let imported = 0;
      let skipped = 0;

      const existingCategoriesSnapshot = await getDocs(collection(db, 'categories'));
      const existingSlugs = new Set(existingCategoriesSnapshot.docs.map((d) => d.data().slug));

      for (const mainCategory of MAIN_CATEGORY_DEFINITIONS) {
        if (!existingSlugs.has(mainCategory.slug)) {
          const mainCatRef = doc(collection(db, 'categories'));
          batch.set(mainCatRef, {
            name: mainCategory.name,
            slug: mainCategory.slug,
            description: `Categoría principal: ${mainCategory.name}`,
            image: '',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
          imported++;
          existingSlugs.add(mainCategory.slug);
        } else {
          skipped++;
        }
      }

      await batch.commit();
      notify.success(
        `Importación completa: ${imported} categorías principales agregadas, ${skipped} ya existían`
      );
      logger.info('[AdminCategories] Navbar categories imported', { imported, skipped });
    } catch (error) {
      logger.error('[AdminCategories] Error importing navbar categories', error);
      notify.error('Error al importar categorías del navbar');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 mt-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Categorías</h2>
          <p className="text-gray-600 mt-1">{categories.length} categoría(s)</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={importNavbarCategories}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
          >
            <Download className="w-5 h-5" />
            Importar del Navbar
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
          >
            <Plus className="w-5 h-5" />
            Nueva Categoría
          </button>
        </div>
      </div>

      {/* Tabla de categorías */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Imagen
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Descripción
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{category.name}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono">
                    {category.slug}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {category.description || '-'}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {categories.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📁</div>
            <p className="text-gray-500">No hay categorías creadas</p>
            <button
              onClick={handleCreate}
              className="mt-4 text-purple-600 hover:underline font-medium"
            >
              Crear primera categoría
            </button>
          </div>
        )}
      </div>

      {/* Modal de creación/edición */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 space-y-6">
              {/* Imagen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imagen de la categoría
                </label>
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div className="w-20 h-20 rounded-full bg-[#f5f0e8] border border-[#ede8de] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {formData.image ? (
                      <img
                        src={formData.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {uploadingImage ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-4 h-4" />
                          {formData.image ? 'Cambiar imagen' : 'Subir imagen'}
                        </>
                      )}
                    </button>
                    {formData.image && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                        className="block text-xs text-red-500 hover:underline"
                      >
                        Eliminar imagen
                      </button>
                    )}
                    <p className="text-xs text-gray-400">
                      Se mostrará como círculo en la sección de categorías
                    </p>
                  </div>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ej: Tazas"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug (URL) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                  placeholder="Ej: tazas"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL: /categoria/{formData.slug || 'slug'}
                </p>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  placeholder="Descripción breve de la categoría"
                />
              </div>
            </div>

            {/* Footer del modal */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={uploadingImage}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {editingCategory ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
}
