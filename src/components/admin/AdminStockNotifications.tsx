import { useEffect, useState, useMemo } from 'react';
import { db } from '../../lib/firebase';
import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import {
  Bell,
  BellRing,
  Mail,
  Search,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  Users,
  Filter,
  Download,
  AlertCircle,
} from 'lucide-react';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import type { StockNotification } from '../../types/firebase';

// ============================================================================
// TIPOS
// ============================================================================

interface NotificationWithId extends StockNotification {
  id: string;
}

interface ProductNotificationGroup {
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  notifications: NotificationWithId[];
  pendingCount: number;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AdminStockNotifications() {
  const [notifications, setNotifications] = useState<NotificationWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'notified' | 'cancelled'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');

  const { confirm, ConfirmDialog } = useConfirmDialog();

  // ============================================================================
  // CARGAR DATOS
  // ============================================================================

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'stock_notifications'), (snapshot) => {
      const notificationsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as NotificationWithId[];

      // Ordenar por fecha de creación (más recientes primero)
      notificationsList.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setNotifications(notificationsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ============================================================================
  // FILTRAR Y AGRUPAR
  // ============================================================================

  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    // Filtro por estado
    if (filterStatus !== 'all') {
      result = result.filter((n) => n.status === filterStatus);
    }

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (n) =>
          n.email.toLowerCase().includes(term) ||
          n.productName.toLowerCase().includes(term) ||
          n.productSlug.toLowerCase().includes(term)
      );
    }

