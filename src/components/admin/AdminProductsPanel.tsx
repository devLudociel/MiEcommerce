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
  query,
  where,
  limit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { Plus, Edit2, Trash2, X, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

// ============================================================================
// TIPOS
// ============================================================================

interface Product {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  category: string; // Slug de la categoría (textiles, sublimados, etc.) - REQUERIDO para búsquedas
  subcategoryId: string;
  subcategory?: string; // Slug de la subcategoría (ropa-personalizada, llaveros, etc.) - OPCIONAL
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
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
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

interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
}

// ============================================================================
// CATEGORÍAS Y SUBCATEGORÍAS DEL NAVBAR (hardcodeadas - LA VERDAD DEL SISTEMA)
// ============================================================================

// Estas son las categorías REALES del navbar - NO usar categorías de Firebase
const navbarCategories = [
  { id: '1', name: 'Productos Gráficos', slug: 'graficos-impresos' },
  { id: '2', name: 'Productos Textiles', slug: 'textiles' },
  { id: '3', name: 'Productos de Papelería', slug: 'papeleria' },
  { id: '4', name: 'Productos Sublimados', slug: 'sublimados' },
  { id: '5', name: 'Corte y Grabado Láser', slug: 'corte-grabado' },
  { id: '6', name: 'Eventos y Celebraciones', slug: 'eventos' },
  { id: '7', name: 'Impresión 3D', slug: 'impresion-3d' },
  { id: '8', name: 'Servicios Digitales', slug: 'servicios-digitales' },
];

const subcategories: Subcategory[] = [
  { id: '1', categoryId: '1', name: 'Tarjetas de Visita', slug: 'tarjetas-visita' },
  { id: '2', categoryId: '1', name: 'Etiquetas y Pegatinas', slug: 'etiquetas-pegatinas' },
  { id: '3', categoryId: '1', name: 'Carteles para Eventos', slug: 'carteles-eventos' },
  { id: '4', categoryId: '2', name: 'Ropa Personalizada', slug: 'ropa-personalizada' },
  { id: '5', categoryId: '2', name: 'Complementos Textiles', slug: 'complementos-textiles' },
  { id: '6', categoryId: '3', name: 'Cuadernos y Libretas', slug: 'cuadernos-libretas' },
  { id: '7', categoryId: '3', name: 'Packaging Corporativo', slug: 'packaging-corporativo' },
  { id: '8', categoryId: '4', name: 'Vajilla Personalizada', slug: 'vajilla-personalizada' },
  { id: '9', categoryId: '4', name: 'Decoración Sublimada', slug: 'decoracion-sublimada' },
  { id: '10', categoryId: '5', name: 'Llaveros Personalizados', slug: 'llaveros' },
  { id: '11', categoryId: '5', name: 'Decoración en Madera', slug: 'decoracion-madera-eventos' },
  { id: '12', categoryId: '5', name: 'Cuadros de Madera', slug: 'cuadros-madera' },
  { id: '13', categoryId: '6', name: 'Packaging para Eventos', slug: 'packaging-eventos' },
  { id: '14', categoryId: '7', name: 'Impresión en Resina', slug: 'impresion-resina' },
  { id: '15', categoryId: '7', name: 'Impresión en Filamento', slug: 'impresion-filamento' },
  { id: '16', categoryId: '8', name: 'Diseño Gráfico', slug: 'diseno-grafico' },
  { id: '17', categoryId: '8', name: 'Desarrollo Web', slug: 'desarrollo-web' },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AdminProductsPanelV2() {
  const [products, setProducts] = useState<Product[]>([]);
  // ✅ USAMOS CATEGORÍAS HARDCODEADAS DEL NAVBAR - NO de Firebase
  const categories = navbarCategories;
  const [schemas, setSchemas] = useState<CustomizationSchema[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  // Accessible confirmation dialog
  const { confirm, ConfirmDialog } = useConfirmDialog();

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

    // Cargar schemas de personalización
    loadSchemas();

    return () => unsubProducts();
  }, []);

  // ✅ YA NO NECESITAMOS loadCategories - usamos las hardcodeadas del navbar

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
      category: categories[0]?.slug || 'otros', // ← NUEVO: Incluir slug de categoría
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
    setSlugError(null);
    setShowModal(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setSlugError(null);
    setShowModal(true);
  };

  const handleDelete = async (product: Product) => {
    const confirmed = await confirm({
      title: '¿Eliminar producto?',
      message: `¿Estás seguro de que quieres eliminar "${product.name}"? Esta acción no se puede deshacer.`,
      type: 'warning',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

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

  // Validar slug único
  const validateSlug = async (slug: string): Promise<boolean> => {
    if (!slug || slug.trim() === '') {
      setSlugError('El slug es obligatorio');
      return false;
    }

    // Validar formato del slug (solo letras minúsculas, números y guiones)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      setSlugError('El slug solo puede contener letras minúsculas, números y guiones');
      return false;
    }

    setIsCheckingSlug(true);
    try {
      // Verificar si el slug ya existe en otro producto
      const q = query(
        collection(db, 'products'),
        where('slug', '==', slug),
        limit(1)
      );
      const snapshot = await getDocs(q);

      // Si encontramos un producto con ese slug
      if (!snapshot.empty) {
        const existingProduct = snapshot.docs[0];
        // Si estamos editando y el slug pertenece al producto actual, es válido
        if (editingProduct && existingProduct.id === editingProduct.id) {
          setSlugError(null);
          return true;
        }
        // Si no, el slug ya está en uso
        setSlugError('Este slug ya está en uso por otro producto');
        return false;
      }

      setSlugError(null);
      return true;
    } catch (error) {
      logger.error('[AdminProducts] Error validating slug', error);
      setSlugError('Error al validar slug');
      return false;
    } finally {
      setIsCheckingSlug(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.basePrice) {
      notify.error('Completa los campos obligatorios');
      return;
    }

    // Validar slug único antes de guardar
    const isSlugValid = await validateSlug(formData.slug);
    if (!isSlugValid) {
      notify.error('Corrige el slug antes de continuar');
      return;
    }

    try {
      // Obtener el slug de la categoría seleccionada
      const selectedCategory = categories.find((cat) => cat.id === formData.categoryId);
      const categorySlug = selectedCategory?.slug || 'otros';

      // Obtener el slug de la subcategoría seleccionada
      const selectedSubcategory = subcategories.find((sub) => sub.id === formData.subcategoryId);
      const subcategorySlug = selectedSubcategory?.slug || '';

      const data: any = {
        name: formData.name,
        description: formData.description || '',
        categoryId: formData.categoryId || categories[0]?.id || 'otros',
        category: categorySlug, // ✅ Slug de categoría (textiles, sublimados, etc.) - PRINCIPAL para búsquedas
        subcategoryId: formData.subcategoryId || '',
        subcategory: subcategorySlug, // ✅ Slug de subcategoría (ropa-personalizada, llaveros, etc.) - OPCIONAL
        basePrice: Number(formData.basePrice) || 0,
        images: formData.images || [],
        tags: formData.tags || [],
        featured: !!formData.featured,
        slug: formData.slug,
        active: formData.active !== false,
        onSale: !!formData.onSale,
        updatedAt: Timestamp.now(),
      };

      // Solo agregar customizationSchemaId si tiene valor
      if (formData.customizationSchemaId) {
        data.customizationSchemaId = formData.customizationSchemaId;
      }

      // Solo agregar salePrice si está en oferta y tiene valor
      if (formData.onSale && formData.salePrice) {
        data.salePrice = Number(formData.salePrice);
      }

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
    <div className="p-6 mt-20">
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
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.slug || ''}
                        onChange={(e) => {
                          const newSlug = e.target.value;
                          setFormData({ ...formData, slug: newSlug });
                          // Limpiar error cuando el usuario empiece a escribir
                          if (slugError) {
                            setSlugError(null);
                          }
                        }}
                        onBlur={() => {
                          // Validar cuando el usuario sale del campo
                          if (formData.slug) {
                            validateSlug(formData.slug);
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                          slugError ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="taza-personalizada-350ml"
                      />
                      {isCheckingSlug && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    {slugError && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span>
                        {slugError}
                      </p>
                    )}
                    {!slugError && formData.slug && !isCheckingSlug && (
                      <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                        <span>✓</span>
                        Slug disponible
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Solo letras minúsculas, números y guiones. Ejemplo: mi-producto-123
                    </p>
                  </div>

                  {/* Categoría */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.categoryId || ''}
                      onChange={(e) => {
                        const selectedCat = categories.find((c) => c.id === e.target.value);
                        setFormData({
                          ...formData,
                          categoryId: e.target.value,
                          category: selectedCat?.slug || 'otros',
                          subcategoryId: '', // Reset subcategory cuando cambia category
                          subcategory: '',
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      📂 Categoría principal (textiles, sublimados, resina, etc.) - Aparecerá en <code className="text-cyan-600">/categoria/{formData.category || 'categoria'}</code>
                    </p>
                  </div>

                  {/* Subcategoría */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategoría (Opcional)
                    </label>
                    <select
                      value={formData.subcategoryId || ''}
                      onChange={(e) => {
                        const selectedSubcat = subcategories.find((s) => s.id === e.target.value);
                        setFormData({
                          ...formData,
                          subcategoryId: e.target.value,
                          subcategory: selectedSubcat?.slug || '',
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={!formData.categoryId}
                    >
                      <option value="">Sin subcategoría</option>
                      {subcategories
                        .filter((sub) => sub.categoryId === formData.categoryId)
                        .map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      📁 Subcategoría específica - Aparecerá en <code className="text-cyan-600">/categoria/{formData.category || 'categoria'}/{formData.subcategory || 'subcategoria'}</code>
                    </p>
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

              {/* Tags / Etiquetas */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-4">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-lg">🏷️</span>
                  Etiquetas (Tags)
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Añadir etiquetas
                  </label>
                  <input
                    type="text"
                    value={(formData.tags || []).join(', ')}
                    onChange={(e) => {
                      const tagsArray = e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter((t) => t.length > 0);
                      setFormData({ ...formData, tags: tagsArray });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="camisetas, ropa, personalizable, regalo"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    🏷️ Tipos de producto (camisetas, tazas, llaveros, etc.) - Separados por comas
                  </p>
                  <div className="mt-2 p-3 bg-white rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700 font-semibold mb-1">💡 Dónde aparecerá este producto:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li>• <strong>Por categoría:</strong> <code className="text-cyan-600">/categoria/{formData.category || 'categoria'}</code></li>
                      {formData.subcategory && (
                        <li>• <strong>Por subcategoría:</strong> <code className="text-cyan-600">/categoria/{formData.category}/{formData.subcategory}</code></li>
                      )}
                      {formData.tags && formData.tags.length > 0 && (
                        <li>• <strong>Por tags:</strong> {formData.tags.slice(0, 3).map(tag => (
                          <code key={tag} className="text-purple-600 ml-1">/productos?tag={tag}</code>
                        ))}</li>
                      )}
                    </ul>
                    <p className="text-xs text-green-700 font-semibold mt-2 pt-2 border-t border-blue-200">✅ Ejemplos completos:</p>
                    <ul className="text-xs text-gray-600 space-y-1 mt-1">
                      <li>• Camiseta → Tags: <code className="text-purple-600">camisetas, ropa, algodon</code> → <code className="text-green-600">/productos?tag=camisetas</code></li>
                      <li>• Taza → Tags: <code className="text-purple-600">tazas, cocina, regalo</code> → <code className="text-green-600">/productos?tag=tazas</code></li>
                      <li>• Llavero → Tags: <code className="text-purple-600">llaveros, madera</code> → <code className="text-green-600">/productos?tag=llaveros</code></li>
                    </ul>
                  </div>
                </div>
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

      {/* Accessible confirmation dialog */}
      <ConfirmDialog />
    </div>
  );
}
