# Dashboard de Ventas con Gráficos Interactivos

## Overview

Implementado un dashboard de ventas completamente visual con gráficos interactivos usando **Recharts**. Proporciona análisis profundo del negocio con visualizaciones modernas y responsivas.

## Características Implementadas

### 1. Gráficos Interactivos

#### Gráfico de Área - Ingresos Diarios
- **Tipo:** AreaChart con gradiente
- **Datos:** Últimos 7 días de ingresos
- **Features:**
  - Gradiente de color personalizado (cyan)
  - Tooltips informativos con formato de moneda
  - Grid cartesiano con líneas punteadas
  - Eje X muestra día de la semana + número
  - Eje Y con escala automática

#### Gráfico Circular - Estados de Pedidos
- **Tipo:** PieChart con sectores coloreados
- **Datos:** Distribución de pedidos por estado
- **Categorías:**
  - Pendientes (amarillo)
  - En Proceso (azul)
  - Completados (verde)
- **Features:**
  - Porcentajes en cada sector
  - Leyenda inferior
  - Colores semánticos por estado

#### Gráfico de Barras - Ingresos Mensuales
- **Tipo:** BarChart con barras múltiples
- **Datos:** Últimos 6 meses
- **Series:**
  - Ingresos en € (cyan)
  - Número de pedidos (morado)
- **Features:**
  - Barras con bordes redondeados
  - Leyenda descriptiva
  - Doble eje Y (implícito)

#### Gráfico de Línea - Pedidos Diarios
- **Tipo:** LineChart con puntos
- **Datos:** Últimos 7 días de pedidos
- **Features:**
  - Línea suave (type="monotone")
  - Puntos destacados en cada día
  - Tooltips con fecha completa

### 2. Tarjetas de Métricas Principales

**4 KPI Cards con gradientes:**
1. **Ingresos Totales** (cyan gradient)
   - Total histórico
   - Ícono: 💰

2. **Período Actual** (green gradient)
   - Según filtro seleccionado
   - Porcentaje del total

3. **Total Pedidos** (purple gradient)
   - Contador total
   - Pedidos pendientes

4. **Ticket Promedio** (orange gradient)
   - Valor medio por pedido
   - Calculado en tiempo real

### 3. Filtros Temporales

**Botones de rango de tiempo:**
- Hoy
- 7 días
- Mes
- Año

**Funcionalidad:**
- Actualiza todas las métricas
- No afecta gráficos históricos
- Interfaz intuitiva con estados activos

### 4. Top 5 Productos

**Visualización:**
- Ranking numerado (1-5)
- Barra de progreso visual
- Ingresos y unidades vendidas
- Gradiente cyan-purple en barras

### 5. Integración con Dashboard Existente

**Banner promocional en AdminDashboard:**
- Diseño gradient (cyan-purple-pink)
- Call-to-action destacado
- Link al nuevo dashboard
- Visible en accesos rápidos con badge "NUEVO"

## Estructura de Archivos

### Componentes Nuevos

#### `src/components/admin/SalesDashboardWithCharts.tsx`
Componente principal con todos los gráficos:
```typescript
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
```

**Gráficos incluidos:**
- AreaChart para ingresos diarios
- PieChart para estados de pedidos
- BarChart para ingresos mensuales
- LineChart para pedidos diarios

#### `src/pages/admin/dashboard-ventas.astro`
Página del nuevo dashboard:
```astro
<BaseLayout title="Dashboard de Ventas - Admin">
  <RequireAdmin client:load>
    <SalesDashboardWithCharts client:load />
  </RequireAdmin>
</BaseLayout>
```

### Modificaciones

#### `src/components/admin/AdminDashboard.tsx`
- Agregado banner promocional para el nuevo dashboard
- Nuevo acceso rápido con badge "NUEVO"
- Diseño destacado con gradient

## Dependencia: Recharts

### Instalación
```bash
npm install recharts
```

### Tamaño del Bundle
- **Comprimido:** ~116 KB (gzip)
- **Sin comprimir:** ~396 KB
- **Justificación:** Librería especializada con componentes optimizados

### Componentes Usados
```typescript
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
```

## Paleta de Colores

```typescript
const COLORS = {
  primary: '#06b6d4',    // cyan-500
  secondary: '#8b5cf6',  // purple-500
  success: '#10b981',    // green-500
  warning: '#f59e0b',    // amber-500
  danger: '#ef4444',     // red-500
  pending: '#eab308',    // yellow-500
  processing: '#3b82f6', // blue-500
  completed: '#10b981',  // green-500
};
```

## Características Técnicas

### Performance
- **Renderizado responsivo:** ResponsiveContainer ajusta automáticamente
- **Lazy loading:** Componente carga solo cuando se visita la página
- **Límite de datos:** Últimos 500 pedidos para cálculos
- **Caching:** Firebase SDK cachea consultas

### Responsividad
- Grid adaptativo (cols-1 md:cols-2)
- Gráficos fluid-width con ResponsiveContainer
- Altura fija por gráfico (300-350px)
- Mobile-first design

### Accesibilidad
- Tooltips descriptivos
- Colores con suficiente contraste
- Etiquetas legibles en gráficos
- Leyendas claras

## Análisis de Datos

### Fuente de Datos
**Firestore Collections:**
- `orders` - Pedidos con detalles
- `products` - Catálogo de productos

