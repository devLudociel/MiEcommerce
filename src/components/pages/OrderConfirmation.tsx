import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { OrderItem, ShippingInfo, PaymentInfo, BillingInfo } from '../../types/firebase';
// Analytics tracking
import { trackPurchase } from '../../lib/analytics';

interface Order {
  id: string;
  date: string;
  items: OrderItem[];
  shippingInfo: ShippingInfo;
  paymentInfo: PaymentInfo;
  billingInfo?: BillingInfo;
  subtotal: number;
  shipping: number;
  tax?: number;
  taxLabel?: string;
  total: number;
  status: string;
  userId?: string;
  accessKey?: string;
}

export default function OrderConfirmation() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [guestAccessKey, setGuestAccessKey] = useState<string | null>(null);
  const [hasDigitalProducts, setHasDigitalProducts] = useState(false);
  const { user, loading: authLoading } = useAuth();

  // Track flag to prevent duplicate purchase events
  const purchaseTracked = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    if (!orderId) {
      window.location.href = '/';
      return;
    }

    const storedOrderRaw =
      typeof window !== 'undefined' ? sessionStorage.getItem('checkout:lastOrder') : null;
    let storedOrder: Order | null = null;

    if (storedOrderRaw) {
      try {
        const parsed = JSON.parse(storedOrderRaw);
        if (parsed?.id === orderId) {
          storedOrder = parsed;
          if (parsed?.accessKey && typeof parsed.accessKey === 'string') {
            setGuestAccessKey(parsed.accessKey);
          }
        }
      } catch (error) {
        console.warn('[OrderConfirmation] Unable to parse stored order', error);
      }
    }

    const loadOrder = async () => {
      try {
        const headers: Record<string, string> = {};

        if (user) {
          const token = await user.getIdToken();
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`/api/get-order?orderId=${orderId}`, {
          headers,
        });

        if (!response.ok) {
          throw new Error('Orden no encontrada');
        }

        const orderData = await response.json();
        setOrder(orderData);
        setGuestAccessKey(null);
        if (storedOrder && typeof window !== 'undefined') {
          sessionStorage.removeItem('checkout:lastOrder');
        }
      } catch (error) {
        console.error('Error loading order:', error);

        if (storedOrder) {
          setOrder(storedOrder);
          if (storedOrder?.accessKey && typeof storedOrder.accessKey === 'string') {
            setGuestAccessKey(storedOrder.accessKey);
          }
          if (user && typeof window !== 'undefined') {
            sessionStorage.removeItem('checkout:lastOrder');
          }
          return;
        }

        window.location.href = '/';
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadOrder();
    }
  }, [authLoading, user]);

  // Track purchase in analytics (once per order)
  useEffect(() => {
    if (order && !purchaseTracked.current) {
      purchaseTracked.current = true;

      // Track purchase event
      trackPurchase({
        id: order.id,
        total: order.total,
        subtotal: order.subtotal,
        shipping: order.shipping,
        tax: order.tax,
        items: order.items.map((item) => ({
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: 'General',
        })),
      });

      logger.debug('[OrderConfirmation] Purchase tracked in analytics', { orderId: order.id });
    }
  }, [order]);

  // Check if order has digital products by querying Firestore
  useEffect(() => {
    const checkDigitalProducts = async () => {
      if (!order || !order.items) return;

      try {
        logger.debug('[OrderConfirmation] Checking for digital products', {
          itemCount: order.items.length,
        });

        // Check each product in Firestore
        for (const item of order.items) {
          const productRef = doc(db, 'products', String(item.productId));
          const productSnap = await getDoc(productRef);

          if (productSnap.exists()) {
            const productData = productSnap.data();
            logger.debug('[OrderConfirmation] Product data', {
              productId: item.productId,
              isDigital: productData?.isDigital,
              category: productData?.category,
            });

            if (productData?.isDigital === true || productData?.category === 'digital') {
              logger.info('[OrderConfirmation] Found digital product!', {
                productId: item.productId,
                productName: item.productName,
              });
              setHasDigitalProducts(true);
              return; // Found at least one, no need to continue
            }
          }
        }

        logger.info('[OrderConfirmation] No digital products found in order');
      } catch (error) {
        logger.error('[OrderConfirmation] Error checking for digital products', error);
      }
    };

    checkDigitalProducts();
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4" />
          <p className="text-gray-600">Cargando confirmación...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const orderDate = new Date(order.date);
  const estimatedDelivery = new Date(orderDate);
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

  const handleDownloadInvoice = async () => {
    if (!order) {
      return;
    }

    const headers: Record<string, string> = {};

    if (user) {
      const token = await user.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    } else if (guestAccessKey) {
      headers['X-Order-Key'] = guestAccessKey;
    } else {
      notify.warning('Inicia sesión para descargar tu factura.');
      return;
    }

    setDownloadingInvoice(true);

    try {
      const response = await fetch(`/api/generate-invoice?orderId=${order.id}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('No se pudo generar la factura.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Factura-${order.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify.success('Factura descargada correctamente');
    } catch (error) {
      logger.error('[OrderConfirmation] Invoice download failed', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'No se pudo generar la factura. Intenta nuevamente más tarde.';
      notify.error(message);
    } finally {
      setDownloadingInvoice(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-cyan-50 py-16 mt-32">
      <div className="container mx-auto px-6 max-w-4xl">
        {/* Mensaje de éxito */}
        <div className="text-center mb-12 animate-in slide-in-from-top duration-500">
          <div className="inline-block p-6 bg-green-500 rounded-full mb-6 shadow-2xl animate-bounce">
            <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
            ¡Pedido Confirmado! 🎉
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Gracias por tu compra, <strong>{order.shippingInfo.firstName}</strong>
          </p>
          <p className="text-gray-500">
            Te hemos enviado un email de confirmación a <strong>{order.shippingInfo.email}</strong>
          </p>
        </div>

        {/* Digital Products Section - Only show if order has digital products */}
        {hasDigitalProducts && (
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl shadow-2xl p-8 mb-8 text-white animate-in slide-in-from-bottom duration-500">
            <div className="text-center mb-6">
              <div className="inline-block p-4 bg-white/20 rounded-full mb-4">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-black mb-2">¡Tus archivos digitales están listos! 🎉</h2>
              <p className="text-cyan-50 text-lg mb-6">
                Descarga instantánea • Acceso ilimitado • Permanente
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📥</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">Accede a tu biblioteca de descargas</h3>
                  <p className="text-cyan-50 text-sm">
                    Todos tus archivos digitales están disponibles en tu cuenta. Puedes descargarlos
                    cuantas veces quieras, sin límite de tiempo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm">
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-2xl mb-1">♾️</div>
                  <div className="font-bold">Descargas Ilimitadas</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-2xl mb-1">⚡</div>
                  <div className="font-bold">Acceso Instantáneo</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-2xl mb-1">🔒</div>
                  <div className="font-bold">Seguro y Permanente</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/cuenta/descargas"
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-cyan-600 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Ir a Mi Biblioteca
              </a>
              <a
                href="/productos/digitales"
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/30 transition-all duration-300 border-2 border-white/50"
              >
                Ver Más Productos Digitales
              </a>
            </div>
          </div>
        )}

        {/* Información del pedido */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 bg-cyan-50 rounded-2xl">
              <div className="text-3xl mb-2">📦</div>
              <div className="text-sm text-gray-600">Número de Pedido</div>
              <div className="font-black text-cyan-600 text-lg">{order.id}</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-2xl">
              <div className="text-3xl mb-2">📅</div>
              <div className="text-sm text-gray-600">Fecha de Pedido</div>
              <div className="font-black text-purple-600 text-lg">
                {orderDate.toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-2xl">
              <div className="text-3xl mb-2">🚚</div>
              <div className="text-sm text-gray-600">Entrega Estimada</div>
              <div className="font-black text-green-600 text-lg">
                {estimatedDelivery.toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
            </div>
          </div>

          {/* Timeline del pedido */}
          <div className="mb-8">
            <h3 className="text-xl font-black text-gray-800 mb-6">Estado del Pedido</h3>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

              {[
                { status: 'confirmed', label: 'Pedido Confirmado', icon: '✓', active: true },
                { status: 'processing', label: 'En Producción', icon: '🔨', active: false },
                { status: 'shipped', label: 'Enviado', icon: '📦', active: false },
                { status: 'delivered', label: 'Entregado', icon: '🏠', active: false },
              ].map((step) => (
                <div key={step.status} className="relative flex items-center mb-6 last:mb-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold z-10 transition-all ${
                      step.active
                        ? 'bg-green-500 text-white shadow-lg scale-110'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {step.icon}
                  </div>
                  <div className="ml-6">
                    <div className={`font-bold ${step.active ? 'text-gray-800' : 'text-gray-400'}`}>
                      {step.label}
                    </div>
                    {step.active && (
                      <div className="text-sm text-green-600 font-medium">
                        {orderDate.toLocaleString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Productos */}
          <div className="mb-8">
            <h3 className="text-xl font-black text-gray-800 mb-4">Productos</h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">{item.name}</h4>
                    {item.variantName && (
                      <p className="text-sm text-gray-500">{item.variantName}</p>
                    )}
                    {item.customization && (
                      <p className="text-sm text-purple-600 font-medium">✨ Personalizado</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-600">Cantidad: {item.quantity}</span>
                      <span className="font-bold text-cyan-600">
                        €{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen de costos */}
          <div className="border-t-2 border-gray-200 pt-6">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span className="font-bold">€{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Envío</span>
                <span className="font-bold">
                  {order.shipping === 0 ? 'GRATIS' : `€${order.shipping.toFixed(2)}`}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-2xl font-black text-gray-800 pt-4 border-t-2 border-gray-200">
              <span>Total Pagado</span>
              <span className="text-cyan-600">€{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Información de envío y pago */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
              <span>📍</span>
              Dirección de Envío
            </h3>
            <div className="space-y-1 text-gray-700">
              <p className="font-bold">
                {order.shippingInfo.firstName} {order.shippingInfo.lastName}
              </p>
              <p>{order.shippingInfo.address}</p>
              <p>
                {order.shippingInfo.zipCode} {order.shippingInfo.city}, {order.shippingInfo.state}
              </p>
              <p>{order.shippingInfo.country}</p>
              <p className="pt-2 text-sm">{order.shippingInfo.phone}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
              <span>💳</span>
              Método de Pago
            </h3>
            <p className="text-gray-700 font-medium">
              {order.paymentInfo.method === 'card' && '💳 Tarjeta de Crédito/Débito'}
              {order.paymentInfo.method === 'paypal' && '🅿️ PayPal'}
              {order.paymentInfo.method === 'transfer' && '🏦 Transferencia Bancaria'}
              {order.paymentInfo.method === 'cash' && '💵 Contra Reembolso'}
            </p>
          </div>
        </div>

        {/* Próximos pasos */}
        <div className="bg-gradient-to-r from-cyan-50 to-purple-50 rounded-2xl p-8 mb-8 border-2 border-cyan-200">
          <h3 className="text-2xl font-black text-gray-800 mb-6 text-center">¿Qué sigue ahora?</h3>
          {hasDigitalProducts ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">📧</div>
                <h4 className="font-bold text-gray-800 mb-2">1. Revisa tu email</h4>
                <p className="text-sm text-gray-600">
                  Te hemos enviado todos los detalles del pedido
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">📥</div>
                <h4 className="font-bold text-gray-800 mb-2">2. Descarga tus archivos</h4>
                <p className="text-sm text-gray-600">
                  Accede a tu biblioteca y descarga los archivos digitales
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">💫</div>
                <h4 className="font-bold text-gray-800 mb-2">3. ¡Disfruta!</h4>
                <p className="text-sm text-gray-600">
                  Tus archivos están listos para usar en tus proyectos
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">📧</div>
                <h4 className="font-bold text-gray-800 mb-2">1. Revisa tu email</h4>
                <p className="text-sm text-gray-600">
                  Te hemos enviado todos los detalles del pedido
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🎨</div>
                <h4 className="font-bold text-gray-800 mb-2">2. Aprobación de diseño</h4>
                <p className="text-sm text-gray-600">
                  Si tu producto es personalizado, te enviaremos una prueba
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">📦</div>
                <h4 className="font-bold text-gray-800 mb-2">3. Producción y envío</h4>
                <p className="text-sm text-gray-600">
                  Comenzamos a producir tu pedido y te lo enviamos
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={handleDownloadInvoice}
            disabled={downloadingInvoice}
            className={`py-4 px-6 rounded-2xl font-bold text-lg text-center shadow-lg transition-all duration-300 ${downloadingInvoice ? 'bg-purple-400 cursor-not-allowed text-white' : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-2xl transform hover:scale-105'}`}
          >
            {downloadingInvoice ? 'Generando factura...' : '📄 Descargar Factura'}
          </button>
          <a
            href="/"
            className="py-4 px-6 bg-gradient-primary text-white rounded-2xl font-bold text-lg text-center shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
          >
            🏠 Volver al Inicio
          </a>
          <a
            href="/cuenta/pedidos"
            className="py-4 px-6 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl font-bold text-lg text-center hover:bg-gray-50 transition-all duration-300"
          >
            📋 Ver Mis Pedidos
          </a>
        </div>

        {/* Soporte */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-2">¿Necesitas ayuda con tu pedido?</p>
          <a
            href="/contacto"
            className="text-cyan-600 hover:text-cyan-700 font-bold hover:underline"
          >
            Contáctanos →
          </a>
        </div>
      </div>
    </div>
  );
}
