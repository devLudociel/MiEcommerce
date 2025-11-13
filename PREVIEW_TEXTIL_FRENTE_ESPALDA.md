# 👕 Preview Frontal/Trasero para Productos Textiles

## Descripción

Sistema de preview especializado para productos textiles (camisetas, sudaderas, polos) que permite a los usuarios:

- **Ver dos vistas separadas**: frente y espalda del producto
- **Subir diseños diferentes** para cada lado
- **Alternar entre vistas** con botones toggle
- **Controles independientes** de posición, tamaño y rotación para cada lado
- **Indicadores de estado** mostrando qué lados tienen diseño

## Componentes Creados

### `TextileProductPreview.tsx`

Preview especializado con las siguientes características:

**Props:**
```typescript
interface TextileProductPreviewProps {
  frontImage: string;              // Vista frontal del producto
  backImage: string;               // Vista trasera del producto
  userFrontImage?: string | null;  // Diseño del usuario para frente
  userBackImage?: string | null;   // Diseño del usuario para espalda
  frontTransform?: ImageTransform; // Transformación del diseño frontal
  backTransform?: ImageTransform;  // Transformación del diseño trasero
  productName?: string;
  onTransformChange?: (side: 'front' | 'back', transform: ImageTransform) => void;
  printAreaPercentage?: number;
}
```

**Características Principales:**

1. **Toggle Frente/Espalda**
   - Botones: 🔵 Frente / 🔴 Espalda
   - Indica con ✓ qué lados tienen diseño
   - Transición suave entre vistas

2. **Controles de Zoom Independientes**
   - Zoom in/out (100% - 300%)
   - Reset zoom
   - Mismo nivel de zoom se mantiene al cambiar de vista

3. **Área de Impresión por Lado**
   - Muestra área imprimible según el lado activo
   - Labels: "Área de Impresión (Frente)" o "Área de Impresión (Espalda)"
   - Borde punteado morado con overlay transparente

4. **Guías de Centrado**
   - Líneas verdes cuando la imagen está centrada
   - Círculo verde en el centro
   - Indicador "✓ Centrado" en el footer

5. **Indicadores de Estado**
   - Badge azul: "Frente: ✓ Con diseño" / "○ Sin diseño"
   - Badge rojo: "Espalda: ✓ Con diseño" / "○ Sin diseño"
   - Muestra visualmente qué lados están completos

6. **Botón de Reset**
   - Icono RotateCcw para resetear transformación
   - Restaura posición, escala y rotación por defecto

## Integración en DynamicCustomizer

### Detección Automática de Productos Textiles

```typescript
const isTextileProduct = (): boolean => {
  const categoryLower = product.categoryId?.toLowerCase() || '';
  const nameLower = product.name?.toLowerCase() || '';
  const subcategoryLower = (product as any).subcategoryId?.toLowerCase() || '';
  const tags = (product as any).tags?.map((t: string) => t.toLowerCase()) || [];

  return (
    categoryLower.includes('camiseta') ||
    categoryLower.includes('sudadera') ||
    categoryLower.includes('polo') ||
    categoryLower.includes('textil') ||
    categoryLower.includes('ropa') ||
    subcategoryLower.includes('camiseta') ||
    // ... más condiciones
  );
};
```

Detecta automáticamente si un producto es textil basándose en:
- CategoryId
- SubcategoryId
- Nombre del producto
- Tags

### Helper Functions

**1. getTextileFrontImage()**
```typescript
// Busca campo de imagen con "front", "frontal" o "frente" en ID o label
// Fallback: primer campo de tipo image_upload
```

**2. getTextileBackImage()**
```typescript
// Busca campo de imagen con "back", "trasera" o "espalda" en ID o label
```

**3. getTextileFrontTransform() / getTextileBackTransform()**
```typescript
// Obtiene la transformación (posición, escala, rotación) por lado
```

