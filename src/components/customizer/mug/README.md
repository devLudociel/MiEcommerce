# Sistema de Personalización de Tazas

Sistema completo de personalización para tazas, termos y botellas, similar a Vistaprint.

## 📁 Estructura de Archivos

```
mug/
├── MugCustomizer.tsx          # Componente principal que integra todo
├── MugCanvas3D.tsx            # Vista previa 3D con rotación
├── MugToolsPanel.tsx          # Panel lateral de herramientas
├── MugOptionsPanel.tsx        # Panel de opciones (Material, Color, etc.)
├── MugReviewScreen.tsx        # Pantalla de revisión final
├── types.ts                   # Tipos TypeScript
├── mugConfig.ts               # Configuración (colores, materiales, etc.)
├── index.ts                   # Exportaciones
└── README.md                  # Esta documentación
```

## 🎨 Características

### 1. **Herramientas de Diseño**

- **Texto**: Agrega texto personalizado con:
  - Múltiples fuentes
  - Tamaños de 12px a 72px
  - 10 colores predefinidos
  - Negrita, cursiva
  - Alineación (izquierda, centro, derecha)

- **Nombres**: Sistema para agregar múltiples nombres (en desarrollo)

- **Archivos Subidos**: Sube imágenes JPG, PNG, SVG (máx 10MB)

- **Gráficos**: Biblioteca de cliparts predefinidos

- **Fondo**: Colores de fondo personalizados

- **Plantillas**: Diseños predefinidos listos para usar

- **Tablas**: Layouts estructurados (en desarrollo)

### 2. **Opciones del Producto**

#### Material
- **Estándar** (€0): Cerámica de alta calidad
- **Mágica** (+€3.50): Cambia de color con el calor

#### Área de Impresión
- **Doble cara** (-€0.70): Diseño en frente y atrás
- **Impresión 360°** (€0): Diseño envuelve toda la taza

#### Colores
8 opciones de colores con precios variables:
- Blanco (-€0.70)
- Azul y blanco (€0)
- Blanco y negro (€0)
- Rojo y blanco (€0)
- Rosa y blanco (+€3.60/unidad)
- Naranja y blanco (€0)
- Amarillo y blanco (€0)
- Verde y blanco (€0)
- Mágica: blanco y negro (€0) - Solo con material mágico

#### Tamaños (Opcional)
- Pequeña (250ml) - €0
- Mediana (350ml) - +€2
- Grande (500ml) - +€4

### 3. **Vista Previa 3D**

- Canvas interactivo con área de seguridad
- Zoom: 50% - 300%
- Rotación: Arrastra para rotar
- Muestra dimensiones (21.5cm × 8cm para 360°)
- Guías de alineación
- Toggle para área de seguridad y márgenes

### 4. **Pantalla de Revisión**

Checklist de verificación:
- ✓ ¿Son el texto y las imágenes claros?
- ✓ ¿Encajan en el área de seguridad?
- ✓ ¿Llega el fondo hasta los bordes?
- ✓ ¿Está todo bien escrito?

Checkbox de confirmación obligatorio antes de continuar.

## 🔧 Uso

### Integración Automática

El sistema se integra automáticamente con productos de tazas:

```tsx
// En ProductCustomizer.tsx
const isMugProduct = schemaId === 'cat_tazas';

{isMugProduct ? (
  <MugCustomizer product={product} />
) : (
  <DynamicCustomizer product={product} schema={dynamicSchema} />
)}
```

### Uso Manual

```tsx
import { MugCustomizer } from './components/customizer/mug';

<MugCustomizer
  product={{
    id: 'mug-001',
    name: 'Taza Personalizada',
    basePrice: 8.39,
    images: ['/taza-blanca.png'],
    slug: 'taza-personalizada',
    categoryId: 'tazas',
    // ...
  }}
/>
```

## 📊 Estructura de Datos

### MugCustomizationData

```typescript
interface MugCustomizationData {
  // Opciones del producto
  material: 'standard' | 'magic';
  printArea: 'double_side' | '360';
  color: string; // ID del color
  size?: 'small' | 'medium' | 'large';

  // Elementos de diseño
  elements: MugDesignElement[]; // Para impresión 360°
  frontElements?: MugDesignElement[]; // Para doble cara
  backElements?: MugDesignElement[]; // Para doble cara

  // Template aplicado
  templateId?: string;
}
```

### MugDesignElement

```typescript
interface MugDesignElement {
  id: string;
  type: 'text' | 'image' | 'clipart' | 'background';
  x: number; // 0-100%
  y: number; // 0-100%
  width: number; // 0-100%
  height: number; // 0-100%
  rotation: number; // 0-360°
  zIndex: number;

  // Para texto
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';

  // Para imágenes
  imageUrl?: string;
  imageData?: string; // Base64

  // Para fondo
  backgroundColor?: string;
  backgroundPattern?: string;
}
```

## 🎯 Flujo de Usuario

1. **Diseño**
   - Usuario selecciona herramienta (Texto, Imagen, etc.)
   - Agrega elementos al canvas
   - Ajusta posición, tamaño, rotación

2. **Configuración**
   - Selecciona material (Estándar/Mágica)
   - Elige área de impresión (Doble cara/360°)
   - Selecciona color
   - Ve precio actualizado en tiempo real

3. **Revisión**
   - Click en "Añadir al carrito"
   - Pantalla de revisión con checklist
   - Confirma diseño
   - Agrega al carrito

4. **Carrito**
   - Redirige a `/cart`
   - Muestra resumen de personalización

## 🔄 Diferencias con DynamicCustomizer

| Aspecto | DynamicCustomizer | MugCustomizer |
|---------|------------------|---------------|
| UI | Genérico, campos de formulario | Especializado, herramientas visuales |
| Preview | Imagen plana 2D | Canvas 3D rotable |
| Diseño | Basado en schema de Firestore | Configuración hardcoded |
| Elementos | Solo upload de imagen | Texto, imágenes, cliparts, plantillas |
| Edición | Controles básicos | Editor visual completo |
| Revisión | No incluida | Pantalla de revisión dedicada |

## 🚀 Próximas Mejoras

- [ ] Implementar herramienta "Nombres" (texto múltiple)
- [ ] Implementar herramienta "Tablas" (layouts grid)
- [ ] Sistema de capas (reordenar z-index)
- [ ] Deshacer/Rehacer
- [ ] Guardar diseños del usuario
- [ ] Compartir diseños
- [ ] Más plantillas predefinidas
- [ ] Biblioteca de cliparts expandida
- [ ] Preview 3D real (Three.js)
- [ ] Exportar a PDF para verificación
- [ ] Sistema de colaboración (múltiples usuarios)

## 📝 Notas Técnicas

### Rendimiento

- Lazy loading de componentes con `React.lazy()`
- Imágenes comprimidas antes de subir
- State management optimizado (solo re-render cuando necesario)

### Compatibilidad

- Responsive (desktop, tablet, mobile)
- Navegadores modernos (Chrome, Firefox, Safari, Edge)
- Touch support para tablets

### Accesibilidad

- Etiquetas ARIA
- Navegación por teclado
- Contraste de colores WCAG AA

## 🐛 Debugging

```tsx
// Activar logs detallados
logger.info('[MugCustomizer] Element added', { elementId, type });

// Ver estado actual en consola
console.log('Current customization:', customization);
```

## 📄 Licencia

Parte del proyecto MiEcommerce.
