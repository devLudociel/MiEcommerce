# 🚀 Guía Rápida: Cómo Crear Productos

## 📋 Resumen del Sistema

Tu tienda ahora tiene **3 niveles de organización**:

1. **Categoría** (obligatorio) → Grupo principal
2. **Subcategoría** (opcional) → Grupo específico dentro de la categoría
3. **Tags** (recomendado) → Características y tipos del producto

---

## ✅ Ejemplo Práctico: Camiseta

### Paso 1: Ve al Admin Panel
- URL: `http://localhost:4321/admin/products`
- Click en **"Nuevo Producto"**

### Paso 2: Completa los campos básicos
- **Nombre**: Camiseta Básica Blanca
- **Slug**: camiseta-basica-blanca
- **Precio base**: 15.99
- **Descripción**: Camiseta de algodón 100% personalizable

### Paso 3: Selecciona Categoría
- **Categoría**: Productos Textiles (se guardará `category: 'textiles'`)
- **Subcategoría**: Ropa Personalizada (se guardará `subcategory: 'ropa-personalizada'`)

### Paso 4: Añade Tags
- **Tags**: `camisetas, ropa, algodon, personalizable, regalo`

### Paso 5: Sube imágenes y guarda

---

## 📍 Dónde Aparecerá Este Producto

Con la configuración del ejemplo anterior, la camiseta aparecerá en:

✅ `/categoria/textiles` (por category)
✅ `/categoria/textiles/ropa-personalizada` (por category + subcategory)
✅ Búsqueda de "camiseta" (por name + tags)
✅ Búsqueda de "ropa" (por tags)
✅ Búsqueda de "algodón" (por tags)

---

## 🗂️ Categorías y Subcategorías Disponibles

### 📦 Productos Textiles (textiles)
- Ropa Personalizada
- Complementos Textiles

### 🎨 Productos Sublimados (sublimados)
- Vajilla Personalizada
- Decoración Sublimada

### ⚡ Corte y Grabado Láser (corte-grabado)
- Llaveros Personalizados
- Decoración en Madera
- Cuadros de Madera

### 🖨️ Impresión 3D (impresion-3d)
- Impresión en Resina
- Impresión en Filamento

### 🖼️ Productos Gráficos (graficos-impresos)
- Tarjetas de Visita
- Etiquetas y Pegatinas
- Carteles para Eventos

### 📝 Productos de Papelería (papeleria)
- Cuadernos y Libretas
- Packaging Corporativo

### 🎉 Eventos y Celebraciones (eventos)
- Packaging para Eventos

### 💻 Servicios Digitales (servicios-digitales)
- Diseño Gráfico
- Desarrollo Web

---

## 🏷️ Tags Recomendados

### Para Textiles
`camisetas`, `sudaderas`, `polos`, `gorras`, `mochilas`, `bolsas`, `toallas`, `ropa`, `bordado`, `estampado`, `personalizable`

### Para Sublimados
`tazas`, `termos`, `vasos`, `botellas`, `platos`, `cocina`, `hogar`, `oficina`, `personalizable`, `regalo`

### Para Corte y Grabado
`llaveros`, `cuadros`, `señales`, `letras`, `decoracion`, `madera`, `metacrilato`, `metal`, `grabado`, `corte`

### Para Impresión 3D
`figuras`, `bustos`, `miniaturas`, `prototipos`, `resina`, `filamento`, `pla`, `petg`, `personalizable`

---

## ⚠️ Errores Comunes y Soluciones

### ❌ "No aparece en /categoria/textiles"
**Causa**: No seleccionaste la categoría correcta
**Solución**:
1. Edita el producto
2. Selecciona "Productos Textiles" en el campo Categoría
3. Guarda

### ❌ "No aparece en /categoria/textiles/ropa-personalizada"
**Causa**: No seleccionaste la subcategoría
**Solución**:
1. Edita el producto
2. Primero selecciona la categoría "Productos Textiles"
3. Luego selecciona "Ropa Personalizada" en Subcategoría
4. Guarda

### ❌ "No encuentro el producto buscando 'camiseta'"
**Causa**: No añadiste el tag "camisetas"
**Solución**:
1. Edita el producto
2. En el campo Tags añade: `camisetas, ropa, personalizable`
3. Guarda

---

## 💡 Mejores Prácticas

### ✅ HACER
1. **Usar categoría siempre**: Nunca dejes la categoría vacía
2. **Añadir múltiples tags**: Cuantos más tags, más fácil encontrar
3. **Usar subcategoría cuando sea relevante**: Si el producto encaja bien en una subcategoría
4. **Mantener consistencia**: Usa los mismos tags para productos similares
   - Ejemplo: Todas las camisetas deben tener el tag "camisetas"

### ❌ NO HACER
1. **No mezclar conceptos**: La categoría NO es un tag
   - ❌ Mal: Category = "camisetas" (camisetas es un tag)
   - ✅ Bien: Category = "textiles", Tags = "camisetas"

2. **No duplicar información**: Si ya está en el nombre, no hace falta en tags
   - ❌ Mal: Nombre = "Camiseta Roja", Tags = "camiseta, roja"
   - ✅ Bien: Nombre = "Camiseta Roja", Tags = "ropa, personalizable, algodon"

3. **No usar tags genéricos**: Sé específico
   - ❌ Mal: Tags = "producto, nuevo, venta"
   - ✅ Bien: Tags = "camisetas, algodon, unisex, personalizable"

---

## 🔍 Cómo Verificar que Funciona

### 1. Crear un producto de prueba
```
Nombre: Camiseta Test
Category: Productos Textiles → textiles
Subcategory: Ropa Personalizada → ropa-personalizada
Tags: camisetas, test, ropa
```

### 2. Verificar URLs
- ✅ Visita: `http://localhost:4321/categoria/textiles`
  - Debe aparecer tu camiseta

- ✅ Visita: `http://localhost:4321/categoria/textiles/ropa-personalizada`
  - Debe aparecer tu camiseta

### 3. Verificar Búsqueda
- ✅ Busca: "camiseta"
  - Debe aparecer tu producto

- ✅ Busca: "test"
  - Debe aparecer tu producto

### 4. Ver logs en consola
- Abre la consola del navegador (F12)
- Visita una categoría
- Deberías ver:
```
🔍 Buscando productos para:
  Category slug: textiles
📦 Productos encontrados: X
  - Camiseta Test | category: textiles | subcategory: ropa-personalizada
```

---

## 📊 Tabla de Referencia Rápida

| Producto | Category | Subcategory | Tags Recomendados |
|----------|----------|-------------|-------------------|
| Camiseta | textiles | ropa-personalizada | camisetas, ropa, algodon |
| Taza | sublimados | vajilla-personalizada | tazas, cocina, regalo |
| Llavero | corte-grabado | llaveros | llaveros, madera, metal |
| Figura | impresion-3d | impresion-resina | figuras, resina, personalizable |
| Tarjeta de visita | graficos-impresos | tarjetas-visita | tarjetas, corporativo, impresion |

---

**Última actualización**: 2025-11-28
**Versión**: 2.0
**Estado**: ✅ Sistema completo con categorías, subcategorías y tags
