import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { cartStore, clearCart } from '../../store/cartStore';
import type { CartItem } from '../../store/cartStore';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import { shippingInfoSchema } from '../../lib/validation/schemas';
import { useFormValidation } from '../../hooks/useFormValidation';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { lookupZipES, autocompleteStreetES, debounce } from '../../utils/address';
import type { AddressSuggestion } from '../../utils/address';
import { useAuth } from '../hooks/useAuth';
import { useSecureCardPayment } from '../checkout/SecureCardPayment';

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

interface BillingInfo {
  fiscalName: string;
  nifCif: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface PaymentInfo {
  method: 'card' | 'paypal' | 'transfer' | 'cash';
  // Card data removed - now handled securely by Stripe Elements
  // No card data in state = PCI-DSS compliant ✓
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
  standard: 0, // Gratis
  express: 4.95, // Express 24-48h
  urgent: 9.95, // Urgente 24h
};
const FREE_SHIPPING_THRESHOLD = 50;

export default function Checkout() {
  const cart = useStore(cartStore);
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

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

  // Billing info state
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    fiscalName: '',
    nifCif: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'España',
  });

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    method: 'card',
    // Card fields removed - Stripe Elements handles them securely
  });

  const [acceptTerms, setAcceptTerms] = useState(false);

  // Order tracking for Stripe Elements payments
  const [orderId, setOrderId] = useState<string | null>(null);

  // Validación con Zod para el formulario de envío
  const shippingValidation = useFormValidation(shippingInfoSchema, {
    validateOnChange: false,
    validateOnBlur: true,
    showToastOnError: false,
    formName: 'Checkout-Shipping',
  });

  // Payment validation removed - Stripe Elements validates card data securely

  useEffect(() => {
    if (cart.items.length === 0 && typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, [cart.items.length]);

  // Load wallet balance when user is authenticated
  useEffect(() => {
    if (!user) {
      setWalletBalance(0);
      setUseWallet(false);
      return;
    }

    const loadWalletBalance = async () => {
      try {
        logger.info('[Checkout] Loading wallet balance', { userId: user.uid });

        const token = await user.getIdToken();
        if (!token) {
          throw new Error('No se pudo obtener el token de autenticación');
        }

        const response = await fetch(`/api/get-wallet-balance?userId=${user.uid}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Error al cargar el saldo');
        }

        const data = await response.json();
        const balance = data.balance || 0;
        setWalletBalance(balance);
        logger.info('[Checkout] Wallet balance loaded', { balance });
      } catch (error) {
        logger.error('[Checkout] Error loading wallet balance', error);
        setWalletBalance(0);
      }
    };

    loadWalletBalance();
  }, [user]);

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
          setShippingInfo((prev) => ({ ...prev, state: info.province || '' }));
        }

        // Set city suggestions
        if (info.cities.length > 0) {
          setCitySuggestions(info.cities);

          // Auto-fill city if there's only one option
          if (info.cities.length === 1 && !shippingInfo.city) {
            setShippingInfo((prev) => ({ ...prev, city: info.cities[0] || '' }));
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

  // Calculate tax based on province (different tax regimes in Spain)
  const getTaxInfo = () => {
    const province = shippingInfo.state;

    // Canarias: IGIC exempt (0% - not registered for IGIC)
    if (province === 'Las Palmas' || province === 'Santa Cruz de Tenerife') {
      return { rate: 0, name: 'IGIC', label: 'IGIC (Exento)' };
    }

    // Ceuta y Melilla: IPSI (exempt for most products, we'll use 0%)
    if (province === 'Ceuta' || province === 'Melilla') {
      return { rate: 0, name: 'IPSI', label: 'IPSI (Exento)' };
    }

    // Rest of Spain: IVA 21%
    return { rate: 0.21, name: 'IVA', label: 'IVA (21%)' };
  };

  const taxInfo = getTaxInfo();
  const subtotalAfterDiscount = subtotal - couponDiscount;
  const tax = subtotalAfterDiscount * taxInfo.rate;

  // Calculate wallet discount
  const totalBeforeWallet = subtotalAfterDiscount + shippingCost + tax;
  const walletDiscount = useWallet ? Math.min(walletBalance, totalBeforeWallet) : 0;

  // Total includes: subtotal - coupon discount + shipping + tax - wallet discount
  const total = totalBeforeWallet - walletDiscount;

  // REMOVED: Old insecure processCardPayment function
  // Now using Stripe Elements (PCI-DSS compliant)

  const clearCartAndStorage = useCallback(async () => {
    // Wait for cart to clear in both localStorage AND Firestore
    await clearCart();

    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem('cart:guest');
      if (user?.uid) {
        localStorage.removeItem(`cart:${user.uid}`);
      }
      logger.info('[Checkout] Cart storage cleared successfully');
    } catch (storageError) {
      logger.warn('[Checkout] Failed to clear cart storage', storageError);
    }
  }, [user]);

  // Stripe Elements - PCI-DSS Compliant Payment
  const securePayment = useSecureCardPayment({
    orderId: orderId ?? '',
    orderTotal: total,
    billingDetails: {
      name: `${shippingInfo.firstName} ${shippingInfo.lastName}`.trim(),
      email: shippingInfo.email,
      phone: shippingInfo.phone,
      address: {
        line1: shippingInfo.address,
        city: shippingInfo.city,
        postal_code: shippingInfo.zipCode,
        state: shippingInfo.state,
        country: 'ES',
      },
    },
    onSuccess: async (paymentIntentId, completedOrderId) => {
      logger.info('[Checkout] Payment successful', {
        paymentIntentId,
        orderId: completedOrderId,
      });
      if (typeof window !== 'undefined') {
        const storedOrder = sessionStorage.getItem('checkout:lastOrder');
        if (storedOrder) {
          try {
            const parsed = JSON.parse(storedOrder);
            if (parsed?.id === completedOrderId) {
              parsed.status = 'paid';
              sessionStorage.setItem('checkout:lastOrder', JSON.stringify(parsed));
            }
          } catch (storageError) {
            logger.warn('[Checkout] Failed to update stored order status', storageError);
          }
        }
      }
      notify.success('¡Pago completado con éxito!');
      await clearCartAndStorage();
      setTimeout(() => {
        window.location.href = `/confirmacion?orderId=${completedOrderId}`;
      }, 500);
    },
    onError: (errorMessage) => {
      logger.error('[Checkout] Payment failed', { error: errorMessage });
      notify.error(errorMessage);
      setIsProcessing(false);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('checkout:lastOrder');
      }
    },
  });

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
    logger.debug('[Checkout] Validating step 2 (payment method)', paymentInfo);

    // Payment method validation only
    if (!paymentInfo.method) {
      notify.error('Selecciona un método de pago');
      return false;
    }

    // Card validation handled by Stripe Elements
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
      const idempotencyKey = `order_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      logger.info('[Checkout] Generated idempotency key:', idempotencyKey);

      const orderData = {
        idempotencyKey,
        items: cart.items.map((item) => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
        })),
        userId: user?.uid || 'guest',
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
        billingInfo: useSameAddress
          ? {
              fiscalName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
              nifCif: billingInfo.nifCif || '',
              address: shippingInfo.address,
              city: shippingInfo.city,
              state: shippingInfo.state,
              zipCode: shippingInfo.zipCode,
              country: 'España',
            }
          : {
              fiscalName: billingInfo.fiscalName,
              nifCif: billingInfo.nifCif,
              address: billingInfo.address,
              city: billingInfo.city,
              state: billingInfo.state,
              zipCode: billingInfo.zipCode,
              country: billingInfo.country,
            },
        paymentMethod: paymentInfo.method,
        subtotal,
        couponDiscount,
        couponCode: appliedCoupon?.code,
        couponId: appliedCoupon?.id,
        shippingCost,
        tax,
        taxType: taxInfo.name,
        taxRate: taxInfo.rate,
        taxLabel: taxInfo.label,
        walletDiscount: useWallet ? walletDiscount : 0,
        usedWallet: useWallet,
        total,
        status: 'pending',
      };

      const response = await fetch('/api/save-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Error al guardar la orden');
      }

      const { orderId: newOrderId } = await response.json();
      setOrderId(newOrderId);

      if (typeof window !== 'undefined') {
        const fallbackOrder = {
          id: newOrderId,
          date: new Date().toISOString(),
          items: orderData.items,
          shippingInfo: orderData.shippingInfo,
          billingInfo: orderData.billingInfo,
          paymentInfo: { method: orderData.paymentMethod },
          subtotal: Number(orderData.subtotal || 0),
          shipping: Number(orderData.shippingCost || 0),
          tax: Number(orderData.tax || 0),
          taxLabel: orderData.taxLabel,
          total: Number(orderData.total || 0),
          status: orderData.status,
          userId: orderData.userId,
          accessKey: idempotencyKey,
        };
        sessionStorage.setItem('checkout:lastOrder', JSON.stringify(fallbackOrder));
      }

      logger.info('[Checkout] Order saved', { orderId: newOrderId });

      if (paymentInfo.method === 'card') {
        logger.info('[Checkout] Processing card payment...');
        const paymentResult = await securePayment.processPayment(newOrderId);

        if (!paymentResult.success) {
          throw new Error(paymentResult.error || 'Error procesando pago');
        }
        // El onSuccess del hook maneja el resto (notificación, carrito y redirección)
      } else {
        notify.success('¡Pedido realizado con éxito!');
        await clearCartAndStorage();
        setTimeout(() => {
          window.location.href = `/confirmacion?orderId=${newOrderId}`;
        }, 500);
      }
    } catch (error) {
      logger.error('[Checkout] Error placing order', error);
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.';
      notify.error(errorMessage);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('checkout:lastOrder');
      }
    } finally {
      setIsProcessing(false);
    }
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
                        <p className="text-red-500 text-sm mt-1">
                          {shippingValidation.errors.firstName}
                        </p>
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
                        <p className="text-red-500 text-sm mt-1">
                          {shippingValidation.errors.lastName}
                        </p>
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
                      {shippingValidation.errors.email && (
                        <p className="text-red-500 text-sm mt-1">
                          {shippingValidation.errors.email}
                        </p>
                      )}
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
                      {shippingValidation.errors.phone && (
                        <p className="text-red-500 text-sm mt-1">
                          {shippingValidation.errors.phone}
                        </p>
                      )}
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
                      <p className="text-red-500 text-sm mt-1">
                        {shippingValidation.errors.address}
                      </p>
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
                      {shippingValidation.errors.city && (
                        <p className="text-red-500 text-sm mt-1">
                          {shippingValidation.errors.city}
                        </p>
                      )}

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
                      <select
                        value={shippingInfo.state}
                        onChange={(e) => {
                          setShippingInfo({ ...shippingInfo, state: e.target.value });
                          shippingValidation.handleChange('state', e.target.value);
                        }}
                        onBlur={(e) => shippingValidation.handleBlur('state', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all bg-white ${shippingValidation.errors.state ? 'border-red-500' : 'border-gray-300'}`}
                      >
                        <option value="">Selecciona una provincia</option>
                        <option value="Álava">Álava</option>
                        <option value="Albacete">Albacete</option>
                        <option value="Alicante">Alicante</option>
                        <option value="Almería">Almería</option>
                        <option value="Asturias">Asturias</option>
                        <option value="Ávila">Ávila</option>
                        <option value="Badajoz">Badajoz</option>
                        <option value="Baleares">Baleares</option>
                        <option value="Barcelona">Barcelona</option>
                        <option value="Burgos">Burgos</option>
                        <option value="Cáceres">Cáceres</option>
                        <option value="Cádiz">Cádiz</option>
                        <option value="Cantabria">Cantabria</option>
                        <option value="Castellón">Castellón</option>
                        <option value="Ceuta">Ceuta</option>
                        <option value="Ciudad Real">Ciudad Real</option>
                        <option value="Córdoba">Córdoba</option>
                        <option value="Cuenca">Cuenca</option>
                        <option value="Girona">Girona</option>
                        <option value="Granada">Granada</option>
                        <option value="Guadalajara">Guadalajara</option>
                        <option value="Guipúzcoa">Guipúzcoa</option>
                        <option value="Huelva">Huelva</option>
                        <option value="Huesca">Huesca</option>
                        <option value="Jaén">Jaén</option>
                        <option value="A Coruña">A Coruña</option>
                        <option value="La Rioja">La Rioja</option>
                        <option value="Las Palmas">Las Palmas</option>
                        <option value="León">León</option>
                        <option value="Lleida">Lleida</option>
                        <option value="Lugo">Lugo</option>
                        <option value="Madrid">Madrid</option>
                        <option value="Málaga">Málaga</option>
                        <option value="Melilla">Melilla</option>
                        <option value="Murcia">Murcia</option>
                        <option value="Navarra">Navarra</option>
                        <option value="Ourense">Ourense</option>
                        <option value="Palencia">Palencia</option>
                        <option value="Pontevedra">Pontevedra</option>
                        <option value="Salamanca">Salamanca</option>
                        <option value="Segovia">Segovia</option>
                        <option value="Sevilla">Sevilla</option>
                        <option value="Soria">Soria</option>
                        <option value="Tarragona">Tarragona</option>
                        <option value="Santa Cruz de Tenerife">Santa Cruz de Tenerife</option>
                        <option value="Teruel">Teruel</option>
                        <option value="Toledo">Toledo</option>
                        <option value="Valencia">Valencia</option>
                        <option value="Valladolid">Valladolid</option>
                        <option value="Vizcaya">Vizcaya</option>
                        <option value="Zamora">Zamora</option>
                        <option value="Zaragoza">Zaragoza</option>
                      </select>
                      {shippingValidation.errors.state && (
                        <p className="text-red-500 text-sm mt-1">
                          {shippingValidation.errors.state}
                        </p>
                      )}
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
                        <p className="text-red-500 text-sm mt-1">
                          {shippingValidation.errors.zipCode}
                        </p>
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

                  {/* Billing Information Section */}
                  <div className="border-t-2 border-gray-200 pt-6">
                    <h3 className="text-xl font-black text-gray-800 mb-4">
                      📋 Datos de Facturación
                    </h3>

                    {/* NIF/CIF field - always visible */}
                    <div className="mb-4">
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        NIF / CIF (opcional)
                      </label>
                      <input
                        type="text"
                        value={billingInfo.nifCif}
                        onChange={(e) =>
                          setBillingInfo({
                            ...billingInfo,
                            nifCif: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all bg-white font-mono"
                        placeholder="12345678A / B12345678"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Para empresas o particulares que necesiten factura con NIF/CIF
                      </p>
                    </div>

                    <div className="mb-4">
                      <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                        <input
                          type="checkbox"
                          checked={useSameAddress}
                          onChange={(e) => setUseSameAddress(e.target.checked)}
                          className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                        />
                        <span className="text-sm font-semibold text-gray-800">
                          Usar la misma dirección de envío para facturación
                        </span>
                      </label>
                    </div>

                    {!useSameAddress && (
                      <div className="space-y-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Nombre Fiscal / Razón Social *
                          </label>
                          <input
                            type="text"
                            value={billingInfo.fiscalName}
                            onChange={(e) =>
                              setBillingInfo({ ...billingInfo, fiscalName: e.target.value })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all bg-white"
                            placeholder="Juan García Pérez / Mi Empresa S.L."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Dirección Fiscal *
                          </label>
                          <input
                            type="text"
                            value={billingInfo.address}
                            onChange={(e) =>
                              setBillingInfo({ ...billingInfo, address: e.target.value })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all bg-white"
                            placeholder="Calle Principal, 123, Piso 2"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              Ciudad *
                            </label>
                            <input
                              type="text"
                              value={billingInfo.city}
                              onChange={(e) =>
                                setBillingInfo({ ...billingInfo, city: e.target.value })
                              }
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all bg-white"
                              placeholder="Madrid"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              Provincia *
                            </label>
                            <select
                              value={billingInfo.state}
                              onChange={(e) =>
                                setBillingInfo({ ...billingInfo, state: e.target.value })
                              }
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all bg-white"
                            >
                              <option value="">Selecciona una provincia</option>
                              <option value="Álava">Álava</option>
                              <option value="Albacete">Albacete</option>
                              <option value="Alicante">Alicante</option>
                              <option value="Almería">Almería</option>
                              <option value="Asturias">Asturias</option>
                              <option value="Ávila">Ávila</option>
                              <option value="Badajoz">Badajoz</option>
                              <option value="Baleares">Baleares</option>
                              <option value="Barcelona">Barcelona</option>
                              <option value="Burgos">Burgos</option>
                              <option value="Cáceres">Cáceres</option>
                              <option value="Cádiz">Cádiz</option>
                              <option value="Cantabria">Cantabria</option>
                              <option value="Castellón">Castellón</option>
                              <option value="Ceuta">Ceuta</option>
                              <option value="Ciudad Real">Ciudad Real</option>
                              <option value="Córdoba">Córdoba</option>
                              <option value="Cuenca">Cuenca</option>
                              <option value="Girona">Girona</option>
                              <option value="Granada">Granada</option>
                              <option value="Guadalajara">Guadalajara</option>
                              <option value="Guipúzcoa">Guipúzcoa</option>
                              <option value="Huelva">Huelva</option>
                              <option value="Huesca">Huesca</option>
                              <option value="Jaén">Jaén</option>
                              <option value="A Coruña">A Coruña</option>
                              <option value="La Rioja">La Rioja</option>
                              <option value="Las Palmas">Las Palmas</option>
                              <option value="León">León</option>
                              <option value="Lleida">Lleida</option>
                              <option value="Lugo">Lugo</option>
                              <option value="Madrid">Madrid</option>
                              <option value="Málaga">Málaga</option>
                              <option value="Melilla">Melilla</option>
                              <option value="Murcia">Murcia</option>
                              <option value="Navarra">Navarra</option>
                              <option value="Ourense">Ourense</option>
                              <option value="Palencia">Palencia</option>
                              <option value="Pontevedra">Pontevedra</option>
                              <option value="Salamanca">Salamanca</option>
                              <option value="Segovia">Segovia</option>
                              <option value="Sevilla">Sevilla</option>
                              <option value="Soria">Soria</option>
                              <option value="Tarragona">Tarragona</option>
                              <option value="Santa Cruz de Tenerife">Santa Cruz de Tenerife</option>
                              <option value="Teruel">Teruel</option>
                              <option value="Toledo">Toledo</option>
                              <option value="Valencia">Valencia</option>
                              <option value="Valladolid">Valladolid</option>
                              <option value="Vizcaya">Vizcaya</option>
                              <option value="Zamora">Zamora</option>
                              <option value="Zaragoza">Zaragoza</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                              CP *
                            </label>
                            <input
                              type="text"
                              value={billingInfo.zipCode}
                              onChange={(e) =>
                                setBillingInfo({ ...billingInfo, zipCode: e.target.value })
                              }
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all bg-white"
                              placeholder="28001"
                              maxLength={5}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    data-testid="checkout-continue-to-payment"
                    onClick={handleNextStep}
                    className="w-full py-4 bg-gradient-rainbow text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                  >
                    Continuar al Pago →
                  </button>
                </div>
              )}

              <div className={currentStep === 2 ? 'space-y-6' : 'hidden'}>
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
                        data-testid={`payment-method-${option.method}`}
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

                  {/* PCI-DSS Compliant Card Input */}
                  {paymentInfo.method === 'card' && securePayment && (
                    <div className="mt-4">{securePayment.CardElement}</div>
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

                  {/* Billing Information Review */}
                  <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-800">📋 Facturación a:</h3>
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="text-cyan-600 hover:text-cyan-700 font-bold text-sm"
                      >
                        Editar
                      </button>
                    </div>
                    {useSameAddress ? (
                      <div className="text-gray-700">
                        <p className="font-medium">Misma dirección de envío</p>
                        {billingInfo.nifCif && (
                          <p className="pt-2 font-mono text-sm">NIF/CIF: {billingInfo.nifCif}</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1 text-gray-700">
                        <p className="font-bold">{billingInfo.fiscalName}</p>
                        {billingInfo.nifCif && (
                          <p className="font-mono text-sm">NIF/CIF: {billingInfo.nifCif}</p>
                        )}
                        <p>{billingInfo.address}</p>
                        <p>
                          {billingInfo.zipCode} {billingInfo.city}, {billingInfo.state}
                        </p>
                        <p>{billingInfo.country}</p>
                      </div>
                    )}
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
                      data-testid="checkout-back"
                      onClick={handlePreviousStep}
                      className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-lg hover:bg-gray-300 transition-all duration-300"
                    >
                      ← Volver
                    </button>
                    <button
                      data-testid="checkout-place-order"
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
                        data-testid="checkout-apply-coupon"
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
                        data-testid="checkout-remove-coupon"
                        onClick={handleRemoveCoupon}
                        className="text-red-500 hover:text-red-700 font-bold text-sm ml-2"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Wallet Section */}
              {user && walletBalance > 0 && (
                <div className="py-4 border-t-2 border-gray-200">
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">💰</span>
                        <div>
                          <p className="font-bold text-gray-900">Saldo disponible</p>
                          <p className="text-sm text-gray-600">€{walletBalance.toFixed(2)}</p>
                        </div>
                      </div>
                      <a href="/account/wallet" className="text-xs text-cyan-600 hover:underline">
                        Ver monedero →
                      </a>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useWallet}
                        onChange={(e) => {
                          setUseWallet(e.target.checked);
                          logger.info('[Checkout] Wallet toggled', { useWallet: e.target.checked });
                        }}
                        className="w-5 h-5 text-cyan-600 rounded focus:ring-2 focus:ring-cyan-500"
                      />
                      <span className="text-sm font-semibold text-gray-800">
                        Usar mi saldo del monedero en esta compra
                      </span>
                    </label>
                    {useWallet && walletDiscount > 0 && (
                      <p className="text-sm text-green-600 mt-2 font-semibold">
                        ✓ Se aplicarán €{walletDiscount.toFixed(2)} de tu saldo
                      </p>
                    )}
                  </div>
                </div>
              )}

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
                      {appliedCoupon?.freeShipping && <span className="text-xs ml-1">(Cupón)</span>}
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

                {tax > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>{taxInfo.label}</span>
                    <span className="font-bold">€{tax.toFixed(2)}</span>
                  </div>
                )}
                {tax === 0 && (taxInfo.name === 'IPSI' || taxInfo.name === 'IGIC') && (
                  <div className="flex justify-between text-green-600">
                    <span>{taxInfo.label}</span>
                    <span className="font-bold">€0.00</span>
                  </div>
                )}

                {useWallet && walletDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Saldo del monedero</span>
                    <span className="font-bold">-€{walletDiscount.toFixed(2)}</span>
                  </div>
                )}

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
