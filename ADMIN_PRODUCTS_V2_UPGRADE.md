# AdminProductsPanelV2 - Guía de Actualización

## 🎯 ¿Qué cambió?

Se creó **AdminProductsPanelV2** - una versión completamente reescrita y mejorada del panel de administración de productos.

### Archivo anterior vs nuevo:
- **Anterior:** `AdminProductsPanel.tsx` (2136 líneas)
- **Nuevo:** `AdminProductsPanelV2.tsx` (880 líneas) - **59% más compacto**

---

## ✅ MEJORAS IMPLEMENTADAS

### 1. **Eliminado `customizerType` (Obsoleto)**

**Antes:**
```typescript
customizerType?: 'shirt' | 'frame' | 'resin' | 'default';
```

**Ahora:**
```typescript
customizationSchemaId?: string; // 'cat_tazas', 'cat_camisetas', etc.
```

### 2. **Schemas Dinámicos**

**Antes:** Hardcodeado con 3 tipos de customizers

**Ahora:**
- Carga los 7 schemas desde Firestore automáticamente
- Selector dropdown con todos los schemas disponibles
- Muestra cantidad de campos por schema

### 3. **Categorías Dinámicas**

**Antes:** 8 categorías hardcodeadas + 20+ subcategorías hardcodeadas

**Ahora:**
- Carga categorías desde Firestore collection `categories`
- Si no existen, crea 5 categorías por defecto
- Fácil de expandir desde Firebase Console

### 4. **Campos Simplificados**

**Eliminados (redundantes):**
- ❌ `customizerType`
- ❌ `category` (simple string)
- ❌ `colors` (array)
- ❌ `sizes` (array)
- ❌ `attributes` (complejo sistema de atributos)
- ❌ `simpleCategories` (duplicado)
- ❌ `VariantImageManager` (sistema complejo de variantes)

**Mantenidos (esenciales):**
- ✅ `name`
- ✅ `description`
- ✅ `categoryId` (referencia a Firestore)
- ✅ `subcategoryId`
- ✅ `basePrice` / `salePrice`
- ✅ `images[]`
- ✅ `tags[]`
- ✅ `slug`
- ✅ `active` / `featured`
- ✅ **`customizationSchemaId`** (NUEVO - conecta con schemas)

### 5. **UI/UX Mejorada**

- ✨ Modal de creación/edición más limpio
- 🎨 Secciones organizadas con iconos
- 📊 Tabla con información clara
- 🖼️ Upload de imágenes simplificado
- ⚡ Menos campos = más rápido de llenar

---

## 🚀 CÓMO USAR

### Opción 1: Reemplazar el actual (Recomendado)

```bash
# Renombrar el anterior (backup)
mv src/components/admin/AdminProductsPanel.tsx src/components/admin/AdminProductsPanel.OLD.tsx

# Renombrar V2 al nombre original
mv src/components/admin/AdminProductsPanelV2.tsx src/components/admin/AdminProductsPanel.tsx
```

### Opción 2: Usar ambos temporalmente

En `src/pages/admin.astro`:

```tsx
// Importar V2
import AdminProductsPanelV2 from '../components/admin/AdminProductsPanelV2';

// Usar en la UI
<AdminProductsPanelV2 client:load />
```

---

## 📋 FLUJO DE CREACIÓN DE PRODUCTO

### 1. **Click en "Nuevo Producto"**

### 2. **Información Básica**
- **Nombre:** Ej: "Taza Personalizada 350ml"
- **Slug:** Se genera automático: `taza-personalizada-350ml`
- **Categoría:** Selecciona de Firestore (Sublimados, Textiles, etc.)
- **Descripción:** Texto libre

### 3. **Precios**
- **Precio base:** 19.99
- **En oferta:** ✓ (checkbox)
- **Precio oferta:** 14.99

### 4. **Personalización** 🎨
- **Schema:** Dropdown con opciones:
  - `cat_tazas` - Tazas / Sublimados (3 campos)
  - `cat_camisetas` - Camisetas / Textiles (3 campos)
  - `cat_camisetas_pro` - Camisetas Pro (4 campos)
  - `cat_hoodies` - Hoodies / Sudaderas (5 campos)
  - `cat_bolsas` - Bolsas / Tote Bags (4 campos)
  - `cat_cuadros` - Cuadros / Marcos (3 campos)
  - `cat_resina` - Figuras de Resina (2 campos)

Si seleccionas `cat_tazas`, el producto usará automáticamente:
- **MugCustomizer** (si categoryId = "tazas")
- O **DynamicCustomizer** (otros productos)

### 5. **Imágenes**
- Upload múltiple
- Preview con opción de eliminar
- Almacenamiento en Firebase Storage

### 6. **Opciones**
- ✓ Producto activo
- ✓ Producto destacado

### 7. **Click "Crear"**
- Guarda en Firestore
- Subidas de imagen a Storage
- Notificación de éxito

---

## 🔗 INTEGRACIÓN CON SCHEMAS

Cuando creas un producto con `customizationSchemaId`:

