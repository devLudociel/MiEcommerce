# 🌐 Guía de URLs para Productos

## 📋 Resumen

Tu tienda ahora soporta **3 tipos de URLs** para acceder a productos:

1. **Por Categoría del Navbar** → `/categoria/{category}`
2. **Por Subcategoría** → `/categoria/{category}/{subcategory}`
3. **Por Tag (Tipo de Producto)** → `/productos?tag={tag}` ✨ NUEVO

---

## 🎯 Tipo 1: URLs por Categoría

### Formato
```
/categoria/{category}
```

### Ejemplos
| URL | Muestra |
|-----|---------|
| `/categoria/textiles` | Todos los productos textiles |
| `/categoria/sublimados` | Todos los productos sublimados |
| `/categoria/corte-grabado` | Todos los productos de corte láser |
| `/categoria/impresion-3d` | Todos los productos de impresión 3D |
| `/categoria/graficos-impresos` | Todos los productos gráficos |

### ¿Qué Campo Usa?
- Campo en Firebase: `category`
- Valor: El slug de la categoría (ej: `textiles`, `sublimados`)

---

## 🎯 Tipo 2: URLs por Subcategoría

### Formato
```
/categoria/{category}/{subcategory}
```

### Ejemplos
| URL | Muestra |
|-----|---------|
| `/categoria/textiles/ropa-personalizada` | Ropa personalizada textil |
| `/categoria/graficos-impresos/tarjetas-visita` | Tarjetas de visita |
| `/categoria/corte-grabado/llaveros` | Llaveros personalizados |
| `/categoria/impresion-3d/impresion-resina` | Figuras de resina |
| `/categoria/sublimados/vajilla-personalizada` | Tazas, vasos, platos |

### ¿Qué Campos Usa?
- Campos en Firebase: `category` + `subcategory`
- Valores: Los slugs (ej: `category: 'textiles'`, `subcategory: 'ropa-personalizada'`)

---

## 🎯 Tipo 3: URLs por Tag ✨ NUEVO

### Formato
```
/productos?tag={tag}
```

### Ejemplos
| URL | Muestra |
|-----|---------|
| `/productos?tag=camisetas` | Todos los productos con tag "camisetas" |
| `/productos?tag=tazas` | Todos los productos con tag "tazas" |
| `/productos?tag=llaveros` | Todos los productos con tag "llaveros" |
| `/productos?tag=figuras` | Todos los productos con tag "figuras" |
| `/productos?tag=personalizable` | Todos los productos personalizables |
| `/productos?tag=regalo` | Todos los productos para regalo |

### ¿Qué Campo Usa?
- Campo en Firebase: `tags` (array)
- Valor: Array de strings (ej: `['camisetas', 'ropa', 'algodon']`)

---

## ✅ Ejemplo Completo: Camiseta

### Configuración en Admin Panel
```
Nombre: Camiseta Básica Blanca
Category: Productos Textiles
Subcategory: Ropa Personalizada
Tags: camisetas, ropa, algodon, personalizable
```

### Campos Guardados en Firebase
```json
{
  "name": "Camiseta Básica Blanca",
  "category": "textiles",
  "subcategory": "ropa-personalizada",
  "tags": ["camisetas", "ropa", "algodon", "personalizable"]
}
```

### URLs donde Aparece
- ✅ `/categoria/textiles` (por category)
- ✅ `/categoria/textiles/ropa-personalizada` (por category + subcategory)
- ✅ `/productos?tag=camisetas` (por tag "camisetas")
- ✅ `/productos?tag=ropa` (por tag "ropa")
- ✅ `/productos?tag=algodon` (por tag "algodon")
- ✅ `/productos?tag=personalizable` (por tag "personalizable")

---

## ✅ Ejemplo Completo: Tarjeta de Visita

### Configuración en Admin Panel
```
Nombre: Tarjetas de Visita Premium
Category: Productos Gráficos
Subcategory: Tarjetas de Visita
Tags: tarjetas, corporativo, impresion, negocios
```

### Campos Guardados en Firebase
```json
{
  "name": "Tarjetas de Visita Premium",
  "category": "graficos-impresos",
  "subcategory": "tarjetas-visita",
  "tags": ["tarjetas", "corporativo", "impresion", "negocios"]
}
```

### URLs donde Aparece
- ✅ `/categoria/graficos-impresos` (por category)
- ✅ `/categoria/graficos-impresos/tarjetas-visita` (por category + subcategory)
- ✅ `/productos?tag=tarjetas` (por tag "tarjetas")
- ✅ `/productos?tag=corporativo` (por tag "corporativo")
- ✅ `/productos?tag=impresion` (por tag "impresion")
- ✅ `/productos?tag=negocios` (por tag "negocios")

---

## ✅ Ejemplo Completo: Llavero

### Configuración en Admin Panel
```
Nombre: Llavero Madera Personalizado
Category: Corte y Grabado Láser
Subcategory: Llaveros Personalizados
Tags: llaveros, madera, grabado, personalizable, regalo
```

### Campos Guardados en Firebase
```json
{
  "name": "Llavero Madera Personalizado",
  "category": "corte-grabado",
  "subcategory": "llaveros",
  "tags": ["llaveros", "madera", "grabado", "personalizable", "regalo"]
}
```

### URLs donde Aparece
- ✅ `/categoria/corte-grabado` (por category)
- ✅ `/categoria/corte-grabado/llaveros` (por category + subcategory)
- ✅ `/productos?tag=llaveros` (por tag "llaveros")
- ✅ `/productos?tag=madera` (por tag "madera")
- ✅ `/productos?tag=grabado` (por tag "grabado")
- ✅ `/productos?tag=personalizable` (por tag "personalizable")
- ✅ `/productos?tag=regalo` (por tag "regalo")