**4. getTextileBaseFrontImage() / getTextileBaseBackImage()**
```typescript
// Obtiene la imagen base del producto (frontal o trasera)
// Busca en:
// 1. schema.previewImages.front / schema.previewImages.back
// 2. Color selector con previewImages.front / previewImages.back
// 3. Fallback: imagen default del producto
```

### Renderizado Condicional

```typescript
{isResinProduct() ? (
  <SplitProductPreview {...props} />
) : isTextileProduct() ? (
  <TextileProductPreview
    frontImage={getTextileBaseFrontImage()}
    backImage={getTextileBaseBackImage()}
    userFrontImage={getTextileFrontImage()}
    userBackImage={getTextileBackImage()}
    frontTransform={getTextileFrontTransform()}
    backTransform={getTextileBackTransform()}
    productName={product.name}
  />
) : (
  <ProductPreview {...props} />
)}
```

## Configuración del Schema

Para que un producto use el preview textil, debe tener:

### Opción 1: Campos de Imagen Separados

```typescript
{
  id: 'front_design',
  label: 'Diseño Frontal',
  fieldType: 'image_upload',
  // ...
},
{
  id: 'back_design',
  label: 'Diseño Trasero',
  fieldType: 'image_upload',
  // ...
}
```

El sistema detecta automáticamente campos que contengan:
- **Front**: "front", "frontal", "frente"
- **Back**: "back", "trasera", "espalda"

### Opción 2: Preview Images en el Schema

```typescript
{
  id: 'shirt_customization_schema',
  // ...
  previewImages: {
    default: '/images/products/camiseta-blanca-frente.png',
    front: '/images/products/camiseta-blanca-frente.png',
    back: '/images/products/camiseta-blanca-espalda.png',
  },
}
```

### Opción 3: Preview Images en Color Selector

```typescript
{
  id: 'color',
  fieldType: 'color_selector',
  config: {
    availableColors: [
      {
        id: 'white',
        name: 'Blanco',
        previewImages: {
          front: '/images/camisetas/blanca-frente.png',
          back: '/images/camisetas/blanca-espalda.png',
        },
      },
      {
        id: 'black',
        name: 'Negro',
        previewImages: {
          front: '/images/camisetas/negra-frente.png',
          back: '/images/camisetas/negra-espalda.png',
        },
      },
    ],
  },
}
```

## Ejemplo de Uso

### Schema para Camiseta Personalizada

```typescript
{
  id: 'camiseta_personalizada',
  name: 'Camiseta Personalizada',
  categoryId: 'cat_camisetas',

  previewImages: {
    default: '/images/camiseta-base-frente.png',
    front: '/images/camiseta-base-frente.png',
    back: '/images/camiseta-base-espalda.png',
  },

  fields: [
    {
      id: 'color',
      label: 'Color de la Camiseta',
      fieldType: 'color_selector',
      config: {
        availableColors: [
          {
            id: 'white',
            name: 'Blanco',
            hexColor: '#FFFFFF',
            previewImages: {
              front: '/images/camisetas/blanca-frente.png',
              back: '/images/camisetas/blanca-espalda.png',
            },
          },
          {
            id: 'black',
            name: 'Negro',
            hexColor: '#000000',
            previewImages: {
              front: '/images/camisetas/negra-frente.png',
              back: '/images/camisetas/negra-espalda.png',
            },
          },
        ],
      },
    },
    {
      id: 'size',
      label: 'Talla',
      fieldType: 'size_selector',
      config: {
        availableSizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      },
    },
    {
      id: 'front_image',
      label: 'Diseño Frontal',
      fieldType: 'image_upload',
      description: 'Sube el diseño que quieres en el frente de la camiseta',
      config: {
        maxFileSize: 10485760,  // 10MB
        acceptedFormats: ['image/png', 'image/jpeg', 'image/jpg'],
        allowPositioning: true,
        allowRotation: true,
        allowScaling: true,
      },
    },
    {
      id: 'back_image',
      label: 'Diseño Trasero',
      fieldType: 'image_upload',
      description: 'Sube el diseño que quieres en la espalda de la camiseta',
      config: {
        maxFileSize: 10485760,
        acceptedFormats: ['image/png', 'image/jpeg', 'image/jpg'],
        allowPositioning: true,
        allowRotation: true,
        allowScaling: true,
      },
    },
  ],

  pricing: {
    basePrice: 15.00,
  },
}
```