### Métricas Calculadas

**Ingresos:**
```typescript
totalRevenue = Σ(order.total) // Todos los pedidos
todayRevenue = Σ(order.total WHERE createdAt >= today)
monthRevenue = Σ(order.total WHERE createdAt >= monthStart)
yearRevenue = Σ(order.total WHERE createdAt >= yearStart)
```

**Pedidos por Estado:**
```typescript
pendingOrders = COUNT(order WHERE status === 'pending')
processingOrders = COUNT(order WHERE status === 'processing')
completedOrders = COUNT(order WHERE status === 'completed' OR 'delivered')
```

**Top Productos:**
```typescript
productSales[productId].sales += item.quantity
productSales[productId].revenue += item.price * item.quantity
topProducts = SORT_DESC(productSales BY revenue).LIMIT(5)
```

**Ventas Diarias:**
```typescript
dailyOrders[date].count++
dailyOrders[date].revenue += order.total
```

**Ventas Mensuales:**
```typescript
monthlyOrders[monthKey].revenue += order.total
monthlyOrders[monthKey].orders++
```

## Uso

### Acceso
1. **Desde Dashboard Principal:** Click en banner o card "Gráficos"
2. **URL Directa:** `/admin/dashboard-ventas`
3. **Requiere:** Autenticación de admin

### Navegación
- Botones de filtro temporal en la parte superior
- Botón "Actualizar" recarga datos en tiempo real
- Gráficos son estáticos (no interactivos más allá de tooltips)

### Interpretación

**Gráfico de Área (Ingresos):**
- Picos = días con más ventas
- Tendencia = crecimiento o declive
- Hover = valor exacto + fecha

**Gráfico Circular (Estados):**
- Sectores grandes = más pedidos en ese estado
- Porcentajes = distribución relativa
- Colores = estado semántico

**Gráfico de Barras (Mensual):**
- Barras azules = ingresos
- Barras moradas = cantidad de pedidos
- Comparación mes a mes

**Gráfico de Línea (Pedidos):**
- Puntos = pedidos en cada día
- Línea = tendencia semanal
- Útil para detectar patrones

## Próximas Mejoras

### Funcionalidades Avanzadas
1. **Exportar datos** a CSV/Excel
2. **Comparación de períodos** (mes actual vs anterior)
3. **Filtro por categoría** de producto
4. **Gráfico de embudo** de conversión
5. **Predicción de ventas** (ML básico)

### Optimizaciones
1. **Server-side rendering** de estadísticas
2. **Caching con Redis** para métricas
3. **Actualización en tiempo real** con Firestore listeners
4. **Paginación** para grandes volúmenes de datos
5. **Web Workers** para cálculos pesados

### UX Improvements
1. **Modo oscuro** para gráficos
2. **Compartir dashboard** vía link
3. **Personalizar gráficos** (mostrar/ocultar)
4. **Alertas automáticas** por caídas de ventas
5. **Dashboard personalizable** con drag & drop

## Build Status

✅ **Build successful**
- No errors
- No warnings (excepto chunk size de test-3d-mug)
- Recharts correctamente integrado
- Todos los gráficos funcionando

## Testing

### Casos de Prueba Manual
1. **Sin datos:**
   - ✅ Muestra mensajes "No hay datos"
   - ✅ No rompe la UI

2. **Con 1 pedido:**
   - ✅ Gráficos muestran un solo punto
   - ✅ Porcentajes = 100%

3. **Con 100+ pedidos:**
   - ✅ Gráficos escalan correctamente
   - ✅ Performance aceptable (<2s carga)

4. **Filtros temporales:**
   - ✅ Actualizan métricas correctamente
   - ✅ No rompen gráficos históricos

5. **Responsividad:**
   - ✅ Mobile: gráficos apilados
   - ✅ Tablet: grid 2 columnas
   - ✅ Desktop: layout completo

## Documentación Recharts

**Oficial:** https://recharts.org/

**Componentes usados:**
- [ResponsiveContainer](https://recharts.org/en-US/api/ResponsiveContainer)
- [AreaChart](https://recharts.org/en-US/api/AreaChart)
- [LineChart](https://recharts.org/en-US/api/LineChart)
- [BarChart](https://recharts.org/en-US/api/BarChart)
- [PieChart](https://recharts.org/en-US/api/PieChart)

## Notas de Implementación

### Decisiones de Diseño
1. **Recharts vs Chart.js:** Recharts elegido por:
   - Componentes React nativos
   - Mejor TypeScript support
   - API declarativa
   - Más ligero que Chart.js con plugins

2. **Datos en memoria vs API:**
   - Elegido: Carga en memoria
   - Razón: Dashboard cambia raramente, no justifica API separada

3. **Límite de 500 pedidos:**
   - Balance entre precisión y performance
   - Escalable con paginación futura

### Problemas Conocidos
1. **Formato de fechas:** Locale español puede no funcionar en todos navegadores
2. **Tamaño del bundle:** Recharts añade ~116KB (justificado por funcionalidad)
3. **Datos históricos limitados:** Solo últimos 500 pedidos cargados

---

**Implementado:** 2025-11-27
**Desarrollador:** Claude Code
**Estado:** ✅ Completo y probado
**Página:** `/admin/dashboard-ventas`
**Bundle:** +116KB gzip (Recharts)
