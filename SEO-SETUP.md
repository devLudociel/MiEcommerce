# 🚀 Guía de Optimización SEO - ImprimeArte

## ✅ Implementaciones Completadas

### 1. **Sitemap Dinámico** (`/sitemap.xml`)

Se ha creado un sitemap.xml automático que incluye:
- ✅ Todas las páginas estáticas (home, sobre-nosotros, contacto, etc.)
- ✅ Todos los productos desde Firestore con sus fechas de actualización
- ✅ Prioridades y frecuencias de cambio optimizadas
- ✅ Cache de 1 hora para mejorar rendimiento

**Ubicación**: `src/pages/sitemap.xml.ts`

**Acceso**: Tu sitemap estará disponible en `https://tudominio.com/sitemap.xml`

---

### 2. **Meta Tags Open Graph Completos**

Todas las páginas ahora tienen meta tags optimizados para redes sociales:
- ✅ Open Graph (Facebook, LinkedIn, WhatsApp)
- ✅ Twitter Cards
- ✅ Imágenes de previsualización
- ✅ Descripciones optimizadas
- ✅ URLs canónicas

**Mejoras en BaseLayout**:
- Soporte para `ogType` (website, product, article)
- URLs canónicas automáticas
- Image alt tags
- Site name y locale configurados

---

### 3. **Schema.org Structured Data**

#### **Página de Inicio** (`index.astro`)
- ✅ **Organization Schema**: Información de tu empresa
- ✅ **WebSite Schema**: Para search box en Google

#### **Páginas de Producto** (`producto/[slug].astro`)
- ✅ **Product Schema**: Datos estructurados de cada producto
  - Nombre y descripción
  - Imágenes
  - Precio en EUR
  - Disponibilidad (InStock/OutOfStock)
  - Marca
  - URL canónica

**Beneficios**:
- Rich snippets en resultados de Google
- Mejor CTR desde buscadores
- Información estructurada para bots

---

### 4. **Robots.txt Optimizado**

Archivo `public/robots.txt` configurado con:
- ✅ Acceso permitido a todos los bots
- ✅ Bloqueo de áreas privadas (/admin, /account, /api)
- ✅ Referencia al sitemap
- ✅ Optimizaciones específicas para Googlebot y Bingbot

---

### 5. **SEO On-Page Mejorado**

#### **BaseLayout.astro** - Mejoras globales:
- Canonical URLs automáticas
- Soporte para `noindex` en páginas privadas
- Meta descriptions dinámicas
- Slot para contenido adicional en `<head>`

#### **Páginas de Producto** - SEO específico:
- Títulos dinámicos con nombre del producto
- Descriptions del producto desde Firestore
- Imágenes de producto en meta tags
- Datos estructurados JSON-LD

---

## ⚙️ Configuración Necesaria

### 1. **Configurar tu Dominio en Astro**

Edita `astro.config.mjs` y añade tu dominio:

```javascript
export default defineConfig({
  site: 'https://tudominio.com', // 👈 Cambia esto por tu dominio real
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [react()],
  output: 'server',
});
```

**IMPORTANTE**: Esto es crucial para que:
- Las URLs canónicas funcionen correctamente
- El sitemap tenga las URLs completas
- Los meta tags tengan rutas absolutas

---

### 2. **Actualizar URLs en Archivos**

Busca y reemplaza `https://tudominio.com` por tu dominio real en:

- ✏️ `public/robots.txt` (línea del Sitemap)
- ✏️ `src/pages/index.astro` (schemas organizationSchema y websiteSchema)
- ✏️ Cualquier otro archivo que tenga `tudominio.com`

---

### 3. **Añadir Redes Sociales** (Opcional)

En `src/pages/index.astro`, descomenta y añade tus redes sociales:

```javascript
const organizationSchema = {
  // ...
  "sameAs": [
    "https://www.facebook.com/tuempresa",
    "https://www.instagram.com/tuempresa",
    "https://twitter.com/tuempresa",
    "https://www.linkedin.com/company/tuempresa"
  ],
  // ...
};
```

