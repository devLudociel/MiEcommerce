# FASE 3: Growth - Características del Personalizador

**Fecha inicio:** 2025-11-13
**Estado:** 🚧 En progreso
**Duración estimada:** 1 mes

---

## 🎯 Objetivo

Implementar características clave en el personalizador que mejoren la experiencia del usuario y aumenten las conversiones a través de:
- **Facilidad de uso:** Plantillas predefinidas y cliparts listos para usar
- **Creatividad:** Galería extensa de elementos visuales
- **Viralidad:** Compartir diseños en redes sociales
- **Reutilización:** Usar diseños guardados en múltiples productos

---

## 📊 Características a Implementar

### 1. Plantillas Predefinidas (#7) 🎨

**Prioridad:** Alta 🔴
**Tiempo estimado:** 8-10 horas
**Impacto:** Conversión +40%, Tiempo de personalización -60%

#### Descripción
Sistema de plantillas pre-diseñadas que los usuarios pueden usar como punto de partida para sus personalizaciones. Reduce la fricción para usuarios sin experiencia en diseño.

#### Tipos de Plantillas
- **Cumpleaños:** "Feliz Cumpleaños", diseños con globos, tortas
- **Aniversarios:** Mensajes románticos, fechas especiales
- **Empresariales:** Logos placeholder, texto corporativo
- **Deportes:** Números de jugador, nombres de equipo
- **Eventos:** Bodas, bautizos, graduaciones
- **Genéricas:** Layouts balanceados, combinaciones de colores

#### Implementación

