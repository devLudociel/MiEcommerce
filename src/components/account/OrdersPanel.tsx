import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, getUserOrdersPaginated } from '../../lib/firebase';
import type { OrderData } from '../../lib/firebase';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { logger } from '../../lib/logger';
import { notify } from '../../lib/notifications';

const PAGE_SIZE = 10; // Number of orders per page

export default function OrdersPanel() {
  const [uid, setUid] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // PERFORMANCE: Load initial page on auth change
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUid(null);
        setOrders([]);
        setHasMore(false);
        setLastDoc(null);
        setLoading(false);
        return;
      }

      setUid(u.uid);
      setLoading(true);

      try {
        logger.info('[OrdersPanel] Cargando pedidos del usuario', { userId: u.uid });
        const result = await getUserOrdersPaginated(u.uid, PAGE_SIZE);
        setOrders(result.orders);
        setHasMore(result.hasMore);
        setLastDoc(result.lastVisible);
        logger.info('[OrdersPanel] Pedidos cargados', {
          count: result.orders.length,
          hasMore: result.hasMore
        });
      } catch (error) {
        logger.error('[OrdersPanel] Error cargando pedidos', error);
        setOrders([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // PERFORMANCE: Load more orders (pagination)
  const loadMoreOrders = async () => {
    if (!uid || !lastDoc || loadingMore) return;

    setLoadingMore(true);
    try {
      logger.info('[OrdersPanel] Cargando más pedidos');
      const result = await getUserOrdersPaginated(uid, PAGE_SIZE, lastDoc);
      setOrders((prev) => [...prev, ...result.orders]);
      setHasMore(result.hasMore);
      setLastDoc(result.lastVisible);
      logger.info('[OrdersPanel] Más pedidos cargados', {
        count: result.orders.length,
        total: orders.length + result.orders.length
      });
    } catch (error) {
      logger.error('[OrdersPanel] Error cargando más pedidos', error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (!uid) {
    return (
      <div className="card p-6 bg-yellow-50 border-yellow-200">
        <p className="text-gray-700">Inicia sesión para ver tus pedidos.</p>
        <a href="/auth/login" className="btn btn-primary inline-block mt-4">
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
          <p className="text-gray-600">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-purple-100 text-purple-800';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
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

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return 'Fecha desconocida';

    let date: Date;
    const ts = timestamp as { toDate?: () => Date };
    if (ts.toDate) {
      date = ts.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp as string | number);
    }

    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  /**
   * Maneja el reordenamiento de productos desde la lista de pedidos
   * @param order - Pedido a reordenar
   * @param editMode - Si es true, abre el customizer para editar; si es false, agrega directamente al carrito
   */
  const handleReorder = (order: OrderData, editMode: boolean) => {
    if (!order || order.items.length === 0) return;

    const firstItem = order.items[0];

    if (!firstItem.productId) {
      logger.warn('[OrdersPanel] Product ID not found in order item');
      notify.error('No se pudo identificar el producto. Por favor, contacta con soporte.');
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
        logger.info('[OrdersPanel] Reorder data saved for editing', {
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
          autoAddToCart: true,
        };

        localStorage.setItem(`reorder_${firstItem.productId}`, JSON.stringify(reorderData));
        logger.info('[OrdersPanel] Reorder data saved for auto-add', {
          productId: firstItem.productId,
          orderId: order.id,
        });

        // Redirigir al customizer con flag de auto-add
        window.location.href = `/producto/${firstItem.productId}?reorder=auto`;
      }
    } else {
      // Producto sin personalización: redirigir directamente a la página del producto
      logger.info('[OrdersPanel] Reordering product without customization', {
        productId: firstItem.productId,
      });
      window.location.href = `/producto/${firstItem.productId}`;
    }
  };

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent">
          Mis Pedidos
        </h2>
        <p className="text-gray-600 mt-2">Historial de compras y estado de entregas</p>
      </div>

      {orders.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <p className="text-gray-600 mb-4 text-lg">Todavía no tienes pedidos.</p>
          <p className="text-gray-500 text-sm mb-6">
            Explora nuestra tienda y encuentra productos increíbles
          </p>
          <a
            href="/"
            className="btn bg-gradient-to-r from-cyan-500 to-purple-600 text-white inline-block px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
          >
            Ir a la tienda
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="card p-6 hover:shadow-xl transition-shadow duration-300 border-2 border-transparent hover:border-cyan-200"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{getStatusIcon(order.status)}</span>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">
                        Pedido #{order.id.substring(0, 8).toUpperCase()}
                      </h3>
                      <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(order.status)}`}
                    >
                      {getStatusText(order.status)}
                    </span>
                    {((order as any).paymentMethod || (order as any).paymentInfo?.method) && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {((order as any).paymentMethod || (order as any).paymentInfo?.method) ===
                        'card'
                          ? '💳 Tarjeta'
                          : ((order as any).paymentMethod || (order as any).paymentInfo?.method) ===
                              'paypal'
                            ? '🅿️ PayPal'
                            : ((order as any).paymentMethod ||
                                  (order as any).paymentInfo?.method) === 'transfer'
                              ? '🏦 Transferencia'
                              : '💵 Contra Reembolso'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total pagado:</p>
                      <p className="font-bold text-xl text-cyan-600">€{order.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Productos:</p>
                      <p className="font-bold text-gray-900">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} artículo(s)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={`/account/orders/${order.id}`}
                    className="btn bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-6 py-2 rounded-xl font-bold hover:shadow-lg transition-all text-center"
                  >
                    Ver detalle
                  </a>
                  {(order.status === 'delivered' || order.status === 'processing' || order.status === 'shipped') && order.items.length > 0 && (
                    <>
                      <button
                        onClick={() => handleReorder(order, false)}
                        className="btn bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-xl font-bold hover:shadow-lg transition-all text-center text-sm flex items-center justify-center gap-1"
                      >
                        <span>🔄</span>
                        Reordenar
                      </button>
                      {order.items[0]?.customization && (
                        <button
                          onClick={() => handleReorder(order, true)}
                          className="btn btn-outline border-2 border-gray-300 px-6 py-2 rounded-xl font-bold hover:border-cyan-500 transition-all text-center text-sm flex items-center justify-center gap-1"
                        >
                          <span>✏️</span>
                          Editar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Preview de productos */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex gap-2 overflow-x-auto">
                  {order.items.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex-shrink-0">
                      <img
                        src={item.image || '/placeholder.jpg'}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                      />
                    </div>
                  ))}
                  {order.items.length > 4 && (
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
                      <span className="text-gray-600 text-sm font-bold">
                        +{order.items.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* PERFORMANCE: Load More button for pagination */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMoreOrders}
                disabled={loadingMore}
                className="btn bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Cargando...</span>
                  </div>
                ) : (
                  <>Ver más pedidos</>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
