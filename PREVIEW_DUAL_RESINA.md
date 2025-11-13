# 🎨 Preview Dual para Productos de Resina

## ✅ Solución Implementada

Ahora los productos tipo **resina/figuras** muestran **DOS previews separados** en lugar de uno con imagen superpuesta.

## 📸 Antes vs Después

### ❌ ANTES (Confuso)
```
┌─────────────────────────────┐
│ Vista Previa                │
│                             │
│  [caja con imagen           │
│   del cliente superpuesta]  │
│                             │
└─────────────────────────────┘
```
**Problema:** Parecía que la imagen se iba a imprimir en la caja, pero en realidad es solo una referencia.

### ✅ DESPUÉS (Claro)
```
┌─────────────────────────────┐
│ 📦 Tu caja personalizada    │
│                             │
│  [solo la caja con el       │
│   color seleccionado]       │
│                             │
└─────────────────────────────┘

┌─────────────────────────────┐
│ 🖼️ Foto de referencia       │
│  Para crear tu figura       │
│                             │
│  [solo la imagen            │
│   del cliente]              │
│                             │
└─────────────────────────────┘
```
**Solución:** Dos previews separados dejan claro que son cosas diferentes.

## 🔧 Cómo Funciona

### 1. Componente Nuevo: `SplitProductPreview.tsx`

Este componente muestra **DOS previews independientes**:

#### Preview 1: Caja Personalizada
- ✅ Muestra SOLO la imagen de la caja
- ✅ Sin imagen del cliente superpuesta
- ✅ Controles de zoom independientes
- ✅ Título: "Tu caja personalizada"

#### Preview 2: Foto de Referencia
- ✅ Muestra SOLO la imagen del cliente
- ✅ Sin caja de fondo
- ✅ Controles de zoom independientes
- ✅ Título: "Foto de referencia - Para crear tu figura"
- ✅ Mensaje explicativo: "La usaremos para crear tu figura personalizada y te enviaremos el resultado final"

### 2. Detección Automática

El `DynamicCustomizer` detecta automáticamente si es un producto de resina:

```typescript
function isResinProduct(): boolean {
  // Detecta por:
  - categoryId contiene "resina" o "figura"
  - subcategoryId contiene "resina" o "figura"
  - name contiene "resina" o "figura"
  - tags contienen "resina" o "figura"
}
```

Si es resina → usa `SplitProductPreview`
Si NO es resina → usa `ProductPreview` normal

### 3. Productos Afectados

Automáticamente aplica a productos que contengan estas palabras:
- ✅ "resina"
- ✅ "figura"

En cualquiera de estos campos:
- `categoryId`
- `subcategoryId`
- `name`
- `tags`

## 📦 Archivos Modificados

### Creado
- **`src/components/customizer/SplitProductPreview.tsx`** (258 líneas)
  - Componente dual preview
  - Zoom independiente para cada preview
  - Diseño claro con íconos y mensajes explicativos

### Modificado
- **`src/components/customizer/DynamicCustomizer.tsx`**
  - Import de `SplitProductPreview`
  - Función `isResinProduct()` para detección
  - Renderizado condicional del preview

## 🎯 Beneficios

### Para el Cliente
1. ✅ **Claridad:** Entiende que la imagen es solo referencia
2. ✅ **Sin confusión:** No piensa que la imagen se imprimirá en la caja
3. ✅ **Mejor UX:** Ve claramente los dos elementos separados
4. ✅ **Preview realista:** Ve cómo quedará realmente su caja

### Para Ti (Administrador)
1. ✅ **Menos consultas:** Los clientes entienden qué están comprando
2. ✅ **Mejor comunicación:** Mensaje claro de "foto de referencia"
3. ✅ **Workflow claro:** La imagen es para que tú crees la figura
4. ✅ **Automático:** No necesitas configurar nada, detecta por nombre/categoría

## 🚀 Uso

### Automático
No necesitas hacer nada. Si tu producto:
- Se llama "Figura de resina"
- Tiene categoryId que contiene "resina"
- Tiene tags que contienen "figura"

Automáticamente usará el preview dual.

### Manual (Forzar para un producto específico)

Si quieres que un producto específico use el preview dual aunque no tenga "resina" en el nombre:

**Opción 1:** Agregar tag
```javascript
// En Firestore, producto:
{
  id: "producto-123",
  name: "Escultura personalizada",
  tags: ["personalizado", "resina"]  // ← Agregar "resina"
}
```

**Opción 2:** Agregar a categoryId
```javascript
{
  id: "producto-123",
  categoryId: "cat_figuras_resina"  // ← Contiene "resina"
}
```

## 🔍 Testing

### Verificar que funciona:

1. **Ir al customizer de resina:**
   ```
   http://localhost:4321/personalizar/figura-personalizada-resina
   ```

2. **Seleccionar color de caja:**
   - Debería mostrar SOLO la caja en el primer preview
   - Sin imagen superpuesta

3. **Subir imagen:**
   - Debería aparecer SOLO en el segundo preview
   - Sin caja de fondo

4. **Controles de zoom:**
   - Cada preview tiene sus propios controles
   - Funcionan independientemente

## 🐛 Troubleshooting

### El preview dual NO aparece

**Causa:** El producto no está siendo detectado como resina.

**Solución:** Verificar que el producto tenga "resina" o "figura" en:
- `categoryId`
- `subcategoryId`
- `name`
- `tags`

**Debug:**
```javascript
// En consola del navegador:
console.log(product.categoryId);
console.log(product.name);
console.log(product.tags);
```

### Quiero usar preview dual en otro tipo de producto

**Solución 1:** Modificar la función `isResinProduct()` en `DynamicCustomizer.tsx`:

```typescript
const isResinProduct = (): boolean => {
  // ... código existente ...

  // Agregar tu condición personalizada:
  return (
    categoryLower.includes('resina') ||
    categoryLower.includes('figura') ||
    categoryLower.includes('escultura') ||  // ← Agregar aquí
    // ... resto del código
  );
};
```

**Solución 2:** Agregar "resina" a los tags del producto en Firestore.

## 📝 Commit

```
Commit: 5456ece
Message: feat: Agregar preview dual para productos de resina
Branch: claude/code-review-session-017kkbwPHD2oEfn5DBc5oPFU
```

## 🎨 Personalización

### Cambiar textos

Editar `DynamicCustomizer.tsx` línea 415-416:

```typescript
<SplitProductPreview
  baseImage={getBaseImage()}
  userImage={getUserImage()}
  productName={product.name}
  baseImageLabel="Tu caja personalizada"      // ← Cambiar aquí
  userImageLabel="Foto de referencia"         // ← Cambiar aquí
/>
```

### Cambiar colores

Editar `SplitProductPreview.tsx`:

```typescript
// Header de caja (línea 55)
className="bg-gradient-to-r from-purple-500 to-cyan-500 p-4"

// Header de referencia (línea 123)
className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4"
```

## ✅ Conclusión

Ahora los clientes ven claramente:
1. 📦 Cómo quedará su caja con el color seleccionado
2. 🖼️ Qué foto están enviando como referencia

Sin confusión de que la imagen se vaya a imprimir en la caja.

---

**Estado:** ✅ Implementado y funcionando
**Testing:** ✅ Probado con figuras de resina
**Deploy:** 🚀 Pusheado a repo
