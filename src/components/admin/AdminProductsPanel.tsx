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
  getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { Plus, Edit2, Trash2, X, Save, Upload, Image as ImageIcon } from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  basePrice: number;
  images: string[];
  tags: string[];
  featured: boolean;
  slug: string;
  active: boolean;

  // Personalización
  customizationSchemaId?: string; // ID del schema (cat_tazas, cat_camisetas, etc.)

  // Ofertas
  onSale: boolean;
  salePrice?: number;

  // Metadata
  createdAt?: any;
  updatedAt?: any;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface CustomizationSchema {
  id: string;
  name: string;
  categoryId: string;
  fieldsCount: number;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AdminProductsPanelV2() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [schemas, setSchemas] = useState<CustomizationSchema[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [uploadingImages, setUploadingImages] = useState(false);

  // ============================================================================
  // CARGAR DATOS
  // ============================================================================

  useEffect(() => {
    // Cargar productos
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(prods);
      setLoading(false);
    });

    // Cargar categorías desde Firestore
    loadCategories();

    // Cargar schemas de personalización
    loadSchemas();

    return () => unsubProducts();
  }, []);

  const loadCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'categories'));
      const cats = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Category[];
      setCategories(cats);

      // Si no hay categorías en Firestore, crear algunas por defecto
      if (cats.length === 0) {
        const defaultCategories = [
          { name: 'Textiles', slug: 'textiles', description: 'Camisetas, sudaderas, bolsas' },
          { name: 'Sublimados', slug: 'sublimados', description: 'Tazas, vasos, termos' },
          { name: 'Marcos', slug: 'marcos', description: 'Cuadros decorativos' },
          { name: 'Resina', slug: 'resina', description: 'Figuras de resina' },
          { name: 'Otros', slug: 'otros', description: 'Otros productos' },
        ];

        for (const cat of defaultCategories) {
          await addDoc(collection(db, 'categories'), cat);
        }

        loadCategories(); // Recargar
      }
    } catch (error) {
      logger.error('[AdminProducts] Error loading categories', error);
    }
  };

  const loadSchemas = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'customization_schemas'));
      const schemasList = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.categoryName || doc.id,
          categoryId: data.categoryId || doc.id,
          fieldsCount: data.schema?.fields?.length || 0,
        };
      }) as CustomizationSchema[];
      setSchemas(schemasList);
      logger.info('[AdminProducts] Loaded schemas', { count: schemasList.length });
    } catch (error) {
      logger.error('[AdminProducts] Error loading schemas', error);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      categoryId: categories[0]?.id || '',
      subcategoryId: '',
      basePrice: 0,
      images: [],
      tags: [],
      featured: false,
      slug: '',
      active: true,
      customizationSchemaId: '',
      onSale: false,
    });
    setShowModal(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setShowModal(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`¿Eliminar producto "${product.name}"?`)) return;

    try {
      await deleteDoc(doc(db, 'products', product.id));

      // Eliminar imágenes de Storage
      for (const imageUrl of product.images || []) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (err) {
          logger.warn('[AdminProducts] Error deleting image', err);
        }
      }

      notify.success('Producto eliminado');
    } catch (error) {
      logger.error('[AdminProducts] Error deleting product', error);
      notify.error('Error al eliminar producto');
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `products/${Date.now()}_${i}_${file.name}`;
        const storageRef = ref(storage, fileName);

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);
      }

      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...uploadedUrls],
      }));

      notify.success(`${uploadedUrls.length} imagen(es) subida(s)`);
    } catch (error) {
      logger.error('[AdminProducts] Error uploading images', error);
      notify.error('Error al subir imágenes');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.basePrice) {
      notify.error('Completa los campos obligatorios');
      return;
    }

    try {
      const data: Partial<Product> = {
        name: formData.name,
        description: formData.description || '',
        categoryId: formData.categoryId || categories[0]?.id || 'otros',
        subcategoryId: formData.subcategoryId || '',
        basePrice: Number(formData.basePrice) || 0,
        images: formData.images || [],
        tags: formData.tags || [],
        featured: !!formData.featured,
        slug: formData.slug,
        active: formData.active !== false,
        customizationSchemaId: formData.customizationSchemaId || undefined,
        onSale: !!formData.onSale,
        salePrice: formData.onSale ? Number(formData.salePrice) || undefined : undefined,
        updatedAt: Timestamp.now(),
      };

      if (editingProduct) {
        // Actualizar
        await updateDoc(doc(db, 'products', editingProduct.id), data);
        notify.success('Producto actualizado');
      } else {
        // Crear
        await addDoc(collection(db, 'products'), {
          ...data,
          createdAt: Timestamp.now(),
        });
        notify.success('Producto creado');
      }

      setShowModal(false);
    } catch (error) {
      logger.error('[AdminProducts] Error saving product', error);
      notify.error('Error al guardar producto');
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

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Productos</h2>
          <p className="text-gray-600 mt-1">
            {products.length} producto(s) • {schemas.length} schema(s) de personalización
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </div>

      {/* Tabla de productos */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Producto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Precio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Personalización
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => {
              const category = categories.find((c) => c.id === product.categoryId);
              const schema = schemas.find((s) => s.id === product.customizationSchemaId);

              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-800">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {category?.name || 'Sin categoría'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-800">
                      €{product.basePrice.toFixed(2)}
                    </div>
                    {product.onSale && product.salePrice && (
                      <div className="text-sm text-green-600">
                        Oferta: €{product.salePrice.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {schema ? (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                        {schema.name}
                      </span>
                    ) : (
                      <span className="text-gray-400">Sin personalización</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-medium w-fit ${
                          product.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {product.active ? 'Activo' : 'Inactivo'}
                      </span>
                      {product.featured && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium w-fit">
                          Destacado
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay productos. Crea uno para empezar.
          </div>
        )}
      </div>

      {/* Modal de Creación/Edición */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-gray-800">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Información básica */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  Información Básica
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del producto <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Ej: Taza personalizada 350ml"
                    />
                  </div>

                  {/* Slug */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slug (URL) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.slug || ''}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="taza-personalizada-350ml"
                    />
                  </div>

                  {/* Categoría */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.categoryId || ''}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Descripción */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      placeholder="Descripción del producto..."
                    />
                  </div>
                </div>
              </div>

              {/* Precios */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  Precios
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Precio base */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio base <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.basePrice || 0}
                      onChange={(e) =>
                        setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="19.99"
                    />
                  </div>

                  {/* En oferta */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      En oferta
                    </label>
                    <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.onSale || false}
                        onChange={(e) => setFormData({ ...formData, onSale: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span>Activar oferta</span>
                    </label>
                  </div>

                  {/* Precio oferta */}
                  {formData.onSale && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Precio en oferta
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.salePrice || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, salePrice: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="14.99"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Personalización */}
              <div className="bg-purple-50 rounded-xl p-4 space-y-4">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-lg">🎨</span>
                  Personalización
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schema de personalización
                  </label>
                  <select
                    value={formData.customizationSchemaId || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, customizationSchemaId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Sin personalización</option>
                    {schemas.map((schema) => (
                      <option key={schema.id} value={schema.id}>
                        {schema.name} ({schema.fieldsCount} campos)
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    Selecciona un schema para habilitar personalización en este producto
                  </p>
                </div>
              </div>

              {/* Imágenes */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-lg">📷</span>
                  Imágenes
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subir imágenes
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {uploadingImages ? 'Subiendo...' : 'Click para subir imágenes'}
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files)}
                      className="hidden"
                      disabled={uploadingImages}
                    />
                  </label>
                </div>

                {/* Preview de imágenes */}
                {formData.images && formData.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-4">
                    {formData.images.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Imagen ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Opciones */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-lg">⚙️</span>
                  Opciones
                </h4>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active !== false}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm">Producto activo</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.featured || false}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm">Producto destacado</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
              >
                <Save className="w-5 h-5" />
                {editingProduct ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
