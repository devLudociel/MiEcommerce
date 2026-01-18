# Fix: Productos Relacionados - Campo Category

## Problema Identificado

Los productos relacionados no se mostraban en la página de detalle del producto porque:

1. **Mismatch de campos**: El hook `useRelatedProducts` estaba buscando productos por el campo `categoryId` (un ID de Firebase como '2', '3', etc.)
2. **Datos insuficientes**: La base de datos tiene pocos productos con el mismo `categoryId`
3. **Campo faltante**: Los productos no tenían el campo `category` (string slug como 'textiles', 'sublimados', etc.)

## Solución Implementada

### 1. Actualización del Admin Panel

**Archivo**: `src/components/admin/AdminProductsPanel.tsx`

#### Cambios realizados:

1. **Agregado campo `category` al tipo Product** (línea 30):
```typescript
interface Product {
  id: string;
  name: string;
  categoryId: string;
  category: string; // ← NUEVO: Slug de categoría para productos relacionados
  // ... otros campos
}
```

2. **Actualización del formulario de creación** (línea 165):
```typescript
const handleCreate = () => {
  setFormData({
    // ... otros campos
    categoryId: categories[0]?.id || '',
    category: categories[0]?.slug || 'otros', // ← NUEVO
  });
};
```

3. **Actualización del select de categoría** (líneas 629-636):
```typescript
onChange={(e) => {
  const selectedCat = categories.find((c) => c.id === e.target.value);
  setFormData({
    ...formData,
    categoryId: e.target.value,
    category: selectedCat?.slug || 'otros', // ← Actualiza ambos campos
  });
}}
```

4. **Guardar campo category en Firebase** (líneas 309-317):
```typescript
const handleSave = async () => {
  // Obtener el slug de la categoría seleccionada
  const selectedCategory = categories.find((cat) => cat.id === formData.categoryId);
  const categorySlug = selectedCategory?.slug || 'otros';

  const data: any = {
    // ... otros campos
    categoryId: formData.categoryId || categories[0]?.id || 'otros',
    category: categorySlug, // ← NUEVO: Guardar slug para productos relacionados
  };
};
```

### 2. Actualización del Hook de React Query

**Archivo**: `src/hooks/react-query/useProducts.ts`

#### Cambios realizados:

**Modificación del hook `useRelatedProducts`** (líneas 208-223):
```typescript
export function useRelatedProducts(categoryOrId?: string, excludeProductId?: string, limit: number = 4) {
  return useQuery({
    queryKey: queryKeys.products.related(categoryOrId || '', excludeProductId || ''),
    queryFn: () => fetchProducts({
      category: categoryOrId, // ← Ahora usa el campo 'category' en vez de 'categoryId'
      excludeIds: excludeProductId ? [excludeProductId] : [],
      limit: limit + 1,
    }),
    // ... resto de config
  });
}
```

### 3. Actualización del Componente ProductDetail

**Archivo**: `src/components/sections/ProductDetail.tsx`

#### Cambios realizados:

**Uso del campo `category` para productos relacionados** (línea 154):
```typescript
// Antes:
const categoryForRelated = uiProduct?.categoryId || uiProduct?.category;

// Ahora:
const categoryForRelated = uiProduct?.category;
```

**Eliminación de logs de debug** (líneas 163-177): Removidos console.log de depuración

## Categorías Disponibles

Las categorías predefinidas en el sistema son:

| ID | Nombre | Slug | Descripción |
|----|--------|------|-------------|
| auto | Textiles | textiles | Camisetas, sudaderas, bolsas |
| auto | Sublimados | sublimados | Tazas, vasos, termos |
| auto | Marcos | marcos | Cuadros decorativos |
| auto | Resina | resina | Figuras de resina |
| auto | Otros | otros | Otros productos |

## Instrucciones para el Usuario

### Para que los productos relacionados funcionen correctamente:

1. **Ir al Admin Panel** (`/admin`)
2. **Crear o editar productos**
3. **Seleccionar una categoría** del dropdown (ej: "Textiles", "Sublimados")
4. **Guardar el producto**

El sistema automáticamente guardará:
- `categoryId`: El ID de Firebase de la categoría
- `category`: El slug de la categoría (ej: 'textiles', 'sublimados')

### Actualizar Productos Existentes

Para que los productos existentes muestren productos relacionados:

1. Ir a **Admin Panel**
2. **Editar cada producto** existente
3. **Reseleccionar la categoría** (aunque ya esté seleccionada)
4. **Guardar**

Esto asegurará que todos los productos tengan el campo `category` correctamente configurado.

## Ejemplo de Funcionamiento

### Producto: "Camiseta Personalizada"
```json
{
  "id": "bIF54Pj4lox8YSDT0IUM",
  "name": "Camiseta Personalizada",
  "categoryId": "xyz123",
  "category": "textiles",  // ← Campo usado para productos relacionados
  // ... otros campos
}
```

### Query de Productos Relacionados
```typescript
// Busca productos con category === 'textiles'
fetchProducts({
  category: 'textiles',
  excludeIds: ['bIF54Pj4lox8YSDT0IUM'],
  limit: 5
})
```

### Resultado
Mostrará hasta 4 productos de la categoría "textiles", excluyendo la camiseta actual.

## Beneficios

1. ✅ **Productos relacionados funcionan correctamente**
2. ✅ **Fácil de gestionar desde el Admin Panel**
3. ✅ **Categorización consistente**
4. ✅ **Mejor experiencia de usuario**
5. ✅ **Aumenta las ventas cruzadas**

## Archivos Modificados

1. `src/components/admin/AdminProductsPanel.tsx` - Admin panel actualizado
2. `src/hooks/react-query/useProducts.ts` - Hook de productos relacionados
3. `src/components/sections/ProductDetail.tsx` - Componente de detalle del producto

## Próximos Pasos Recomendados

1. **Actualizar todos los productos existentes** seleccionando su categoría en el Admin Panel
2. **Crear más productos** en cada categoría para mejorar las recomendaciones
3. **Verificar** que los productos relacionados se muestran correctamente

---

**Fecha**: 2025-11-28
**Autor**: Claude Code
**Versión**: 1.0
