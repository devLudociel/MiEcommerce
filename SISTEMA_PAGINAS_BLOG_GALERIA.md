# 📝 Sistema de Páginas, Blog y Galería

## ✅ Sistema Completo Creado

He creado un sistema completo para gestionar todo el contenido de tu web desde el panel de administración.

---

## 🎯 ¿Qué puedes hacer?

### 1. **Crear Páginas Informativas**
Páginas estáticas como:
- Sobre Nosotros
- Preguntas Frecuentes (FAQ)
- Política de Privacidad
- Términos y Condiciones
- Contacto
- Guía de Materiales
- Tiempos de Producción

### 2. **Gestionar un Blog**
- Crear artículos y tutoriales
- Añadir imágenes destacadas
- Categorizar posts
- Añadir tags
- Definir extractos
- Publicar o guardar como borrador

### 3. **Administrar una Galería**
- Subir imágenes de trabajos realizados
- Organizar por categorías
- Añadir descripciones
- Etiquetar imágenes

---

## 🚀 Cómo Empezar

### Paso 1: Accede al Panel de Administración

1. Ve a **http://localhost:4321/admin**
2. Verás un nuevo botón: **📝 Blog & Páginas**
3. Click en el botón

### Paso 2: Crear Páginas Predeterminadas (IMPORTANTE)

La primera vez que accedas, verás un botón:

```
⚡ Crear Páginas Predeterminadas
```

**Haz click** para crear automáticamente:
- ✅ Sobre Nosotros
- ✅ FAQ
- ✅ Contacto
- ✅ Política de Privacidad

Estas páginas ya tienen contenido de ejemplo que puedes editar.

---

## 📄 Gestión de Páginas

### Crear una Nueva Página

1. **Tab: 📄 Páginas**
2. Click en **+ Nueva Página**
3. Completa el formulario:

```
Título: Guía de Materiales
Slug: guia-materiales (se genera automáticamente)
Contenido: (usar Markdown - ver sección abajo)
Meta Descripción: Descripción para SEO
Estado: Publicado / Borrador
Imagen Destacada: (opcional)
```

4. Click en **Guardar**

### Editar una Página Existente

1. En la lista de páginas, click en **Editar**
2. Modifica el contenido
3. Click en **Guardar**

### Ver una Página

- Click en **Ver** para abrirla en una nueva pestaña
- La URL será: `http://localhost:4321/{slug}`
- Ejemplo: `http://localhost:4321/sobre-nosotros`

---

## 📝 Gestión de Blog

### Crear un Nuevo Post

1. **Tab: 📝 Blog**
2. Click en **+ Nuevo Post**
3. Completa el formulario:

```
Título: Cómo Personalizar una Camiseta con DTF
Slug: como-personalizar-camiseta-dtf
Contenido: (usar Markdown)
Meta Descripción: Aprende a personalizar camisetas con DTF
Extracto: Guía paso a paso para personalizar camisetas
Autor: Tu Nombre
Categoría: Tutoriales
Tags: dtf, camisetas, tutorial, textil (separados por comas)
Estado: Publicado
Imagen Destacada: Subir imagen
```

4. Click en **Guardar**

### Ver el Blog

- URL: `http://localhost:4321/blog`
- Muestra todos los posts publicados
- Click en un post para leerlo

---

## 🖼️ Gestión de Galería

### Añadir una Imagen

1. **Tab: 🖼️ Galería**
2. Click en **+ Nueva Imagen**
3. Completa el formulario:

```
Título: Figura Funko Personalizada
Descripción: Figura de resina personalizada en 3D
Imagen: Subir archivo JPG/PNG
Categoría: Impresión 3D
Tags: funko, resina, personalizado
```

4. Click en **Guardar**

### Ver la Galería

- URL: `http://localhost:4321/galeria`
- Muestra todas las imágenes en una cuadrícula
- Hover para ver detalles

---

## ✍️ Cómo Escribir Contenido (Markdown)

El contenido se escribe en **Markdown**, un formato simple para dar estilo al texto.

### Ejemplos:

