import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import type { OrderData } from '../../lib/firebase';
import { logger } from '../../lib/logger';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import ShipmentTracking from './ShipmentTracking';
import type { Timestamp } from 'firebase/firestore';

// Extended order type with optional Firestore fields
interface ExtendedOrder extends OrderData {
  couponDiscount?: number;
  couponCode?: string;
  shippingCost?: number;
  iva?: number;
  walletDiscount?: number;
}

// Type for Firestore timestamp or Date
type TimestampLike = Timestamp | Date | { toDate: () => Date } | string | number;

interface OrderDetailProps {
  orderId?: string;
}

export default function OrderDetail({ orderId }: OrderDetailProps) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUid(null);
        setLoading(false);
        return;
      }

      if (!orderId) {
        setError('ID de pedido no válido');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        logger.info('[OrderDetail] Cargando pedido', { orderId, userId: u.uid });
        const token = await u.getIdToken();
        const response = await fetch(`/api/get-order?orderId=${encodeURIComponent(orderId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          let errorMessage = 'Pedido no encontrado';
          try {
            const payload = await response.json();
            if (payload?.error) {
              errorMessage = String(payload.error);
            }
          } catch (parseError) {
            logger.warn('[OrderDetail] Error parsing order response', parseError);
          }

          if (response.status === 401) {
            errorMessage = 'Debes iniciar sesión para ver este pedido';
          } else if (response.status === 403 || response.status === 404) {
            errorMessage = 'Pedido no encontrado';
          } else if (response.status >= 500) {
            errorMessage = 'Error interno del servidor al cargar el pedido';
          }

          setError(errorMessage);
          setOrder(null);
          return;
        }

        const orderData = await response.json();
        setOrder(orderData);
      } catch (error) {
        logger.error('[OrderDetail] Error cargando pedido', error);
        setError('Error al cargar el pedido');
        setOrder(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [orderId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'paid':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'processing':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente de pago';
      case 'paid':
        return 'Pagado';
      case 'processing':
        return 'Procesando';
      case 'shipped':
        return 'Enviado';
      case 'delivered':
        return 'Entregado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'paid':
        return '💳';
      case 'processing':
        return '⚙️';
      case 'shipped':
        return '📦';
      case 'delivered':
        return '✅';
      case 'cancelled':
        return '❌';
      default:
        return '📋';
    }
  };

  const formatDate = (timestamp: TimestampLike | null | undefined): string => {
    if (!timestamp) return 'Fecha desconocida';

    let date: Date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }

    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleDownloadInvoice = async () => {
    if (!order?.id) return;

    try {
      // Get the ID token from the current user
      const user = auth.currentUser;
      if (!user) {
        logger.error('[OrderDetail] No authenticated user found');
        alert('Debes iniciar sesión para descargar la factura');
        return;
      }

      const token = await user.getIdToken();

      // Fetch the invoice with authentication
      const response = await fetch(`/api/generate-invoice?orderId=${order.id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factura-${order.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      logger.info('[OrderDetail] Invoice downloaded successfully', { orderId: order.id });
    } catch (error) {
      logger.error('[OrderDetail] Error downloading invoice', error);
      alert('Error al descargar la factura. Por favor, inténtalo de nuevo.');
    }
  };

  /**
   * Maneja el reordenamiento de productos
   * @param editMode - Si es true, abre el customizer para editar; si es false, agrega directamente al carrito
   */
  const handleReorder = (editMode: boolean) => {
    if (!order || order.items.length === 0) return;

    // Para simplificar, tomamos el primer item del pedido
    // En un futuro se podría mejorar para manejar múltiples items
    const firstItem = order.items[0];

    if (!firstItem.productId) {
      logger.warn('[OrderDetail] Product ID not found in order item');
      alert('No se pudo identificar el producto. Por favor, contacta con soporte.');
      return;
    }

    // Si el producto tiene personalización
    if (firstItem.customization) {
      if (editMode) {
        // Editar y Reordenar: Guardar configuración en localStorage y redirigir al customizer
        const reorderData = {
          values: firstItem.customization.values || [],
          layers: firstItem.customization.layers || [],
          timestamp: Date.now(),
        };

        localStorage.setItem(`reorder_${firstItem.productId}`, JSON.stringify(reorderData));
        logger.info('[OrderDetail] Reorder data saved for editing', {
          productId: firstItem.productId,
          orderId: order.id,
        });

        // Redirigir al customizer con flag de edición
        window.location.href = `/producto/${firstItem.productId}?reorder=edit`;
      } else {
        // Reordenar: Guardar configuración y agregar directamente al carrito
        const reorderData = {
          values: firstItem.customization.values || [],
          layers: firstItem.customization.layers || [],
          timestamp: Date.now(),
          autoAddToCart: true, // Flag para agregar automáticamente
        };

        localStorage.setItem(`reorder_${firstItem.productId}`, JSON.stringify(reorderData));
        logger.info('[OrderDetail] Reorder data saved for auto-add', {
          productId: firstItem.productId,
          orderId: order.id,
        });

        // Redirigir al customizer con flag de auto-add
        window.location.href = `/producto/${firstItem.productId}?reorder=auto`;
      }
    } else {
      // Producto sin personalización: redirigir directamente a la página del producto
      logger.info('[OrderDetail] Reordering product without customization', {
        productId: firstItem.productId,
      });
      window.location.href = `/producto/${firstItem.productId}`;
    }
  };

  if (!uid) {
    return (
      <div className="card p-8 bg-yellow-50 border-yellow-200 text-center">
        <p className="text-gray-700 mb-4">Inicia sesión para ver los detalles del pedido.</p>
        <a href="/auth/login" className="btn btn-primary inline-block">
          Iniciar sesión
        </a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <div className="flex justify-center items-center gap-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Cargando detalles del pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="card p-8 bg-red-50 border-red-200 text-center">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-red-700 font-bold mb-2">{error || 'Pedido no encontrado'}</p>
        <p className="text-gray-600 mb-4">
          Verifica que el ID del pedido sea correcto o contacta con soporte.
        </p>
        <a href="/account/orders" className="btn btn-primary inline-block">
          Volver a mis pedidos
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <a
            href="/account/orders"
            className="text-cyan-600 hover:text-cyan-700 font-medium inline-flex items-center gap-2 mb-2"
          >
            ← Volver a mis pedidos
          </a>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent">
            Pedido #{order.id.substring(0, 8).toUpperCase()}
          </h1>
          <p className="text-gray-600 text-sm mt-1">{formatDate(order.createdAt)}</p>
        </div>
        <div className="text-right">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold text-lg ${getStatusBadge(order.status)}`}
          >
            <span className="text-2xl">{getStatusIcon(order.status)}</span>
            {getStatusText(order.status)}
          </div>
        </div>
      </div>

      {/* Tracking del envío */}
      <ShipmentTracking order={order} />

      {/* Resumen del pedido */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Resumen del pedido</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-cyan-600">€{order.total.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Productos</p>
            <p className="text-xl font-bold text-gray-900">
              {order.items.reduce((sum, item) => sum + item.quantity, 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Método de pago</p>
            <p className="text-sm font-bold text-gray-900">
              {(order.paymentInfo?.method || order.paymentMethod) === 'card'
                ? '💳 Tarjeta'
                : (order.paymentInfo?.method || order.paymentMethod) === 'paypal'
                  ? '🅿️ PayPal'
                  : (order.paymentInfo?.method || order.paymentMethod) === 'transfer'
                    ? '🏦 Transferencia'
                    : '💵 Contra Reembolso'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Envío</p>
            <p className="text-sm font-bold text-gray-900">
              {(order.shippingInfo?.shippingMethod || 'standard') === 'standard'
                ? '📦 Estándar'
                : order.shippingInfo?.shippingMethod === 'express'
                  ? '⚡ Express'
                  : '🚀 Urgente'}
            </p>
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Productos</h2>
        <div className="space-y-4">
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="flex gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <img
                src={item.image || FALLBACK_IMG_400x300}
                alt={item.name}
                className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.onerror = null;
                  img.src = FALLBACK_IMG_400x300;
                }}
              />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                <p className="text-sm text-gray-600">Precio unitario: €{item.price.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg text-cyan-600">
                  €{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Información de envío */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Información de envío</h2>
        <div className="space-y-2">
          <p>
            <span className="font-bold text-gray-900">{order.shippingInfo.fullName}</span>
          </p>
          <p className="text-gray-700">{order.shippingInfo.address}</p>
          <p className="text-gray-700">
            {order.shippingInfo.zipCode} {order.shippingInfo.city}, {order.shippingInfo.state}
          </p>
          <p className="text-gray-700">{order.shippingInfo.country}</p>
          <p className="text-gray-700 pt-2">
            <span className="font-bold">Email:</span> {order.shippingInfo.email}
          </p>
          <p className="text-gray-700">
            <span className="font-bold">Teléfono:</span> {order.shippingInfo.phone}
          </p>
        </div>
      </div>

      {/* Desglose del precio */}
      <div className="card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Desglose del precio</h2>
        <div className="space-y-3">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal</span>
            <span className="font-semibold">€{order.subtotal.toFixed(2)}</span>
          </div>

          {(() => {
            const extOrder = order as ExtendedOrder;
            return (
              extOrder.couponDiscount &&
              extOrder.couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento {extOrder.couponCode && `(${extOrder.couponCode})`}</span>
                  <span className="font-semibold">-€{extOrder.couponDiscount.toFixed(2)}</span>
                </div>
              )
            );
          })()}

          <div className="flex justify-between text-gray-700">
            <span>Envío</span>
            <span className="font-semibold">
              {((order as ExtendedOrder).shippingCost || order.shipping || 0) === 0
                ? 'GRATIS'
                : `€${((order as ExtendedOrder).shippingCost || order.shipping || 0).toFixed(2)}`}
            </span>
          </div>

          {(() => {
            const extOrder = order as ExtendedOrder;
            return (
              extOrder.iva &&
              extOrder.iva > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>IVA (21%)</span>
                  <span className="font-semibold">€{extOrder.iva.toFixed(2)}</span>
                </div>
              )
            );
          })()}

          {(() => {
            const extOrder = order as ExtendedOrder;
            return (
              extOrder.walletDiscount &&
              extOrder.walletDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Saldo del monedero</span>
                  <span className="font-semibold">-€{extOrder.walletDiscount.toFixed(2)}</span>
                </div>
              )
            );
          })()}

          <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t-2 border-gray-200">
            <span>Total</span>
            <span className="text-cyan-600">€{order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-4 flex-wrap">
        <button
          onClick={handleDownloadInvoice}
          className="btn bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
        >
          📄 Descargar Factura
        </button>
        <a
          href="/account/orders"
          className="btn btn-outline border-2 border-gray-300 px-8 py-3 rounded-xl font-bold hover:border-cyan-500 transition-all"
        >
          Volver a mis pedidos
        </a>

        {/* Botones de reordenamiento mejorados */}
        {(order.status === 'delivered' ||
          order.status === 'processing' ||
          order.status === 'shipped') &&
          order.items.length > 0 && (
            <>
              {/* Reordenar: Comprar de nuevo con la misma configuración */}
              <button
                onClick={() => handleReorder(false)}
                className="btn bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <span>🔄</span>
                Reordenar
              </button>

              {/* Editar y Reordenar: Modificar personalización antes de comprar */}
              {order.items[0]?.customization && (
                <button
                  onClick={() => handleReorder(true)}
                  className="btn btn-outline border-2 border-cyan-500 text-cyan-700 px-8 py-3 rounded-xl font-bold hover:bg-cyan-50 transition-all flex items-center gap-2"
                >
                  <span>✏️</span>
                  Editar y Reordenar
                </button>
              )}
            </>
          )}
      </div>
    </div>
  );
}
