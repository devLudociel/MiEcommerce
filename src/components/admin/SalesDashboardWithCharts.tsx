import { useEffect, useState, lazy, Suspense } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DashboardChartSkeleton } from '../ui/Skeleton';

const COLORS = {
  pending: '#eab308', // yellow-500
  processing: '#3b82f6', // blue-500
  completed: '#10b981', // green-500
};

interface OrderItem {
  productId?: string;
  id?: string;
  name?: string;
  quantity?: number;
  price?: number | string;
}

interface OrderDocument {
  id: string;
  total?: number | string;
  status?: string;
  items?: OrderItem[];
  createdAt: Date;
}

// Lazy load the ChartsSection to reduce initial bundle size
// Recharts (~116 KB gzip) only loads when user scrolls to charts
const ChartsSection = lazy(() => import('./charts/ChartsSection'));

interface DashboardStats {
  totalRevenue: number;
  todayRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  totalProducts: number;
  topProducts: { name: string; sales: number; revenue: number }[];
  averageOrderValue: number;
  ordersLastWeek: { date: string; count: number; revenue: number }[];
  revenueByMonth: { month: string; revenue: number; orders: number }[];
  ordersByStatus: { name: string; value: number; color: string }[];
}

export default function SalesDashboardWithCharts() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!db) {
        throw new Error('Firebase no está inicializado');
      }

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Obtener pedidos (últimos 500 para cálculos más precisos)
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(500));
      const ordersSnapshot = await getDocs(ordersQuery);

      const allOrders = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));

      // Calcular estadísticas
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
      const monthlyOrders: { [key: string]: { revenue: number; orders: number } } = {};

      allOrders.forEach((order: OrderDocument) => {
        const orderTotal = parseFloat(String(order.total)) || 0;
        const orderDate = order.createdAt;

        totalRevenue += orderTotal;

        if (orderDate >= todayStart) todayRevenue += orderTotal;
        if (orderDate >= monthStart) monthRevenue += orderTotal;
        if (orderDate >= yearStart) yearRevenue += orderTotal;

        // Estados
        if (order.status === 'pending') pendingOrders++;
        else if (order.status === 'processing') processingOrders++;
        else if (order.status === 'completed' || order.status === 'delivered') completedOrders++;

        // Productos más vendidos
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: OrderItem) => {
            const productId = item.productId || item.id;
            const productName = item.name || 'Producto sin nombre';
            const quantity = item.quantity || 1;
            const price = parseFloat(String(item.price)) || 0;

            if (!productSales[productId]) {
              productSales[productId] = { name: productName, sales: 0, revenue: 0 };
            }
            productSales[productId].sales += quantity;
            productSales[productId].revenue += price * quantity;
          });
        }

        // Ventas diarias (últimos 7 días)
        if (orderDate >= weekStart) {
          const dateKey = orderDate.toISOString().split('T')[0];
          if (!dailyOrders[dateKey]) {
            dailyOrders[dateKey] = { count: 0, revenue: 0 };
          }
          dailyOrders[dateKey].count++;
          dailyOrders[dateKey].revenue += orderTotal;
        }

        // Ventas mensuales (últimos 12 meses)
        if (orderDate >= new Date(now.getFullYear() - 1, now.getMonth(), 1)) {
          const monthKey = orderDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
          });
          if (!monthlyOrders[monthKey]) {
            monthlyOrders[monthKey] = { revenue: 0, orders: 0 };
          }
          monthlyOrders[monthKey].revenue += orderTotal;
          monthlyOrders[monthKey].orders++;
        }
      });

      // Top 5 productos
      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Datos para gráfico de línea (últimos 7 días)
      const ordersLastWeek = Object.entries(dailyOrders)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Datos para gráfico de barras mensuales
      const revenueByMonth = Object.entries(monthlyOrders)
        .map(([month, data]) => ({ month, ...data }))
        .slice(-6); // Últimos 6 meses

      // Datos para gráfico circular (estados de pedidos)
      const ordersByStatus = [
        { name: 'Pendientes', value: pendingOrders, color: COLORS.pending },
        { name: 'En Proceso', value: processingOrders, color: COLORS.processing },
        { name: 'Completados', value: completedOrders, color: COLORS.completed },
      ].filter((item) => item.value > 0);

      // Obtener total de productos
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);
      const totalProducts = productsSnapshot.size;

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
        ordersLastWeek,
        revenueByMonth,
        ordersByStatus,
      });
    } catch (error: unknown) {
      console.error('[Dashboard] Error loading data:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
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
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
          >
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="p-6 text-center text-red-600">No hay datos disponibles</div>;
  }

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard de Ventas</h1>
          <p className="text-gray-600">Análisis visual de tu negocio</p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="px-6 py-3 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 transition-colors shadow-md hover:shadow-lg disabled:opacity-50"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Filtro de tiempo */}
      <div className="mb-6 flex gap-2">
        {(['today', 'week', 'month', 'year'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              timeRange === range
                ? 'bg-cyan-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {range === 'today' && 'Hoy'}
            {range === 'week' && '7 días'}
            {range === 'month' && 'Mes'}
            {range === 'year' && 'Año'}
          </button>
        ))}
      </div>

      {/* Tarjetas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-cyan-100 text-sm font-semibold">Ingresos Totales</p>
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-3xl font-bold mb-1">€{stats.totalRevenue.toFixed(2)}</p>
          <p className="text-cyan-100 text-sm">Todos los tiempos</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-green-100 text-sm font-semibold">Período Actual</p>
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-3xl font-bold mb-1">€{displayRevenue.toFixed(2)}</p>
          <p className="text-green-100 text-sm">
            {((displayRevenue / stats.totalRevenue) * 100).toFixed(1)}% del total
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-purple-100 text-sm font-semibold">Total Pedidos</p>
            <span className="text-2xl">📦</span>
          </div>
          <p className="text-3xl font-bold mb-1">{stats.totalOrders}</p>
          <p className="text-purple-100 text-sm">{stats.pendingOrders} pendientes</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-orange-100 text-sm font-semibold">Ticket Promedio</p>
            <span className="text-2xl">🎯</span>
          </div>
          <p className="text-3xl font-bold mb-1">€{stats.averageOrderValue.toFixed(2)}</p>
          <p className="text-orange-100 text-sm">Por pedido</p>
        </div>
      </div>

      {/* Lazy loaded charts section */}
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardChartSkeleton />
              <DashboardChartSkeleton />
            </div>
            <DashboardChartSkeleton />
            <DashboardChartSkeleton />
          </div>
        }
      >
        <ChartsSection
          ordersLastWeek={stats.ordersLastWeek}
          ordersByStatus={stats.ordersByStatus}
          revenueByMonth={stats.revenueByMonth}
          topProducts={stats.topProducts}
        />
      </Suspense>
    </div>
  );
}
