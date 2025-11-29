import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';

interface DashboardStats {
  // Ventas
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  yearRevenue: number;

  // Pedidos
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;

  // Productos
  totalProducts: number;
  topProducts: { name: string; sales: number; revenue: number }[];

  // Métricas
  averageOrderValue: number;
  conversionRate: number;

  // Tendencias
  ordersLastWeek: { date: string; count: number; revenue: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [error, setError] = useState<string | null>(null);
  const [ordersLimit, setOrdersLimit] = useState(100); // PERFORMANCE: Limitar carga inicial
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  useEffect(() => {
    // Verificar usuario autenticado
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Silently verify authentication (logs removed for production)
    });

    loadDashboardData();

    return () => unsubscribe();
  }, [timeRange, ordersLimit]); // PERFORMANCE: Recargar cuando cambie el límite

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Verificar que db esté disponible
      if (!db) {
        throw new Error('Firebase no está inicializado');
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // PERFORMANCE: Obtener pedidos con límite y ordenamiento
      const ordersRef = collection(db, 'orders');

      // Ordenar por fecha descendente y limitar
      const ordersQuery = query(
        ordersRef,
        orderBy('createdAt', 'desc'),
        limit(ordersLimit)
      );

      const ordersSnapshot = await getDocs(ordersQuery);

      const allOrders = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));

      // Calcular estadísticas de ventas
      let totalRevenue = 0;
      let todayRevenue = 0;
      let monthRevenue = 0;
      let yearRevenue = 0;

      const totalOrders = allOrders.length;
      let pendingOrders = 0;
      let processingOrders = 0;
      let completedOrders = 0;

      const productSales: { [key: string]: { name: string; sales: number; revenue: number } } = {};
      const dailyOrders: { [key: string]: { count: number; revenue: number } } = {};

      allOrders.forEach((order: any) => {
        const orderTotal = parseFloat(order.total) || 0;
        const orderDate = order.createdAt;

        totalRevenue += orderTotal;

        // Ventas por período
        if (orderDate >= todayStart) todayRevenue += orderTotal;
        if (orderDate >= monthStart) monthRevenue += orderTotal;
        if (orderDate >= yearStart) yearRevenue += orderTotal;

        // Estados de pedidos
        if (order.status === 'pending') pendingOrders++;
        else if (order.status === 'processing') processingOrders++;
        else if (order.status === 'completed') completedOrders++;

        // Productos más vendidos
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const productId = item.productId || item.id;
            const productName = item.name || 'Producto sin nombre';
            const quantity = item.quantity || 1;
            const price = parseFloat(item.price) || 0;

            if (!productSales[productId]) {
              productSales[productId] = { name: productName, sales: 0, revenue: 0 };
            }
            productSales[productId].sales += quantity;
            productSales[productId].revenue += price * quantity;
          });
        }

        // Ventas de la última semana
        if (orderDate >= weekStart) {
          const dateKey = orderDate.toISOString().split('T')[0];
          if (!dailyOrders[dateKey]) {
            dailyOrders[dateKey] = { count: 0, revenue: 0 };
          }
          dailyOrders[dateKey].count++;
          dailyOrders[dateKey].revenue += orderTotal;
        }
      });

      // Top productos
      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Ordenar ventas de la última semana
      const ordersLastWeek = Object.entries(dailyOrders)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Obtener total de productos
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);
      const totalProducts = productsSnapshot.size;

      // Calcular métricas
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setStats({
        totalRevenue,
        todayRevenue,
        monthRevenue,
        yearRevenue,
        totalOrders,
        pendingOrders,
        processingOrders,
        completedOrders,
        totalProducts,
        topProducts,
        averageOrderValue,
        conversionRate: 0, // Esto requeriría tracking de visitas
        ordersLastWeek,
      });
    } catch (error: any) {
      // Log only in development
      if (import.meta.env.DEV) {
        console.error('[Dashboard] Error loading data:', error);
      }

      const errorMessage = error?.message || 'Error desconocido';
      const errorCode = error?.code || 'unknown';
      setError(`${errorCode}: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-cyan-500 border-r-transparent mb-4"></div>
          <p className="text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
          <div className="text-5xl mb-4">🚨</div>
          <h2 className="text-2xl font-bold text-red-800 mb-2">Error al cargar el Dashboard</h2>
          <p className="text-red-700 mb-4 font-mono text-sm bg-red-100 p-3 rounded">{error}</p>
          <div className="text-left bg-white p-4 rounded-lg mb-4">
            <p className="font-semibold text-gray-900 mb-2">Posibles causas:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 text-sm">
              <li>Las reglas de Firestore no están actualizadas</li>
              <li>Tu email no está configurado como admin en firestore.rules</li>
              <li>No estás autenticado o tu sesión expiró</li>
              <li>Problemas de permisos en Firebase Console</li>
            </ul>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadDashboardData}
              className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
            >
              🔄 Reintentar
            </button>
            <a
              href="/FIREBASE-SETUP.md"
              target="_blank"
              className="px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors"
            >
              📖 Ver Guía
            </a>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Abre la consola del navegador (F12) para ver logs detallados
          </p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Error: No hay datos disponibles</p>
        <button
          onClick={loadDashboardData}
          className="mt-4 px-6 py-3 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 transition-colors"
        >
          🔄 Reintentar
        </button>
      </div>
    );
  }

  // Determinar qué ingresos mostrar según el rango de tiempo
  const getRevenueByTimeRange = () => {
    switch (timeRange) {
      case 'today':
        return stats.todayRevenue;
      case 'week':
        return stats.ordersLastWeek.reduce((sum, day) => sum + day.revenue, 0);
      case 'month':
        return stats.monthRevenue;
      case 'year':
        return stats.yearRevenue;
      default:
        return stats.monthRevenue;
    }
  };

  const displayRevenue = getRevenueByTimeRange();
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'today':
        return 'Hoy';
      case 'week':
        return 'Últimos 7 días';
      case 'month':
        return 'Este mes';
      case 'year':
        return 'Este año';
      default:
        return 'Este mes';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard de Administración</h1>
        <p className="text-gray-600">Vista general de tu negocio</p>
      </div>

      {/* Banner: Nuevo Dashboard con Gráficos */}
      <div className="mb-6 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">📊 Nuevo Dashboard con Gráficos Interactivos</h2>
            <p className="text-white/90 mb-4">
              Visualiza tus ventas con gráficos de línea, área, barras y circular. Análisis completo de tu negocio.
            </p>
            <a
              href="/admin/dashboard-ventas"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-xl font-bold hover:shadow-xl transition-all"
            >
              <span>✨</span>
              Ver Dashboard con Gráficos
              <span>→</span>
            </a>
          </div>
          <div className="hidden lg:block text-8xl opacity-50">📈</div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="mb-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <a
          href="/admin/products"
          className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all text-center group"
        >
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📦</div>
          <div className="text-sm font-semibold text-gray-900">Productos</div>
        </a>
        <a
          href="/admin/categories"
          className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all text-center group"
        >
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📁</div>
          <div className="text-sm font-semibold text-gray-900">Categorías</div>
        </a>
        <a
          href="/admin/orders"
          className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-cyan-500 hover:shadow-lg transition-all text-center group"
        >
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🛒</div>
          <div className="text-sm font-semibold text-gray-900">Pedidos</div>
        </a>
        <a
          href="/admin/dashboard-ventas"
          className="p-4 bg-gradient-to-br from-cyan-500 to-purple-600 border-2 border-cyan-400 rounded-xl hover:shadow-xl transition-all text-center group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 bg-yellow-400 text-xs font-bold px-2 py-0.5 rounded-bl-lg text-gray-900">
            NUEVO
          </div>
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</div>
          <div className="text-sm font-semibold text-white">Gráficos</div>
        </a>
        <a
          href="/admin/cupones"
          className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-green-500 hover:shadow-lg transition-all text-center group"
        >
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🎟️</div>
          <div className="text-sm font-semibold text-gray-900">Cupones</div>
        </a>
        <a
          href="/admin/newsletter"
          className="p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-center group"
        >
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">✉️</div>
          <div className="text-sm font-semibold text-gray-900">Newsletter</div>
        </a>
        <a
          href="/admin/customization"
          className="p-4 bg-gradient-to-br from-purple-500 to-cyan-500 border-2 border-purple-400 rounded-xl hover:shadow-xl transition-all text-center group relative overflow-hidden"
        >
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🎨</div>
          <div className="text-sm font-semibold text-white">Personalización</div>
        </a>
        <a
          href="/test-customizer"
          target="_blank"
          className="p-4 bg-white border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-500 hover:shadow-lg transition-all text-center group"
        >
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🧪</div>
          <div className="text-sm font-semibold text-gray-900">Test</div>
        </a>
      </div>

      {/* Filtro de tiempo */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTimeRange('today')}
          className={`px-4 py-2 rounded-lg font-semibold ${
            timeRange === 'today'
              ? 'bg-cyan-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Hoy
        </button>
        <button
          onClick={() => setTimeRange('week')}
          className={`px-4 py-2 rounded-lg font-semibold ${
            timeRange === 'week'
              ? 'bg-cyan-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          7 días
        </button>
        <button
          onClick={() => setTimeRange('month')}
          className={`px-4 py-2 rounded-lg font-semibold ${
            timeRange === 'month'
              ? 'bg-cyan-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Mes
        </button>
        <button
          onClick={() => setTimeRange('year')}
          className={`px-4 py-2 rounded-lg font-semibold ${
            timeRange === 'year'
              ? 'bg-cyan-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Año
        </button>
      </div>

      {/* Tarjetas de métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Ingresos totales */}
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-cyan-100 text-sm font-semibold">Ingresos Totales</p>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold mb-1">€{stats.totalRevenue.toFixed(2)}</p>
          <p className="text-cyan-100 text-sm">Todos los tiempos</p>
        </div>

        {/* Ingresos según filtro */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-100 text-sm font-semibold">{getTimeRangeLabel()}</p>
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-3xl font-bold mb-1">€{displayRevenue.toFixed(2)}</p>
          <p className="text-green-100 text-sm">
            {displayRevenue > 0
              ? `${((displayRevenue / stats.totalRevenue) * 100).toFixed(1)}% del total`
              : `Sin ventas ${getTimeRangeLabel().toLowerCase()}`}
          </p>
        </div>

        {/* Total pedidos */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-purple-100 text-sm font-semibold">Total Pedidos</p>
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-3xl font-bold mb-1">{stats.totalOrders}</p>
          <p className="text-purple-100 text-sm">{stats.pendingOrders} pendientes</p>
        </div>

        {/* Ticket promedio */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-orange-100 text-sm font-semibold">Ticket Promedio</p>
            <span className="text-2xl">🎯</span>
          </div>
          <p className="text-3xl font-bold mb-1">€{stats.averageOrderValue.toFixed(2)}</p>
          <p className="text-orange-100 text-sm">Por pedido</p>
        </div>
      </div>

      {/* Segunda fila de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Ingresos de hoy */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Ingresos de Hoy</h3>
            <span className="text-xl">☀️</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">€{stats.todayRevenue.toFixed(2)}</p>
        </div>

        {/* Ingresos del año */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Ingresos del Año</h3>
            <span className="text-xl">📅</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">€{stats.yearRevenue.toFixed(2)}</p>
        </div>

        {/* Total productos */}
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Total Productos</h3>
            <span className="text-xl">🏷️</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
        </div>
      </div>

      {/* Estados de pedidos */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Estado de Pedidos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
            <div>
              <p className="text-sm text-yellow-700 font-semibold">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pendingOrders}</p>
            </div>
            <span className="text-3xl">⏳</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <p className="text-sm text-blue-700 font-semibold">En Proceso</p>
              <p className="text-2xl font-bold text-blue-900">{stats.processingOrders}</p>
            </div>
            <span className="text-3xl">⚙️</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div>
              <p className="text-sm text-green-700 font-semibold">Completados</p>
              <p className="text-2xl font-bold text-green-900">{stats.completedOrders}</p>
            </div>
            <span className="text-3xl">✅</span>
          </div>
        </div>
      </div>

      {/* Productos más vendidos */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Top 5 Productos Más Vendidos</h3>
        {stats.topProducts.length > 0 ? (
          <div className="space-y-3">
            {stats.topProducts.map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.sales} unidades vendidas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">€{product.revenue.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">ingresos</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No hay datos de ventas de productos</p>
        )}
      </div>

      {/* Gráfico simple de ventas de la última semana */}
      <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Ventas de los Últimos 7 Días</h3>
        {stats.ordersLastWeek.length > 0 ? (
          <div className="space-y-2">
            {stats.ordersLastWeek.map((day, index) => {
              const maxRevenue = Math.max(...stats.ordersLastWeek.map((d) => d.revenue));
              const barWidth = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;

              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-gray-600 font-medium">
                    {new Date(day.date).toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                  <div className="flex-1 relative">
                    <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-full rounded-full flex items-center justify-end pr-3"
                        style={{ width: `${barWidth}%`, minWidth: day.revenue > 0 ? '60px' : '0' }}
                      >
                        <span className="text-white text-xs font-bold">
                          €{day.revenue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold text-gray-700">
                    {day.count} pedido{day.count !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No hay ventas en los últimos 7 días</p>
        )}
      </div>

      {/* Controles de carga y actualización */}
      <div className="mt-8 space-y-4">
        {/* Información de datos cargados */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-sm text-blue-800">
            📊 Mostrando estadísticas basadas en los últimos <strong>{ordersLimit} pedidos</strong>
            {stats.totalOrders >= ordersLimit && (
              <span className="text-blue-600">
                {' '}
                (puede haber más pedidos en la base de datos)
              </span>
            )}
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="px-6 py-3 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 Actualizar Datos
          </button>

          {ordersLimit < 1000 && (
            <button
              onClick={() => {
                setOrdersLimit(ordersLimit + 100);
                setIsLoadingAll(false);
              }}
              disabled={loading}
              className="px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ➕ Cargar 100 más
            </button>
          )}

          {!isLoadingAll && (
            <button
              onClick={() => {
                if (
                  confirm(
                    '⚠️ Esto puede cargar miles de pedidos y afectar el rendimiento. ¿Estás seguro?'
                  )
                ) {
                  setOrdersLimit(10000);
                  setIsLoadingAll(true);
                }
              }}
              disabled={loading}
              className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📈 Cargar Todos
            </button>
          )}

          {ordersLimit > 100 && (
            <button
              onClick={() => {
                setOrdersLimit(100);
                setIsLoadingAll(false);
              }}
              disabled={loading}
              className="px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ↩️ Restablecer (100)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
