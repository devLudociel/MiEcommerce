// src/components/admin/charts/ChartsSection.tsx
// This component is lazy loaded to reduce initial bundle size
// Recharts (~116 KB gzip) only loads when this component is rendered

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = {
  primary: '#06b6d4', // cyan-500
  secondary: '#8b5cf6', // purple-500
  success: '#10b981', // green-500
  warning: '#f59e0b', // amber-500
  danger: '#ef4444', // red-500
  pending: '#eab308', // yellow-500
  processing: '#3b82f6', // blue-500
  completed: '#10b981', // green-500
};

interface ChartsSectionProps {
  ordersLastWeek: { date: string; count: number; revenue: number }[];
  ordersByStatus: { name: string; value: number; color: string }[];
  revenueByMonth: { month: string; revenue: number; orders: number }[];
  topProducts: { name: string; sales: number; revenue: number }[];
}

export default function ChartsSection({
  ordersLastWeek,
  ordersByStatus,
  revenueByMonth,
  topProducts,
}: ChartsSectionProps) {
  return (
    <>
      {/* Gr�ficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gr�fico de �rea - Ingresos �ltimos 7 d�as */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Ingresos - �ltimos 7 D�as</h3>
          {ordersLastWeek.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={ordersLastWeek}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day: 'numeric',
                    })
                  }
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  formatter={(value: number | string) => [
                    `€${parseFloat(String(value)).toFixed(2)}`,
                    'Ingresos',
                  ]}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  }
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-20">No hay datos de la �ltima semana</p>
          )}
        </div>

        {/* Gr�fico circular - Estados de pedidos */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Estado de Pedidos</h3>
          {ordersByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ordersByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ordersByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-20">No hay pedidos</p>
          )}
        </div>
      </div>

      {/* Gr�fico de barras - Ingresos mensuales */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Ingresos por Mes (�ltimos 6 Meses)</h3>
        {revenueByMonth.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                formatter={(value: number | string, name: string) => {
                  if (name === 'revenue')
                    return [`€${parseFloat(String(value)).toFixed(2)}`, 'Ingresos'];
                  return [value, 'Pedidos'];
                }}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar
                dataKey="revenue"
                name="Ingresos (�)"
                fill={COLORS.primary}
                radius={[8, 8, 0, 0]}
              />
              <Bar dataKey="orders" name="Pedidos" fill={COLORS.secondary} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-20">No hay datos mensuales</p>
        )}
      </div>

      {/* Top productos */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Top 5 Productos M�s Vendidos</h3>
        {topProducts.length > 0 ? (
          <div className="space-y-3">
            {topProducts.map((product, index) => {
              const maxRevenue = Math.max(...topProducts.map((p) => p.revenue));
              const barWidth = (product.revenue / maxRevenue) * 100;

              return (
                <div key={index} className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-cyan-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-600">{product.sales} unidades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">�{product.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No hay datos de productos</p>
        )}
      </div>

      {/* Gr�fico de l�nea - Pedidos diarios */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Pedidos Diarios - �ltimos 7 D�as</h3>
        {ordersLastWeek.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ordersLastWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
                }
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip
                formatter={(value: number | string) => [value, 'Pedidos']}
                labelFormatter={(label) =>
                  new Date(label).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })
                }
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                name="Pedidos"
                stroke={COLORS.secondary}
                strokeWidth={3}
                dot={{ fill: COLORS.secondary, r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-20">No hay datos de pedidos</p>
        )}
      </div>
    </>
  );
}
