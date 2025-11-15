# 📘 Guía de Configuración para Productos Textiles

## Panel de Administración - SchemaEditor

Esta guía te explica cómo configurar el schema para productos textiles (camisetas, sudaderas, polos) para que tengan el preview frontal/trasero.

## Acceso al Panel Admin

1. Ve a `/admin/customization`
2. Selecciona o crea una categoría para textiles (ej: "Camisetas")
3. Click en "Editar Schema" o "Crear Nuevo Schema"

## Configuración de Preview Visual

En la sección **"Configuración de Preview Visual"** encontrarás tres campos:

### 🖼️ Imagen Preview por Defecto (Opcional)
```
Uso: Imagen que se muestra cuando no hay un color seleccionado
```
- **Opción 1**: Pega la URL de una imagen ya subida
- **Opción 2**: Click en "Subir" para seleccionar desde tu PC

### 🔵 Imagen Frontal (Para textiles - Opcional)
```
Uso: Vista frontal de la camiseta/sudadera/polo
```
- Esta imagen se mostrará cuando el usuario seleccione el botón "🔵 Frente"
- **Recomendación**: Sube una imagen del producto de frente con fondo transparente o neutro

### 🔴 Imagen Trasera (Para textiles - Opcional)
```
Uso: Vista trasera de la camiseta/sudadera/polo
```
- Esta imagen se mostrará cuando el usuario seleccione el botón "🔴 Espalda"
- **Recomendación**: Sube una imagen del producto de espalda con fondo transparente o neutro

## Ejemplo de Configuración Paso a Paso

### Escenario: Configurar una Camiseta Blanca

**Paso 1**: Prepara tus imágenes
- `camiseta-blanca-frente.png` (vista frontal)
- `camiseta-blanca-espalda.png` (vista trasera)

**Paso 2**: En el SchemaEditor
1. En **"Imagen Frontal"**:
   - Click en botón "Subir" (azul)
   - Selecciona `camiseta-blanca-frente.png`
   - Espera a que termine de subir
   - Verás el mensaje "Imagen frontal subida correctamente"

2. En **"Imagen Trasera"**:
   - Click en botón "Subir" (rojo)
   - Selecciona `camiseta-blanca-espalda.png`
   - Espera a que termine de subir
   - Verás el mensaje "Imagen trasera subida correctamente"

**Paso 3**: Configurar campos de personalización
Agrega al menos dos campos de tipo **"Subir Imagen"**:

1. **Campo Frontal**:
   ```
   Tipo: 🖼️ Subir Imagen
   Label: Diseño Frontal
   ID: front_image (automático, pero debe contener "front" o "frente")
   ```

2. **Campo Trasero**:
   ```
   Tipo: 🖼️ Subir Imagen
   Label: Diseño Trasero
   ID: back_image (automático, pero debe contener "back" o "espalda")
   ```

**Paso 4**: Agregar selector de talla y color (opcional)

1. **Color Selector**:
   ```
   Tipo: 🎨 Selector de Colores
   Label: Color de la Camiseta

   Configuración Avanzada:
   - Agrega colores (Blanco, Negro, Rojo, etc.)
   - Para cada color, puedes agregar imágenes específicas:
     * Preview Frontal: URL de la camiseta [COLOR] vista de frente
     * Preview Trasera: URL de la camiseta [COLOR] vista de espalda
   ```

2. **Size Selector**:
   ```
   Tipo: 📏 Selector de Tallas
   Label: Talla

   Configuración Avanzada:
   - Agrega tallas disponibles: XS, S, M, L, XL, XXL
   ```

**Paso 5**: Guardar Schema
- Click en "Guardar Schema"
- El schema se guardará en Firestore

## Asignar Schema a Productos

### Opción A: Al crear el producto
Cuando crees un producto en Firestore, incluye:
```javascript
{
  name: "Camiseta Personalizada",
  categoryId: "camisetas", // o "textiles" o similar
  customizationSchemaId: "EL_ID_DEL_SCHEMA",
  // ... otros campos
}
```

### Opción B: Detección automática
Si tu producto tiene:
- **categoryId** que incluya: `camiseta`, `sudadera`, `polo`, `textil`
- **tags** que incluyan: `camiseta`, `sudadera`, `polo`

El sistema detectará automáticamente que es un producto textil y buscará el schema correspondiente.

## Configuración Avanzada: Colores con Imágenes Front/Back

Si quieres que cada color tenga su propia vista frontal y trasera:

1. En el campo **"Color Selector"**, expandir **"Configuración Avanzada"**

2. Para cada color, en **ColorSelectorConfigEditor**:
   ```
   Nombre del color: Blanco
   Código Hex: #FFFFFF

   Vista previa:
   - Imagen Preview: (opcional - imagen por defecto)

   Preview por lado:
   - ✓ Imagen Frontal: https://ejemplo.com/camiseta-blanca-frente.png
   - ✓ Imagen Trasera: https://ejemplo.com/camiseta-blanca-espalda.png
   ```

3. Repite para cada color (Negro, Rojo, Azul, etc.)

## Resultado Final

Cuando un cliente personalice el producto:

1. **Verá un toggle con dos botones**:
   - 🔵 Frente
   - 🔴 Espalda

2. **Al hacer click en "Frente"**:
   - Se muestra la imagen frontal del producto
   - Puede subir su diseño frontal
   - Ajustar posición, tamaño, rotación

3. **Al hacer click en "Espalda"**:
   - Se muestra la imagen trasera del producto
   - Puede subir su diseño trasero
   - Ajustar independientemente