---

### 4. **Crear Imagen OG por Defecto**

Crea una imagen `og-image.jpg` en la carpeta `public/`:
- Dimensiones recomendadas: **1200 x 630px**
- Formato: JPG o PNG
- Peso máximo: 300KB
- Contenido: Logo + texto descriptivo de tu marca

Esta imagen se usará cuando compartan tus páginas en redes sociales.

---

### 5. **Enviar Sitemap a Google**

1. Ve a [Google Search Console](https://search.google.com/search-console)
2. Añade tu propiedad (dominio)
3. Ve a **Sitemaps** en el menú lateral
4. Añade la URL: `https://tudominio.com/sitemap.xml`
5. Haz clic en **Enviar**

---

## 🧪 Cómo Probar que Funciona

### **1. Verificar Sitemap**
```bash
# En desarrollo:
http://localhost:4321/sitemap.xml

# En producción:
https://tudominio.com/sitemap.xml
```

Deberías ver XML con todas tus páginas y productos.

---

### **2. Probar Meta Tags**

**Herramientas recomendadas**:
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

Ingresa la URL de una página de producto para ver cómo se verá al compartirla.

---

### **3. Validar Schema.org**

1. Ve a [Google Rich Results Test](https://search.google.com/test/rich-results)
2. Ingresa la URL de tu página de inicio o de un producto
3. Verifica que detecte correctamente:
   - Organization (home)
   - Product (páginas de producto)

---

### **4. Verificar Robots.txt**
```bash
# En producción:
https://tudominio.com/robots.txt
```

Debe mostrar las reglas configuradas.

---

## 📊 Métricas de Éxito

Una vez implementado y publicado, monitorea:

1. **Google Search Console**:
   - Impresiones y clics
   - Posición promedio
   - Errores de indexación
   - Cobertura del sitemap

2. **Google Analytics** (si lo tienes):
   - Tráfico orgánico
   - Páginas de entrada desde buscadores
   - Tasa de rebote

3. **Rich Results** en Google:
   - Busca tu producto por nombre
   - Verifica si aparecen precios y disponibilidad

---

## 🎯 Próximos Pasos Recomendados

### **1. Crear Contenido de Calidad**
- Blog con guías de personalización
- Casos de éxito de clientes
- Tutoriales de diseño

### **2. Optimizar Velocidad**
- Comprimir imágenes de productos
- Implementar lazy loading
- Usar CDN para imágenes

### **3. Link Building Interno**
- Enlazar productos relacionados
- Breadcrumbs en categorías
- Enlaces contextuales en descripciones

### **4. Mobile-First**
- Verificar que todo sea responsive
- Testar en diferentes dispositivos
- Optimizar tap targets

---

## ❓ FAQ

### ¿Cuánto tarda en aparecer en Google?
Normalmente 1-4 semanas después de enviar el sitemap. Puede acelerarse con:
- Google Search Console (solicitar indexación)
- Links desde redes sociales
- Contenido fresco regularmente

### ¿Qué pasa si cambio de dominio?
Necesitarás actualizar:
- `astro.config.mjs` (site)
- `robots.txt` (sitemap URL)
- `index.astro` (schemas)
- Volver a enviar sitemap en Google Search Console

### ¿Puedo añadir más tipos de Schema?
Sí, puedes añadir:
- `BreadcrumbList` para navegación
- `Review` agregado para reseñas de productos
- `FAQPage` en la página de FAQ
- `Article` para posts de blog

---

## 📞 Notas Finales

✅ **Implementado**:
- Sitemap dinámico
- Meta tags completos
- Schema.org (Organization, WebSite, Product)
- Robots.txt
- Canonical URLs
- Open Graph + Twitter Cards

⚠️ **Pendiente de configurar**:
- Tu dominio real en astro.config.mjs
- Imagen og-image.jpg
- Redes sociales (opcional)
- Envío a Google Search Console

🎉 **Tu sitio ahora está optimizado para SEO**. Solo necesitas configurar tu dominio y empezar a promocionarlo.