**Base de datos (Firestore):**
```typescript
// Collection: design_templates
{
  id: string;
  category: ProductCategory;  // Camisetas, tazas, marcos, etc.
  subcategory: string;        // Cumpleaños, deportes, etc.
  name: string;               // "Cumpleaños Elegante"
  description: string;
  thumbnail: string;          // URL de preview
  isPremium: boolean;         // Free vs Premium
  popularity: number;         // Veces usada
  tags: string[];             // ["cumpleaños", "elegante", "dorado"]

  // Datos del diseño
  template: {
    fields: {
      fieldId: string;
      value: any;
      imageUrl?: string;
      imageTransform?: ImageTransform;
    }[];
    previewImage?: string;
  };

  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**Componentes:**
- `TemplateGallery.tsx` - Galería de plantillas con filtros
- `TemplateCard.tsx` - Card de preview de plantilla
- `TemplateModal.tsx` - Modal con preview grande y botón "Usar"
- `TemplateFilters.tsx` - Filtros por categoría, precio, popularidad
- Admin: `TemplateEditor.tsx` - Crear/editar plantillas

**Integración:**
- Nuevo tab "Plantillas" en `DynamicCustomizer.tsx`
- Al seleccionar plantilla, pre-llena todos los campos
- Usuario puede modificar cualquier elemento
- Tracking: qué plantillas se usan más

**Endpoints API:**
- `/api/templates/get-by-category` - Obtener plantillas por categoría
- `/api/templates/increment-usage` - Incrementar contador de uso
- Admin: `/api/templates/create` - Crear plantilla
- Admin: `/api/templates/update` - Editar plantilla
- Admin: `/api/templates/delete` - Eliminar plantilla

#### Features
- ✅ Categorización por tipo de producto y ocasión
- ✅ Preview en tiempo real antes de aplicar
- ✅ Plantillas gratuitas y premium (opcional)
- ✅ Búsqueda y filtrado
- ✅ Sorting por popularidad, recientes, nombre
- ✅ Responsive: grid en desktop, list en móvil
- ✅ Lazy loading de thumbnails
- ✅ Analytics: plantilla más usada, tasa de conversión por plantilla

#### Beneficios
- ✅ Reduce fricción para usuarios sin experiencia
- ✅ Acelera el proceso de personalización
- ✅ Aumenta tasa de conversión (inspiración)
- ✅ Mejor UX (menos decisiones que tomar)
- ✅ Monetización potencial (plantillas premium)

---

### 2. Galería de Cliparts (#12) 🖼️

**Prioridad:** Alta 🔴
**Tiempo estimado:** 10-12 horas
**Impacto:** Engagement +50%, Valor percibido +35%

#### Descripción
Biblioteca extensa de imágenes, iconos y elementos gráficos que los usuarios pueden añadir a sus diseños sin necesidad de subirlos.

#### Categorías de Cliparts
- **Iconos:** Corazones, estrellas, flechas, etc.
- **Animales:** Perros, gatos, pájaros
- **Deportes:** Balones, trofeos, medallas
- **Naturaleza:** Flores, árboles, hojas
- **Celebraciones:** Globos, confetti, regalos
- **Profesiones:** Herramientas, símbolos profesionales
- **Emojis y expresiones**
- **Formas geométricas**
- **Marcos y bordes decorativos**

#### Implementación

**Base de datos (Firestore):**
```typescript
// Collection: cliparts
{
  id: string;
  name: string;              // "Corazón rojo"
  category: string;          // "Celebraciones"
  subcategory: string;       // "Amor"
  tags: string[];            // ["corazón", "amor", "rojo", "romántico"]
  imageUrl: string;          // URL en Firebase Storage
  thumbnailUrl: string;      // Thumbnail optimizado
  isPremium: boolean;
  usageCount: number;
  format: 'png' | 'svg';     // Preferir SVG (escalable)
  hasTransparency: boolean;
  dimensions: {
    width: number;
    height: number;
  };
  colors: string[];          // Colores predominantes (para filtrar)
  createdAt: timestamp;
  createdBy: string;         // 'system' o userId (si UGC)
}
```

**Componentes:**
- `ClipartGallery.tsx` - Galería principal con infinite scroll
- `ClipartGrid.tsx` - Grid responsive de cliparts
- `ClipartCard.tsx` - Card con preview y botón "Añadir"
- `ClipartFilters.tsx` - Filtros por categoría, color, formato
- `ClipartSearch.tsx` - Búsqueda por nombre/tags
- Admin: `ClipartUploader.tsx` - Subir y categorizar cliparts

**Integración en DynamicCustomizer:**
- Nuevo botón "Añadir Clipart" en campos de imagen
- Modal/Panel lateral con galería
- Al seleccionar, añade clipart como nueva capa
- Cada clipart es transformable (posición, escala, rotación)
- Soporte para múltiples cliparts en mismo diseño

**Sistema de Capas:**
```typescript
interface DesignLayer {
  id: string;
  type: 'uploaded_image' | 'clipart' | 'text';
  source?: string;           // URL si es imagen/clipart
  transform: ImageTransform;
  zIndex: number;            // Orden de capas
  locked: boolean;           // Evitar edición accidental
  visible: boolean;
}
```

**Endpoints API:**
- `/api/cliparts/get-all` - Obtener cliparts con paginación
- `/api/cliparts/search` - Buscar por texto
- `/api/cliparts/get-by-category` - Filtrar por categoría
- `/api/cliparts/increment-usage` - Tracking de uso
- Admin: `/api/cliparts/upload` - Subir nuevo clipart
- Admin: `/api/cliparts/bulk-upload` - Subir múltiples

#### Features Avanzadas
- ✅ Sistema de capas (múltiples cliparts en un diseño)
- ✅ Controles por capa (mover, escalar, rotar, eliminar)
- ✅ Z-index (traer al frente / enviar atrás)
- ✅ Lock de capas (evitar mover accidentalmente)
- ✅ Opacity control por capa
- ✅ Filtros de color (cambiar color del clipart)
- ✅ Flip horizontal/vertical
- ✅ Infinite scroll en galería
- ✅ Búsqueda inteligente con tags
- ✅ Favoritos (guardar cliparts favoritos del usuario)

#### Bibliotecas Recomendadas
- **Flaticon** - Iconos vectoriales (licencia)
- **Freepik** - Ilustraciones (licencia)
- **Openmoji** - Emojis open source
- **Heroicons** - Iconos minimalistas
- O crear propios cliparts con Figma/Illustrator

#### Beneficios
- ✅ Mayor valor percibido (más opciones)
- ✅ Diseños más profesionales
- ✅ Elimina necesidad de buscar imágenes externamente
- ✅ Consistencia visual (curated library)
- ✅ Monetización (cliparts premium)
- ✅ Reduce tiempo de diseño

---

### 3. Compartir en Redes Sociales (#13) 🔗

**Prioridad:** Media 🟡
**Tiempo estimado:** 4-5 horas
**Impacto:** Tráfico orgánico +30%, Brand awareness +40%

#### Descripción
Permitir a los usuarios compartir sus diseños personalizados en redes sociales, generando tráfico orgánico y promoción viral.

#### Implementación

**Componentes:**
- `ShareDesignButton.tsx` - Botón principal "Compartir"
- `ShareModal.tsx` - Modal con opciones de compartir
- `SocialShareButtons.tsx` - Botones individuales por red
- `DesignSnapshot.tsx` - Genera imagen del diseño para compartir

**Redes Sociales a Soportar:**
1. **WhatsApp** (principal en España)
   - Compartir link con preview del diseño
   - Texto: "¡Mira mi diseño personalizado en [Producto]!"

2. **Facebook**
   - Share dialog con Open Graph
   - Imagen del diseño como preview
   - Link a producto personalizado

3. **Instagram**
   - Descargar imagen del diseño
   - Copy hashtags sugeridos
   - Guía: "Sube esta imagen a tu story"

4. **Pinterest**
   - Pin con imagen del diseño
   - Descripción optimizada
   - Link a producto

5. **Twitter/X**
   - Tweet pre-escrito con link
   - Imagen del diseño adjunta
   - Hashtags relevantes

6. **Email**
   - Enviar diseño por correo
   - Template con preview e info

7. **Copiar Link**
   - URL única del diseño
   - Query params con configuración
   - Feedback visual al copiar

#### Generación de Imagen para Compartir
```typescript
// Usar html2canvas o similar
async function generateDesignSnapshot(
  designData: CustomizationSchema
): Promise<Blob> {
  // 1. Renderizar preview del diseño
  // 2. Capturar como imagen
  // 3. Añadir watermark sutil
  // 4. Optimizar tamaño
  // 5. Retornar blob
}
```

#### URLs Compartibles
Crear URLs únicas que pre-carguen el diseño:
```
https://tutienda.com/producto/camiseta-personalizada?design=abc123

