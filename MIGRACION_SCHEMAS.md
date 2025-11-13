# Migración a Schemas Dinámicos

## 🎯 Objetivo

Migrar los customizers hardcodeados (ShirtCustomizer, FrameCustomizer, ResinCustomizer) a un sistema dinámico basado en schemas configurables desde Firestore.

## 🔍 Problema Identificado

### Sistema Anterior (❌ Hardcodeado)

```typescript
// ShirtCustomizer.tsx (617 líneas)
const SHIRT_COLORS = {
  blanco: { color: '#FFFFFF', name: 'Blanco' },
  negro: { color: '#1a1a1a', name: 'Negro' },
  // ... cambios requieren editar código
};

// FrameCustomizer.tsx (590 líneas)
const FLOWER_COLORS = {
  rosa: { primary: '#EC4899', name: 'Rosas' },
  // ... cambios requieren editar código
};

// ResinCustomizer.tsx (602 líneas)
const BOX_COLORS = {
  azul: { color: '#3B82F6', name: 'Azul' },
  // ... cambios requieren editar código
};
```

**Problemas:**
- ❌ Cambios requieren editar código y desplegar
- ❌ No reutilizable para nuevos productos
- ❌ Duplicación de lógica similar
- ❌ Sin templates, cliparts, ni save/share
- ❌ Solo 3-4 tipos de campos soportados

### Sistema Nuevo (✅ Dinámico)

```typescript
// DynamicCustomizer.tsx (530 líneas)
// + SchemaEditor.tsx (550 líneas de interfaz visual)
// + exampleSchemas.ts (284 líneas de configuración)

// Admin puede crear/editar schemas desde la interfaz:
// - 10 tipos de campos diferentes
// - Templates predefinidos
// - Cliparts integrados
// - Save & Share designs
// - Conditional fields
```

**Ventajas:**
- ✅ Cambios sin código (desde admin panel)
- ✅ Reutilizable para cualquier producto
- ✅ Lógica centralizada
- ✅ Features avanzados incluidos
- ✅ 10 tipos de campos soportados

## 📋 Pasos de Migración

### 1. Importar Schemas a Firestore

```bash
# Ejecutar script de importación
npx tsx scripts/importSchemas.ts
```

Este script importa los schemas de `src/data/exampleSchemas.ts` a Firestore:

- `cat_camisetas` → Schema para camisetas/textiles
- `cat_cuadros` → Schema para cuadros/marcos
- `cat_resina` → Schema para figuras de resina
- `cat_tazas` → Schema para tazas/sublimados

### 2. Verificar en Firebase Console

1. Abrir Firebase Console
2. Ir a Firestore Database
3. Buscar colección `customization_schemas`
4. Verificar que existen los 4 documentos

### 3. Actualizar ProductCustomizer.tsx

**Antes:**
```typescript
// ProductCustomizer.tsx línea 279-288
switch (customizerType) {
  case 'shirt':
    return <ShirtCustomizer product={product} />;
  case 'frame':
    return <FrameCustomizer product={product} />;
  case 'resin':
    return <ResinCustomizer product={product} />;
  default:
    return <ShirtCustomizer product={product} />;
}
```

**Después:**
```typescript
// ProductCustomizer.tsx - usar solo DynamicCustomizer
if (useDynamic && dynamicSchema) {
  return <DynamicCustomizer product={product} schema={dynamicSchema} />;
}

// Fallback si no hay schema (mostrar error)
return (
  <div className="text-center p-8">
    <h2 className="text-2xl font-bold mb-4">
      Customizer no configurado
    </h2>
    <p>Este producto aún no tiene un schema de personalización.</p>
  </div>
);
```

### 4. Eliminar Customizers Hardcodeados

```bash
# Eliminar archivos obsoletos
rm src/components/customizer/ShirtCustomizer.tsx
rm src/components/customizer/FrameCustomizer.tsx
rm src/components/customizer/ResinCustomizer.tsx
```

### 5. Eliminar Imports en ProductCustomizer.tsx

```typescript
// Eliminar estas líneas (13-15):
const ShirtCustomizer = lazy(() => import('./ShirtCustomizer.tsx'));
const FrameCustomizer = lazy(() => import('./FrameCustomizer.tsx'));
const ResinCustomizer = lazy(() => import('./ResinCustomizer.tsx'));
```

### 6. Configurar Productos

Para cada producto en Firestore, asegurarse que tenga el campo correcto:

```javascript
// Opción 1: Usar customizationSchemaId explícito
{
  id: "producto-123",
  name: "Camiseta Premium",
  customizationSchemaId: "cat_camisetas" // ID del schema a usar
}

// Opción 2: Dejar que detectSchemaId lo auto-detecte por subcategoryId
{
  id: "producto-456",
  name: "Cuadro de Flores",
  subcategoryId: "cuadros" // Automáticamente usará cat_cuadros
}
```

## 🔧 Gestión de Schemas desde Admin

### Editar Schema Existente

1. Ir a `/admin/customization`
2. Seleccionar categoría
3. Click en "Editar Schema"
4. Modificar campos:
   - Agregar/eliminar campos
   - Cambiar orden (drag & drop)
   - Configurar colores/opciones
   - Establecer precios
5. Guardar

### Crear Nuevo Schema

1. Ir a `/admin/customization`
2. Click en "Crear Nuevo Schema"
3. Seleccionar categoría
4. Agregar campos:
   - Color Selector
   - Size Selector
   - Dropdown
   - Image Upload
   - Text Input
   - Number Input
   - Checkbox
   - Radio Group
   - Card Selector
   - Dimensions Input
5. Configurar preview images
6. Guardar

## 📊 Tipos de Campos Soportados

| Tipo | Descripción | Config |
|------|-------------|--------|
| `color_selector` | Selector de colores con preview | availableColors[], displayStyle |
| `size_selector` | Selector de tallas | sizes[], showSizeGuide |
| `dropdown` | Lista desplegable | options[] |
| `image_upload` | Upload de imagen | maxSizeMB, allowedFormats, showPreview |
| `text_input` | Campo de texto | placeholder, maxLength |
| `number_input` | Campo numérico | min, max, step |
| `checkbox` | Checkbox simple | defaultValue |
| `radio_group` | Radio buttons | options[] |
| `card_selector` | Selector visual tipo cards | options[], displayStyle |
| `dimensions_input` | Alto x Ancho | minWidth, maxWidth, minHeight, maxHeight, unit |

## 🎨 Features Adicionales

### Templates

Los usuarios pueden seleccionar plantillas predefinidas:

```typescript
// En SchemaEditor, configurar templates:
{
  id: "template-1",
  name: "Diseño Vintage",
  template: {
    fields: [
      { fieldId: "tshirt_color", value: "black" },
      { fieldId: "tshirt_size", value: "L" }
    ]
  }
}
```

### Cliparts

Biblioteca de elementos gráficos reutilizables:
- Iconos
- Ilustraciones
- Decoraciones

### Save & Share

Los usuarios pueden:
- Guardar sus diseños
- Compartir con otros
- Cargar diseños guardados

### Conditional Fields

Mostrar campos según valores de otros:

```typescript
{
  id: "custom_text",
  fieldType: "text_input",
  label: "Texto personalizado",
  condition: {
    dependsOn: "tshirt_color",
    showWhen: ["black", "white"] // Solo mostrar si color es negro o blanco
  }
}
```

## ✅ Validación

Después de migrar, verificar:

- [ ] Schemas importados en Firestore
- [ ] ProductCustomizer usa DynamicCustomizer
- [ ] Customizers hardcodeados eliminados
- [ ] Productos apuntan a schemas correctos
- [ ] Se pueden crear customizations
- [ ] Add to cart funciona
- [ ] Preview se renderiza correctamente

## 🚀 Rollback Plan

Si algo sale mal:

```bash
# Revertir a estado anterior
git revert HEAD
git push

# O volver a commit específico
git reset --hard 0e8bbb2  # Antes de Sprint 2
git push --force
```

## 📚 Recursos

- **Código DynamicCustomizer:** `src/components/customizer/DynamicCustomizer.tsx`
- **SchemaEditor:** `src/components/admin/SchemaEditor.tsx`
- **Example Schemas:** `src/data/exampleSchemas.ts`
- **Types:** `src/types/customization.ts`
- **Schema Functions:** `src/lib/customization/schemas.ts`

## 🎯 Resultado Esperado

### Antes
- 3 customizers hardcodeados (1,809 líneas)
- Cambios requieren código
- Features limitados

### Después
- 1 customizer dinámico (530 líneas)
- Cambios desde admin panel
- 10 tipos de campos
- Templates, Cliparts, Save/Share
- Escalable para cualquier producto
