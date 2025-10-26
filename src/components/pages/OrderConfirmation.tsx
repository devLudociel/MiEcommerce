import { useEffect, useState } from 'react';

interface Order {
  id: string;
  date: string;
  items: any[];
  shippingInfo: any;
  paymentInfo: any;
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
}

export default function OrderConfirmation() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    if (!orderId) {
      window.location.href = '/';
      return;
    }

    try {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      const foundOrder = orders.find((o: Order) => o.id === orderId);

      if (foundOrder) {
        setOrder(foundOrder);
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error loading order:', error);
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  }, []);

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
        </div>

        {/* Botones de acción */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
