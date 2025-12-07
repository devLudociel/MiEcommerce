// src/components/admin/AdminCoupons.tsx
import { useState, useEffect } from 'react';
import { getActiveCoupons, deactivateCoupon, createCoupon } from '../../lib/firebase';
import type { Coupon } from '../../types/firebase';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';
import { useSimpleFormValidation } from '../../hooks/useFormValidation';
import { couponSchema } from '../../lib/validation/schemas';
import LoadingButton from '../ui/LoadingButton';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

export default function AdminCoupons() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Validation hook
  const { errors, validate } = useSimpleFormValidation(couponSchema);

  // Accessible confirmation dialog
  const { confirm, ConfirmDialog } = useConfirmDialog();

  // Form state - aligned with Zod schema
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'free_shipping',
    value: 10,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    usageLimit: undefined as number | undefined,
    timesUsed: 0,
    active: true,
    minPurchase: undefined as number | undefined,
    userSpecific: [] as string[],
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      logger.info('[AdminCoupons] Loading coupons');
      const data = await getActiveCoupons();
      setCoupons(data);
      logger.info('[AdminCoupons] Loaded coupons', { count: data.length });
    } catch (error) {
      logger.error('[AdminCoupons] Error loading coupons', error);
      notify.error('Error al cargar los cupones');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      notify.error('Debes estar autenticado');
      return;
    }

    setSubmitting(true);
    logger.info('[AdminCoupons] Submitting coupon form', formData);

    try {
      // Validate with Zod
      const validationResult = await validate(formData);

      if (!validationResult.success) {
        logger.warn('[AdminCoupons] Validation failed', validationResult.errors);
        return;
      }

      const validatedData = validationResult.data;

      // Create coupon payload for Firebase
      const payload: Omit<Coupon, 'id' | 'currentUses' | 'createdAt' | 'updatedAt'> = {
        code: validatedData.code,
        description: validatedData.description,
        type: validatedData.type,
        value: validatedData.value,
        startDate: Timestamp.fromDate(new Date()) as any,
        endDate: validatedData.expirationDate
          ? (Timestamp.fromDate(validatedData.expirationDate) as any)
          : undefined,
        active: validatedData.active,
        createdBy: user.uid,
        minPurchase: validatedData.minPurchase,
        maxDiscount: undefined, // Not in our schema
        maxUses: validatedData.usageLimit,
        maxUsesPerUser: undefined, // Not in our schema
      };

      await createCoupon(payload);
      logger.info('[AdminCoupons] Coupon created successfully', { code: validatedData.code });
      notify.success(`Cupón ${validatedData.code} creado exitosamente`);

      setShowForm(false);
      loadCoupons();

      // Reset form
      setFormData({
        code: '',
        description: '',
        type: 'percentage',
        value: 10,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: undefined,
        timesUsed: 0,
        active: true,
        minPurchase: undefined,
        userSpecific: [],
      });
    } catch (error) {
      logger.error('[AdminCoupons] Error creating coupon', error);
      notify.error('Error al crear el cupón: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (couponId: string, code: string) => {
    const confirmed = await confirm({
      title: '¿Desactivar cupón?',
      message: `¿Estás seguro de que quieres desactivar el cupón "${code}"?`,
      type: 'warning',
      confirmText: 'Desactivar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      logger.info('[AdminCoupons] Deactivating coupon', { couponId, code });
      await deactivateCoupon(couponId);
      notify.success(`Cupón ${code} desactivado`);
      loadCoupons();
    } catch (error) {
      logger.error('[AdminCoupons] Error deactivating coupon', error);
      notify.error('Error al desactivar cupón');
    }
  };

  const formatDate = (timestamp: unknown): string => {
    if (!timestamp) return '-';
    try {
      const ts = timestamp as { toDate?: () => Date };
      const date = ts.toDate ? ts.toDate() : new Date(timestamp as string | number);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('es-ES');
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-500 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Cargando cupones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-32 md:mt-40 px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-800">Gestión de Cupones</h1>
          <p className="text-gray-600 mt-1">Crea y administra cupones de descuento</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-magenta-500 text-white font-bold rounded-xl hover:shadow-lg transition-all"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Cupón'}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Crear Nuevo Cupón</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Código */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Código del Cupón *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="VERANO2025"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none font-mono font-bold"
                  required
                  maxLength={20}
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Descuento *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none"
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto Fijo ($)</option>
                  <option value="free_shipping">Envío Gratis</option>
                </select>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descripción *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="10% de descuento en toda la tienda"
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Valor */}
              {formData.type !== 'free_shipping' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valor {formData.type === 'percentage' ? '(%)' : '(€)'} *
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    min="1"
                    max={formData.type === 'percentage' ? 100 : undefined}
                    step="0.01"
                    className={`w-full px-4 py-2 border-2 rounded-xl outline-none ${
                      errors.value ? 'border-red-500' : 'border-gray-200 focus:border-cyan-500'
                    }`}
                    required
                  />
                  {errors.value && <p className="text-red-500 text-sm mt-1">{errors.value}</p>}
                </div>
              )}

              {/* Compra mínima */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Compra Mínima (€) <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="number"
                  value={formData.minPurchase || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minPurchase: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  min="0"
                  step="0.01"
                  placeholder="Sin mínimo"
                  className={`w-full px-4 py-2 border-2 rounded-xl outline-none ${
                    errors.minPurchase ? 'border-red-500' : 'border-gray-200 focus:border-cyan-500'
                  }`}
                />
                {errors.minPurchase && (
                  <p className="text-red-500 text-sm mt-1">{errors.minPurchase}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Usos máximos */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Límite de Usos <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="number"
                  value={formData.usageLimit || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      usageLimit: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  min="1"
                  placeholder="Ilimitado"
                  className={`w-full px-4 py-2 border-2 rounded-xl outline-none ${
                    errors.usageLimit ? 'border-red-500' : 'border-gray-200 focus:border-cyan-500'
                  }`}
                />
                {errors.usageLimit && (
                  <p className="text-red-500 text-sm mt-1">{errors.usageLimit}</p>
                )}
              </div>

              {/* Fecha de expiración */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de Expiración <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="date"
                  value={
                    formData.expirationDate
                      ? formData.expirationDate.toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expirationDate: e.target.value
                        ? new Date(e.target.value)
                        : (undefined as any),
                    })
                  }
                  className={`w-full px-4 py-2 border-2 rounded-xl outline-none ${
                    errors.expirationDate
                      ? 'border-red-500'
                      : 'border-gray-200 focus:border-cyan-500'
                  }`}
                />
                {errors.expirationDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.expirationDate}</p>
                )}
              </div>
            </div>

            <LoadingButton
              type="submit"
              loading={submitting}
              loadingText="Creando cupón..."
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
            >
              Crear Cupón
            </LoadingButton>
          </form>
        </div>
      )}

      {/* Lista de cupones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <svg
              className="mx-auto w-16 h-16 text-gray-300 mb-4"
              width="64"
              height="64"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            <p className="text-gray-600">No hay cupones activos</p>
          </div>
        ) : (
          coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200 hover:border-cyan-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-mono font-black text-2xl text-cyan-600 mb-1">
                    {coupon.code}
                  </div>
                  <p className="text-sm text-gray-600">{coupon.description}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    coupon.type === 'percentage'
                      ? 'bg-green-100 text-green-700'
                      : coupon.type === 'fixed'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {coupon.type === 'percentage' && `${coupon.value}%`}
                  {coupon.type === 'fixed' && `$${coupon.value}`}
                  {coupon.type === 'free_shipping' && 'Envío Gratis'}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-700 mb-4">
                {coupon.minPurchase && <div>Compra mínima: ${coupon.minPurchase.toFixed(2)}</div>}
                {coupon.maxUses && (
                  <div>
                    Usos: {coupon.currentUses}/{coupon.maxUses}
                  </div>
                )}
                <div>
                  Válido: {formatDate(coupon.startDate)} - {formatDate(coupon.endDate)}
                </div>
              </div>

              <button
                onClick={() => coupon.id && handleDeactivate(coupon.id, coupon.code)}
                className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-colors"
              >
                Desactivar
              </button>
            </div>
          ))
        )}
      </div>

      {/* Accessible confirmation dialog */}
      <ConfirmDialog />
    </div>
  );
}
