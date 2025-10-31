import { useEffect, useState } from 'react';
import { getOrdersPaginated, getOrdersCount, updateOrderStatus } from '../../lib/firebase';
import type { OrderData } from '../../lib/firebase';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import Pagination from '../ui/Pagination';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  processing: 'En Producción',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PAGE_SIZE = 20;

export default function AdminOrdersList() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [pageHistory, setPageHistory] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([
    null,
  ]);

  useEffect(() => {
    loadOrders();
    loadTotalCount();
  }, [filter]);

  const loadTotalCount = async () => {
    try {
      const count = await getOrdersCount(filter);
      setTotalCount(count);
    } catch (error) {
      console.error('Error cargando conteo:', error);
    }
  };

  const loadOrders = async (cursor?: QueryDocumentSnapshot<DocumentData> | null) => {
    try {
      setLoading(true);
      const result = await getOrdersPaginated(PAGE_SIZE, cursor, filter);
      setOrders(result.data);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Error cargando pedidos:', error);
      alert('Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (hasMore && lastDoc) {
      setPageHistory([...pageHistory, lastDoc]);
      setCurrentPage(currentPage + 1);
      loadOrders(lastDoc);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newHistory = [...pageHistory];
      newHistory.pop();
      const previousCursor = newHistory[newHistory.length - 1];
      setPageHistory(newHistory);
      setCurrentPage(currentPage - 1);
      loadOrders(previousCursor);
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setCurrentPage(1);
    setPageHistory([null]);
    setLastDoc(null);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
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

      // Recargar pedidos
      await loadOrders();
      alert('Estado actualizado correctamente. Email enviado al cliente.');
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error actualizando estado');
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-800 mb-2">Gestión de Pedidos</h1>
          <p className="text-gray-600">
            Total de pedidos: <span className="font-bold">{totalCount}</span>
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Filtrar por estado:</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-4 py-2 rounded-xl font-bold transition-all ${
                filter === 'all'
                  ? 'bg-gradient-primary text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos ({totalCount})
            </button>
            {Object.entries(statusLabels).map(([status, label]) => (
              <button
                key={status}
                onClick={() => handleFilterChange(status)}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  filter === status
                    ? 'bg-gradient-primary text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de pedidos */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg">No hay pedidos para mostrar</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-shadow"
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    {/* ID y Fecha */}
                    <div>
                      <p className="text-sm text-gray-500">Pedido</p>
                      <p className="font-bold text-gray-800 truncate">#{order.id?.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {order.createdAt?.toDate
                          ? order.createdAt.toDate().toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Fecha no disponible'}
                      </p>
                    </div>

                    {/* Cliente */}
                    <div>
                      <p className="text-sm text-gray-500">Cliente</p>
                      <p className="font-bold text-gray-800">
                        {order.shippingInfo.firstName} {order.shippingInfo.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{order.shippingInfo.email}</p>
                    </div>

                    {/* Productos */}
                    <div>
                      <p className="text-sm text-gray-500">Productos</p>
                      <p className="font-bold text-gray-800">{order.items.length} item(s)</p>
                      <p className="text-xs text-gray-500">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} unidades
                      </p>
                    </div>

                    {/* Total */}
                    <div>
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="font-black text-cyan-600 text-xl">€{order.total.toFixed(2)}</p>
                    </div>

                    {/* Estado y Acciones */}
                    <div className="flex flex-col gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold text-center ${
                          statusColors[order.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {statusLabels[order.status] || order.status}
                      </span>
                      <div className="flex gap-2">
                        <a
                          href={`/admin/orders/${order.id}`}
                          className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-300 transition-all text-center"
                        >
                          Ver Detalle
                        </a>
                      </div>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id!, e.target.value)}
                        className="px-3 py-2 border-2 border-gray-300 rounded-xl text-sm font-bold focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none"
                      >
                        {Object.entries(statusLabels).map(([status, label]) => (
                          <option key={status} value={status}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                hasMore={hasMore}
                hasPrevious={currentPage > 1}
                onNextPage={handleNextPage}
                onPreviousPage={handlePreviousPage}
                itemsPerPage={PAGE_SIZE}
                totalItems={totalCount}
                isLoading={loading}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