## Flujo de Usuario

1. **Selecciona el producto textil** (camiseta, sudadera, etc.)
2. **Elige color y talla** usando los selectores
3. **Sube diseño frontal**:
   - Click en campo "Diseño Frontal"
   - Sube imagen
   - Ajusta posición, tamaño, rotación
   - Ve preview en tiempo real en vista frontal
4. **Cambia a vista trasera** con botón "🔴 Espalda"
5. **Sube diseño trasero**:
   - Click en campo "Diseño Trasero"
   - Sube imagen diferente
   - Ajusta independientemente
6. **Alterna entre vistas** para revisar ambos lados
7. **Agrega al carrito** cuando esté satisfecho

## UX Mejorada vs Versión Anterior

### ❌ Antes (ProductPreview simple)
- Solo una vista del producto
- Confusión sobre dónde va cada diseño
- No se podía ver la espalda
- Mismo diseño aplicado a ambos lados (limitante)

### ✅ Ahora (TextileProductPreview)
- Dos vistas claramente separadas
- Toggle intuitivo entre frente y espalda
- Diseños completamente independientes
- Indicadores visuales de qué está completo
- Controles separados por lado
- Preview exacto de cómo quedará el producto

## Ventajas del Sistema

### Para el Usuario
- **Claridad**: Sabe exactamente qué está personalizando
- **Flexibilidad**: Puede usar diseños diferentes en cada lado
- **Feedback visual**: Ve el resultado final antes de comprar
- **Control**: Ajusta cada lado independientemente

### Para el Negocio
- **Menos devoluciones**: Cliente sabe exactamente qué recibirá
- **Más ventas**: Mayor confianza = más conversiones
- **Diferenciación**: Permite productos más complejos
- **Escalable**: Se adapta automáticamente a nuevos productos textiles

### Para el Desarrollo
- **Reutilizable**: Un componente para todos los textiles
- **Automático**: Detección automática de productos
- **Mantenible**: Configuración por schema, no por código
- **Extensible**: Fácil agregar más funcionalidades

## Productos que Usan Este Preview

El preview textil se activa automáticamente para productos con:
- **CategoryId** que incluya: camiseta, sudadera, polo, textil, ropa
- **SubcategoryId** que incluya: camiseta, sudadera, polo, textil, ropa
- **Name** que incluya: camiseta, sudadera, polo
- **Tags** que incluyan: camiseta, sudadera, polo, textil, ropa

**Ejemplos:**
- ✅ Camisetas personalizadas
- ✅ Sudaderas con capucha
- ✅ Polos de empresa
- ✅ Camisetas deportivas
- ✅ Hoodies personalizados
- ❌ Cuadros (usa ProductPreview)
- ❌ Tazas (usa ProductPreview)
- ❌ Figuras de resina (usa SplitProductPreview)

## Próximos Pasos Sugeridos

### Mejoras Opcionales
1. **Drag & Drop**: Arrastrar imágenes entre frente y espalda
2. **Preview 3D**: Rotar producto en 3D para ver todos los ángulos
3. **Vistas Laterales**: Agregar vista lateral para productos más complejos
4. **Modo Comparación**: Ver frente y espalda lado a lado
5. **Plantillas Dobles**: Templates que incluyan diseño para ambos lados

### Recomendaciones
- Asegurar que los productos tienen imágenes de alta calidad para frente y espalda
- Configurar correctamente categoryId o tags para detección automática
- Usar nomenclatura consistente en IDs de campos (front/back)
- Proveer guidelines de diseño para área imprimible por lado

---

**Archivo creado:** 2025-11-13
**Commit:** a061dcb
**Branch:** claude/code-review-session-017kkbwPHD2oEfn5DBc5oPFU