```typescript
{
  id: "prod_123",
  name: "Taza Mágica Personalizada",
  categoryId: "sublimados",
  subcategoryId: "tazas",
  basePrice: 12.99,
  customizationSchemaId: "cat_tazas", // ← Conecta con schema
  // ...
}
```

**ProductCustomizer** detecta automáticamente:

```typescript
// En ProductCustomizer.tsx:54-65
const schemaId = detectSchemaId(product);

if (schemaId === 'cat_tazas') {
  return <MugCustomizer product={product} />; // ← Sistema tipo Vistaprint
} else {
  return <DynamicCustomizer product={product} schema={schema} />; // ← Sistema genérico
}
```

---

## 📊 COMPARATIVA

| Aspecto | AdminProductsPanel (OLD) | AdminProductsPanelV2 (NEW) |
|---------|--------------------------|----------------------------|
| **Líneas de código** | 2136 | 880 (-59%) |
| **Schemas** | 3 hardcodeados | 7 dinámicos desde Firestore |
| **Categorías** | 8 hardcodeadas | Dinámicas desde Firestore |
| **Subcategorías** | 20+ hardcodeadas | Simplificadas |
| **customizerType** | Sí (obsoleto) | ❌ Eliminado |
| **customizationSchemaId** | ❌ No | ✅ Sí |
| **Campos del form** | 15+ campos | 10 campos esenciales |
| **Sistema de variantes** | Complejo (VariantImageManager) | Simplificado |
| **Carga de schemas** | ❌ No | ✅ Sí (automático) |
| **UI/UX** | Compleja, muchas secciones | Limpia, organizada |

---

## ⚠️ MIGRACIÓN DE DATOS

Si ya tienes productos con `customizerType`:

### Script de migración (opcional):

```typescript
// scripts/migrateCustomizerType.ts
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

const CUSTOMIZER_TO_SCHEMA = {
  'shirt': 'cat_camisetas',
  'frame': 'cat_cuadros',
  'resin': 'cat_resina',
  'default': undefined
};

async function migrate() {
  const snapshot = await getDocs(collection(db, 'products'));

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    if (data.customizerType && data.customizerType !== 'default') {
      const schemaId = CUSTOMIZER_TO_SCHEMA[data.customizerType];

      await updateDoc(doc(db, 'products', docSnap.id), {
        customizationSchemaId: schemaId
        // Opcionalmente eliminar customizerType
        // customizerType: deleteField()
      });

      console.log(`✓ Migrado: ${docSnap.id} → ${schemaId}`);
    }
  }

  console.log('✅ Migración completada');
}

migrate();
```

---

## 🔧 CUSTOMIZACIÓN

### Agregar más schemas:

1. **Crea el schema** en `src/data/exampleSchemas.ts`
2. **Impórtalo** con `npx tsx scripts/importSchemas.ts`
3. **Automáticamente aparece** en el dropdown del panel

### Agregar más categorías:

**Opción 1: Desde Firebase Console**
- Ve a Firestore > `categories` collection
- Agrega documento con: `{ name, slug, description }`

**Opción 2: Desde código**
```typescript
await addDoc(collection(db, 'categories'), {
  name: 'Joyas Personalizadas',
  slug: 'joyas',
  description: 'Anillos, pulseras, etc.'
});
```

---

## 📝 CHANGELOG

### v2.0.0 (2025-XX-XX)

**Added:**
- ✅ `customizationSchemaId` field
- ✅ Dynamic schema loading from Firestore
- ✅ Dynamic category loading
- ✅ Simplified form with 10 essential fields
- ✅ Better UI/UX with organized sections

**Removed:**
- ❌ `customizerType` (obsolete)
- ❌ Hardcoded categories/subcategories
- ❌ Complex attribute system
- ❌ `simpleCategories` duplicate
- ❌ VariantImageManager complexity

**Changed:**
- 🔄 From 2136 lines to 880 lines (-59%)
- 🔄 From 3 customizers to 7 dynamic schemas
- 🔄 From hardcoded to Firestore-driven

---

## 🎉 BENEFICIOS

1. **Más fácil de mantener** - 59% menos código
2. **Más flexible** - Schemas dinámicos
3. **Más escalable** - Agregar categorías sin cambiar código
4. **Mejor UX** - Formulario más simple
5. **Mejor performance** - Menos campos innecesarios
6. **Actualizado** - Compatible con MugCustomizer y sistema nuevo

---

## 🐛 TROUBLESHOOTING

### "No aparecen schemas en el dropdown"

**Solución:**
```bash
npx tsx scripts/importSchemas.ts
```

### "No aparecen categorías"

**Solución:** El panel crea 5 categorías por defecto automáticamente. Si no aparecen, revisa:
- Firebase Console > Firestore > `categories` collection
- Permisos de escritura en Firestore

### "Productos existentes sin personalización"

**Normal.** Los productos sin `customizationSchemaId` simplemente no tienen personalización habilitada. Edita el producto y selecciona un schema.

---

## 📚 DOCUMENTACIÓN RELACIONADA

- `src/components/customizer/mug/README.md` - Sistema MugCustomizer
- `MIGRACION_SCHEMAS.md` - Guía de schemas
- `public/models/README.md` - Modelos 3D

---

¡Disfruta del nuevo panel mejorado! 🚀
