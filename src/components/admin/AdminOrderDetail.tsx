import { useEffect, useState } from 'react';
import { getOrderById, updateOrderStatus } from '../../lib/firebase';
import type { OrderData } from '../../lib/firebase';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  processing: 'En Producción',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export default function AdminOrderDetail() {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || window.location.pathname.split('/').pop();

    if (!id) {
      window.location.href = '/admin/orders';
      return;
    }

    setOrderId(id);
    loadOrder(id);
  }, []);

  const loadOrder = async (id: string) => {
    try {
      setLoading(true);
      const foundOrder = await getOrderById(id);
      if (foundOrder) {
        setOrder(foundOrder);
      } else {
        alert('Pedido no encontrado');
        window.location.href = '/admin/orders';
      }
    } catch (error) {
      console.error('Error cargando pedido:', error);
      alert('Error cargando pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!orderId) return;

    try {
      await updateOrderStatus(orderId, newStatus);

      // Enviar email de notificación
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            type: 'status-update',
            newStatus,
          }),
        });
        console.log('✅ Email de notificación enviado');
      } catch (emailError) {
        console.error('⚠️ Error enviando email (no crítico):', emailError);
      }

      await loadOrder(orderId);
      alert('Estado actualizado correctamente. Email enviado al cliente.');
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error actualizando estado');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/admin/orders"
            className="inline-flex items-center text-cyan-600 hover:text-cyan-700 font-bold mb-4"
          >
            ← Volver a lista de pedidos
          </a>
          <h1 className="text-4xl font-black text-gray-800 mb-2">
            Detalle del Pedido #{order.id?.slice(0, 8)}
          </h1>
          <p className="text-gray-600">
            Realizado el {orderDate.toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Productos */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-black text-gray-800 mb-4">Productos</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded-lg"
                      width="96"
                      height="96"
                      style={{ width: '96px', height: '96px', objectFit: 'cover' }}
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-lg">{item.name}</h3>
                      {item.variantName && (
                        <p className="text-sm text-gray-500">Variante: {item.variantName}</p>
                      )}
                      {item.customization && (
                        <p className="text-sm text-purple-600 font-medium">✨ Personalizado</p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-gray-600">
                          Cantidad: <strong>{item.quantity}</strong>
                        </span>
                        <span className="text-gray-600">
                          Precio unitario: <strong>€{item.price.toFixed(2)}</strong>
                        </span>
                        <span className="font-bold text-cyan-600 text-lg">
                          €{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="mt-6 pt-6 border-t-2 border-gray-200 space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-bold">€{order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Envío:</span>
                  <span className="font-bold">
                    {order.shipping === 0 ? 'GRATIS' : `€${order.shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-2xl font-black text-gray-800 pt-3 border-t-2 border-gray-200">
                  <span>Total:</span>
                  <span className="text-cyan-600">€{order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Dirección de envío */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-black text-gray-800 mb-4">📍 Dirección de Envío</h2>
              <div className="space-y-2 text-gray-700">
                <p className="font-bold text-lg">
                  {order.shippingInfo.firstName} {order.shippingInfo.lastName}
                </p>
                <p>{order.shippingInfo.address}</p>
                <p>
                  {order.shippingInfo.zipCode} {order.shippingInfo.city}, {order.shippingInfo.state}
                </p>
                <p>{order.shippingInfo.country}</p>
                <div className="pt-3 border-t border-gray-200 mt-3">
                  <p className="text-sm">
                    <strong>Email:</strong> {order.shippingInfo.email}
                  </p>
                  <p className="text-sm">
                    <strong>Teléfono:</strong> {order.shippingInfo.phone}
                  </p>
                </div>
                {order.shippingInfo.notes && (
                  <div className="pt-3 border-t border-gray-200 mt-3">
                    <p className="text-sm font-bold">Notas del cliente:</p>
                    <p className="text-sm italic text-gray-600">{order.shippingInfo.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Estado y acciones */}
          <div className="space-y-6">
            {/* Estado actual */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-black text-gray-800 mb-4">Estado del Pedido</h2>
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-bold text-lg focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
              >
                {Object.entries(statusLabels).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-2">
                Última actualización:{' '}
                {order.updatedAt?.toDate
                  ? order.updatedAt.toDate().toLocaleString('es-ES')
                  : 'No disponible'}
              </p>
            </div>

            {/* Información de pago */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-black text-gray-800 mb-4">💳 Método de Pago</h2>
              <p className="text-gray-700 font-medium">
                {order.paymentInfo.method === 'card' && '💳 Tarjeta'}
                {order.paymentInfo.method === 'paypal' && '🅿️ PayPal'}
                {order.paymentInfo.method === 'transfer' && '🏦 Transferencia'}
                {order.paymentInfo.method === 'cash' && '💵 Contra Reembolso'}
              </p>
              {order.paymentInfo.cardLast4 && (
                <p className="text-sm text-gray-500 mt-1">
                  Tarjeta terminada en: ****{order.paymentInfo.cardLast4}
                </p>
              )}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <strong>Estado de pago:</strong>
                </p>
                <span
                  className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-bold ${
                    order.paymentStatus === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {order.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                </span>
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-black text-gray-800 mb-4">Acciones</h2>
              <div className="space-y-3">
                <button
                  onClick={() => window.print()}
                  className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
                >
                  🖨️ Imprimir Pedido
                </button>
                <a
                  href={`/api/generate-invoice?orderId=${order.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-3 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-all text-center"
                >
                  📄 Descargar Factura PDF
                </a>
                <a
                  href={`mailto:${order.shippingInfo.email}?subject=Actualización de tu pedido ${order.id}`}
                  className="block w-full px-4 py-3 bg-cyan-500 text-white rounded-xl font-bold hover:bg-cyan-600 transition-all text-center"
                >
                  📧 Enviar Email
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
