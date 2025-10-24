// src/components/admin/AdminCoupons.tsx
import { useState, useEffect } from 'react';
import { getActiveCoupons, deactivateCoupon, db } from '../../lib/firebase';
import type { Coupon } from '../../types/firebase';
import { Timestamp, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

export default function AdminCoupons() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'free_shipping',
    value: 10,
    minPurchase: 0,
    maxDiscount: 0,
    maxUses: 0,
    maxUsesPerUser: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await getActiveCoupons();
      setCoupons(data);
    } catch (error) {
      console.error('Error cargando cupones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    alert('🔥 CÓDIGO NUEVO CARGADO - VERSIÓN 2024-v3 🔥');

    console.log('========== INICIO handleSubmit ==========');
    console.log('1️⃣ formData completo:', formData);
    console.log('2️⃣ formData.minPurchase:', formData.minPurchase, 'tipo:', typeof formData.minPurchase);
    console.log('3️⃣ formData.maxDiscount:', formData.maxDiscount, 'tipo:', typeof formData.maxDiscount);
    console.log('4️⃣ formData.maxUses:', formData.maxUses, 'tipo:', typeof formData.maxUses);
    console.log('5️⃣ formData.maxUsesPerUser:', formData.maxUsesPerUser, 'tipo:', typeof formData.maxUsesPerUser);

    if (!user) {
      alert('Debes estar autenticado');
      return;
    }

    try {
      console.log('🚀 [DIRECT-v2] Iniciando creación de cupón');

      // Construir objeto base solo con campos requeridos
      const couponData: any = {
        code: formData.code.toUpperCase(),
        description: formData.description,
        type: formData.type,
        value: formData.value,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        active: true,
        createdBy: user.uid,
        currentUses: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('6️⃣ couponData BASE (antes de opcionales):', couponData);

      // Solo agregar campos opcionales si tienen valores > 0
      console.log('7️⃣ Evaluando minPurchase > 0:', formData.minPurchase, '>', 0, '=', formData.minPurchase > 0);
      if (formData.minPurchase > 0) {
        console.log('   ✅ AGREGANDO minPurchase:', formData.minPurchase);
        couponData.minPurchase = formData.minPurchase;
      } else {
        console.log('   ❌ NO agregando minPurchase');
      }

      console.log('8️⃣ Evaluando maxDiscount > 0:', formData.maxDiscount, '>', 0, '=', formData.maxDiscount > 0);
      if (formData.maxDiscount > 0) {
        console.log('   ✅ AGREGANDO maxDiscount:', formData.maxDiscount);
        couponData.maxDiscount = formData.maxDiscount;
      } else {
        console.log('   ❌ NO agregando maxDiscount');
      }

      console.log('9️⃣ Evaluando maxUses > 0:', formData.maxUses, '>', 0, '=', formData.maxUses > 0);
      if (formData.maxUses > 0) {
        console.log('   ✅ AGREGANDO maxUses:', formData.maxUses);
        couponData.maxUses = formData.maxUses;
      } else {
        console.log('   ❌ NO agregando maxUses');
      }

      console.log('🔟 Evaluando maxUsesPerUser > 0:', formData.maxUsesPerUser, '>', 0, '=', formData.maxUsesPerUser > 0);
      if (formData.maxUsesPerUser > 0) {
        console.log('   ✅ AGREGANDO maxUsesPerUser:', formData.maxUsesPerUser);
        couponData.maxUsesPerUser = formData.maxUsesPerUser;
      } else {
        console.log('   ❌ NO agregando maxUsesPerUser');
      }

      console.log('1️⃣1️⃣ couponData COMPLETO (después de opcionales):', couponData);
      console.log('1️⃣2️⃣ Claves de couponData:', Object.keys(couponData));
      console.log('1️⃣3️⃣ Valores de couponData:', Object.values(couponData));

      // Filtrar explícitamente cualquier undefined
      const cleanData = Object.fromEntries(
        Object.entries(couponData).filter(([key, value]) => {
          const isUndefined = value === undefined;
          console.log(`   Filtrado ${key}:`, value, isUndefined ? '❌ ELIMINAR' : '✅ MANTENER');
          return !isUndefined;
        })
      );

      console.log('1️⃣4️⃣ cleanData FINAL:', cleanData);
      console.log('1️⃣5️⃣ Claves de cleanData:', Object.keys(cleanData));
      console.log('1️⃣6️⃣ Valores de cleanData:', Object.values(cleanData));
      console.log('1️⃣7️⃣ Campos undefined en cleanData:', Object.entries(cleanData).filter(([k, v]) => v === undefined));

      // Llamar DIRECTAMENTE a Firebase sin usar la función createCoupon
      console.log('1️⃣8️⃣ A punto de llamar addDoc...');
      const docRef = await addDoc(collection(db, 'coupons'), cleanData);

      console.log('✅ [DIRECT-v2] Cupón creado con ID:', docRef.id);
      alert('Cupón creado exitosamente');
      setShowForm(false);
      loadCoupons();

      // Reset form
      setFormData({
        code: '',
        description: '',
        type: 'percentage',
        value: 10,
        minPurchase: 0,
        maxDiscount: 0,
        maxUses: 0,
        maxUsesPerUser: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('❌ [DIRECT-v2] Error creando cupón:', error);
      console.error('❌ Mensaje de error:', (error as Error).message);
      console.error('❌ Stack:', (error as Error).stack);
      alert('Error al crear el cupón: ' + (error as Error).message);
    }
  };

  const handleDeactivate = async (couponId: string, code: string) => {
    if (!confirm(`¿Desactivar el cupón ${code}?`)) return;

    try {
      await deactivateCoupon(couponId);
      alert('Cupón desactivado');
      loadCoupons();
    } catch (error) {
      console.error('Error desactivando cupón:', error);
      alert('Error al desactivar cupón');
    }
  };

  const formatDate = (timestamp: any): string => {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-ES');
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Valor */}
              {formData.type !== 'free_shipping' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valor {formData.type === 'percentage' ? '(%)' : '($)'} *
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    min="1"
                    max={formData.type === 'percentage' ? 100 : undefined}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none"
                    required
                  />
                </div>
              )}

              {/* Compra mínima */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Compra Mínima ($)
                </label>
                <input
                  type="number"
                  value={formData.minPurchase}
                  onChange={(e) => setFormData({ ...formData, minPurchase: Number(e.target.value) })}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none"
                />
              </div>

              {/* Descuento máximo */}
              {formData.type === 'percentage' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Descuento Máximo ($)
                  </label>
                  <input
                    type="number"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: Number(e.target.value) })}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Usos totales */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Usos Máximos Totales (0 = ilimitado)
                </label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: Number(e.target.value) })}
                  min="0"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none"
                />
              </div>

              {/* Usos por usuario */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Usos por Usuario
                </label>
                <input
                  type="number"
                  value={formData.maxUsesPerUser}
                  onChange={(e) => setFormData({ ...formData, maxUsesPerUser: Number(e.target.value) })}
                  min="1"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fecha inicio */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none"
                  required
                />
              </div>

              {/* Fecha fin */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de Expiración *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-cyan-500 outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
            >
              Crear Cupón
            </button>
          </form>
        </div>
      )}

      {/* Lista de cupones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <svg className="mx-auto w-16 h-16 text-gray-300 mb-4" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <p className="text-gray-600">No hay cupones activos</p>
          </div>
        ) : (
          coupons.map((coupon) => (
            <div key={coupon.id} className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200 hover:border-cyan-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-mono font-black text-2xl text-cyan-600 mb-1">
                    {coupon.code}
                  </div>
                  <p className="text-sm text-gray-600">{coupon.description}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  coupon.type === 'percentage' ? 'bg-green-100 text-green-700' :
                  coupon.type === 'fixed' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {coupon.type === 'percentage' && `${coupon.value}%`}
                  {coupon.type === 'fixed' && `$${coupon.value}`}
                  {coupon.type === 'free_shipping' && 'Envío Gratis'}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-700 mb-4">
                {coupon.minPurchase && (
                  <div>Compra mínima: ${coupon.minPurchase.toFixed(2)}</div>
                )}
                {coupon.maxUses && (
                  <div>Usos: {coupon.currentUses}/{coupon.maxUses}</div>
                )}
                <div>Válido: {formatDate(coupon.startDate)} - {formatDate(coupon.endDate)}</div>
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
    </div>
  );
}