// Query params:
?design=<base64 encoded design data>
// O
?designId=<saved design ID>
```

**Base de datos (Firestore):**
```typescript
// Collection: shared_designs
{
  id: string;               // Short ID (ej: "abc123")
  userId: string;
  productId: string;
  designData: any;          // Configuración completa
  imageUrl: string;         // Snapshot del diseño
  shareCount: number;       // Veces compartido
  viewCount: number;        // Veces visto
  clickCount: number;       // Clics a producto
  conversionCount: number;  // Compras generadas
  platform: {
    whatsapp: number;
    facebook: number;
    instagram: number;
    // etc.
  };
  createdAt: timestamp;
  expiresAt: timestamp;     // Auto-delete después de 90 días
}
```

**Endpoints API:**
- `/api/share/create` - Crear link compartible
- `/api/share/get-design` - Obtener diseño por ID
- `/api/share/track-view` - Trackear visualización
- `/api/share/track-click` - Trackear clic
- `/api/share/track-conversion` - Trackear compra

#### Features
- ✅ Generación de imagen del diseño
- ✅ URLs únicas y cortas (ej: tutienda.com/d/abc123)
- ✅ Open Graph tags optimizados
- ✅ Tracking de shares, views, clicks
- ✅ Analytics por plataforma
- ✅ Incentivo: "Comparte y gana 5% descuento"
- ✅ Watermark sutil en imagen compartida
- ✅ Botón "Diseñar el tuyo" en landing
- ✅ Mobile-first (especialmente WhatsApp)

#### Beneficios
- ✅ Marketing viral orgánico
- ✅ Tráfico cualificado (amigos/familia)
- ✅ Prueba social (ver diseños de otros)
- ✅ Zero costo de adquisición
- ✅ Brand awareness
- ✅ User-generated content

---

### 4. Usar Diseño en Otro Producto (#22) 🔄

**Prioridad:** Alta 🔴
**Tiempo estimado:** 6-8 horas
**Impacto:** Cross-selling +45%, AOV +30%

#### Descripción
Permitir a los usuarios guardar sus diseños y reutilizarlos en diferentes productos. Ejemplo: diseño de cumpleaños en camiseta → usarlo en taza y marco.

#### Casos de Uso
1. Usuario crea diseño para camiseta
2. Le gusta el resultado
3. Quiere el mismo diseño en taza
4. Click "Usar en otro producto"
5. Selecciona taza de catálogo
6. Diseño se adapta automáticamente
7. Compra ambos productos

#### Implementación

**Base de datos (Firestore):**
```typescript
// Collection: saved_designs (ya existe en user_profiles?)
{
  userId: string;
  designs: [
    {
      id: string;
      name: string;          // "Mi diseño de cumpleaños"
      thumbnail: string;     // Preview
      originalProductId: string;
      originalCategory: string;
      designData: any;       // Configuración completa
      usageCount: number;    // Veces reutilizado
      products: string[];    // IDs de productos donde se usó
      createdAt: timestamp;
      lastUsedAt: timestamp;
    }
  ]
}
```

**Componentes:**
- `SavedDesigns.tsx` - Lista de diseños guardados del usuario
- `SaveDesignModal.tsx` - Modal para guardar diseño
- `DesignCard.tsx` - Card de diseño guardado
- `ProductSelector.tsx` - Selector de producto para aplicar diseño
- `DesignAdapter.tsx` - Lógica de adaptación entre productos
- Botón "Guardar Diseño" en customizer
- Botón "Usar en otro producto" en diseño guardado

**Flujo de Usuario:**

**Paso 1: Guardar Diseño**
```typescript
// Desde el customizer
<button onClick={handleSaveDesign}>
  💾 Guardar Diseño
