# ✅ Sistema FINAL de Categorías - Simplificado

## 🎯 Concepto Final (SIMPLE)

El sistema ahora usa **SOLO las categorías del navbar** (hardcodeadas).

**NO más confusión** entre categorías de Firebase vs categorías del navbar.

---

## 📊 Estructura de Productos

Cada producto tiene **3 campos principales**:

### 1. **category** (slug de categoría) - OBLIGATORIO
- Ejemplos: `graficos-impresos`, `textiles`, `sublimados`, `corte-grabado`, `impresion-3d`
- Determina la URL: `/categoria/{category}`

### 2. **subcategory** (slug de subcategoría) - OPCIONAL
- Ejemplos: `tarjetas-visita`, `ropa-personalizada`, `llaveros`, `impresion-resina`
- Determina la URL: `/categoria/{category}/{subcategory}`

### 3. **tags** (array de strings) - RECOMENDADO
- Ejemplos: `['camisetas', 'ropa', 'personalizable']`
- Para búsquedas y filtros adicionales

---

## 🗂️ Categorías Disponibles (del Navbar)

| ID | Nombre | Slug |
|----|--------|------|
| 1 | Productos Gráficos | `graficos-impresos` |
| 2 | Productos Textiles | `textiles` |
| 3 | Productos de Papelería | `papeleria` |
| 4 | Productos Sublimados | `sublimados` |
| 5 | Corte y Grabado Láser | `corte-grabado` |
| 6 | Eventos y Celebraciones | `eventos` |
| 7 | Impresión 3D | `impresion-3d` |
| 8 | Servicios Digitales | `servicios-digitales` |

---

## 📁 Subcategorías por Categoría

### Productos Gráficos (ID: 1)
- Tarjetas de Visita → `tarjetas-visita`
- Etiquetas y Pegatinas → `etiquetas-pegatinas`
- Carteles para Eventos → `carteles-eventos`

### Productos Textiles (ID: 2)
- Ropa Personalizada → `ropa-personalizada`
- Complementos Textiles → `complementos-textiles`

### Productos de Papelería (ID: 3)
- Cuadernos y Libretas → `cuadernos-libretas`
- Packaging Corporativo → `packaging-corporativo`

### Productos Sublimados (ID: 4)
- Vajilla Personalizada → `vajilla-personalizada`
- Decoración Sublimada → `decoracion-sublimada`

### Corte y Grabado Láser (ID: 5)
- Llaveros Personalizados → `llaveros`
- Decoración en Madera → `decoracion-madera-eventos`
- Cuadros de Madera → `cuadros-madera`

### Eventos y Celebraciones (ID: 6)
- Packaging para Eventos → `packaging-eventos`

### Impresión 3D (ID: 7)
- Impresión en Resina → `impresion-resina`
- Impresión en Filamento → `impresion-filamento`

### Servicios Digitales (ID: 8)
- Diseño Gráfico → `diseno-grafico`
- Desarrollo Web → `desarrollo-web`

---

## ✅ Ejemplo Completo: Tarjeta de Visita

### En el Admin Panel

1. **Nombre**: Tarjetas de Visita Premium
2. **Slug**: tarjetas-visita-premium
3. **Categoría**: Productos Gráficos
4. **Subcategoría**: Tarjetas de Visita
5. **Tags**: `tarjetas, corporativo, impresion, negocios`

### Campos Guardados en Firebase

```json
{
  "name": "Tarjetas de Visita Premium",
  "slug": "tarjetas-visita-premium",
  "categoryId": "1",
  "category": "graficos-impresos",          // ← Se guarda automáticamente
  "subcategoryId": "1",
  "subcategory": "tarjetas-visita",         // ← Se guarda automáticamente
  "tags": ["tarjetas", "corporativo", "impresion", "negocios"],
  "basePrice": 15.99,
  "active": true
}
```

### Dónde Aparece

- ✅ `/categoria/graficos-impresos` (por category)
- ✅ `/categoria/graficos-impresos/tarjetas-visita` (por category + subcategory)
- ✅ Búsqueda de "tarjetas" (por name + tags)
- ✅ Búsqueda de "corporativo" (por tags)

---

## ✅ Ejemplo Completo: Camiseta

### En el Admin Panel

1. **Nombre**: Camiseta Básica Blanca
2. **Slug**: camiseta-basica-blanca
3. **Categoría**: Productos Textiles
4. **Subcategoría**: Ropa Personalizada
5. **Tags**: `camisetas, ropa, algodon, personalizable`

### Campos Guardados en Firebase

```json
{
  "name": "Camiseta Básica Blanca",
  "slug": "camiseta-basica-blanca",
  "categoryId": "2",
  "category": "textiles",                    // ← Se guarda automáticamente
  "subcategoryId": "4",
  "subcategory": "ropa-personalizada",       // ← Se guarda automáticamente
  "tags": ["camisetas", "ropa", "algodon", "personalizable"],
  "basePrice": 15.99,
  "active": true
}
```