---

## 🏷️ Tags Recomendados por Tipo de Producto

### Textiles
```
camisetas, sudaderas, polos, gorras, mochilas, bolsas, toallas
ropa, bordado, estampado, personalizable
```

### Sublimados
```
tazas, termos, vasos, botellas, platos
cocina, hogar, oficina, personalizable, regalo
```

### Corte y Grabado
```
llaveros, cuadros, señales, letras, decoracion
madera, metacrilato, metal, grabado, corte
```

### Impresión 3D
```
figuras, bustos, miniaturas, prototipos
resina, filamento, pla, petg, personalizable
```

### Productos Gráficos
```
tarjetas, etiquetas, carteles, pegatinas
corporativo, impresion, negocios, eventos
```

---

## 💡 Casos de Uso

### Caso 1: Cliente busca "camisetas"
**Solución**: Enlazar a `/productos?tag=camisetas`

```html
<a href="/productos?tag=camisetas">Ver todas las camisetas</a>
```

### Caso 2: Cliente navega por categorías
**Solución**: Usar URLs de categoría

```html
<a href="/categoria/textiles">Productos Textiles</a>
<a href="/categoria/textiles/ropa-personalizada">Ropa Personalizada</a>
```

### Caso 3: Cliente busca "regalos personalizables"
**Solución**: Usar tag "regalo" o "personalizable"

```html
<a href="/productos?tag=regalo">Ideas para Regalos</a>
<a href="/productos?tag=personalizable">Productos Personalizables</a>
```

### Caso 4: Cliente busca "productos de madera"
**Solución**: Usar tag "madera"

```html
<a href="/productos?tag=madera">Productos de Madera</a>
```

---

## 🔗 Crear Enlaces en Tu Web

### En el Navbar (Categorías)
```html
<nav>
  <a href="/categoria/textiles">Textiles</a>
  <a href="/categoria/sublimados">Sublimados</a>
  <a href="/categoria/corte-grabado">Corte Láser</a>
  <a href="/categoria/impresion-3d">Impresión 3D</a>
</nav>
```

### En la Homepage (Tags Populares)
```html
<div class="tags-populares">
  <a href="/productos?tag=camisetas">Camisetas</a>
  <a href="/productos?tag=tazas">Tazas</a>
  <a href="/productos?tag=llaveros">Llaveros</a>
  <a href="/productos?tag=regalo">Regalos</a>
  <a href="/productos?tag=personalizable">Personalizable</a>
</div>
```

### En el Footer (Enlaces Rápidos)
```html
<footer>
  <h3>Productos Populares</h3>
  <ul>
    <li><a href="/productos?tag=camisetas">Camisetas</a></li>
    <li><a href="/productos?tag=tazas">Tazas</a></li>
    <li><a href="/productos?tag=figuras">Figuras 3D</a></li>
    <li><a href="/productos?tag=tarjetas">Tarjetas de Visita</a></li>
  </ul>
</footer>
```

---

## 🔍 Verificar que Funciona

### Paso 1: Crear producto de prueba
```
Nombre: Test Camiseta
Category: Productos Textiles
Subcategory: Ropa Personalizada
Tags: camisetas, test, prueba
```

### Paso 2: Probar URLs
```
✅ http://localhost:4321/categoria/textiles
   → Debe aparecer "Test Camiseta"

✅ http://localhost:4321/categoria/textiles/ropa-personalizada
   → Debe aparecer "Test Camiseta"

✅ http://localhost:4321/productos?tag=camisetas
   → Debe aparecer "Test Camiseta"

✅ http://localhost:4321/productos?tag=test
   → Debe aparecer "Test Camiseta"
```

### Paso 3: Ver logs en consola (F12)
```
[ProductsWithFilters] Tag filter applied {tags: ['camisetas'], remaining: 1}
```

---

## ⚠️ Errores Comunes

### ❌ "No aparece en /productos?tag=camisetas"
**Causa**: El producto no tiene el tag "camisetas"
**Solución**:
1. Edita el producto en el admin
2. Añade el tag "camisetas" en el campo Tags
3. Guarda

### ❌ "Aparece en /categoria/textiles pero no en /productos?tag=camisetas"
**Causa**: Tiene `category: 'textiles'` pero no tiene el tag "camisetas"
**Solución**: Añade "camisetas" a los tags del producto

---

## 📊 Tabla de Referencia Rápida

| Producto | Category | Subcategory | Tags | URLs |
|----------|----------|-------------|------|------|
| Camiseta | textiles | ropa-personalizada | camisetas, ropa | `/categoria/textiles`<br>`/categoria/textiles/ropa-personalizada`<br>`/productos?tag=camisetas` |
| Taza | sublimados | vajilla-personalizada | tazas, cocina | `/categoria/sublimados`<br>`/categoria/sublimados/vajilla-personalizada`<br>`/productos?tag=tazas` |
| Llavero | corte-grabado | llaveros | llaveros, madera | `/categoria/corte-grabado`<br>`/categoria/corte-grabado/llaveros`<br>`/productos?tag=llaveros` |
| Figura | impresion-3d | impresion-resina | figuras, resina | `/categoria/impresion-3d`<br>`/categoria/impresion-3d/impresion-resina`<br>`/productos?tag=figuras` |

---

**Fecha**: 2025-11-28
**Versión**: 1.0
**Estado**: ✅ Sistema completo con soporte para URLs por tag
