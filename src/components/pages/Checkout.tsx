import { useEffect, useState, useCallback, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { cartStore, cartLoadingStore, clearCart } from '../../store/cartStore';
import type { CartItem } from '../../store/cartStore';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import { shippingInfoSchema } from '../../lib/validation/schemas';
import { useFormValidation } from '../../hooks/useFormValidation';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { withRetry } from '../../lib/resilience';
import { lookupZipES, autocompleteStreetES, debounce } from '../../utils/address';
import type { AddressSuggestion } from '../../utils/address';
import { useAuth } from '../hooks/useAuth';
import { useSecureCardPayment } from '../checkout/SecureCardPayment';
import { getUserData } from '../../lib/userProfile';
import type { Address } from '../../lib/userProfile';

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

// Spanish provinces for dropdown
const SPANISH_PROVINCES = [
  'Álava',
  'Albacete',
  'Alicante',
  'Almería',
  'Asturias',
  'Ávila',
  'Badajoz',
  'Barcelona',
  'Burgos',
  'Cáceres',
  'Cádiz',
  'Cantabria',
  'Castellón',
  'Ceuta',
  'Ciudad Real',
  'Córdoba',
  'Cuenca',
  'Girona',
  'Granada',
  'Guadalajara',
  'Guipúzcoa',
  'Huelva',
  'Huesca',
  'Illes Balears',
  'Jaén',
  'La Rioja',
  'Las Palmas',
  'León',
  'Lleida',
  'Lugo',
  'Madrid',
  'Málaga',
  'Melilla',
  'Murcia',
  'Navarra',
  'Ourense',
  'Palencia',
  'Pontevedra',
  'Salamanca',
  'Santa Cruz de Tenerife',
  'Segovia',
  'Sevilla',
  'Soria',
  'Tarragona',
  'Teruel',
  'Toledo',
  'Valencia',
  'Valladolid',
  'Vizcaya',
  'Zamora',
  'Zaragoza',
];

export default function Checkout() {
  const cart = useStore(cartStore);
  const isCartSyncing = useStore(cartLoadingStore);
  const { user, loading: authLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [showAddressSelector, setShowAddressSelector] = useState(false);

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

  // Redirect to home if cart is empty (after initialization)
  // BUT: Don't redirect if we're processing a payment or already have an order
  useEffect(() => {
    if (
      !authLoading &&
      !isCartSyncing &&
      cart.items.length === 0 &&
      !isProcessing &&
      !orderId &&
      typeof window !== 'undefined'
    ) {
      logger.warn('[Checkout] Cart is empty, redirecting to home');
      window.location.href = '/';
    }
  }, [authLoading, cart.items.length, isCartSyncing, isProcessing, orderId]);

  // Load wallet balance when user is authenticated
  // TEMPORALMENTE DESHABILITADO - Debugging import error
  useEffect(() => {
    if (!user) {
      setWalletBalance(0);
      setUseWallet(false);
      return;
    }

    // TODO: Re-enable when logger import is fixed
    logger.warn('[Checkout] Wallet balance loading temporarily disabled');
    setWalletBalance(0);

    /*
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
    */
  }, [user]);

  // Load saved addresses and auto-fill with default shipping address
  useEffect(() => {
    if (!user) {
      setSavedAddresses([]);
      return;
    }

    const loadSavedAddresses = async () => {
      try {
        logger.info('[Checkout] Loading saved addresses', { userId: user.uid });
        const userData = await getUserData(user.uid);

        if (userData?.addresses && userData.addresses.length > 0) {
          setSavedAddresses(userData.addresses);

          // Auto-fill with default shipping address if form is empty
          const defaultShipping = userData.addresses.find((addr) => addr.isDefaultShipping);
          if (defaultShipping && !shippingInfo.firstName) {
            fillAddressFromSaved(defaultShipping);
            logger.info('[Checkout] Auto-filled with default shipping address');
          }
        }
      } catch (error) {
        logger.error('[Checkout] Error loading saved addresses', error);
      }
    };

    loadSavedAddresses();
  }, [user]);

  // Helper function to fill shipping form from saved address
  const fillAddressFromSaved = (address: Address) => {
    const [firstName, ...lastNameParts] = (address.fullName || '').split(' ');
    setShippingInfo((prev) => ({
      ...prev,
      firstName: firstName || '',
      lastName: lastNameParts.join(' ') || '',
      email: prev.email || user?.email || '', // Keep existing email or use user's
      phone: address.phone || '',
      address: address.line1 || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zip || '',
      country: address.country || 'España',
    }));
    setShowAddressSelector(false);
    notify.success('Dirección cargada correctamente');
  };

  // Auto-fill email for logged-in users
  useEffect(() => {
    if (user && user.email && !shippingInfo.email) {
      setShippingInfo((prev) => ({ ...prev, email: user.email || '' }));
    }
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

  // PERFORMANCE: Memoize shipping cost calculation
  const shippingCost = useMemo(() => {
    // Free shipping from coupon or cart threshold
    if (appliedCoupon?.freeShipping || subtotal >= FREE_SHIPPING_THRESHOLD) {
      return 0;
    }
    // Return cost based on selected method
    return SHIPPING_COSTS[shippingInfo.shippingMethod || 'standard'];
  }, [appliedCoupon?.freeShipping, subtotal, shippingInfo.shippingMethod]);

  // PERFORMANCE: Memoize tax calculation
  const taxInfo = useMemo(() => {
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
  }, [shippingInfo.state]);
  const subtotalAfterDiscount = subtotal - couponDiscount;
  const tax = subtotalAfterDiscount * taxInfo.rate;

  // Calculate wallet discount
  const totalBeforeWallet = subtotalAfterDiscount + shippingCost + tax;
  const walletDiscount = useWallet ? Math.min(walletBalance, totalBeforeWallet) : 0;

  // Total includes: subtotal - coupon discount + shipping + tax - wallet discount
  const total = totalBeforeWallet - walletDiscount;

  const clearCartAndStorage = useCallback(async () => {
    logger.info('[Checkout] Starting cart clear process...');

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

      // Force a final check to ensure cart is empty
      const finalState = cartStore.get();
      if (finalState.items.length > 0) {
        logger.warn('[Checkout] Cart still has items after clear, forcing empty state');
        cartStore.set({ items: [], total: 0 });
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

      // Execute post-payment actions (wallet debit, coupon tracking, cashback, email)
      try {
        logger.info('[Checkout] Executing post-payment actions...', {
          orderId: completedOrderId,
          paymentIntentId,
        });

        // Get authentication token
        const token = user ? await user.getIdToken() : null;
        if (!token) {
          logger.warn('[Checkout] No authentication token available for finalize-order');
        }

        await withRetry(
          async () => {
            const finalizeResponse = await fetch('/api/finalize-order', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                orderId: completedOrderId,
                paymentIntentId,
              }),
            });

            if (!finalizeResponse.ok) {
              const errorData = await finalizeResponse.json().catch(() => ({}));
              logger.error('[Checkout] Failed to execute post-payment actions', errorData);
              // Continue anyway - webhook will handle it
              notify.warning('El pedido se completó pero algunas acciones están pendientes');
              const error: any = new Error('Finalize order failed');
              error.status = finalizeResponse.status;
              throw error;
            } else {
              logger.info('[Checkout] Post-payment actions completed successfully');
            }
          },
          {
            context: 'Finalize order post-payment',
            maxAttempts: 3,
            backoffMs: 1000,
          }
        );
      } catch (finalizeError) {
        logger.error('[Checkout] Error calling finalize-order endpoint', finalizeError);
        // Continue anyway - webhook will handle it
      }

      // Update stored order status
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

      // Show success notification
      notify.success('¡Pago completado con éxito!');

      // Clear cart with timeout protection
      try {
        logger.info('[Checkout] Clearing cart...');
        await Promise.race([
          clearCartAndStorage(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Cart clear timeout')), 3000)
          ),
        ]);
        logger.info('[Checkout] Cart cleared successfully');
      } catch (clearError) {
        logger.error('[Checkout] Error clearing cart (continuing anyway)', clearError);
      }

      // Redirect to confirmation page (ensure this always happens)
      logger.info('[Checkout] Redirecting to confirmation page...', { orderId: completedOrderId });
      const redirectUrl = `/confirmacion?orderId=${completedOrderId}`;

      // Use both methods to ensure redirect works
      if (typeof window !== 'undefined') {
        // Try navigation first, then fallback to location.href
        setTimeout(() => {
          try {
            window.location.href = redirectUrl;
          } catch (redirectError) {
            logger.error('[Checkout] Redirect failed, trying alternative method', redirectError);
            window.location.assign(redirectUrl);
          }
        }, 500);
      }
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

  const cancelPendingOrder = useCallback(async (orderIdToCancel: string, key: string) => {
    if (!orderIdToCancel || !key) {
      return;
    }

    try {
      const response = await fetch('/api/cancel-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          orderId: orderIdToCancel,
          idempotencyKey: key,
          reason: 'payment_failed',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn('[Checkout] Failed to auto-cancel pending order', {
          orderId: orderIdToCancel,
          status: response.status,
          body: errorText,
        });
      } else {
        logger.info('[Checkout] Pending order cancelled after payment failure', {
          orderId: orderIdToCancel,
        });
      }
    } catch (error) {
      logger.error('[Checkout] Error cancelling pending order', error);
    }
  }, []);

  // PERFORMANCE: Memoize coupon handlers
  const handleApplyCoupon = useCallback(async () => {
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
          userId: user?.uid || 'guest',
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
  }, [couponCode, subtotal, user?.uid]);

  const handleRemoveCoupon = useCallback(() => {
    logger.info('[Checkout] Removing coupon', appliedCoupon);
    setAppliedCoupon(null);
    notify.success('Cupón eliminado');
  }, [appliedCoupon]);

  // PERFORMANCE: Memoize order placement handler
  const handlePlaceOrder = useCallback(async () => {
    if (!acceptTerms) {
      notify.warning('Debes aceptar los términos y condiciones');
      return;
    }

    // Validate shipping info
    logger.debug('[Checkout] Validating shipping info', shippingInfo);
    const result = await shippingValidation.validate(shippingInfo);

    if (!result.success) {
      const firstError = Object.values(result.errors!)[0];
      notify.error(firstError || 'Por favor, corrige los errores en el formulario de envío');
      logger.warn('[Checkout] Validation failed', result.errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate payment method
    if (!paymentInfo.method) {
      notify.error('Selecciona un método de pago');
      return;
    }

    logger.info('[Checkout] Placing order', { total, itemCount: cart.items.length });
    setIsProcessing(true);

    let cleanupOrderId: string | null = null;
    let cleanupIdempotency: string | null = null;

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
      cleanupOrderId = newOrderId;
      cleanupIdempotency = idempotencyKey;

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
          await cancelPendingOrder(newOrderId, idempotencyKey);
          cleanupOrderId = null;
          cleanupIdempotency = null;
          throw new Error(paymentResult.error || 'Error procesando pago');
        }
        cleanupOrderId = null;
        cleanupIdempotency = null;
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
      if (cleanupOrderId && cleanupIdempotency) {
        await cancelPendingOrder(cleanupOrderId, cleanupIdempotency);
        cleanupOrderId = null;
        cleanupIdempotency = null;
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    acceptTerms,
    total,
    cart.items,
    user?.uid,
    shippingInfo,
    billingInfo,
    useSameAddress,
    appliedCoupon,
    useWallet,
    walletDiscount,
    paymentInfo,
    subtotal,
    shippingCost,
    tax,
    taxInfo,
    clearCartAndStorage,
    shippingValidation,
    securePayment,
    cancelPendingOrder,
  ]);

  if (authLoading || isCartSyncing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8 mt-32 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando carrito...</p>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-8 mt-32">
      <div className="container mx-auto px-6">
        {/* Page Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2">Finalizar Compra</h1>
          <p className="text-gray-600">Completa tus datos para recibir tu pedido</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Información de Envío</h2>
                {savedAddresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAddressSelector(!showAddressSelector)}
                    className="text-sm font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
                  >
                    {showAddressSelector ? 'Ocultar direcciones' : 'Usar dirección guardada'}
                  </button>
                )}
              </div>

              {/* Saved Addresses Selector */}
              {showAddressSelector && savedAddresses.length > 0 && (
                <div className="mb-6 p-4 bg-cyan-50 rounded-lg border border-cyan-100">
                  <p className="text-sm font-medium text-gray-700 mb-3">Selecciona una dirección:</p>
                  <div className="space-y-2">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => fillAddressFromSaved(addr)}
                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-cyan-500 hover:bg-white transition-all"
                      >
                        <div className="font-medium text-gray-900">{addr.fullName}</div>
                        <div className="text-sm text-gray-600">
                          {addr.line1}, {addr.city}, {addr.state} {addr.zip}
                        </div>
                        {addr.isDefaultShipping && (
                          <span className="text-xs font-medium text-cyan-600">
                            Dirección predeterminada
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={shippingInfo.firstName}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, firstName: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="Tu nombre"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    value={shippingInfo.lastName}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, lastName: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="Tus apellidos"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={shippingInfo.email}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, email: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="tu@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={shippingInfo.phone}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, phone: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="+34 600 000 000"
                    required
                  />
                </div>

                <div className="md:col-span-2 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    value={shippingInfo.address}
                    onChange={(e) => {
                      setShippingInfo({ ...shippingInfo, address: e.target.value });
                      handleStreetAutocomplete(e.target.value);
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="Calle, número, piso..."
                    required
                  />
                  {/* Street Autocomplete Suggestions */}
                  {streetSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {streetSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setShippingInfo({ ...shippingInfo, address: suggestion.label });
                            setStreetSuggestions([]);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-cyan-50 transition-colors"
                        >
                          <div className="font-medium text-gray-900">{suggestion.label}</div>
                          {suggestion.postcode && (
                            <div className="text-sm text-gray-500">CP: {suggestion.postcode}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código Postal *
                  </label>
                  <input
                    type="text"
                    value={shippingInfo.zipCode}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, zipCode: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="28001"
                    required
                  />
                  {zipLoading && (
                    <div className="absolute right-3 top-10">
                      <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ciudad *
                  </label>
                  <input
                    type="text"
                    value={shippingInfo.city}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, city: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    placeholder="Madrid"
                    required
                  />
                  {/* City Suggestions */}
                  {citySuggestions.length > 1 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                      {citySuggestions.map((city, idx) => (
                        <button
                          key={idx}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provincia *
                  </label>
                  <select
                    value={shippingInfo.state}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, state: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    required
                  >
                    <option value="">Selecciona una provincia</option>
                    {SPANISH_PROVINCES.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">País *</label>
                  <input
                    type="text"
                    value={shippingInfo.country}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, country: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas adicionales (opcional)
                  </label>
                  <textarea
                    value={shippingInfo.notes || ''}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, notes: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    rows={3}
                    placeholder="Instrucciones especiales de entrega..."
                  />
                </div>
              </div>
            </div>

            {/* Billing Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Información de Facturación</h2>

              <div className="mb-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSameAddress}
                    onChange={(e) => setUseSameAddress(e.target.checked)}
                    className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Usar la misma dirección de envío
                  </span>
                </label>
              </div>

              {!useSameAddress && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre Fiscal
                    </label>
                    <input
                      type="text"
                      value={billingInfo.fiscalName}
                      onChange={(e) =>
                        setBillingInfo({ ...billingInfo, fiscalName: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={billingInfo.address}
                      onChange={(e) =>
                        setBillingInfo({ ...billingInfo, address: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      value={billingInfo.zipCode}
                      onChange={(e) =>
                        setBillingInfo({ ...billingInfo, zipCode: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad</label>
                    <input
                      type="text"
                      value={billingInfo.city}
                      onChange={(e) =>
                        setBillingInfo({ ...billingInfo, city: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provincia
                    </label>
                    <select
                      value={billingInfo.state}
                      onChange={(e) =>
                        setBillingInfo({ ...billingInfo, state: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    >
                      <option value="">Selecciona una provincia</option>
                      {SPANISH_PROVINCES.map((province) => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">País</label>
                    <input
                      type="text"
                      value={billingInfo.country}
                      onChange={(e) =>
                        setBillingInfo({ ...billingInfo, country: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NIF/CIF (opcional)
                </label>
                <input
                  type="text"
                  value={billingInfo.nifCif}
                  onChange={(e) => setBillingInfo({ ...billingInfo, nifCif: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  placeholder="12345678X"
                />
              </div>
            </div>

            {/* Shipping Method */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Método de Envío</h2>
              <div className="space-y-3">
                <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-cyan-500 transition-all">
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
                    className="w-5 h-5 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Estándar (3-5 días)</span>
                      <span className="font-bold text-gray-900">
                        {subtotal >= FREE_SHIPPING_THRESHOLD || appliedCoupon?.freeShipping
                          ? 'GRATIS'
                          : '0,00 €'}
                      </span>
                    </div>
                  </div>
                </label>

                <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-cyan-500 transition-all">
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
                    className="w-5 h-5 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Express (24-48h)</span>
                      <span className="font-bold text-gray-900">
                        {appliedCoupon?.freeShipping ? 'GRATIS' : '4,95 €'}
                      </span>
                    </div>
                  </div>
                </label>

                <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-cyan-500 transition-all">
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
                    className="w-5 h-5 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Urgente (24h)</span>
                      <span className="font-bold text-gray-900">
                        {appliedCoupon?.freeShipping ? 'GRATIS' : '9,95 €'}
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Método de Pago</h2>

              <div className="space-y-3 mb-6">
                <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-cyan-500 transition-all">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentInfo.method === 'card'}
                    onChange={(e) =>
                      setPaymentInfo({ ...paymentInfo, method: e.target.value as 'card' })
                    }
                    className="w-5 h-5 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="ml-3 flex-1">
                    <span className="font-medium text-gray-900">Tarjeta de Crédito/Débito</span>
                    <div className="text-sm text-gray-500 mt-1">Pago seguro con Stripe</div>
                  </div>
                </label>

                <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-cyan-500 transition-all opacity-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paypal"
                    disabled
                    className="w-5 h-5 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="ml-3 flex-1">
                    <span className="font-medium text-gray-900">PayPal</span>
                    <div className="text-sm text-gray-500 mt-1">Próximamente</div>
                  </div>
                </label>

                <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-cyan-500 transition-all">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="transfer"
                    checked={paymentInfo.method === 'transfer'}
                    onChange={(e) =>
                      setPaymentInfo({ ...paymentInfo, method: e.target.value as 'transfer' })
                    }
                    className="w-5 h-5 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                  />
                  <div className="ml-3 flex-1">
                    <span className="font-medium text-gray-900">Transferencia Bancaria</span>
                    <div className="text-sm text-gray-500 mt-1">
                      Enviaremos los datos por email
                    </div>
                  </div>
                </label>
              </div>

              {/* Stripe Elements Card Input */}
              {paymentInfo.method === 'card' && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {securePayment.CardElement}
                </div>
              )}
            </div>

            {/* Terms and Submit */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <label className="flex items-start space-x-3 cursor-pointer mb-6">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-5 h-5 text-cyan-600 border-gray-300 rounded focus:ring-2 focus:ring-cyan-500 mt-0.5"
                />
                <span className="text-sm text-gray-600">
                  Acepto los{' '}
                  <a href="/terminos" className="text-cyan-600 hover:underline">
                    términos y condiciones
                  </a>{' '}
                  y la{' '}
                  <a href="/privacidad" className="text-cyan-600 hover:underline">
                    política de privacidad
                  </a>
                </span>
              </label>

              <button
                onClick={handlePlaceOrder}
                disabled={isProcessing || !acceptTerms}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Procesando...
                  </span>
                ) : (
                  `Realizar Pedido - ${total.toFixed(2)} €`
                )}
              </button>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 sticky top-36">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Resumen del Pedido</h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.image || FALLBACK_IMG_400x300}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm truncate">{item.name}</h3>
                      <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                      <p className="font-bold text-cyan-600 text-sm">
                        {(item.price * item.quantity).toFixed(2)} €
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 mb-4"></div>

              {/* Coupon Input */}
              <div className="mb-6">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-green-800 text-sm">
                        Cupón: {appliedCoupon.code}
                      </div>
                      <div className="text-xs text-green-600">{appliedCoupon.description}</div>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="ml-2 text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Código de cupón"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {validatingCoupon ? '...' : 'Aplicar'}
                    </button>
                  </div>
                )}
              </div>

              {/* Wallet Toggle */}
              {walletBalance > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">Usar saldo Monedero</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Saldo disponible: {walletBalance.toFixed(2)} €
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={useWallet}
                      onChange={(e) => setUseWallet(e.target.checked)}
                      className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                    />
                  </label>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium text-gray-900">{subtotal.toFixed(2)} €</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Descuento cupón:</span>
                    <span className="font-medium text-green-600">
                      -{couponDiscount.toFixed(2)} €
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Envío:</span>
                  <span className="font-medium text-gray-900">
                    {shippingCost === 0 ? (
                      <span className="text-green-600 font-bold">GRATIS</span>
                    ) : (
                      `${shippingCost.toFixed(2)} €`
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{taxInfo.label}:</span>
                  <span className="font-medium text-gray-900">{tax.toFixed(2)} €</span>
                </div>

                {useWallet && walletDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Descuento monedero:</span>
                    <span className="font-medium text-purple-600">
                      -{walletDiscount.toFixed(2)} €
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-2xl font-black text-cyan-600">
                      {total.toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>

              {/* Free Shipping Progress */}
              {subtotal < FREE_SHIPPING_THRESHOLD && !appliedCoupon?.freeShipping && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800 font-medium">
                    ¡Solo te faltan{' '}
                    <span className="font-bold">
                      {(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)} €
                    </span>{' '}
                    para envío gratis!
                  </p>
                  <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(subtotal / FREE_SHIPPING_THRESHOLD) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