</button>

// Modal: nombrar el diseño
<input placeholder="Nombre tu diseño (ej: Cumpleaños de Ana)" />
```

**Paso 2: Ver Diseños Guardados**
- Panel en "Mi Cuenta" → "Mis Diseños"
- Grid con thumbnails de diseños
- Info: producto original, fecha, veces usado
- Acciones: Ver, Editar, Usar en otro producto, Eliminar

**Paso 3: Aplicar a Otro Producto**
```typescript
// Usuario clickea "Usar en otro producto"
// Modal muestra productos compatibles
<ProductSelector
  compatibleCategories={['Camisetas', 'Tazas', 'Marcos']}
  onSelect={handleApplyDesign}
/>

// Al seleccionar producto:
// 1. Navega a página de producto
// 2. Abre customizer
// 3. Pre-carga diseño guardado
// 4. Adapta elementos si es necesario
```

**Lógica de Adaptación:**
```typescript
function adaptDesignToProduct(
  design: SavedDesign,
  targetProduct: Product
): CustomizationSchema {
  // 1. Verificar compatibilidad de campos
  const targetSchema = targetProduct.customizationSchema;

  // 2. Mapear campos compatibles
  // Ej: "text_input" → "text_input" ✅
  // Ej: "color_selector" → "color_selector" ✅
  // Ej: "image_upload" → "image_upload" ✅

  // 3. Ajustar transforms para nuevo tamaño de canvas
  // Ej: Camiseta (70% área) → Taza (60% área)

  // 4. Advertir si hay incompatibilidades
  // Ej: Diseño usa campo que no existe en target

  // 5. Retornar diseño adaptado
  return adaptedDesign;
}
```

**Compatibilidad de Campos:**
| Campo Original | Compatible Con | Notas |
|----------------|----------------|-------|
| text_input | text_input | Directo |
| color_selector | color_selector | Si colores existen en target |
| size_selector | size_selector | Puede requerir ajuste |
| image_upload | image_upload | Directo, ajustar transform |
| dropdown | dropdown | Si opciones son similares |

**Endpoints API:**
- `/api/designs/save` - Guardar diseño
- `/api/designs/get-user-designs` - Obtener diseños del usuario
- `/api/designs/update` - Actualizar diseño
- `/api/designs/delete` - Eliminar diseño
- `/api/designs/duplicate` - Duplicar diseño
- `/api/designs/get-compatible-products` - Productos compatibles

#### Features Avanzadas
- ✅ Auto-save mientras personaliza
- ✅ Versiones de diseño (historial)
- ✅ Compartir diseño con amigos
- ✅ Diseños favoritos
- ✅ Búsqueda en diseños guardados
- ✅ Etiquetas/tags para organizar
- ✅ Carpetas/colecciones
- ✅ Export diseño como imagen
- ✅ Sugerencias: "Este diseño quedaría bien en..."
- ✅ Bundle: "Compra este diseño en 3 productos y ahorra 15%"

#### Smart Suggestions
```typescript
// Análisis de diseño
function analyzeDesign(design: SavedDesign): DesignAnalysis {
  return {
    hasText: boolean;
    hasImage: boolean;
    colors: string[];
    complexity: 'simple' | 'medium' | 'complex';
    orientation: 'horizontal' | 'vertical' | 'square';
  };
}

