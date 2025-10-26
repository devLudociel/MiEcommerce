// src/components/wallet/ApplyCoupon.tsx
import { useState } from 'react';
import { validateCoupon } from '../../lib/firebase';
import type { Coupon } from '../../types/firebase';

interface ApplyCouponProps {
  userId: string;
  cartTotal: number;
  onCouponApplied: (coupon: Coupon, discount: number) => void;
  onCouponRemoved: () => void;
  appliedCoupon?: Coupon;
}

export default function ApplyCoupon({
  userId,
  cartTotal,
  onCouponApplied,
  onCouponRemoved,
  appliedCoupon,
}: ApplyCouponProps) {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!couponCode.trim()) {
      setError('Ingresa un código de cupón');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const result = await validateCoupon(couponCode.trim(), userId, cartTotal);

      if (!result.valid) {
        setError(result.error || 'Cupón no válido');
        return;
      }

      if (result.coupon && result.discount !== undefined) {
        onCouponApplied(result.coupon, result.discount);
        setSuccess(true);
        setCouponCode('');
      }
    } catch (err) {
      console.error('Error aplicando cupón:', err);
      setError('Error al aplicar el cupón');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    onCouponRemoved();
    setSuccess(false);
    setError(null);
    setCouponCode('');
  };

  if (appliedCoupon) {
    // Mostrar cupón aplicado
    return (
      <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-bold text-green-800">Cupón aplicado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white rounded-lg font-mono font-bold text-green-700 border border-green-300">
                {appliedCoupon.code}
              </span>
              {appliedCoupon.type === 'percentage' && (
                <span className="text-sm text-green-700">{appliedCoupon.value}% de descuento</span>
              )}
              {appliedCoupon.type === 'fixed' && (
                <span className="text-sm text-green-700">${appliedCoupon.value} de descuento</span>
              )}
              {appliedCoupon.type === 'free_shipping' && (
                <span className="text-sm text-green-700">Envío gratis</span>
              )}
            </div>
            <p className="text-sm text-green-600 mt-1">{appliedCoupon.description}</p>
          </div>
          <button
            onClick={handleRemoveCoupon}
            className="ml-2 p-2 text-green-700 hover:text-green-900 hover:bg-green-100 rounded-lg transition-colors"
            aria-label="Quitar cupón"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Formulario para aplicar cupón
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-cyan-500"
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
        ¿Tienes un cupón de descuento?
      </h3>

      <form onSubmit={handleApplyCoupon} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value.toUpperCase());
              setError(null);
              setSuccess(false);
            }}
            placeholder="CODIGO123"
            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all font-mono font-bold uppercase"
            disabled={loading}
            maxLength={20}
          />
          <button
            type="submit"
            disabled={loading || !couponCode.trim()}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-magenta-500 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                <span>...</span>
              </div>
            ) : (
              'Aplicar'
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <svg
              className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-green-700">¡Cupón aplicado exitosamente!</p>
          </div>
        )}
      </form>

      <p className="text-xs text-gray-500 mt-3">
        Los cupones se aplican automáticamente al total de tu compra
      </p>
    </div>
  );
}
