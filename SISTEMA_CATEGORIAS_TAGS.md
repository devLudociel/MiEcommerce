# Sistema de Categorías y Tags - Guía Completa

## 📋 Resumen

Este documento explica cómo funciona el sistema de organización de productos usando **Categorías** y **Tags**.

---

## 🎯 Conceptos Clave

### 1. **Categorías** (Category)
- **Qué son**: Grupos principales de productos
- **Ejemplos**: textiles, sublimados, resina, corte-grabado, marcos
- **Campo en Firebase**: `category` (string)
- **Uso**: Determina en qué página de categoría aparece el producto
- **URL**: `/categoria/{category}`

### 2. **Tags** (Etiquetas)
- **Qué son**: Tipos específicos de producto o características
- **Ejemplos**: camisetas, tazas, llaveros, personalizable, regalo, madera, metal
- **Campo en Firebase**: `tags` (array de strings)
- **Uso**: Para búsquedas y filtros adicionales
- **URL**: Se pueden usar en búsquedas y filtros

---

## 📊 Estructura de Datos en Firebase

### Producto Ejemplo: Camiseta Personalizada

```json
{
  "id": "producto-001",
  "name": "Camiseta Básica Personalizable",
  "category": "textiles",           // ← Categoría principal
  "categoryId": "2",                 // ← ID de categoría (legacy)
  "tags": [                          // ← Tags/Etiquetas
    "camisetas",
    "ropa",
    "personalizable",
    "regalo"
  ],
  "basePrice": 15.99,
  "active": true,
  // ... otros campos
}
```

### Producto Ejemplo: Taza Sublimada

```json
{
  "id": "producto-002",
  "name": "Taza Cerámica 350ml",
  "category": "sublimados",          // ← Categoría principal
  "categoryId": "4",                 // ← ID de categoría (legacy)
  "tags": [                          // ← Tags/Etiquetas
    "tazas",
    "cocina",
    "regalo",
    "personalizable"
  ],
  "basePrice": 8.99,
  "active": true,
  // ... otros campos
}
```

---

## 🗂️ Categorías Disponibles

| Nombre                    | Slug             | ID  | Descripción                          |
|---------------------------|------------------|-----|--------------------------------------|
| Productos Textiles        | `textiles`       | 2   | Camisetas, sudaderas, bolsas, etc.   |
| Productos Sublimados      | `sublimados`     | 4   | Tazas, termos, vasos, etc.           |
| Corte y Grabado Láser     | `corte-grabado`  | 5   | Llaveros, cuadros de madera, etc.    |
| Impresión 3D              | `impresion-3d`   | 7   | Figuras de resina, filamento, etc.   |
| Productos Gráficos        | `graficos`       | 1   | Tarjetas, carteles, etiquetas, etc.  |
| Marcos                    | `marcos`         | -   | Cuadros decorativos                  |
| Resina                    | `resina`         | -   | Figuras personalizadas               |
| Otros                     | `otros`          | -   | Productos sin categoría específica   |

---

## 🏷️ Tags Recomendados por Categoría

### Textiles
- `camisetas`, `sudaderas`, `polos`, `gorras`, `mochilas`, `bolsas`, `toallas`
- `ropa`, `complementos`, `accesorios`
- `personalizable`, `bordado`, `estampado`

### Sublimados
- `tazas`, `termos`, `vasos`, `botellas`, `platos`
- `cocina`, `hogar`, `oficina`
- `personalizable`, `regalo`

### Corte y Grabado Láser
- `llaveros`, `cuadros`, `señales`, `letras`, `decoracion`
- `madera`, `metacrilato`, `metal`
- `personalizable`, `grabado`, `corte`

### Impresión 3D
- `figuras`, `bustos`, `miniaturas`, `prototipos`
- `resina`, `filamento`, `pla`, `petg`
- `personalizable`, `modelado`, `impresion`

---

## 📍 Cómo Funcionan las URLs

### 1. Páginas de Categoría
**URL**: `/categoria/{category}`
**Ejemplo**: `/categoria/textiles`
**Muestra**: Todos los productos con `category: 'textiles'`

```
Usuario visita: /categoria/textiles
          ↓
Sistema busca: products donde category == 'textiles'
          ↓
Muestra: Todas las camisetas, sudaderas, bolsas, etc.
```

### 2. Páginas de Subcategoría (Futuro)
**URL**: `/categoria/{category}/{subcategory}`
**Ejemplo**: `/categoria/textiles/ropa-personalizada`
**Muestra**: Productos con `category: 'textiles'` Y `subcategory: 'ropa-personalizada'`

*Nota: Por ahora, el campo subcategory está vacío. Se puede implementar más adelante.*

### 3. Página de Todos los Productos
**URL**: `/productos`
**Muestra**: Todos los productos activos
**Filtros**: Por categoría, precio, tags, etc.

---

## 🛠️ Cómo Crear/Editar Productos

### En el Panel de Admin