// Sugerir productos compatibles
function suggestProducts(
  design: SavedDesign,
  analysis: DesignAnalysis
): Product[] {
  // Si diseño es horizontal → Camisetas
  // Si diseño es cuadrado → Tazas, cojines
  // Si diseño es vertical → Marcos, pósters
  // Si tiene texto largo → Evitar productos pequeños
}
```

#### Beneficios
- ✅ **Cross-selling:** Usuario compra mismo diseño en varios productos
- ✅ **AOV:** Aumenta valor promedio de orden
- ✅ **User retention:** Razón para volver (ver diseños guardados)
- ✅ **Reduce fricción:** No re-hacer diseño desde cero
- ✅ **Better UX:** Menos trabajo, más compras
- ✅ **Data:** Insights sobre qué diseños son más populares

---

## 🗓️ Roadmap de Implementación

### Semana 1 (8-10 horas)
- [x] Crear documento FASE3_GROWTH.md
- [ ] **Plantillas Predefinidas (#7)**
  - [ ] Diseñar modelo de datos en Firestore
  - [ ] Crear componente `TemplateGallery.tsx`
  - [ ] Integrar en `DynamicCustomizer.tsx`
  - [ ] Crear 20 plantillas iniciales
  - [ ] API endpoints
  - [ ] Panel de admin para gestionar plantillas
  - [ ] Testing

### Semana 2 (10-12 horas)
- [ ] **Galería de Cliparts (#12)**
  - [ ] Diseñar modelo de datos
  - [ ] Sistema de capas (layers)
  - [ ] Componente `ClipartGallery.tsx`
  - [ ] Controles de capas (z-index, lock, visible)
  - [ ] Integración en customizer
  - [ ] Subir 100+ cliparts iniciales
  - [ ] API endpoints
  - [ ] Admin uploader
  - [ ] Testing

### Semana 3 (4-5 horas)
- [ ] **Compartir en Redes (#13)**
  - [ ] Componente `ShareDesignButton.tsx`
  - [ ] Generación de snapshots
  - [ ] URLs compartibles
  - [ ] Open Graph optimization
  - [ ] Tracking de shares
  - [ ] Testing en todas las plataformas

### Semana 4 (6-8 horas)
- [ ] **Usar Diseño en Otro Producto (#22)**
  - [ ] Sistema de diseños guardados
  - [ ] Lógica de adaptación
  - [ ] Componente `SavedDesigns.tsx`
  - [ ] `ProductSelector.tsx`
  - [ ] Sugerencias inteligentes
  - [ ] Bundles y descuentos
  - [ ] API endpoints
  - [ ] Testing

### Semana 5 (Buffer)
- [ ] Testing integral
- [ ] Optimización de performance
- [ ] Documentación
- [ ] Deploy gradual

---

## 📈 KPIs a Medir

### Baseline (Antes de Fase 3)
- Tasa de conversión en customizer: X%
- Abandono en personalización: Y%
- AOV: Z€
- Productos por orden: W

### Objetivos (3 meses después)
- 📊 **Conversión:** +40% (gracias a plantillas)
- 📊 **Abandono:** -50% (más fácil personalizar)
- 📊 **AOV:** +30% (cross-selling con diseños guardados)
- 📊 **Productos/orden:** +45% (mismo diseño en múltiples productos)
- 📊 **Shares:** 500+ diseños compartidos/mes
- 📊 **Uso de plantillas:** 70% de personalizaciones usan plantilla
- 📊 **Uso de cliparts:** 60% de personalizaciones añaden clipart
- 📊 **Diseños guardados:** Promedio 3 diseños/usuario

---

## 🔧 Stack Técnico

- **Frontend:** React + TypeScript
- **Backend:** Astro API routes + Firestore
- **Storage:** Firebase Storage (cliparts, thumbnails, snapshots)
- **Canvas:** HTML5 Canvas / Fabric.js (sistema de capas)
- **Image Processing:** html2canvas (snapshots), Sharp (server-side)
- **Icons/Cliparts:** Flaticon, Freepik, Openmoji
- **Analytics:** Firebase Analytics + Custom events
- **Utilities:** Zod (validaciones), nanoid (short IDs)

---

## 🎉 Beneficios Esperados

### Para el Usuario
- ✅ Personalización más fácil y rápida
- ✅ Diseños más profesionales (templates + cliparts)
- ✅ Reutilización eficiente de diseños
- ✅ Inspiración constante
- ✅ Compartir creaciones con orgullo

### Para el Negocio
- ✅ +40% tasa de conversión
- ✅ +30% AOV (cross-selling)
- ✅ -50% abandono en personalización
- ✅ +500 diseños compartidos/mes (marketing viral)
- ✅ Menor fricción = más ventas
- ✅ Datos sobre preferencias de diseño
- ✅ Potencial de monetización (templates/cliparts premium)

---

## ✅ Checklist de Implementación

### Plantillas Predefinidas
- [ ] Modelo de datos en Firestore
- [ ] Componente TemplateGallery
- [ ] Integración en DynamicCustomizer
- [ ] Crear 20 plantillas iniciales
- [ ] Filtros y búsqueda
- [ ] API endpoints
- [ ] Admin panel
- [ ] Analytics de uso
- [ ] Testing

### Galería de Cliparts
- [ ] Modelo de datos
- [ ] Sistema de capas (layers)
- [ ] Componente ClipartGallery
- [ ] Controles de capas
- [ ] Upload de cliparts
- [ ] 100+ cliparts iniciales
- [ ] Categorización y tags
- [ ] API endpoints
- [ ] Admin uploader
- [ ] Testing

### Compartir en Redes
- [ ] Componente ShareDesignButton
- [ ] Generación de snapshots
- [ ] URLs compartibles
- [ ] Open Graph tags
- [ ] Integración con redes sociales
- [ ] Tracking de shares/views/clicks
- [ ] Incentivos (descuentos por compartir)
- [ ] Testing en todas las plataformas

### Usar Diseño en Otro Producto
- [ ] Sistema de diseños guardados
- [ ] SavedDesigns component
- [ ] ProductSelector component
- [ ] Lógica de adaptación
- [ ] Sugerencias inteligentes
- [ ] Bundles y descuentos
- [ ] Auto-save
- [ ] Versiones de diseño
- [ ] API endpoints
- [ ] Testing

---

## 🚀 Próximos Pasos

### Fase Actual: Semana 1 - Plantillas Predefinidas
1. Diseñar esquema de base de datos
2. Crear componente TemplateGallery
3. Diseñar 20 plantillas iniciales variadas
4. Integrar en DynamicCustomizer
5. Testing y ajustes

### Siguiente: Semana 2 - Galería de Cliparts
Implementar sistema de capas y galería de cliparts

---

**Responsable:** Claude AI
**Última actualización:** 2025-11-13
**Progreso:** 5% (Documento de planificación completado)