    return result;
  }, [notifications, filterStatus, searchTerm]);

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: ProductNotificationGroup } = {};

    filteredNotifications.forEach((n) => {
      if (!groups[n.productId]) {
        groups[n.productId] = {
          productId: n.productId,
          productName: n.productName,
          productSlug: n.productSlug,
          productImage: n.productImage,
          notifications: [],
          pendingCount: 0,
        };
      }
      groups[n.productId].notifications.push(n);
      if (n.status === 'pending') {
        groups[n.productId].pendingCount++;
      }
    });

    return Object.values(groups).sort((a, b) => b.pendingCount - a.pendingCount);
  }, [filteredNotifications]);

  // Stats
  const stats = useMemo(() => {
    const pending = notifications.filter((n) => n.status === 'pending').length;
    const notified = notifications.filter((n) => n.status === 'notified').length;
    const cancelled = notifications.filter((n) => n.status === 'cancelled').length;
    const uniqueProducts = new Set(notifications.map((n) => n.productId)).size;
    const uniqueEmails = new Set(notifications.map((n) => n.email)).size;

    return { pending, notified, cancelled, uniqueProducts, uniqueEmails, total: notifications.length };
  }, [notifications]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleMarkAsNotified = async (notification: NotificationWithId) => {
    try {
      await updateDoc(doc(db, 'stock_notifications', notification.id), {
        status: 'notified',
        notifiedAt: Timestamp.now(),
      });
      notify.success('Marcado como notificado');
    } catch (error) {
      logger.error('[AdminNotifications] Error marking as notified', error);
      notify.error('Error al actualizar');
    }
  };

  const handleMarkAllAsNotified = async (productId: string) => {
    const confirmed = await confirm({
      title: '¿Marcar todos como notificados?',
      message: 'Esto marcará todas las suscripciones pendientes de este producto como notificadas. Úsalo después de enviar los emails.',
      type: 'info',
      confirmText: 'Marcar Todos',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      const batch = writeBatch(db);
      const pendingNotifications = notifications.filter(
        (n) => n.productId === productId && n.status === 'pending'
      );

      for (const n of pendingNotifications) {
        batch.update(doc(db, 'stock_notifications', n.id), {
          status: 'notified',
          notifiedAt: Timestamp.now(),
        });
      }

      await batch.commit();
      notify.success(`${pendingNotifications.length} notificaciones actualizadas`);
    } catch (error) {
      logger.error('[AdminNotifications] Error batch update', error);
      notify.error('Error al actualizar');
    }
  };

  const handleDelete = async (notification: NotificationWithId) => {
    const confirmed = await confirm({
      title: '¿Eliminar suscripción?',
      message: `¿Eliminar la suscripción de ${notification.email}?`,
      type: 'warning',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'stock_notifications', notification.id));
      notify.success('Suscripción eliminada');
    } catch (error) {
      logger.error('[AdminNotifications] Error deleting', error);
      notify.error('Error al eliminar');
    }
  };

  const handleExportEmails = (productId?: string) => {
    const toExport = productId
      ? notifications.filter((n) => n.productId === productId && n.status === 'pending')
      : notifications.filter((n) => n.status === 'pending');

    if (toExport.length === 0) {
      notify.info('No hay emails pendientes para exportar');
      return;
    }

    const emails = [...new Set(toExport.map((n) => n.email))];
    const csv = ['Email', ...emails].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `emails_stock_${productId ? toExport[0].productSlug : 'todos'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    notify.success(`${emails.length} emails exportados`);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return '-';
    return timestamp.toDate().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 mt-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BellRing className="w-7 h-7 text-amber-500" />
            Notificaciones de Stock
          </h2>
          <p className="text-gray-600 mt-1">
            Usuarios esperando productos sin stock
          </p>
        </div>
        <button
          onClick={() => handleExportEmails()}
          disabled={stats.pending === 0}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Exportar Emails Pendientes
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Notificados</p>
              <p className="text-2xl font-bold text-green-600">{stats.notified}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <XCircle className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cancelados</p>
              <p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Productos</p>
              <p className="text-2xl font-bold text-purple-600">{stats.uniqueProducts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Users className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Emails únicos</p>
              <p className="text-2xl font-bold text-cyan-600">{stats.uniqueEmails}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por email o producto..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="notified">Notificados</option>
            <option value="cancelled">Cancelados</option>
          </select>

          {/* View mode */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-4 py-2 text-sm font-medium ${viewMode === 'grouped' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Por Producto
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium ${viewMode === 'list' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Lista
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No hay notificaciones
          </h3>
          <p className="text-gray-500">
            {searchTerm || filterStatus !== 'all'
              ? 'No se encontraron resultados con los filtros aplicados'
              : 'Aún no hay usuarios esperando productos sin stock'}
          </p>
        </div>
      ) : viewMode === 'grouped' ? (
        /* Grouped View */
        <div className="space-y-4">
          {groupedNotifications.map((group) => (
            <div key={group.productId} className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Product Header */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {group.productImage ? (
                    <img
                      src={group.productImage}
                      alt={group.productName}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-gray-800">{group.productName}</h3>
                    <p className="text-sm text-gray-500">/{group.productSlug}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                        {group.pendingCount} pendientes
                      </span>
                      <span className="text-xs text-gray-400">
                        {group.notifications.length} total
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportEmails(group.productId)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Exportar emails"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  {group.pendingCount > 0 && (
                    <button
                      onClick={() => handleMarkAllAsNotified(group.productId)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      <Send className="w-4 h-4" />
                      Marcar todos notificados
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              <div className="divide-y divide-gray-100">
                {group.notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <span className="font-medium text-gray-700">{n.email}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {formatDate(n.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        n.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        n.status === 'notified' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {n.status === 'pending' ? 'Pendiente' :
                         n.status === 'notified' ? 'Notificado' : 'Cancelado'}
                      </span>
                      {n.status === 'pending' && (
                        <button
                          onClick={() => handleMarkAsNotified(n)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Marcar como notificado"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {group.notifications.length > 5 && (
                  <div className="px-6 py-2 text-center text-sm text-gray-500">
                    ... y {group.notifications.length - 5} más
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredNotifications.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-700">{n.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {n.productImage && (
                        <img
                          src={n.productImage}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium text-gray-800">{n.productName}</div>
                        <div className="text-xs text-gray-400">/{n.productSlug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatDate(n.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      n.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      n.status === 'notified' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {n.status === 'pending' ? 'Pendiente' :
                       n.status === 'notified' ? 'Notificado' : 'Cancelado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {n.status === 'pending' && (
                        <button
                          onClick={() => handleMarkAsNotified(n)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Marcar como notificado"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
}
