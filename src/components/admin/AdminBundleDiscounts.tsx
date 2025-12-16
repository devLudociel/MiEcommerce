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
  getDocs,
} from 'firebase/firestore';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Package,
  Tag,
  Calendar,
  Percent,
  Gift,
  ShoppingBag,
} from 'lucide-react';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import type { BundleDiscount, BundleDiscountType } from '../../types/firebase';
import { categories as navbarCategoriesData } from '../../data/categories';

// ============================================================================
// TIPOS LOCALES
// ============================================================================

interface LocalBundleDiscount extends Omit<BundleDiscount, 'startDate' | 'endDate' | 'createdAt' | 'updatedAt'> {
  id: string;
  startDate: Date;
  endDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Product {
  id: string;
  name: string;
  categoryId: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DISCOUNT_TYPES: { value: BundleDiscountType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'buy_x_get_y_free',
    label: 'Compra X, lleva Y gratis',
    description: 'Ej: 3x2 (compra 3, paga 2)',
    icon: <Gift className="w-5 h-5" />,
  },
  {
    value: 'buy_x_get_y_percent',
    label: 'X unidad con % descuento',
    description: 'Ej: 2da unidad al 50%',
    icon: <Percent className="w-5 h-5" />,
  },
  {
    value: 'buy_x_fixed_price',
    label: 'X unidades por precio fijo',
    description: 'Ej: 3 camisetas por €25',
    icon: <Package className="w-5 h-5" />,
  },
  {
    value: 'quantity_percent',
    label: 'Descuento por cantidad',
    description: 'Ej: 5+ unidades = 10% dto',
    icon: <ShoppingBag className="w-5 h-5" />,
  },
];

const navbarCategories = navbarCategoriesData.map(cat => ({
  id: cat.id,
  name: cat.name,
  slug: cat.slug,
}));

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AdminBundleDiscounts() {
  const [discounts, setDiscounts] = useState<LocalBundleDiscount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<LocalBundleDiscount | null>(null);
  const [formData, setFormData] = useState<Partial<LocalBundleDiscount>>({});

  const { confirm, ConfirmDialog } = useConfirmDialog();

  // ============================================================================
  // CARGAR DATOS
  // ============================================================================

  useEffect(() => {
    // Cargar descuentos
    const unsubDiscounts = onSnapshot(collection(db, 'bundleDiscounts'), (snapshot) => {
      const items = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate() || new Date(),
          endDate: data.endDate?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as LocalBundleDiscount;
      });
      setDiscounts(items.sort((a, b) => b.priority - a.priority));
      setLoading(false);
    });

    // Cargar productos para selección
    loadProducts();

    return () => unsubDiscounts();
  }, []);

  const loadProducts = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      const prods = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        categoryId: doc.data().categoryId,
      }));
      setProducts(prods);
    } catch (error) {
      logger.error('[AdminBundleDiscounts] Error loading products', error);
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleNew = () => {
    setEditingDiscount(null);
    setFormData({
      name: '',
      description: '',
      type: 'buy_x_get_y_free',
      buyQuantity: 3,
      getQuantity: 1,
      discountPercent: 50,
      applyTo: 'all',
      categoryIds: [],
      productIds: [],
      tagIds: [],
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      active: true,
      priority: 10,
      stackable: false,
    });
    setShowModal(true);
  };

  const handleEdit = (discount: LocalBundleDiscount) => {
    setEditingDiscount(discount);
    setFormData({ ...discount });
    setShowModal(true);
  };

  const handleDelete = async (discount: LocalBundleDiscount) => {
    const confirmed = await confirm({
      title: '¿Eliminar descuento?',
      message: `¿Estás seguro de que quieres eliminar "${discount.name}"?`,
      type: 'warning',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'bundleDiscounts', discount.id));
      notify.success('Descuento eliminado');
      logger.info('[AdminBundleDiscounts] Discount deleted', { id: discount.id });
    } catch (error) {
      logger.error('[AdminBundleDiscounts] Error deleting discount', error);
      notify.error('Error al eliminar descuento');
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.type || !formData.buyQuantity) {
      notify.warning('Por favor completa los campos obligatorios');
      return;
    }

    try {
      const discountData = {
        name: formData.name,
        description: formData.description || '',
        type: formData.type,
        buyQuantity: formData.buyQuantity,
        getQuantity: formData.getQuantity || 1,
        discountPercent: formData.discountPercent || 0,
        fixedPrice: formData.fixedPrice || 0,
        applyTo: formData.applyTo || 'all',
        categoryIds: formData.categoryIds || [],
        productIds: formData.productIds || [],
        tagIds: formData.tagIds || [],
        minPurchase: formData.minPurchase || 0,
        maxDiscount: formData.maxDiscount || 0,
        maxUsesPerOrder: formData.maxUsesPerOrder || 0,
        startDate: Timestamp.fromDate(formData.startDate || new Date()),
        endDate: Timestamp.fromDate(formData.endDate || new Date()),
        active: formData.active ?? true,
        priority: formData.priority || 10,
        stackable: formData.stackable ?? false,
        updatedAt: Timestamp.now(),
      };

      if (editingDiscount) {
        await updateDoc(doc(db, 'bundleDiscounts', editingDiscount.id), discountData);
        notify.success('Descuento actualizado');
        logger.info('[AdminBundleDiscounts] Discount updated', { id: editingDiscount.id });
      } else {
        await addDoc(collection(db, 'bundleDiscounts'), {
          ...discountData,
          createdBy: 'admin',
          createdAt: Timestamp.now(),
        });
        notify.success('Descuento creado');
        logger.info('[AdminBundleDiscounts] Discount created');
      }

      setShowModal(false);
    } catch (error) {
      logger.error('[AdminBundleDiscounts] Error saving discount', error);
      notify.error('Error al guardar descuento');
    }
  };

  const toggleActive = async (discount: LocalBundleDiscount) => {
    try {
      await updateDoc(doc(db, 'bundleDiscounts', discount.id), {
        active: !discount.active,
        updatedAt: Timestamp.now(),
      });
      notify.success(discount.active ? 'Descuento desactivado' : 'Descuento activado');
    } catch (error) {
      logger.error('[AdminBundleDiscounts] Error toggling discount', error);
      notify.error('Error al cambiar estado');
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getDiscountLabel = (discount: LocalBundleDiscount): string => {
    switch (discount.type) {
      case 'buy_x_get_y_free':
        return `${discount.buyQuantity}x${discount.buyQuantity - (discount.getQuantity || 1)}`;
      case 'buy_x_get_y_percent':
        return `${discount.buyQuantity}ª unidad al ${discount.discountPercent}%`;
      case 'buy_x_fixed_price':
        return `${discount.buyQuantity} por €${discount.fixedPrice?.toFixed(2)}`;
      case 'quantity_percent':
        return `${discount.buyQuantity}+ uds = ${discount.discountPercent}% dto`;
      default:
        return discount.type;
    }
  };

  const isExpired = (discount: LocalBundleDiscount): boolean => {
    return discount.endDate < new Date();
  };

  const isUpcoming = (discount: LocalBundleDiscount): boolean => {
    return discount.startDate > new Date();
  };

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
          <h2 className="text-2xl font-bold text-gray-800">Descuentos por Paquete</h2>
          <p className="text-gray-500">Gestiona promociones tipo 3x2, 2do al 50%, etc.</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Nuevo Descuento
        </button>
      </div>

      {/* Lista de descuentos */}
      {discounts.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <Gift className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No hay descuentos configurados</h3>
          <p className="text-gray-500 mb-4">Crea tu primer descuento por paquete para aumentar ventas</p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-5 h-5" />
            Crear Descuento
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {discounts.map((discount) => (
            <div
              key={discount.id}
              className={`bg-white rounded-xl border-2 p-4 transition-all ${
                !discount.active
                  ? 'border-gray-200 opacity-60'
                  : isExpired(discount)
                  ? 'border-red-200 bg-red-50'
                  : isUpcoming(discount)
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-green-200 bg-green-50'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Info principal */}
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl ${
                      discount.type === 'buy_x_get_y_free'
                        ? 'bg-pink-100 text-pink-600'
                        : discount.type === 'buy_x_get_y_percent'
                        ? 'bg-purple-100 text-purple-600'
                        : discount.type === 'buy_x_fixed_price'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-cyan-100 text-cyan-600'
                    }`}
                  >
                    {DISCOUNT_TYPES.find((t) => t.value === discount.type)?.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{discount.name}</h3>
                    <p className="text-sm text-gray-600">{discount.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Tipo */}
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                        {getDiscountLabel(discount)}
                      </span>
                      {/* Aplicabilidad */}
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                        <Tag className="w-3 h-3" />
                        {discount.applyTo === 'all'
                          ? 'Todos los productos'
                          : discount.applyTo === 'categories'
                          ? `${discount.categoryIds?.length || 0} categorías`
                          : discount.applyTo === 'products'
                          ? `${discount.productIds?.length || 0} productos`
                          : `${discount.tagIds?.length || 0} tags`}
                      </span>
                      {/* Fechas */}
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                        <Calendar className="w-3 h-3" />
                        {discount.startDate.toLocaleDateString()} - {discount.endDate.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2">
                  {/* Toggle activo */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discount.active}
                      onChange={() => toggleActive(discount)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                  <button
                    onClick={() => handleEdit(discount)}
                    className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(discount)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Estado */}
              {isExpired(discount) && (
                <div className="mt-3 text-xs text-red-600 font-medium">
                  ⚠️ Este descuento ha expirado
                </div>
              )}
              {isUpcoming(discount) && (
                <div className="mt-3 text-xs text-amber-600 font-medium">
                  ⏳ Este descuento aún no ha comenzado
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de edición/creación */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">
                {editingDiscount ? 'Editar Descuento' : 'Nuevo Descuento'}
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
              {/* Nombre y descripción */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej: 3x2 en Camisetas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Ej: Compra 3 camisetas y paga solo 2"
                  />
                </div>
              </div>

              {/* Tipo de descuento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipo de Descuento <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DISCOUNT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        formData.type === type.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          formData.type === type.value ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {type.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{type.label}</p>
                        <p className="text-xs text-gray-500">{type.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configuración según tipo */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <h4 className="font-semibold text-gray-700">Configuración</h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {/* Cantidad a comprar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.type === 'quantity_percent' ? 'Mínimo unidades' : 'Comprar'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.buyQuantity || 3}
                      onChange={(e) => setFormData({ ...formData, buyQuantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Cantidad gratis (solo para buy_x_get_y_free) */}
                  {formData.type === 'buy_x_get_y_free' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gratis
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.getQuantity || 1}
                        onChange={(e) => setFormData({ ...formData, getQuantity: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}

                  {/* Porcentaje (para buy_x_get_y_percent y quantity_percent) */}
                  {(formData.type === 'buy_x_get_y_percent' || formData.type === 'quantity_percent') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        % Descuento
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.discountPercent || 50}
                        onChange={(e) => setFormData({ ...formData, discountPercent: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}

                  {/* Precio fijo (solo para buy_x_fixed_price) */}
                  {formData.type === 'buy_x_fixed_price' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Precio fijo (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.fixedPrice || 0}
                        onChange={(e) => setFormData({ ...formData, fixedPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>

                {/* Preview del descuento */}
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Resultado:</span>{' '}
                    {formData.type === 'buy_x_get_y_free' && (
                      <>Compra {formData.buyQuantity} y paga {(formData.buyQuantity || 3) - (formData.getQuantity || 1)}</>
                    )}
                    {formData.type === 'buy_x_get_y_percent' && (
                      <>La {formData.buyQuantity}ª unidad tiene {formData.discountPercent}% de descuento</>
                    )}
                    {formData.type === 'buy_x_fixed_price' && (
                      <>{formData.buyQuantity} unidades por €{formData.fixedPrice?.toFixed(2)}</>
                    )}
                    {formData.type === 'quantity_percent' && (
                      <>A partir de {formData.buyQuantity} unidades, {formData.discountPercent}% de descuento en todas</>
                    )}
                  </p>
                </div>
              </div>

              {/* Aplicabilidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  ¿Dónde aplica?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['all', 'categories', 'products', 'tags'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setFormData({ ...formData, applyTo: option })}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.applyTo === option
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 text-gray-600 hover:border-purple-300'
                      }`}
                    >
                      {option === 'all' && 'Todos'}
                      {option === 'categories' && 'Categorías'}
                      {option === 'products' && 'Productos'}
                      {option === 'tags' && 'Tags'}
                    </button>
                  ))}
                </div>

                {/* Selector de categorías */}
                {formData.applyTo === 'categories' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleccionar categorías
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {navbarCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            const current = formData.categoryIds || [];
                            const updated = current.includes(cat.id)
                              ? current.filter((id) => id !== cat.id)
                              : [...current, cat.id];
                            setFormData({ ...formData, categoryIds: updated });
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            formData.categoryIds?.includes(cat.id)
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selector de productos */}
                {formData.applyTo === 'products' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleccionar productos
                    </label>
                    <select
                      multiple
                      value={formData.productIds || []}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                        setFormData({ ...formData, productIds: selected });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 h-32"
                    >
                      {products.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Ctrl+Click para seleccionar múltiples</p>
                  </div>
                )}
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha inicio
                  </label>
                  <input
                    type="date"
                    value={formData.startDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha fin
                  </label>
                  <input
                    type="date"
                    value={formData.endDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setFormData({ ...formData, endDate: new Date(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Opciones adicionales */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active ?? true}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Activo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.stackable ?? false}
                    onChange={(e) => setFormData({ ...formData, stackable: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Acumulable con otros descuentos</span>
                </label>
              </div>
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
                {editingDiscount ? 'Guardar Cambios' : 'Crear Descuento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