### Dónde Aparece

- ✅ `/categoria/textiles` (por category)
- ✅ `/categoria/textiles/ropa-personalizada` (por category + subcategory)
- ✅ Búsqueda de "camiseta" (por name + tags)
- ✅ Búsqueda de "ropa" (por tags)
- ✅ Búsqueda de "algodón" (por tags)

---

## ✅ Ejemplo Completo: Llavero

### En el Admin Panel

1. **Nombre**: Llavero Madera Personalizado
2. **Slug**: llavero-madera-personalizado
3. **Categoría**: Corte y Grabado Láser
4. **Subcategoría**: Llaveros Personalizados
5. **Tags**: `llaveros, madera, grabado, personalizable`

### Campos Guardados en Firebase

```json
{
  "name": "Llavero Madera Personalizado",
  "slug": "llavero-madera-personalizado",
  "categoryId": "5",
  "category": "corte-grabado",               // ← Se guarda automáticamente
  "subcategoryId": "10",
  "subcategory": "llaveros",                 // ← Se guarda automáticamente
  "tags": ["llaveros", "madera", "grabado", "personalizable"],
  "basePrice": 5.99,
  "active": true
}
```

### Dónde Aparece

- ✅ `/categoria/corte-grabado` (por category)
- ✅ `/categoria/corte-grabado/llaveros` (por category + subcategory)
- ✅ Búsqueda de "llavero" (por name + tags)
- ✅ Búsqueda de "madera" (por tags)

---

## 🚀 Cómo Crear un Producto Paso a Paso

### Paso 1: Ir al Admin Panel
```
http://localhost:4321/admin/products
```

### Paso 2: Click "Nuevo Producto"

### Paso 3: Completar Información Básica
- **Nombre**: El nombre del producto
- **Slug**: URL amigable (se auto-genera)
- **Precio base**: Precio en euros

### Paso 4: Seleccionar Categoría
- Elige la categoría principal del navbar
- **Ejemplo**: "Productos Textiles"
- **Se guardará**: `category: 'textiles'`

### Paso 5: Seleccionar Subcategoría (opcional)
- El selector se activa automáticamente según la categoría
- **Ejemplo**: "Ropa Personalizada"
- **Se guardará**: `subcategory: 'ropa-personalizada'`

### Paso 6: Añadir Tags
- Tipos de producto, características, etc.
- Separados por comas
- **Ejemplo**: `camisetas, ropa, algodon, personalizable`

### Paso 7: Subir imágenes y guardar

---

## 🔍 Verificar que Funciona

### 1. Crear producto de prueba
```
Nombre: Producto Test
Category: Productos Textiles
Subcategory: Ropa Personalizada
Tags: test, prueba
```

### 2. Visitar URLs
```
✅ http://localhost:4321/categoria/textiles
   → Debe aparecer "Producto Test"

✅ http://localhost:4321/categoria/textiles/ropa-personalizada
   → Debe aparecer "Producto Test"
```

### 3. Ver console logs (F12)
```
🔍 Buscando productos para:
  Category slug: textiles
  Subcategory slug: ropa-personalizada
📦 Productos encontrados: 1
  - Producto Test | category: textiles | subcategory: ropa-personalizada
```

---

## ⚠️ Errores Comunes

### ❌ "No aparece en /categoria/textiles"
**Solución**: Verifica que seleccionaste "Productos Textiles" en el campo Categoría

### ❌ "No aparece en /categoria/textiles/ropa-personalizada"
**Solución**: Verifica que seleccionaste "Ropa Personalizada" en el campo Subcategoría

### ❌ "Aparece en textiles pero no en productos?category=camisetas"
**Explicación**: Los URLs son diferentes:
- `/categoria/textiles` → Categoría del navbar (usa campo `category`)
- `/productos?category=camisetas` → Filtro dinámico (NO soportado actualmente, usar tags en su lugar)

---

## 💡 Mejores Prácticas

### ✅ HACER
1. **Siempre selecciona una categoría** del navbar
2. **Usa subcategoría** si el producto encaja bien
3. **Añade tags específicos** para búsquedas
4. **Mantén consistencia** en los tags

### ❌ NO HACER
1. **No dejes categoría vacía**
2. **No confundas tags con categorías**
3. **No uses tags genéricos** como "producto" o "venta"

---

## 📊 Tabla de Referencia Rápida

| Producto | Category | Subcategory | Tags |
|----------|----------|-------------|------|
| Tarjeta de visita | graficos-impresos | tarjetas-visita | tarjetas, corporativo |
| Camiseta | textiles | ropa-personalizada | camisetas, ropa, algodon |
| Taza | sublimados | vajilla-personalizada | tazas, cocina, regalo |
| Llavero | corte-grabado | llaveros | llaveros, madera, metal |
| Figura resina | impresion-3d | impresion-resina | figuras, resina, personalizable |

---

**Fecha**: 2025-11-28
**Versión**: FINAL 3.0
**Estado**: ✅ Sistema simplificado y funcional