1. **Ve a** `/admin/products`
2. **Click en** "Nuevo Producto" o edita uno existente
3. **Selecciona la Categoría Principal**:
   - Ejemplo: "Productos Textiles"
   - Esto guardará automáticamente `category: 'textiles'`

4. **Añade Tags** (separados por comas):
   - Ejemplo: `camisetas, ropa, personalizable, regalo`
   - Esto guardará `tags: ['camisetas', 'ropa', 'personalizable', 'regalo']`

5. **Guarda el producto**

---

## ✅ Ejemplos Prácticos

### Ejemplo 1: Camiseta Básica

**Configuración**:
- **Nombre**: Camiseta Básica Blanca
- **Category**: Textiles
- **Tags**: `camisetas, ropa, algodon, basica`

**Dónde aparecerá**:
- ✅ `/categoria/textiles` (por category)
- ✅ Búsqueda de "camiseta" (por name + tags)
- ✅ Búsqueda de "ropa" (por tags)
- ✅ Filtro por tag "camisetas"

---

### Ejemplo 2: Taza Personalizada

**Configuración**:
- **Nombre**: Taza Mágica Personalizada
- **Category**: Sublimados
- **Tags**: `tazas, cocina, regalo, magica, personalizable`

**Dónde aparecerá**:
- ✅ `/categoria/sublimados` (por category)
- ✅ Búsqueda de "taza" (por name + tags)
- ✅ Búsqueda de "regalo" (por tags)
- ✅ Filtro por tag "tazas"

---

### Ejemplo 3: Llavero de Madera

**Configuración**:
- **Nombre**: Llavero Personalizado Madera
- **Category**: Corte y Grabado
- **Tags**: `llaveros, madera, grabado, personalizable`

**Dónde aparecerá**:
- ✅ `/categoria/corte-grabado` (por category)
- ✅ Búsqueda de "llavero" (por name + tags)
- ✅ Búsqueda de "madera" (por tags)
- ✅ Filtro por tag "llaveros"

---

## 🔍 Sistema de Búsqueda

La búsqueda encuentra productos que coincidan en:

1. **Nombre del producto** (normalizado, sin tildes, case-insensitive)
2. **Descripción** (normalizado)
3. **Tags** (array completo)
4. **Category** (campo category)

**Ejemplo de búsqueda**: "camiseta roja"
- Busca productos que contengan "camiseta" Y "roja" en cualquiera de los campos anteriores

---

## 📦 Filtros Dinámicos en Páginas de Categoría

Los filtros se generan automáticamente basándose en los productos reales:

### 1. **Tags Disponibles**
- Se extraen automáticamente de todos los productos de la categoría
- Solo muestra tags que existen

### 2. **Rango de Precio**
- Se calcula automáticamente el precio mínimo y máximo
- Basado en los productos reales

### 3. **Solo Ofertas**
- Filtra productos con `onSale: true`

---

## 🚨 Errores Comunes

### Problema: "No aparecen productos en /categoria/textiles"

**Posibles causas**:
1. ❌ El producto no tiene el campo `category` guardado
2. ❌ El campo `category` tiene un valor diferente (ej: "camisetas" en vez de "textiles")
3. ❌ El producto tiene `active: false`

**Solución**:
1. Abre el producto en el admin panel
2. Selecciona la categoría correcta ("Productos Textiles")
3. Guarda el producto
4. Verifica que aparezca en la consola del navegador cuando visites `/categoria/textiles`

---

### Problema: "Quiero que 'camisetas' sea una categoría"

**No es recomendable** porque:
- Las categorías son grupos amplios (textiles, sublimados, etc.)
- "Camisetas" es un tipo de producto dentro de "Textiles"
- Usa tags para tipos específicos

**Mejor solución**:
- **Category**: textiles
- **Tags**: camisetas, ropa, etc.

Si realmente necesitas subcategorías como "Ropa Personalizada", usa el campo `subcategory` (futuro).

---

## 💡 Mejores Prácticas

### ✅ Hacer

1. **Usa categorías amplias**: textiles, sublimados, resina
2. **Usa tags específicos**: camisetas, tazas, llaveros
3. **Añade múltiples tags**: Más tags = más fácil encontrar
4. **Usa tags descriptivos**: personalizable, regalo, madera, metal
5. **Mantén consistencia**: Usa los mismos tags para productos similares

### ❌ No Hacer

1. **No uses categorías muy específicas**: "camisetas-rojas-xl"
2. **No dupliques información**: Si ya está en el nombre, no hace falta en tags
3. **No uses tags genéricos sin sentido**: "producto", "nuevo"
4. **No mezcles categorías**: Un producto solo debe tener una categoría principal

---

## 🔮 Futuras Mejoras

1. **Subcategorías**: Añadir campo `subcategory` para filtrado más específico
2. **Tags sugeridos**: Sugerir tags basándose en productos existentes
3. **Filtro por tags en URL**: `/productos?tag=camisetas`
4. **Categorías anidadas**: Soporte para jerarquía de categorías

---

**Fecha**: 2025-11-28
**Versión**: 1.0
**Estado**: ✅ Implementado y documentado
