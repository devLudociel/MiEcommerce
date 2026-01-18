# Filtros de Categoría - Optimización Completa

## Problema Anterior

### ❌ Sistema Antiguo (CategoryPage.tsx)

**Problemas identificados**:

1. **Filtros hardcodeados** (líneas 67-96):
```typescript
const attributes = [
  { id: '1', name: 'Forma', options: [{ value: 'Standard' }, { value: 'Cuadrada' }] },
  { id: '2', name: 'Acabado', options: [{ value: 'Mate' }, { value: 'Brillo' }] },
  // ... 9 atributos más que probablemente no existen en tus productos
];
```

2. **Filtros irrelevantes**:
   - Aparecían siempre, aunque no hubiera productos
   - No estaban basados en datos reales de Firebase
   - Confundían al usuario

3. **UI compleja innecesariamente**:
   - Demasiados campos de filtro
   - No responsive en móvil
   - Difícil de usar

---

## ✅ Solución Implementada

### Nuevo Sistema (CategoryPageOptimized.tsx)

## 🎯 Características Principales

### 1. Filtros Dinámicos

**Tags extraídos automáticamente** de los productos:
```typescript
const availableTags = useMemo(() => {
  const allTags = new Set<string>();
  products.forEach((product) => {
    if (product.tags && Array.isArray(product.tags)) {
      product.tags.forEach((tag) => {
        if (tag && typeof tag === 'string') {
          allTags.add(tag);
        }
      });
    }
  });
  return Array.from(allTags).sort();
}, [products]);
```

**Beneficios**:
- ✅ Solo muestra tags que SÍ existen
- ✅ Se actualiza automáticamente
- ✅ No hay filtros vacíos

### 2. Rango de Precio Real

**Calculado dinámicamente**:
```typescript
const realPriceRange = useMemo<[number, number]>(() => {
  if (products.length === 0) return [0, 1000];
  const prices = products.map((p) => p.basePrice);
  return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
}, [products]);
```

**Beneficios**:
- ✅ Basado en precios reales de productos
- ✅ Se ajusta automáticamente
- ✅ Siempre relevante

### 3. Filtros Simplificados

**Solo 4 filtros esenciales**:

1. **Ordenar por**:
   - Destacados
   - Precio: Menor a Mayor
   - Precio: Mayor a Menor
   - Nombre A-Z

2. **Rango de Precio**:
   - Slider dinámico
   - Basado en precios reales

3. **Solo Ofertas**:
   - Checkbox simple
   - Muestra solo productos con descuento

4. **Tags**:
   - Extraídos de productos reales
   - Botones con estado visual
   - Multi-selección

### 4. Responsive Móvil

**Botón de filtros en móvil**:
```typescript
<button onClick={() => setShowMobileFilters(!showMobileFilters)}>
  Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
</button>
```

**Beneficios**:
- ✅ Ocul los filtros en móvil por defecto
- ✅ Muestra contador de filtros activos
- ✅ Animación suave al abrir/cerrar

### 5. Sticky Filters (Desktop)

**Panel fijo al hacer scroll**:
```css
position: sticky;
top: 220px;
```

**Beneficios**:
- ✅ Filtros siempre visibles
- ✅ Fácil acceso durante navegación
- ✅ Mejor UX

---

## 📊 Comparación Antes vs Después

| Característica | Antes ❌ | Después ✅ |
|----------------|----------|------------|
| **Filtros mostrados** | 9 atributos hardcodeados | Solo tags reales |
| **Rango de precio** | 0-1000 (fijo) | Dinámico según productos |
| **Filtros vacíos** | Sí, muchos | No, solo relevantes |
| **Responsive móvil** | Mal | Excelente con toggle |
| **UX** | Confusa | Simple e intuitiva |
| **Performance** | Regular | Optimizado con useMemo |
| **Mantenimiento** | Difícil (hardcoded) | Fácil (automático) |

---

## 🎨 Diseño Mejorado

### Panel de Filtros

```
┌─────────────────────────────┐
│ Filtros      Limpiar (2)    │  ← Header con contador
├─────────────────────────────┤
│ Ordenar por                 │
│ [Destacados ▼]              │  ← Dropdown simple
├─────────────────────────────┤
│ Precio: €10 - €50           │
│ ═══════○══════              │  ← Slider dinámico
│ €10           €50           │
├─────────────────────────────┤
│ ☑ Solo ofertas              │  ← Checkbox simple
├─────────────────────────────┤
│ Etiquetas (5)               │
│ [personalizado] [regalo]    │  ← Pills interactivos
│ [premium] [nuevo]           │
└─────────────────────────────┘
```

### Móvil

```
┌───────────────────────┐
│ [Filtros (2) ▼]       │  ← Botón expandible
└───────────────────────┘

Cuando se expande:
┌───────────────────────┐
│ Filtros    Limpiar    │
│ [Ordenar por...]      │
│ [Precio...]           │
│ [☑ Solo ofertas]      │
│ [Tags...]             │
└───────────────────────┘
```