```markdown
# Título Principal

## Subtítulo

### Subtítulo más pequeño

**Texto en negrita**

*Texto en cursiva*

- Lista item 1
- Lista item 2
- Lista item 3

1. Paso 1
2. Paso 2
3. Paso 3

[Enlace a Google](https://google.com)

Párrafo normal de texto.

Otro párrafo.
```

### Resultado Visual:

# Título Principal

## Subtítulo

**Texto en negrita**

- Lista item 1
- Lista item 2

---

## 🔗 URLs de las Páginas del Footer

Todas estas páginas ya están enlazadas en el footer. Solo necesitas crearlas:

### Información
- `/sobre-nosotros` ✅ (se crea con "Páginas Predeterminadas")
- `/como-personalizar` ⚠️ (crear manualmente)
- `/guia-materiales` ⚠️ (crear manualmente)
- `/tiempos-produccion` ⚠️ (crear manualmente)
- `/galeria` ✅ (ya existe la página)
- `/blog` ✅ (ya existe la página)

### Ayuda y Soporte
- `/faq` ✅ (se crea con "Páginas Predeterminadas")
- `/contacto` ✅ (se crea con "Páginas Predeterminadas")
- `/envios` ⚠️ (crear manualmente)
- `/devoluciones` ⚠️ (crear manualmente)
- `/privacidad` ✅ (se crea con "Páginas Predeterminadas")
- `/terminos-condiciones` ⚠️ (crear manualmente)

---

## 📋 Páginas Recomendadas para Crear

### 1. **Cómo Personalizar**
```
Título: Cómo Personalizar tus Productos
Slug: como-personalizar

Contenido:
# Cómo Personalizar

Personalizar tus productos es muy fácil:

## Paso 1: Elige tu Producto
Navega por nuestro catálogo y selecciona el producto que quieres personalizar.

## Paso 2: Sube tu Diseño
Puedes subir tu propia imagen o usar nuestro personalizador.

## Paso 3: Confirma tu Pedido
Revisa la vista previa y realiza tu pedido.

¡En 3-5 días lo tendrás en casa!
```

### 2. **Guía de Materiales**
```
Título: Guía de Materiales
Slug: guia-materiales

Contenido:
# Guía de Materiales

## Textiles

### Algodón 100%
- **Características**: Suave, transpirable
- **Usos**: Camisetas, sudaderas
- **Cuidados**: Lavar a 30°C

### Poliéster
- **Características**: Resistente, colores vibrantes
- **Usos**: Ropa deportiva, sublimación
- **Cuidados**: Lavar a 40°C

## Impresión 3D

### Resina
- **Características**: Alta precisión, acabado liso
- **Usos**: Figuras, bustos, miniaturas
- **Durabilidad**: Muy alta

### PLA
- **Características**: Ecológico, resistente
- **Usos**: Prototipos, objetos decorativos
- **Durabilidad**: Alta
```

### 3. **Tiempos de Producción**
```
Título: Tiempos de Producción
Slug: tiempos-produccion

Contenido:
# Tiempos de Producción

## Productos Estándar
- Camisetas DTF: 3-5 días hábiles
- Tazas sublimadas: 2-3 días hábiles
- Llaveros láser: 1-2 días hábiles

## Productos Personalizados
- Impresión 3D resina: 5-7 días hábiles
- Diseño gráfico personalizado: 2-4 días hábiles
- Bordado textil: 7-10 días hábiles

## Urgencias
Disponemos de servicio express (24-48h) con coste adicional.
Contacta con nosotros para más información.
```

### 4. **Envíos**
```
Título: Información de Envíos
Slug: envios

Contenido:
# Envíos

## Canarias (Península)
- **Tiempo**: 3-5 días hábiles
- **Coste**: 5€ (Gratis pedidos +50€)

## Resto de España
- **Tiempo**: 5-7 días hábiles
- **Coste**: 7€ (Gratis pedidos +60€)

## Internacional
- Contacta con nosotros para presupuesto

## Seguimiento
Recibirás un número de seguimiento por email cuando se envíe tu pedido.
```

