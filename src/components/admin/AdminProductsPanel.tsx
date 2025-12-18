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
import { Plus, Edit2, Trash2, X, Save, Upload, Image as ImageIcon, Copy, Download, FileUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { categories as navbarCategoriesData } from '../../data/categories';
import { exportProductsToCsv, parseProductsCsv, generateCsvTemplate, validateUniqueSlugs } from '../../lib/productsCsv';
import type { FirebaseProduct } from '../../types/firebase';

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

  // Control de Stock/Inventario
  trackInventory: boolean; // Si true, se controla el stock
  stock: number; // Cantidad disponible
  lowStockThreshold: number; // Umbral para alerta de bajo stock (default: 5)
  allowBackorder: boolean; // Si true, permite comprar sin stock (bajo pedido)

  // SEO
  metaTitle: string; // Título para buscadores (máx 60 caracteres)
  metaDescription: string; // Descripción para buscadores (máx 160 caracteres)

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

/** Input type for creating/updating products - Product without id and with optional timestamps */
type ProductInput = Omit<Product, 'id' | 'createdAt'> & {
  updatedAt: Timestamp;
  createdAt?: Timestamp;
};

// ============================================================================
// CATEGORÍAS Y SUBCATEGORÍAS DEL NAVBAR (importadas de categories.ts)
// ============================================================================

// Estas son las categorías REALES del navbar - sincronizadas con categories.ts
const navbarCategories = navbarCategoriesData.map(cat => ({
  id: cat.id,
  name: cat.name,
  slug: cat.slug,
}));

// Subcategorías extraídas del mismo archivo
const subcategories: Subcategory[] = navbarCategoriesData.flatMap(cat =>
  cat.subcategories.map(sub => ({
    id: sub.id,
    categoryId: cat.id,
    name: sub.name,
    slug: sub.slug,
  }))
);

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

  // Import/Export state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    products: Partial<FirebaseProduct>[];
    errors: { row: number; message: string; data?: string }[];
  } | null>(null);
  const [importing, setImporting] = useState(false);

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
      // Control de Stock - valores por defecto
      trackInventory: false,
      stock: 0,
      lowStockThreshold: 5,
      allowBackorder: false,
      // SEO - valores por defecto
      metaTitle: '',
      metaDescription: '',
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

  const handleDuplicate = async (product: Product) => {
    const confirmed = await confirm({
      title: '¿Duplicar producto?',
      message: `Se creará una copia de "${product.name}" con un nuevo slug. ¿Continuar?`,
      type: 'info',
      confirmText: 'Duplicar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      // Generate new slug with suffix
      const baseSlug = product.slug.replace(/-copia(-\d+)?$/, '');
      const existingSlugs = products
        .map((p) => p.slug)
        .filter((s) => s.startsWith(baseSlug));

      let newSlug = `${baseSlug}-copia`;
      let counter = 1;
      while (existingSlugs.includes(newSlug)) {
        newSlug = `${baseSlug}-copia-${counter}`;
        counter++;
      }

      // Create duplicated product data
      const duplicatedProduct: ProductInput = {
        name: `${product.name} (Copia)`,
        description: product.description,
        categoryId: product.categoryId,
        category: product.category,
        subcategoryId: product.subcategoryId,
        subcategory: product.subcategory,
        basePrice: product.basePrice,
        images: [...product.images], // Copy images array
        tags: [...product.tags],
        featured: false, // Don't copy featured status
        slug: newSlug,
        active: false, // Start as inactive
        customizationSchemaId: product.customizationSchemaId,
        onSale: false, // Don't copy sale status
        salePrice: undefined,
        // Stock - reset to defaults
        trackInventory: product.trackInventory,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        allowBackorder: product.allowBackorder,
        // SEO - copy but mark as needing update
        metaTitle: product.metaTitle ? `${product.metaTitle} (Copia)` : '',
        metaDescription: product.metaDescription || '',
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'products'), duplicatedProduct);

      notify.success(`Producto duplicado: ${duplicatedProduct.name}`);
      logger.info('[AdminProducts] Product duplicated', {
        originalId: product.id,
        newId: docRef.id,
        newSlug
      });

      // Open the duplicated product for editing
      const newProduct: Product = {
        ...duplicatedProduct,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      handleEdit(newProduct);

    } catch (error) {
      logger.error('[AdminProducts] Error duplicating product', error);
      notify.error('Error al duplicar producto');
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

      const data: ProductInput = {
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
        // Optional fields - only include if they have values
        ...(formData.customizationSchemaId && { customizationSchemaId: formData.customizationSchemaId }),
        ...(formData.onSale && formData.salePrice && { salePrice: Number(formData.salePrice) }),
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
  // IMPORT/EXPORT HANDLERS
  // ============================================================================

  const handleExportCsv = () => {
    try {
      // Convert products to FirebaseProduct format
      const firebaseProducts: FirebaseProduct[] = products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category as any,
        basePrice: p.basePrice,
        images: p.images,
        customizable: !!p.customizationSchemaId,
        tags: p.tags,
        featured: p.featured,
        slug: p.slug,
        active: p.active,
        isDigital: false,
        trackInventory: p.trackInventory,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
        allowBackorder: p.allowBackorder,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }));

      const csv = exportProductsToCsv(firebaseProducts);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `productos_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notify.success(`${products.length} productos exportados a CSV`);
      logger.info('[AdminProducts] Products exported', { count: products.length });
    } catch (error) {
      logger.error('[AdminProducts] Error exporting CSV', error);
      notify.error('Error al exportar productos');
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const csv = generateCsvTemplate();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'plantilla_productos.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notify.success('Plantilla descargada');
    } catch (error) {
      logger.error('[AdminProducts] Error downloading template', error);
      notify.error('Error al descargar plantilla');
    }
  };

  const handleImportFileChange = async (file: File | null) => {
    if (!file) {
      setImportFile(null);
      setImportPreview(null);
      return;
    }

    setImportFile(file);

    try {
      const text = await file.text();
      const result = parseProductsCsv(text);

      // Validate unique slugs against existing products
      const existingSlugs = new Set(products.map((p) => p.slug));
      const slugErrors = validateUniqueSlugs(result.products, existingSlugs);

      setImportPreview({
        products: result.products,
        errors: [...result.errors, ...slugErrors],
      });
    } catch (error) {
      logger.error('[AdminProducts] Error parsing CSV', error);
      notify.error('Error al leer el archivo CSV');
      setImportPreview({
        products: [],
        errors: [{ row: 0, message: 'Error al leer el archivo' }],
      });
    }
  };

  const handleImportProducts = async () => {
    if (!importPreview || importPreview.products.length === 0) {
      notify.error('No hay productos para importar');
      return;
    }

    setImporting(true);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const product of importPreview.products) {
        try {
          // Check if product has an ID (update existing)
          if (product.id) {
            const existingProduct = products.find((p) => p.id === product.id);
            if (existingProduct) {
              // Update existing product
              await updateDoc(doc(db, 'products', product.id), {
                ...product,
                id: undefined, // Remove id from data
                updatedAt: Timestamp.now(),
              });
              successCount++;
              continue;
            }
          }

          // Create new product
          const category = categories.find((c) => c.slug === product.category);
          const newProduct = {
            name: product.name,
            description: product.description || '',
            categoryId: category?.id || categories[0]?.id || '',
            category: product.category || 'otros',
            subcategoryId: '',
            subcategory: '',
            basePrice: product.basePrice || 0,
            images: product.images || [],
            tags: product.tags || [],
            featured: product.featured || false,
            slug: product.slug,
            active: product.active ?? true,
            onSale: false,
            trackInventory: product.trackInventory || false,
            stock: product.stock || 0,
            lowStockThreshold: product.lowStockThreshold || 5,
            allowBackorder: product.allowBackorder || false,
            metaTitle: product.metaTitle || '',
            metaDescription: product.metaDescription || '',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };

          await addDoc(collection(db, 'products'), newProduct);
          successCount++;
        } catch (error) {
          errorCount++;
          logger.error('[AdminProducts] Error importing product', { product, error });
        }
      }

      notify.success(`${successCount} productos importados correctamente`);
      if (errorCount > 0) {
        notify.error(`${errorCount} productos con errores`);
      }

      logger.info('[AdminProducts] Import completed', { successCount, errorCount });

      // Close modal and reset
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview(null);
    } catch (error) {
      logger.error('[AdminProducts] Error importing products', error);
      notify.error('Error al importar productos');
    } finally {
      setImporting(false);
    }
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
        <div className="flex items-center gap-3">
          {/* Import/Export buttons */}
          <div className="flex items-center gap-2 border-r border-gray-200 pr-3">
            <button
              onClick={handleExportCsv}
              disabled={products.length === 0}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar todos los productos a CSV"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              title="Importar productos desde CSV"
            >
              <FileUp className="w-4 h-4" />
              Importar
            </button>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
          >
            <Plus className="w-5 h-5" />
            Nuevo Producto
          </button>
        </div>
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
                      {/* Stock indicator */}
                      {product.trackInventory && (
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-medium w-fit ${
                            product.stock === 0
                              ? 'bg-red-100 text-red-700'
                              : product.stock <= (product.lowStockThreshold || 5)
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {product.stock === 0
                            ? '❌ Sin stock'
                            : product.stock <= (product.lowStockThreshold || 5)
                            ? `⚠️ ${product.stock} uds`
                            : `📦 ${product.stock} uds`}
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
                        onClick={() => handleDuplicate(product)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Duplicar"
                      >
                        <Copy className="w-4 h-4" />
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

              {/* Control de Stock */}
              <div className="bg-amber-50 rounded-xl p-4 space-y-4">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-lg">📦</span>
                  Control de Stock
                </h4>

                {/* Toggle de seguimiento de inventario */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Controlar inventario
                    </label>
                    <p className="text-xs text-gray-500">
                      Activa para limitar ventas según stock disponible
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.trackInventory || false}
                      onChange={(e) =>
                        setFormData({ ...formData, trackInventory: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Campos de stock - solo visibles si trackInventory está activo */}
                {formData.trackInventory && (
                  <div className="space-y-4 pt-2 border-t border-amber-200">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Stock actual */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Stock disponible *
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.stock ?? 0}
                          onChange={(e) =>
                            setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })
                          }
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                            (formData.stock ?? 0) <= (formData.lowStockThreshold ?? 5)
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-300'
                          }`}
                          placeholder="100"
                        />
                        {(formData.stock ?? 0) <= (formData.lowStockThreshold ?? 5) && (
                          <p className="mt-1 text-xs text-red-600 font-medium">
                            ⚠️ Stock bajo
                          </p>
                        )}
                      </div>

                      {/* Umbral de bajo stock */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Alerta bajo stock
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.lowStockThreshold ?? 5}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lowStockThreshold: parseInt(e.target.value) || 5,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                          placeholder="5"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Alertar cuando queden menos de X unidades
                        </p>
                      </div>
                    </div>

                    {/* Permitir pedidos sin stock */}
                    <div className="flex items-center justify-between bg-amber-100 rounded-lg p-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Permitir pedidos sin stock
                        </label>
                        <p className="text-xs text-gray-500">
                          Clientes pueden comprar bajo pedido (backorder)
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.allowBackorder || false}
                          onChange={(e) =>
                            setFormData({ ...formData, allowBackorder: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    {/* Indicador visual del estado */}
                    <div className={`text-center py-2 rounded-lg text-sm font-medium ${
                      (formData.stock ?? 0) === 0
                        ? 'bg-red-100 text-red-700'
                        : (formData.stock ?? 0) <= (formData.lowStockThreshold ?? 5)
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {(formData.stock ?? 0) === 0
                        ? `❌ Sin stock${formData.allowBackorder ? ' (bajo pedido activo)' : ''}`
                        : (formData.stock ?? 0) <= (formData.lowStockThreshold ?? 5)
                        ? `⚠️ Stock bajo: ${formData.stock} unidades`
                        : `✅ Stock disponible: ${formData.stock} unidades`}
                    </div>
                  </div>
                )}
              </div>

              {/* SEO */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-4">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-lg">🔍</span>
                  SEO (Posicionamiento en Google)
                </h4>

                <div className="space-y-4">
                  {/* Meta Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Título SEO
                    </label>
                    <input
                      type="text"
                      value={formData.metaTitle || ''}
                      onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                      maxLength={70}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        (formData.metaTitle?.length || 0) > 60 ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder={formData.name || 'Título que aparecerá en Google'}
                    />
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        Deja vacío para usar el nombre del producto
                      </p>
                      <span className={`text-xs font-medium ${
                        (formData.metaTitle?.length || 0) === 0
                          ? 'text-gray-400'
                          : (formData.metaTitle?.length || 0) <= 50
                          ? 'text-green-600'
                          : (formData.metaTitle?.length || 0) <= 60
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {formData.metaTitle?.length || 0}/60
                      </span>
                    </div>
                  </div>

                  {/* Meta Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción SEO
                    </label>
                    <textarea
                      value={formData.metaDescription || ''}
                      onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                      maxLength={170}
                      rows={3}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                        (formData.metaDescription?.length || 0) > 160 ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder={formData.description || 'Descripción que aparecerá en Google'}
                    />
                    <div className="flex justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        Deja vacío para usar la descripción del producto
                      </p>
                      <span className={`text-xs font-medium ${
                        (formData.metaDescription?.length || 0) === 0
                          ? 'text-gray-400'
                          : (formData.metaDescription?.length || 0) <= 140
                          ? 'text-green-600'
                          : (formData.metaDescription?.length || 0) <= 160
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {formData.metaDescription?.length || 0}/160
                      </span>
                    </div>
                  </div>

                  {/* Google Preview */}
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <p className="text-xs text-blue-700 font-semibold mb-3">
                      👁️ Vista previa en Google:
                    </p>
                    <div className="font-sans">
                      {/* Title */}
                      <p className="text-[#1a0dab] text-lg leading-tight hover:underline cursor-pointer truncate">
                        {formData.metaTitle || formData.name || 'Título del producto'}
                      </p>
                      {/* URL */}
                      <p className="text-[#006621] text-sm truncate">
                        tutienda.com › producto › {formData.slug || 'slug-producto'}
                      </p>
                      {/* Description */}
                      <p className="text-[#545454] text-sm line-clamp-2">
                        {formData.metaDescription || formData.description || 'Descripción del producto que aparecerá en los resultados de búsqueda de Google...'}
                      </p>
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>💡 <strong>Tips SEO:</strong></p>
                    <ul className="list-disc list-inside space-y-0.5 ml-4">
                      <li>Incluye palabras clave relevantes al inicio del título</li>
                      <li>La descripción debe ser atractiva y describir el producto</li>
                      <li>Evita duplicar títulos entre productos</li>
                    </ul>
                  </div>
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileUp className="w-6 h-6 text-purple-500" />
                Importar Productos
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Instrucciones</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Formato aceptado: CSV (valores separados por comas)</li>
                  <li>• Primera fila debe contener los encabezados</li>
                  <li>• Campos obligatorios: name, category, basePrice, slug</li>
                  <li>• Las imágenes y tags se separan con <code className="bg-blue-100 px-1 rounded">|</code></li>
                  <li>• Si incluyes un ID existente, el producto se actualizará</li>
                </ul>
                <button
                  onClick={handleDownloadTemplate}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar plantilla CSV
                </button>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar archivo CSV
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-400 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileUp className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      {importFile ? importFile.name : 'Click para seleccionar archivo CSV'}
                    </p>
                    {importFile && (
                      <p className="text-xs text-gray-500 mt-1">
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleImportFileChange(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Preview */}
              {importPreview && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium text-green-700">
                        {importPreview.products.length} productos válidos
                      </span>
                    </div>
                    {importPreview.errors.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="text-sm font-medium text-red-700">
                          {importPreview.errors.length} errores
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Errors list */}
                  {importPreview.errors.length > 0 && (
                    <div className="bg-red-50 rounded-xl p-4">
                      <h4 className="font-semibold text-red-800 mb-2">Errores encontrados</h4>
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {importPreview.errors.map((error, idx) => (
                          <div key={idx} className="text-sm text-red-700">
                            <span className="font-medium">Fila {error.row}:</span> {error.message}
                            {error.data && (
                              <div className="text-xs text-red-500 truncate">
                                {error.data}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products preview */}
                  {importPreview.products.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Vista previa ({Math.min(5, importPreview.products.length)} de {importPreview.products.length})
                      </h4>
                      <div className="space-y-2">
                        {importPreview.products.slice(0, 5).map((product, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200"
                          >
                            <div>
                              <div className="font-medium text-gray-800">{product.name}</div>
                              <div className="text-sm text-gray-500">
                                {product.category} • €{product.basePrice?.toFixed(2)} • /{product.slug}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                              product.id ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {product.id ? 'Actualizar' : 'Crear'}
                            </span>
                          </div>
                        ))}
                        {importPreview.products.length > 5 && (
                          <p className="text-sm text-gray-500 text-center">
                            ... y {importPreview.products.length - 5} productos más
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportProducts}
                disabled={!importPreview || importPreview.products.length === 0 || importing}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <FileUp className="w-5 h-5" />
                    Importar {importPreview?.products.length || 0} productos
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
