import { useEffect, useState, useMemo } from 'react';
import { db } from '../../lib/firebase';
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { notify } from '../../lib/notifications';
import { logger } from '../../lib/logger';
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  DollarSign,
  Shield,
  ShieldOff,
  Eye,
  X,
  MapPin,
  CreditCard,
  Ban,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import type { UserDataDoc, Address } from '../../lib/userProfile';

// ============================================================================
// TIPOS
// ============================================================================

interface UserWithStats extends UserDataDoc {
  uid: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderDate?: Date;
  isDisabled?: boolean;
  isAdmin?: boolean;
}

interface OrderSummary {
  id: string;
  total: number;
  status: string;
  createdAt: Date;
  itemsCount: number;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function AdminUsersPanel() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'orders' | 'spent'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // User detail modal
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [userOrders, setUserOrders] = useState<OrderSummary[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Admin emails from environment
  const adminEmails = useMemo(() => {
    const emails = import.meta.env.PUBLIC_ADMIN_EMAILS || '';
    return emails.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
  }, []);

  const { confirm, ConfirmDialog } = useConfirmDialog();

  // ============================================================================
  // CARGAR DATOS
  // ============================================================================

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), async (snapshot) => {
      const usersList: UserWithStats[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as UserDataDoc;
        const uid = docSnap.id;

        // Check if user is admin
        const isAdmin = adminEmails.includes((data.email || '').toLowerCase());

        // Fetch orders count for this user
        let ordersCount = 0;
        let totalSpent = 0;
        let lastOrderDate: Date | undefined;

        try {
          const ordersQuery = query(
            collection(db, 'orders'),
            where('userId', '==', uid)
          );
          const ordersSnap = await getDocs(ordersQuery);
          ordersCount = ordersSnap.size;

          ordersSnap.forEach((orderDoc) => {
            const orderData = orderDoc.data();
            totalSpent += orderData.total || 0;

            const orderDate = orderData.createdAt?.toDate?.() || new Date(orderData.createdAt);
            if (!lastOrderDate || orderDate > lastOrderDate) {
              lastOrderDate = orderDate;
            }
          });
        } catch (error) {
          logger.warn('[AdminUsers] Error fetching orders for user', { uid, error });
        }

        usersList.push({
          ...data,
          uid,
          ordersCount,
          totalSpent,
          lastOrderDate,
          isAdmin,
          isDisabled: data.isDisabled || false,
        } as UserWithStats);
      }

      setUsers(usersList);
      setLoading(false);
    });

    return () => unsubUsers();
  }, [adminEmails]);

  // ============================================================================
  // FILTRAR Y ORDENAR
  // ============================================================================

  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.email?.toLowerCase().includes(term) ||
          u.displayName?.toLowerCase().includes(term) ||
          u.profile?.firstName?.toLowerCase().includes(term) ||
          u.profile?.lastName?.toLowerCase().includes(term) ||
          u.profile?.phone?.includes(term)
      );
    }

    // Role filter
    if (filterRole === 'admin') {
      result = result.filter((u) => u.isAdmin);
    } else if (filterRole === 'user') {
      result = result.filter((u) => !u.isAdmin);
    }

    // Status filter
    if (filterStatus === 'active') {
      result = result.filter((u) => !u.isDisabled);
    } else if (filterStatus === 'disabled') {
      result = result.filter((u) => u.isDisabled);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'name':
          const nameA = a.displayName || a.email || '';
          const nameB = b.displayName || b.email || '';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'orders':
          comparison = a.ordersCount - b.ordersCount;
          break;
        case 'spent':
          comparison = a.totalSpent - b.totalSpent;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [users, searchTerm, filterRole, filterStatus, sortBy, sortOrder]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleToggleDisabled = async (user: UserWithStats) => {
    const action = user.isDisabled ? 'habilitar' : 'deshabilitar';
    const confirmed = await confirm({
      title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} usuario?`,
      message: `¿Estás seguro de que quieres ${action} a "${user.displayName || user.email}"?`,
      type: user.isDisabled ? 'info' : 'warning',
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isDisabled: !user.isDisabled,
      });
      notify.success(`Usuario ${user.isDisabled ? 'habilitado' : 'deshabilitado'}`);
    } catch (error) {
      logger.error('[AdminUsers] Error toggling user status', error);
      notify.error('Error al actualizar estado del usuario');
    }
  };

  const handleViewUser = async (user: UserWithStats) => {
    setSelectedUser(user);
    setLoadingOrders(true);

    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const ordersSnap = await getDocs(ordersQuery);

      const orders: OrderSummary[] = ordersSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          total: data.total || 0,
          status: data.status || 'pending',
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          itemsCount: data.items?.length || 0,
        };
      });

      setUserOrders(orders);
    } catch (error) {
      logger.error('[AdminUsers] Error fetching user orders', error);
      notify.error('Error al cargar pedidos del usuario');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleExportUsers = () => {
    try {
      const headers = ['Email', 'Nombre', 'Teléfono', 'Fecha Registro', 'Pedidos', 'Total Gastado', 'Estado', 'Rol'];
      const rows = filteredUsers.map((u) => {
        const createdAt = u.createdAt instanceof Timestamp
          ? u.createdAt.toDate().toLocaleDateString('es-ES')
          : new Date(u.createdAt || 0).toLocaleDateString('es-ES');

        return [
          u.email || '',
          u.displayName || `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim(),
          u.profile?.phone || '',
          createdAt,
          u.ordersCount.toString(),
          u.totalSpent.toFixed(2),
          u.isDisabled ? 'Deshabilitado' : 'Activo',
          u.isAdmin ? 'Admin' : 'Usuario',
        ];
      });

      const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      notify.success(`${filteredUsers.length} usuarios exportados`);
    } catch (error) {
      logger.error('[AdminUsers] Error exporting users', error);
      notify.error('Error al exportar usuarios');
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  const formatDate = (date: Date | Timestamp | undefined) => {
    if (!date) return '-';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 mt-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-purple-500" />
            Usuarios
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredUsers.length} de {users.length} usuario(s)
          </p>
        </div>
        <button
          onClick={handleExportUsers}
          disabled={filteredUsers.length === 0}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
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
                placeholder="Buscar por email, nombre, teléfono..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Role filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todos los roles</option>
            <option value="admin">Administradores</option>
            <option value="user">Usuarios</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="disabled">Deshabilitados</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Usuarios</p>
              <p className="text-2xl font-bold text-gray-800">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Activos</p>
              <p className="text-2xl font-bold text-gray-800">
                {users.filter((u) => !u.isDisabled).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Shield className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Administradores</p>
              <p className="text-2xl font-bold text-gray-800">
                {users.filter((u) => u.isAdmin).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Ventas</p>
              <p className="text-2xl font-bold text-gray-800">
                €{users.reduce((sum, u) => sum + u.totalSpent, 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Usuario
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('date')}
              >
                <div className="flex items-center gap-1">
                  Registro
                  {sortBy === 'date' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('orders')}
              >
                <div className="flex items-center gap-1">
                  Pedidos
                  {sortBy === 'orders' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('spent')}
              >
                <div className="flex items-center gap-1">
                  Total Gastado
                  {sortBy === 'spent' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                </div>
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
            {filteredUsers.map((user) => (
              <tr key={user.uid} className={`hover:bg-gray-50 ${user.isDisabled ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${user.isAdmin ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-purple-500 to-cyan-500'}`}>
                      {(user.displayName || user.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 flex items-center gap-2">
                        {user.displayName || `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'Sin nombre'}
                        {user.isAdmin && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                      {user.profile?.phone && (
                        <div className="text-sm text-gray-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {user.profile.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {formatDate(user.createdAt)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <ShoppingBag className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-800">{user.ordersCount}</span>
                  </div>
                  {user.lastOrderDate && (
                    <div className="text-xs text-gray-400">
                      Último: {formatDate(user.lastOrderDate)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-gray-800">
                    €{user.totalSpent.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      user.isDisabled
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {user.isDisabled ? 'Deshabilitado' : 'Activo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleViewUser(user)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleDisabled(user)}
                      className={`p-2 rounded-lg transition-colors ${
                        user.isDisabled
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                      title={user.isDisabled ? 'Habilitar' : 'Deshabilitar'}
                    >
                      {user.isDisabled ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
              ? 'No se encontraron usuarios con los filtros aplicados.'
              : 'No hay usuarios registrados.'}
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-bold text-gray-800">Detalles del Usuario</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold ${selectedUser.isAdmin ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-purple-500 to-cyan-500'}`}>
                    {(selectedUser.displayName || selectedUser.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                      {selectedUser.displayName || `${selectedUser.profile?.firstName || ''} ${selectedUser.profile?.lastName || ''}`.trim() || 'Sin nombre'}
                      {selectedUser.isAdmin && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-sm font-medium">
                          Admin
                        </span>
                      )}
                      {selectedUser.isDisabled && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-sm font-medium">
                          Deshabilitado
                        </span>
                      )}
                    </h4>
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {selectedUser.email}
                      </div>
                      {selectedUser.profile?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {selectedUser.profile.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        Registrado: {formatDate(selectedUser.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600">{selectedUser.ordersCount}</div>
                    <div className="text-xs text-gray-500">Pedidos</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">€{selectedUser.totalSpent.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Total Gastado</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-cyan-600">€{selectedUser.creditBalance?.toFixed(2) || '0.00'}</div>
                    <div className="text-xs text-gray-500">Saldo Crédito</div>
                  </div>
                </div>
              </div>

              {/* Addresses */}
              {selectedUser.addresses && selectedUser.addresses.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    Direcciones ({selectedUser.addresses.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedUser.addresses.map((addr, idx) => (
                      <div key={addr.id || idx} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-800">{addr.label || `Dirección ${idx + 1}`}</span>
                          {addr.isDefaultShipping && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Envío</span>
                          )}
                          {addr.isDefaultBilling && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">Facturación</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {addr.fullName} • {addr.line1}
                          {addr.line2 && `, ${addr.line2}`}
                          {addr.city && `, ${addr.city}`}
                          {addr.zip && ` ${addr.zip}`}
                          {addr.country && `, ${addr.country}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tax IDs */}
              {selectedUser.taxIds && selectedUser.taxIds.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    Identificaciones Fiscales
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.taxIds.map((tax, idx) => (
                      <span key={tax.id || idx} className="px-3 py-1 bg-white rounded-lg border border-gray-200 text-sm">
                        {tax.label || 'NIF'}: {tax.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Orders History */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <ShoppingBag className="w-5 h-5 text-gray-400" />
                  Historial de Pedidos
                </h4>
                {loadingOrders ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent" />
                  </div>
                ) : userOrders.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Sin pedidos</p>
                ) : (
                  <div className="space-y-2">
                    {userOrders.slice(0, 10).map((order) => (
                      <div key={order.id} className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">#{order.id.slice(-8).toUpperCase()}</div>
                          <div className="text-sm text-gray-500">
                            {order.itemsCount} producto(s) • {formatDate(order.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-800">€{order.total.toFixed(2)}</div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {order.status === 'completed' ? 'Completado' :
                             order.status === 'processing' ? 'Procesando' :
                             order.status === 'cancelled' ? 'Cancelado' :
                             'Pendiente'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {userOrders.length > 10 && (
                      <p className="text-sm text-gray-500 text-center">
                        ... y {userOrders.length - 10} pedidos más
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => handleToggleDisabled(selectedUser)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
                  selectedUser.isDisabled
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {selectedUser.isDisabled ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Habilitar Usuario
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    Deshabilitar Usuario
                  </>
                )}
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
}