### 5. **Devoluciones**
```
Título: Política de Devoluciones
Slug: devoluciones

Contenido:
# Política de Devoluciones

## Productos Estándar
- **Plazo**: 14 días desde la recepción
- **Estado**: Sin usar, en perfecto estado
- **Reembolso**: Total del producto

## Productos Personalizados
Los productos personalizados **NO admiten devolución** salvo defecto de fabricación.

## Defectos de Fabricación
Si tu producto llega defectuoso:
1. Contacta con nosotros en 48h
2. Envía fotos del defecto
3. Te enviaremos un reemplazo gratis

## Proceso de Devolución
1. Contacta con nosotros: info@imprimarte.com
2. Espera la autorización
3. Envía el producto
4. Reembolso en 5-7 días hábiles
```

### 6. **Términos y Condiciones**
```
Título: Términos y Condiciones
Slug: terminos-condiciones

Contenido:
# Términos y Condiciones

## Aceptación de los Términos
Al usar este sitio web, aceptas estos términos y condiciones.

## Uso del Sitio
- Debes ser mayor de 18 años
- No usar para actividades ilegales
- No infringir derechos de autor

## Propiedad Intelectual
Todo el contenido es propiedad de ImprimeArte.

## Privacidad
Ver nuestra [Política de Privacidad](/privacidad).

## Modificaciones
Nos reservamos el derecho a modificar estos términos.

**Última actualización**: 29 de noviembre de 2025
```

---

## 🎨 Consejos de Diseño

### Imágenes Recomendadas

- **Páginas**: 1200x600px (opcional)
- **Blog**: 1200x630px (recomendado)
- **Galería**: 800x800px o superior

### SEO (Meta Descripciones)

- **Longitud**: 150-160 caracteres
- **Incluir**: Palabra clave principal
- **Atractivo**: Que invite a hacer click

Ejemplo:
```
Descubre cómo personalizar tus camisetas con DTF.
Guía paso a paso con consejos profesionales. ¡Calidad premium!
```

---

## 🔄 Actualizar Contenido

### Editar una Página

1. Ve a **Admin > Blog & Páginas**
2. Tab correspondiente (Páginas/Blog/Galería)
3. Click en **Editar** junto a la página
4. Modifica el contenido
5. Click en **Guardar**

### Publicar/Despublicar

- Cambia el **Estado** entre:
  - **Borrador**: No visible públicamente
  - **Publicado**: Visible en la web

---

## ❓ Preguntas Frecuentes

### ¿Puedo usar HTML en el contenido?

Sí, puedes mezclar Markdown con HTML:

```html
<div style="background: #f0f0f0; padding: 20px; border-radius: 10px;">
  <h3>Oferta Especial</h3>
  <p>¡20% de descuento en todos los productos!</p>
</div>
```

### ¿Cómo subo imágenes?

1. Click en **"Imagen Destacada"** o **"Imagen"**
2. Selecciona archivo de tu ordenador
3. Espera a que se suba
4. La imagen aparecerá en una vista previa

### ¿Puedo borrar páginas?

Sí, click en **Eliminar** en la lista de páginas.

**⚠️ CUIDADO**: No se puede deshacer.

### ¿Cómo cambio el slug (URL)?

El slug se genera automáticamente del título, pero puedes editarlo manualmente antes de guardar.

**Ejemplo**:
- Título: "Cómo Personalizar una Taza"
- Slug: `como-personalizar-una-taza`

---

## 📊 Próximos Pasos Recomendados

1. ✅ **Crear páginas predeterminadas** (botón en el panel)
2. ⚠️ **Crear las 6 páginas adicionales** (ver ejemplos arriba)
3. ⚠️ **Añadir imágenes** a las páginas principales
4. ⚠️ **Crear 2-3 posts de blog** de ejemplo
5. ⚠️ **Subir 10-15 imágenes** a la galería de trabajos

---

**Fecha**: 29 de noviembre de 2025
**Estado**: ✅ Sistema completamente funcional
**Panel**: http://localhost:4321/admin/pages
