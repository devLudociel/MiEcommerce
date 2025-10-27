import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { cartStore, clearCart } from '../../store/cartStore';
import type { CartItem } from '../../store/cartStore';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import { shippingInfoSchema, paymentInfoSchema } from '../../lib/validation/schemas';
import { useFormValidation } from '../../hooks/useFormValidation';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { lookupZipES, autocompleteStreetES, debounce } from '../../utils/address';
import type { ZipLookup, AddressSuggestion } from '../../utils/address';

interface ShippingInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  shippingMethod?: 'standard' | 'express' | 'urgent';
  notes?: string;
}

interface PaymentInfo {
  method: 'card' | 'paypal' | 'transfer' | 'cash';
  cardNumber?: string;
  cardName?: string;
  cardExpiry?: string;
  cardCVV?: string;
}

type CheckoutStep = 1 | 2 | 3;

interface AppliedCoupon {
  id: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  discountAmount: number;
  freeShipping: boolean;
}

const SHIPPING_COSTS = {
  standard: 0,    // Gratis
  express: 4.95,  // Express 24-48h
  urgent: 9.95,   // Urgente 24h
};
const FREE_SHIPPING_THRESHOLD = 50;

export default function Checkout() {
  const cart = useStore(cartStore);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Address autocomplete state
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [zipLoading, setZipLoading] = useState(false);
  const [streetSuggestions, setStreetSuggestions] = useState<AddressSuggestion[]>([]);

  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'España',
    shippingMethod: 'standard',
    notes: '',
  });

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    method: 'card',
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCVV: '',
  });

  const [acceptTerms, setAcceptTerms] = useState(false);

  // Validación con Zod para el formulario de envío
  const shippingValidation = useFormValidation(shippingInfoSchema, {
    validateOnChange: false,
    validateOnBlur: true,
    showToastOnError: false,
    formName: 'Checkout-Shipping',
  });

  // Validación con Zod para el formulario de pago
  const paymentValidation = useFormValidation(paymentInfoSchema, {
    validateOnChange: false,
    validateOnBlur: true,
    showToastOnError: false,
    formName: 'Checkout-Payment',
  });

  useEffect(() => {
    if (cart.items.length === 0 && typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, [cart.items.length]);

  // ZIP code lookup effect
  useEffect(() => {
    const zip = shippingInfo.zipCode;
    if (!/^\d{5}$/.test(zip)) {
      setCitySuggestions([]);
      return;
    }

    let cancelled = false;
    setZipLoading(true);

    lookupZipES(zip)
      .then((info) => {
        if (cancelled || !info) return;

        logger.debug('[Checkout] ZIP lookup result', info);

        // Auto-fill province if available and not already set
        if (info.province && !shippingInfo.state) {
          setShippingInfo((prev) => ({ ...prev, state: info.province! }));
        }

        // Set city suggestions
        if (info.cities.length > 0) {
          setCitySuggestions(info.cities);

          // Auto-fill city if there's only one option
          if (info.cities.length === 1 && !shippingInfo.city) {
            setShippingInfo((prev) => ({ ...prev, city: info.cities[0] }));
          }
        }
      })
      .catch((error) => {
        logger.warn('[Checkout] ZIP lookup failed', error);
      })
      .finally(() => {
        if (!cancelled) setZipLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shippingInfo.zipCode]);

  // Debounced street autocomplete
  const handleStreetAutocomplete = useCallback(
    debounce(async (text: string) => {
      if (text.length < 3) {
        setStreetSuggestions([]);
        return;
      }

      try {
        const suggestions = await autocompleteStreetES(text, {
          postcode: shippingInfo.zipCode,
          city: shippingInfo.city,
        });

        logger.debug('[Checkout] Street autocomplete results', { count: suggestions.length });
        setStreetSuggestions(suggestions);
      } catch (error) {
        logger.warn('[Checkout] Street autocomplete failed', error);
        setStreetSuggestions([]);
      }
    }, 350),
    [shippingInfo.zipCode, shippingInfo.city]
  );

  const subtotal = cart.total;
  const couponDiscount = appliedCoupon?.discountAmount || 0;

  // Calculate shipping cost based on method and free shipping conditions
  const getShippingCost = () => {
    // Free shipping from coupon or cart threshold
    if (appliedCoupon?.freeShipping || subtotal >= FREE_SHIPPING_THRESHOLD) {
      return 0;
    }
    // Return cost based on selected method
    return SHIPPING_COSTS[shippingInfo.shippingMethod || 'standard'];
  };

  const shippingCost = getShippingCost();

  // Calculate IVA (21% Spanish VAT on subtotal after discount)
  const subtotalAfterDiscount = subtotal - couponDiscount;
  const iva = subtotalAfterDiscount * 0.21;

  // Total includes: subtotal - discount + shipping + IVA
  const total = subtotalAfterDiscount + shippingCost + iva;

  const validateStep1 = async (): Promise<boolean> => {
    logger.debug('[Checkout] Validating step 1 (shipping info)', shippingInfo);

    const result = await shippingValidation.validate(shippingInfo);

    if (!result.success) {
      const firstError = Object.values(result.errors!)[0];
      notify.error(firstError || 'Por favor, corrige los errores en el formulario');
      logger.warn('[Checkout] Step 1 validation failed', result.errors);
      return false;
    }

    logger.info('[Checkout] Step 1 validation successful');
    return true;
  };

  const validateStep2 = async (): Promise<boolean> => {
    logger.debug('[Checkout] Validating step 2 (payment info)', paymentInfo);

    const result = await paymentValidation.validate(paymentInfo);

    if (!result.success) {
      const firstError = Object.values(result.errors!)[0];
      notify.error(firstError || 'Por favor, corrige los errores de pago');
      logger.warn('[Checkout] Step 2 validation failed', result.errors);
      return false;
    }

    logger.info('[Checkout] Step 2 validation successful');
    return true;
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      const isValid = await validateStep1();
      if (isValid) {
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        logger.info('[Checkout] Moved to step 2');
      }
    } else if (currentStep === 2) {
      const isValid = await validateStep2();
      if (isValid) {
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        logger.info('[Checkout] Moved to step 3');
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as CheckoutStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      notify.warning('Introduce un código de cupón');
      return;
    }

    setValidatingCoupon(true);
    logger.info('[Checkout] Validating coupon', { code: couponCode });

    try {
      const response = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          userId: 'guest', // TODO: Replace with actual user ID when auth is implemented
          cartTotal: subtotal,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        logger.warn('[Checkout] Coupon validation failed', data);
        notify.error(data.error || 'Cupón no válido');
        return;
      }

      logger.info('[Checkout] Coupon applied successfully', data.coupon);
      setAppliedCoupon(data.coupon);
      notify.success(`¡Cupón ${data.coupon.code} aplicado!`);
      setCouponCode('');
    } catch (error) {
      logger.error('[Checkout] Error validating coupon', error);
      notify.error('Error al validar el cupón. Intenta de nuevo.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    logger.info('[Checkout] Removing coupon', appliedCoupon);
    setAppliedCoupon(null);
    notify.success('Cupón eliminado');
  };

  const handlePlaceOrder = async () => {
    if (!acceptTerms) {
      notify.warning('Debes aceptar los términos y condiciones');
      return;
    }

    logger.info('[Checkout] Placing order', { total, itemCount: cart.items.length });
    setIsProcessing(true);
    try {
      // Preparar datos de la orden para Firebase
      const orderData = {
        items: cart.items.map((item) => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
        })),
        userId: 'guest', // Cambiar cuando haya autenticación
        customerEmail: shippingInfo.email,
        shippingInfo: {
          fullName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
          email: shippingInfo.email,
          address: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          zipCode: shippingInfo.zipCode,
          country: 'España',
          phone: shippingInfo.phone,
          shippingMethod: shippingInfo.shippingMethod || 'standard',
        },
        paymentMethod: paymentInfo.method,
        subtotal,
        couponDiscount,
        couponCode: appliedCoupon?.code,
        couponId: appliedCoupon?.id,
        shippingCost,
        iva,
        total,
        status: 'pending',
      };

      // Guardar orden en Firebase
      const response = await fetch('/api/save-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Error al guardar la orden');
      }

      const { orderId } = await response.json();

      // Limpiar carrito y redirigir
      logger.info('[Checkout] Order placed successfully', { orderId });
      notify.success('¡Pedido realizado con éxito!');
      clearCart();

      // Pequeña pausa para que el usuario vea la notificación
      setTimeout(() => {
        window.location.href = `/confirmacion?orderId=${orderId}`;
      }, 500);
    } catch (error) {
      logger.error('[Checkout] Error placing order', error);
      notify.error('Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19);
  };

  if (cart.items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8 mt-32">
      <div className="container mx-auto px-6 mb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            {[
              { step: 1, label: 'Envío' },
              { step: 2, label: 'Pago' },
              { step: 3, label: 'Confirmar' },
            ].map((item, index) => (
              <div key={item.step} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${currentStep >= item.step ? 'bg-gradient-primary text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-500'}`}
                  >
                    {currentStep > item.step ? '✓' : item.step}
                  </div>
                  <span
                    className={`ml-2 font-bold text-sm ${currentStep >= item.step ? 'text-cyan-600' : 'text-gray-400'}`}
                  >
                    {item.label}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded transition-all duration-300 ${currentStep > item.step ? 'bg-gradient-primary' : 'bg-gray-200'}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-200">
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-black text-gray-800 mb-2">Información de Envío</h2>
                    <p className="text-gray-600">Completa tus datos para recibir tu pedido</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Nombre *</label>
                      <input
                        type="text"
                        value={shippingInfo.firstName}
                        onChange={(e) => {
                          setShippingInfo({ ...shippingInfo, firstName: e.target.value });
                          shippingValidation.handleChange('firstName', e.target.value);
                        }}
                        onBlur={(e) => shippingValidation.handleBlur('firstName', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${shippingValidation.errors.firstName ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Juan"
                      />
                      {shippingValidation.errors.firstName && (
                        <p className="text-red-500 text-sm mt-1">{shippingValidation.errors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Apellidos *
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.lastName}
                        onChange={(e) => {
                          setShippingInfo({ ...shippingInfo, lastName: e.target.value });
                          shippingValidation.handleChange('lastName', e.target.value);
                        }}
                        onBlur={(e) => shippingValidation.handleBlur('lastName', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${shippingValidation.errors.lastName ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="García"
                      />
                      {shippingValidation.errors.lastName && (
                        <p className="text-red-500 text-sm mt-1">{shippingValidation.errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                      <input
                        type="email"
                        value={shippingInfo.email}
                        onChange={(e) => {
                          setShippingInfo({ ...shippingInfo, email: e.target.value });
                          shippingValidation.handleChange('email', e.target.value);
                        }}
                        onBlur={(e) => shippingValidation.handleBlur('email', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${shippingValidation.errors.email ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="tu@email.com"
                      />
                      {shippingValidation.errors.email && <p className="text-red-500 text-sm mt-1">{shippingValidation.errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Teléfono *
                      </label>
                      <input
                        type="tel"
                        value={shippingInfo.phone}
                        onChange={(e) => {
                          setShippingInfo({ ...shippingInfo, phone: e.target.value });
                          shippingValidation.handleChange('phone', e.target.value);
                        }}
                        onBlur={(e) => shippingValidation.handleBlur('phone', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${shippingValidation.errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="612 345 678"
                      />
                      {shippingValidation.errors.phone && <p className="text-red-500 text-sm mt-1">{shippingValidation.errors.phone}</p>}
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Dirección *
                    </label>
                    <input
                      type="text"
                      value={shippingInfo.address}
                      onChange={(e) => {
                        setShippingInfo({ ...shippingInfo, address: e.target.value });
                        shippingValidation.handleChange('address', e.target.value);
                        handleStreetAutocomplete(e.target.value);
                      }}
                      onBlur={(e) => {
                        shippingValidation.handleBlur('address', e.target.value);
                        // Clear suggestions after a delay
                        setTimeout(() => setStreetSuggestions([]), 200);
                      }}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${shippingValidation.errors.address ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Calle Principal, 123, Piso 2"
                    />
                    {shippingValidation.errors.address && (
                      <p className="text-red-500 text-sm mt-1">{shippingValidation.errors.address}</p>
                    )}

                    {/* Street autocomplete suggestions */}
                    {streetSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border-2 border-cyan-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                        {streetSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              setShippingInfo({
                                ...shippingInfo,
                                address: suggestion.label,
                                city: suggestion.city || shippingInfo.city,
                                state: suggestion.province || shippingInfo.state,
                                zipCode: suggestion.postcode || shippingInfo.zipCode,
                              });
                              setStreetSuggestions([]);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-cyan-50 transition-colors border-b border-gray-100 last:border-0"
                          >
                            <div className="font-medium text-gray-800">{suggestion.label}</div>
                            {suggestion.city && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {suggestion.city}
                                {suggestion.postcode && `, ${suggestion.postcode}`}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Ciudad *</label>
                      <input
                        type="text"
                        value={shippingInfo.city}
                        onChange={(e) => {
                          setShippingInfo({ ...shippingInfo, city: e.target.value });
                          shippingValidation.handleChange('city', e.target.value);
                        }}
                        onBlur={(e) => {
                          shippingValidation.handleBlur('city', e.target.value);
                          // Clear suggestions after a delay
                          setTimeout(() => setCitySuggestions([]), 200);
                        }}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${shippingValidation.errors.city ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Madrid"
                      />
                      {shippingValidation.errors.city && <p className="text-red-500 text-sm mt-1">{shippingValidation.errors.city}</p>}

                      {/* City autocomplete suggestions */}
                      {citySuggestions.length > 1 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border-2 border-cyan-200 rounded-xl shadow-lg max-h-40 overflow-auto">
                          {citySuggestions.map((city) => (
                            <button
                              key={city}
                              type="button"
                              onClick={() => {
                                setShippingInfo({ ...shippingInfo, city });
                                setCitySuggestions([]);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-cyan-50 transition-colors"
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Provincia *
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.state}
                        onChange={(e) => {
                          setShippingInfo({ ...shippingInfo, state: e.target.value });
                          shippingValidation.handleChange('state', e.target.value);
                        }}
                        onBlur={(e) => shippingValidation.handleBlur('state', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${shippingValidation.errors.state ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Madrid"
                      />
                      {shippingValidation.errors.state && <p className="text-red-500 text-sm mt-1">{shippingValidation.errors.state}</p>}
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-bold text-gray-700 mb-2">CP *</label>
                      <input
                        type="text"
                        value={shippingInfo.zipCode}
                        onChange={(e) => {
                          setShippingInfo({ ...shippingInfo, zipCode: e.target.value });
                          shippingValidation.handleChange('zipCode', e.target.value);
                        }}
                        onBlur={(e) => shippingValidation.handleBlur('zipCode', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${shippingValidation.errors.zipCode ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="28001"
                        maxLength={5}
                      />
                      {zipLoading && (
                        <div className="absolute right-3 top-11 text-xs text-cyan-600 flex items-center gap-1">
                          <div className="w-3 h-3 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Buscando...</span>
                        </div>
                      )}
                      {shippingValidation.errors.zipCode && (
                        <p className="text-red-500 text-sm mt-1">{shippingValidation.errors.zipCode}</p>
                      )}
                    </div>
                  </div>

                  {/* Shipping Method Selector */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Método de envío *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Standard Shipping */}
                      <label
                        className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          shippingInfo.shippingMethod === 'standard'
                            ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200'
                            : 'border-gray-300 hover:border-cyan-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shippingMethod"
                          value="standard"
                          checked={shippingInfo.shippingMethod === 'standard'}
                          onChange={(e) =>
                            setShippingInfo({
                              ...shippingInfo,
                              shippingMethod: e.target.value as 'standard' | 'express' | 'urgent',
                            })
                          }
                          className="sr-only"
                        />
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-bold text-gray-800">Estándar</span>
                          <span className="font-black text-green-600">GRATIS</span>
                        </div>
                        <p className="text-xs text-gray-600">3-5 días laborables</p>
                        {shippingInfo.shippingMethod === 'standard' && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </label>

                      {/* Express Shipping */}
                      <label
                        className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          shippingInfo.shippingMethod === 'express'
                            ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200'
                            : 'border-gray-300 hover:border-cyan-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shippingMethod"
                          value="express"
                          checked={shippingInfo.shippingMethod === 'express'}
                          onChange={(e) =>
                            setShippingInfo({
                              ...shippingInfo,
                              shippingMethod: e.target.value as 'standard' | 'express' | 'urgent',
                            })
                          }
                          className="sr-only"
                        />
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-bold text-gray-800">Express</span>
                          <span className="font-black text-gray-800">€4.95</span>
                        </div>
                        <p className="text-xs text-gray-600">24-48 horas</p>
                        {shippingInfo.shippingMethod === 'express' && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </label>

                      {/* Urgent Shipping */}
                      <label
                        className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          shippingInfo.shippingMethod === 'urgent'
                            ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200'
                            : 'border-gray-300 hover:border-cyan-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shippingMethod"
                          value="urgent"
                          checked={shippingInfo.shippingMethod === 'urgent'}
                          onChange={(e) =>
                            setShippingInfo({
                              ...shippingInfo,
                              shippingMethod: e.target.value as 'standard' | 'express' | 'urgent',
                            })
                          }
                          className="sr-only"
                        />
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-bold text-gray-800">Urgente</span>
                          <span className="font-black text-orange-600">€9.95</span>
                        </div>
                        <p className="text-xs text-gray-600">24 horas</p>
                        {shippingInfo.shippingMethod === 'urgent' && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </label>
                    </div>
                    {appliedCoupon?.freeShipping && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ Envío gratis aplicado por cupón {appliedCoupon.code}
                      </p>
                    )}
                    {subtotal >= FREE_SHIPPING_THRESHOLD && !appliedCoupon?.freeShipping && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ Envío gratis por superar €{FREE_SHIPPING_THRESHOLD}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Notas adicionales (opcional)
                    </label>
                    <textarea
                      value={shippingInfo.notes}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, notes: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                      rows={3}
                      placeholder="Ej: Dejar en portería, llamar antes de entregar..."
                    />
                  </div>

                  <button
                    onClick={handleNextStep}
                    className="w-full py-4 bg-gradient-rainbow text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                  >
                    Continuar al Pago →
                  </button>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-black text-gray-800 mb-2">Método de Pago</h2>
                    <p className="text-gray-600">Elige cómo quieres pagar tu pedido</p>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        method: 'card',
                        icon: '💳',
                        label: 'Tarjeta de Crédito/Débito',
                        description: 'Pago seguro con tarjeta',
                      },
                      {
                        method: 'paypal',
                        icon: '🅿️',
                        label: 'PayPal',
                        description: 'Pago rápido y seguro',
                      },
                      {
                        method: 'transfer',
                        icon: '🏦',
                        label: 'Transferencia Bancaria',
                        description: 'Te enviaremos los datos',
                      },
                      {
                        method: 'cash',
                        icon: '💵',
                        label: 'Contra Reembolso',
                        description: 'Paga al recibir (+3€)',
                      },
                    ].map((option) => (
                      <button
                        key={option.method}
                        onClick={() =>
                          setPaymentInfo({ ...paymentInfo, method: option.method as any })
                        }
                        className={`w-full p-4 rounded-xl border-2 transition-all duration-300 text-left ${paymentInfo.method === option.method ? 'border-cyan-500 bg-cyan-50 shadow-lg scale-105' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">{option.icon}</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-800">{option.label}</div>
                            <div className="text-sm text-gray-500">{option.description}</div>
                          </div>
                          {paymentInfo.method === option.method && (
                            <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white">
                              ✓
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {paymentInfo.method === 'card' && (
                    <div className="space-y-4 mt-6 p-6 bg-gray-50 rounded-2xl border-2 border-gray-200">
                      <h3 className="font-bold text-gray-800 mb-4">Datos de la Tarjeta</h3>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Número de Tarjeta *
                        </label>
                        <input
                          type="text"
                          value={paymentInfo.cardNumber}
                          onChange={(e) => {
                            const formatted = formatCardNumber(e.target.value);
                            setPaymentInfo({ ...paymentInfo, cardNumber: formatted });
                            paymentValidation.handleChange('cardNumber', formatted);
                          }}
                          onBlur={(e) => paymentValidation.handleBlur('cardNumber', e.target.value)}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all font-mono ${paymentValidation.errors.cardNumber ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                        />
                        {paymentValidation.errors.cardNumber && (
                          <p className="text-red-500 text-sm mt-1">{paymentValidation.errors.cardNumber}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Nombre en la Tarjeta *
                        </label>
                        <input
                          type="text"
                          value={paymentInfo.cardName}
                          onChange={(e) => {
                            const upperValue = e.target.value.toUpperCase();
                            setPaymentInfo({ ...paymentInfo, cardName: upperValue });
                            paymentValidation.handleChange('cardName', upperValue);
                          }}
                          onBlur={(e) => paymentValidation.handleBlur('cardName', e.target.value)}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all ${paymentValidation.errors.cardName ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="JUAN GARCIA"
                        />
                        {paymentValidation.errors.cardName && (
                          <p className="text-red-500 text-sm mt-1">{paymentValidation.errors.cardName}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Fecha de Vencimiento *
                          </label>
                          <input
                            type="text"
                            value={paymentInfo.cardExpiry}
                            onChange={(e) => {
                              let value = e.target.value.replace(/\D/g, '');
                              if (value.length >= 2) {
                                value = value.slice(0, 2) + '/' + value.slice(2, 4);
                              }
                              setPaymentInfo({ ...paymentInfo, cardExpiry: value });
                              paymentValidation.handleChange('cardExpiry', value);
                            }}
                            onBlur={(e) => paymentValidation.handleBlur('cardExpiry', e.target.value)}
                            className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all font-mono ${paymentValidation.errors.cardExpiry ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="MM/AA"
                            maxLength={5}
                          />
                          {paymentValidation.errors.cardExpiry && (
                            <p className="text-red-500 text-sm mt-1">{paymentValidation.errors.cardExpiry}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            CVV *
                          </label>
                          <input
                            type="text"
                            value={paymentInfo.cardCVV}
                            onChange={(e) => {
                              const cvv = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setPaymentInfo({ ...paymentInfo, cardCVV: cvv });
                              paymentValidation.handleChange('cardCVV', cvv);
                            }}
                            onBlur={(e) => paymentValidation.handleBlur('cardCVV', e.target.value)}
                            className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all font-mono ${paymentValidation.errors.cardCVV ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="123"
                            maxLength={4}
                          />
                          {paymentValidation.errors.cardCVV && (
                            <p className="text-red-500 text-sm mt-1">{paymentValidation.errors.cardCVV}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={handlePreviousStep}
                      className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-300 transition-all duration-300"
                    >
                      ← Volver
                    </button>
                    <button
                      onClick={handleNextStep}
                      className="flex-1 py-4 bg-gradient-rainbow text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                    >
                      Revisar Pedido →
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-black text-gray-800 mb-2">Revisar Pedido</h2>
                    <p className="text-gray-600">
                      Confirma que todo está correcto antes de finalizar
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-800">📦 Envío a:</h3>
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="text-cyan-600 hover:text-cyan-700 font-bold text-sm"
                      >
                        Editar
                      </button>
                    </div>
                    <div className="space-y-1 text-gray-700">
                      <p className="font-bold">
                        {shippingInfo.firstName} {shippingInfo.lastName}
                      </p>
                      <p>{shippingInfo.address}</p>
                      <p>
                        {shippingInfo.zipCode} {shippingInfo.city}, {shippingInfo.state}
                      </p>
                      <p>{shippingInfo.country}</p>
                      <p className="pt-2">{shippingInfo.email}</p>
                      <p>{shippingInfo.phone}</p>
                      {shippingInfo.notes && (
                        <p className="pt-2 text-sm italic text-gray-600">
                          Nota: {shippingInfo.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-800">💳 Método de Pago:</h3>
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="text-cyan-600 hover:text-cyan-700 font-bold text-sm"
                      >
                        Editar
                      </button>
                    </div>
                    <p className="text-gray-700 font-medium">
                      {paymentInfo.method === 'card' && '💳 Tarjeta de Crédito/Débito'}
                      {paymentInfo.method === 'paypal' && '🅿️ PayPal'}
                      {paymentInfo.method === 'transfer' && '🏦 Transferencia Bancaria'}
                      {paymentInfo.method === 'cash' && '💵 Contra Reembolso'}
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-1 w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                      />
                      <span className="text-sm text-gray-700">
                        He leído y acepto los{' '}
                        <a href="/terminos" className="text-cyan-600 hover:underline font-bold">
                          términos y condiciones
                        </a>{' '}
                        y la{' '}
                        <a href="/privacidad" className="text-cyan-600 hover:underline font-bold">
                          política de privacidad
                        </a>
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handlePreviousStep}
                      className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-300 transition-all duration-300"
                    >
                      ← Volver
                    </button>
                    <button
                      onClick={handlePlaceOrder}
                      disabled={!acceptTerms || isProcessing}
                      className={`flex-1 py-4 rounded-2xl font-black text-lg transition-all duration-300 ${!acceptTerms || isProcessing ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-rainbow text-white shadow-lg hover:shadow-2xl transform hover:scale-105'}`}
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Procesando...
                        </span>
                      ) : (
                        `✓ Realizar Pedido - €${total.toFixed(2)}`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-white rounded-3xl shadow-2xl p-6 border border-gray-200">
              <h2 className="text-2xl font-black text-gray-800 mb-6">Resumen del Pedido</h2>
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {cart.items.map((item: CartItem) => (
                  <div
                    key={`${item.id}-${item.variantId}`}
                    className="flex gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <img
                      src={item.image || FALLBACK_IMG_400x300}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.onerror = null;
                        img.src = FALLBACK_IMG_400x300;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 text-sm truncate">{item.name}</h3>
                      {item.variantName && (
                        <p className="text-xs text-gray-500 truncate">{item.variantName}</p>
                      )}
                      {item.customization && (
                        <p className="text-xs text-purple-600 font-medium">✨ Personalizado</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600">x{item.quantity}</span>
                        <span className="font-bold text-cyan-600">
                          €{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Section */}
              <div className="py-4 border-t-2 border-gray-200">
                {!appliedCoupon ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">
                      ¿Tienes un cupón de descuento?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        placeholder="CODIGO-DESCUENTO"
                        className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none font-mono uppercase"
                        disabled={validatingCoupon}
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={validatingCoupon || !couponCode.trim()}
                        className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {validatingCoupon ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Validando...</span>
                          </div>
                        ) : (
                          'Aplicar'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-green-600 font-black">✓ Cupón aplicado</span>
                          <span className="px-2 py-0.5 bg-green-200 text-green-800 font-mono font-bold text-xs rounded">
                            {appliedCoupon.code}
                          </span>
                        </div>
                        <p className="text-sm text-green-700">{appliedCoupon.description}</p>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-red-500 hover:text-red-700 font-bold text-sm ml-2"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 py-4 border-t-2 border-gray-200">
                <div className="flex justify-between text-gray-700">
                  <span>
                    Subtotal ({cart.items.length}{' '}
                    {cart.items.length === 1 ? 'producto' : 'productos'})
                  </span>
                  <span className="font-bold">€{subtotal.toFixed(2)}</span>
                </div>

                {appliedCoupon && couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento ({appliedCoupon.code})</span>
                    <span className="font-bold">-€{couponDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-700">
                  <span>Envío</span>
                  {shippingCost === 0 ? (
                    <span className="font-bold text-green-500">
                      GRATIS ✓
                      {appliedCoupon?.freeShipping && (
                        <span className="text-xs ml-1">(Cupón)</span>
                      )}
                    </span>
                  ) : (
                    <span className="font-bold">€{shippingCost.toFixed(2)}</span>
                  )}
                </div>
                {subtotal < FREE_SHIPPING_THRESHOLD && !appliedCoupon?.freeShipping && (
                  <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg">
                    💡 ¡Añade €{(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)} más para envío
                    GRATIS!
                  </div>
                )}

                <div className="flex justify-between text-gray-700">
                  <span>
                    IVA (21%)
                  </span>
                  <span className="font-bold">€{iva.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-xl font-black text-gray-800 pt-3 border-t-2 border-gray-200">
                  <span>Total</span>
                  <span className="text-cyan-600">€{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