---

## 🚀 Funcionalidades Nuevas

### 1. Contador de Filtros Activos

```typescript
const activeFiltersCount = filters.tags.length + (filters.onSale ? 1 : 0);
```

**Muestra**: "Filtros (3)" cuando hay 3 filtros activos

### 2. Estado Visual de Tags

**Tags seleccionados**:
- ✅ Borde cyan
- ✅ Fondo cyan claro
- ✅ Texto cyan oscuro
- ✅ Fuente bold

**Tags no seleccionados**:
- Borde gris
- Fondo blanco
- Texto gris

### 3. Mensaje Sin Resultados

**Si no hay productos con los filtros**:
```
┌──────────────────────────────────┐
│ No se encontraron productos      │
│ con estos filtros                │
│                                  │
│ [Limpiar filtros]                │
└──────────────────────────────────┘
```

### 4. Loading State

```
┌──────────────────────────────────┐
│         ⏳                        │
│ Cargando productos...            │
└──────────────────────────────────┘
```

---

## 💡 Cómo Funciona

### Flujo de Filtrado

```
Usuario entra a categoría
        ↓
Sistema carga productos de Firebase
        ↓
Extrae tags únicos automáticamente
        ↓
Calcula rango de precio real
        ↓
Muestra solo filtros relevantes
        ↓
Usuario aplica filtros
        ↓
Re-filtra en tiempo real
        ↓
Muestra resultados actualizados
```

### Ejemplo Práctico

**URL**: `/categoria/corte-grabado/llaveros`

**Sistema carga**:
1. Categoría: "Corte y Grabado Láser" (id: '5')
2. Subcategoría: "Llaveros Personalizados" (id: '10')
3. Productos con `categoryId='5'` y `subcategoryId='10'`

**Extrae automáticamente**:
- Tags: ["personalizado", "madera", "metal", "regalo", "empresas"]
- Precio mínimo: €3
- Precio máximo: €15

**Muestra filtros**:
```
Ordenar por: [Destacados ▼]
Precio: €3 - €15  [═══○═══]
☑ Solo ofertas
Tags: [personalizado] [madera] [metal] [regalo] [empresas]
```

---

## 📝 Archivos Modificados

### Nuevo Archivo Creado

**`src/components/pages/CategoryPageOptimized.tsx`**
- Sistema de filtros completamente nuevo
- Dinámico y basado en productos reales
- Responsive y optimizado

### Archivo Actualizado

**`src/pages/categoria/[...slug].astro`**
```diff
- import CategoryPage from '../../components/pages/CategoryPage';
+ import CategoryPageOptimized from '../../components/pages/CategoryPageOptimized';

- <CategoryPage categorySlug={categorySlug} subcategorySlug={subcategorySlug} client:load />
+ <CategoryPageOptimized categorySlug={categorySlug} subcategorySlug={subcategorySlug} client:load />
```

---

## 🎯 Mejoras de UX

### Antes
1. Usuario ve 9 filtros
2. La mayoría están vacíos
3. No sabe cuáles usar
4. Se frustra y se va

### Después
1. Usuario ve solo filtros relevantes
2. Todos tienen productos
3. Sabe exactamente qué buscar
4. Encuentra lo que necesita rápidamente

---

## 📱 Responsive Design

### Desktop (lg: >1024px)
- ✅ Filtros en sidebar izquierdo
- ✅ Sticky al hacer scroll
- ✅ Siempre visible
- ✅ Layout 1/4 + 3/4

### Mobile (< 1024px)
- ✅ Filtros ocultos por defecto
- ✅ Botón toggle con contador
- ✅ Panel expandible
- ✅ Layout 100% width

---

## 🔧 Performance

### Optimizaciones Implementadas

1. **useMemo para tags**:
```typescript
const availableTags = useMemo(() => {
  // ... extracción de tags
}, [products]);
```

2. **useMemo para precio**:
```typescript
const realPriceRange = useMemo(() => {
  // ... cálculo de rango
}, [products]);
```

3. **useMemo para filtrado**:
```typescript
const filteredProducts = useMemo(() => {
  // ... filtrado y ordenamiento
}, [products, filters]);
```

**Beneficio**: Re-cálculos solo cuando cambian las dependencias

---

## ✨ Próximas Mejoras Recomendadas

1. **Filtros en URL**:
   - Guardar estado en query params
   - Compartir URLs con filtros
   - Bookmark de búsquedas

2. **Historial de Filtros**:
   - Recordar filtros del usuario
   - Sugerencias basadas en historial

3. **Filtros Avanzados**:
   - Por color (si aplica)
   - Por tamaño (si aplica)
   - Por material (dinámico)

4. **Búsqueda Dentro de Categoría**:
   - Input de búsqueda
   - Filtro por nombre/descripción

---

**Fecha**: 2025-11-28
**Versión**: 1.0
**Estado**: ✅ Implementado y optimizado