4. **Indicadores de estado**:
   - Badge azul: "Frente: ✓ Con diseño" / "○ Sin diseño"
   - Badge rojo: "Espalda: ✓ Con diseño" / "○ Sin diseño"

## Recomendaciones de Imágenes

### Dimensiones
- **Resolución recomendada**: 1000x1000px o 1500x1500px
- **Formato**: PNG con fondo transparente (preferido) o JPG con fondo blanco
- **Tamaño máximo**: 5MB por imagen

### Calidad
- Buena iluminación uniforme
- Producto centrado
- Sin sombras duras
- Fondo limpio (transparente o blanco)

### Consistencia
- Usar el mismo producto (mismo modelo de camiseta)
- Misma iluminación en frente y espalda
- Misma escala/tamaño en ambas vistas
- Mismo ángulo de cámara

## Troubleshooting

### ❌ "Las imágenes no se ven en el preview"
**Solución**:
- Verifica que las URLs sean públicas y accesibles
- Comprueba que el formato sea válido (JPG, PNG, WEBP)
- Verifica en la consola del navegador si hay errores de CORS

### ❌ "El toggle frontal/trasero no aparece"
**Solución**:
- Asegúrate de haber subido AMBAS imágenes (frontal Y trasera)
- Verifica que el producto sea detectado como textil:
  - categoryId incluya "camiseta", "sudadera", "polo", "textil"
  - O que tenga tags relevantes

### ❌ "Los diseños del usuario no se muestran correctamente"
**Solución**:
- Verifica que los campos de imagen tengan IDs con:
  - Frontal: "front", "frontal", o "frente"
  - Trasero: "back", "trasera", o "espalda"
- Comprueba la configuración de los campos image_upload

### ❌ "Al cambiar de color, las vistas no cambian"
**Solución**:
- Verifica que cada color tenga configurado `previewImages.front` y `previewImages.back`
- En ColorSelectorConfigEditor, asegúrate de haber guardado las URLs para cada color

## Testing

Para probar tu configuración:

1. Ve al customizer del producto: `/products/[slug]/customize`
2. Verifica que aparezcan los botones 🔵 Frente / 🔴 Espalda
3. Sube una imagen de prueba en "Diseño Frontal"
4. Cambia a vista trasera
5. Sube otra imagen en "Diseño Trasero"
6. Alterna entre vistas para verificar que ambas funcionan
7. Verifica los indicadores de estado

## Ejemplo Completo de Schema

```javascript
{
  "id": "camiseta_personalizada_schema",
  "name": "Camiseta Personalizada",
  "categoryId": "camisetas",

  "previewImages": {
    "default": "https://storage.com/camiseta-base.png",
    "front": "https://storage.com/camiseta-frente.png",
    "back": "https://storage.com/camiseta-espalda.png"
  },

  "fields": [
    {
      "id": "color",
      "fieldType": "color_selector",
      "label": "Color de la Camiseta",
      "required": true,
      "config": {
        "displayStyle": "color_blocks",
        "availableColors": [
          {
            "id": "white",
            "name": "Blanco",
            "hexColor": "#FFFFFF",
            "previewImages": {
              "front": "https://storage.com/camiseta-blanca-frente.png",
              "back": "https://storage.com/camiseta-blanca-espalda.png"
            }
          },
          {
            "id": "black",
            "name": "Negro",
            "hexColor": "#000000",
            "previewImages": {
              "front": "https://storage.com/camiseta-negra-frente.png",
              "back": "https://storage.com/camiseta-negra-espalda.png"
            }
          }
        ]
      }
    },
    {
      "id": "size",
      "fieldType": "size_selector",
      "label": "Talla",
      "required": true,
      "config": {
        "displayStyle": "buttons",
        "availableSizes": ["XS", "S", "M", "L", "XL", "XXL"]
      }
    },
    {
      "id": "front_image",
      "fieldType": "image_upload",
      "label": "Diseño Frontal",
      "required": false,
      "config": {
        "maxSizeMB": 10,
        "allowedFormats": ["jpg", "jpeg", "png"],
        "showPreview": true,
        "showPositionControls": true
      }
    },
    {
      "id": "back_image",
      "fieldType": "image_upload",
      "label": "Diseño Trasero",
      "required": false,
      "config": {
        "maxSizeMB": 10,
        "allowedFormats": ["jpg", "jpeg", "png"],
        "showPreview": true,
        "showPositionControls": true
      }
    }
  ],

  "pricing": {
    "basePrice": 15.00
  }
}
```

## Flujo Completo del Usuario Final

1. Cliente entra a `/products/camiseta-personalizada/customize`
2. Selecciona el color (ej: Blanco)
   - El preview cambia a camiseta blanca vista frontal
3. Selecciona la talla (ej: L)
4. En "Diseño Frontal", sube una imagen de su logo
   - La imagen aparece en la vista frontal
   - Puede ajustar posición, tamaño, rotación
5. Click en botón "🔴 Espalda"
   - El preview cambia a vista trasera
6. En "Diseño Trasero", sube una imagen de un nombre
   - La imagen aparece en la vista trasera
   - Puede ajustar independientemente
7. Alterna entre frente y espalda para revisar
8. Click en "Agregar al Carrito"
9. El pedido se guarda con ambos diseños

---

**Fecha de creación**: 2025-11-15
**Versión**: 1.0
**Relacionado con**: PREVIEW_TEXTIL_FRENTE_ESPALDA.md
