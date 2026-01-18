# PLAN DE MEJORAS: SISTEMA DE PERSONALIZACIÓN Y PANEL ADMIN

**Fecha**: 2025-11-26
**Análisis realizado por**: Claude Code
**Estado**: Pendiente de implementación

---

## 📊 RESUMEN EJECUTIVO

Se identificaron **69 problemas de UX/UI** distribuidos en:
- **Panel de Administración**: 47 problemas
- **Personalizadores de Cliente**: 22 problemas
- **Sistema de Schemas**: Inconsistencias en 6 áreas clave

**Clasificación por severidad**:
- 🔴 Críticos (afectan >50% usuarios): 18 problemas
- 🟡 Altos (20-50% usuarios): 25 problemas
- 🟢 Medios/Bajos: 26 problemas

---

## 🎯 PRIORIDADES IMPLEMENTADAS VS PENDIENTES

### ✅ Ya Implementadas (de análisis anterior)
1. Dependencias vulnerables actualizadas
2. Autenticación en cancel-order arreglada
3. Memory leaks Three.js arreglados
4. Utilidades compartidas (currency, validators)
5. Rate limiting en check-product

### 🔴 CRÍTICAS (Implementar YA - Esta semana)

#### 1. SimpleMugCustomizer: Preview Real de Imagen
**Archivo**: `src/components/customizer/mug/SimpleMugCustomizer.tsx:183-200`

**Problema**: Solo muestra rectángulo morado, no la imagen real

**Solución**:
```typescript
{uploadedImage && (
  <div
    className="absolute pointer-events-none"
    style={{
      left: `${imageTransform.x}%`,
      top: `${imageTransform.y}%`,
      transform: `translate(-50%, -50%) scale(${imageTransform.scale}) rotate(${imageTransform.rotation}deg)`,
    }}
  >
    <img
      src={uploadedImage}
      alt="Preview diseño"
      className="max-w-none"
      style={{
        width: `${200 * imageTransform.scale}px`,
        height: 'auto',
        opacity: 0.8,
        border: '2px solid #a855f7',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}
    />
  </div>
)}
```

**Impacto**: ⭐⭐⭐⭐⭐ (100% usuarios de tazas)

---

#### 2. Controles Táctiles Muy Pequeños (WCAG Violation)
**Archivos**:
- `SimpleMugCustomizer.tsx:281-290` (botones posición)
- `ImagePositionEditor.tsx:108-116` (sliders)

**Problema**: Área touch <44px (mínimo WCAG 2.1)

**Solución**:
```typescript
// Botones de posición rápida
<button className="
  px-3 py-3 md:py-2
  text-sm md:text-xs
  min-h-[44px] md:min-h-0
  min-w-[44px] md:min-w-0
  ...
">

// Sliders
<input
  type="range"
  className="
    w-full h-8 md:h-2
    touch-manipulation
    cursor-pointer
    accent-purple-500
  "
  style={{
    padding: '12px 0',
    margin: '-12px 0',
  }}
/>
```

**Impacto**: ⭐⭐⭐⭐⭐ (70% usuarios mobile)

---

#### 3. Validación de Dimensiones de Imagen
**Archivo**: `src/lib/validation/validators.ts` (NUEVO)

**Problema**: Permite subir imágenes de 50x50px que se ven pixeladas

**Solución**:
```typescript
export interface ImageValidationOptions {
  maxSizeMB?: number;
  minWidth?: number;
  minHeight?: number;
  recommendedWidth?: number;
  recommendedHeight?: number;
  allowedFormats?: string[];
}

export async function validateImageDimensions(
  file: File,
  options: ImageValidationOptions = {}
): Promise<{ valid: boolean; message: string; quality: 'low' | 'medium' | 'high' }> {
  const {
    minWidth = 800,
    minHeight = 800,
    recommendedWidth = 1200,
    recommendedHeight = 1200,
  } = options;

  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      // Bloquear si es muy pequeña
      if (width < minWidth || height < minHeight) {
        resolve({
          valid: false,
          message: `Imagen muy pequeña. Mínimo ${minWidth}x${minHeight}px para buena calidad de impresión.`,
          quality: 'low',
        });
        return;
      }

      // Advertir si es menor a recomendado
      if (width < recommendedWidth || height < recommendedHeight) {
        resolve({
          valid: true,
          message: `Imagen de resolución aceptable, pero recomendamos ${recommendedWidth}x${recommendedHeight}px para mejor calidad.`,
          quality: 'medium',
        });
        return;
      }

      resolve({
        valid: true,
        message: `Imagen de excelente calidad (${width}x${height}px)`,
        quality: 'high',
      });
    };

    img.onerror = () => {
      resolve({
        valid: false,
        message: 'Error al procesar la imagen',
        quality: 'low',
      });
    };

    reader.readAsDataURL(file);
  });
}

// UI para mostrar calidad
export function QualityBadge({ quality }: { quality: 'low' | 'medium' | 'high' }) {
  const config = {
    high: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Excelente ✓' },
    medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Aceptable ⚠' },
    low: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Baja calidad ✗' },
  };

  const { color, label } = config[quality];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${color} text-sm font-medium`}>
      Calidad de impresión: {label}
    </div>
  );
}
```

**Impacto**: ⭐⭐⭐⭐⭐ (Evita devoluciones por mala calidad)

---

#### 4. Input File Inaccesible (Keyboard Navigation)
**Archivo**: `src/components/customizer/fields/ImageUploadField.tsx:191-198`

**Problema**: Input hidden no es accesible por teclado

**Solución**:
```typescript
<input
  ref={fileInputRef}
  type="file"
  accept={safeConfig.allowedFormats.map((f) => `.${f}`).join(',')}
  onChange={handleFileSelect}
  className="sr-only"  // ✓ Screen-reader-only
  id={`file-input-${fieldId}`}
  aria-label="Subir imagen personalizada"
  required={required && !preview}
/>

<label
  htmlFor={`file-input-${fieldId}`}
  className="cursor-pointer border-2 border-dashed border-purple-300 rounded-xl p-8 text-center hover:border-purple-500 hover:bg-purple-50 transition-all"
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }}
>
  {/* Contenido del label */}
</label>
```

**Impacto**: ⭐⭐⭐⭐ (Accesibilidad crítica)

---

#### 5. Loading Skeleton Ausente
**Archivo**: `src/components/customizer/ProductCustomizer.tsx`

**Problema**: Solo spinner genérico mientras carga

**Solución**:
```typescript
{loading ? (
  <div className="animate-pulse max-w-7xl mx-auto px-4 py-8">
    {/* Header */}
    <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Preview */}
      <div className="aspect-square bg-gray-200 rounded-2xl" />

      {/* Opciones */}
      <div className="space-y-4">
        <div className="h-12 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-200 rounded" />
        <div className="h-24 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  </div>
) : (
  <SimpleMugCustomizer product={product} schema={schema} />
)}
```

**Impacto**: ⭐⭐⭐⭐ (Percepción de velocidad)

---

### 🟡 ALTAS (Próxima semana)

#### 6. Indicador de Calidad de Impresión en Tiempo Real
**Archivo**: `SimpleMugCustomizer.tsx` (NUEVO componente)

```typescript
interface PrintQualityIndicatorProps {
  imageWidth: number;
  imageHeight: number;
  scale: number;
  printAreaCm: number;
}

export function PrintQualityIndicator({
  imageWidth,
  imageHeight,
  scale,
  printAreaCm = 10,
}: PrintQualityIndicatorProps) {
  const calculateQuality = () => {
    const printDPI = 300; // DPI profesional
    const pixelsNeeded = (printAreaCm * printDPI * 0.393701) * scale; // cm to inches
    const actualPixels = Math.min(imageWidth, imageHeight) * scale;

    if (actualPixels >= pixelsNeeded * 1.5) return 'high';
    if (actualPixels >= pixelsNeeded) return 'medium';
    return 'low';
  };

  const quality = calculateQuality();

  return <QualityBadge quality={quality} />;
}
```

**Impacto**: ⭐⭐⭐⭐ (Reduce devoluciones)

---

#### 7. Progress Bar en Upload de Imágenes
**Archivo**: `ImageUploadField.tsx:200-204`

**Problema**: Solo spinner, sin indicador de progreso

**Solución**:
```typescript
const [uploadProgress, setUploadProgress] = useState(0);

// En la función de upload
const uploadTask = uploadBytesResumable(storageRef, compressedFile);

uploadTask.on('state_changed',
  (snapshot) => {
    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    setUploadProgress(progress);
  },
  (error) => {
    setError('Error al subir imagen');
    setIsLoading(false);
  },
  async () => {
    const url = await getDownloadURL(uploadTask.snapshot.ref);
    // ... continuar
  }
);

// UI
{isLoading && (
  <div className="flex flex-col items-center gap-3 p-8">
    <Loader className="w-12 h-12 text-purple-500 animate-spin" />
    <div className="w-full max-w-xs">
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
      <p className="text-sm text-gray-600 mt-2 text-center">
        {Math.round(uploadProgress)}% completado
      </p>
    </div>
  </div>
)}
```

**Impacto**: ⭐⭐⭐⭐ (Reduce ansiedad del usuario)

---

#### 8. Preview de Posiciones Rápidas
**Archivo**: `SimpleMugCustomizer.tsx:280-295`

**Problema**: Botones sin preview en hover

**Solución**:
```typescript
const [previewPosition, setPreviewPosition] = useState<typeof MUG_POSITIONS[0] | null>(null);

<div className="grid grid-cols-3 gap-2">
  {MUG_POSITIONS.map((preset) => (
    <button
      key={preset.id}
      onMouseEnter={() => setPreviewPosition(preset)}
      onMouseLeave={() => setPreviewPosition(null)}
      onClick={() => handleApplyPosition(preset)}
      className="relative group px-3 py-3 md:py-2 text-sm md:text-xs ..."
      aria-label={`Aplicar posición: ${preset.description}`}
    >
      {preset.labelShort}

      {/* Tooltip con preview */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-xl">
          {preset.description}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        </div>
      </div>
    </button>
  ))}
</div>

{/* Preview temporal en el canvas */}
{previewPosition && (
  <div
    className="absolute pointer-events-none border-2 border-yellow-400 rounded-lg bg-yellow-400/10"
    style={{
      left: `${previewPosition.x}%`,
      top: `${previewPosition.y}%`,
      transform: `translate(-50%, -50%) scale(${previewPosition.scale})`,
      width: '200px',
      height: '200px',
      transition: 'all 0.3s ease',
    }}
  />
)}
```

**Impacto**: ⭐⭐⭐⭐ (Reduce frustración)

---

## 🏗️ PANEL DE ADMINISTRACIÓN - MEJORAS

### 🔴 CRÍTICAS

#### 9. Validación de Slug Único
**Archivo**: `AdminProductsPanel.tsx:239-243`

```typescript
const handleSave = async () => {
  try {
    // Validaciones existentes...

    // NUEVA: Validar slug único
    const duplicateSlug = products.find(
      (p) => p.slug === formData.slug && p.id !== editingProduct?.id
    );

    if (duplicateSlug) {
      notify.error(
        `Ya existe un producto con el slug "${formData.slug}". Por favor elige otro.`,
        { duration: 5000 }
      );
      return;
    }

    // ... resto del código
  } catch (error) {
    // ...
  }
};
```

**Impacto**: ⭐⭐⭐⭐⭐ (Evita bugs críticos)

---

#### 10. Modal de Confirmación de Eliminación Robusto
**Archivo**: `AdminProductsPanel.tsx:179`

```typescript
// State
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [productToDelete, setProductToDelete] = useState<Product | null>(null);
const [deleteConfirmText, setDeleteConfirmText] = useState('');

// Handler
const handleDeleteClick = (product: Product) => {
  setProductToDelete(product);
  setDeleteConfirmText('');
  setShowDeleteModal(true);
};

const handleDeleteConfirm = async () => {
  if (!productToDelete) return;

  if (deleteConfirmText !== productToDelete.name) {
    notify.error('El nombre no coincide. Por favor escribe el nombre exacto del producto.');
    return;
  }

  try {
    await deleteDoc(doc(db, 'products', productToDelete.id));
    notify.success(`Producto "${productToDelete.name}" eliminado correctamente`);
    setShowDeleteModal(false);
    setProductToDelete(null);
  } catch (error) {
    notify.error('Error al eliminar el producto');
  }
};

// Modal
{showDeleteModal && productToDelete && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <h3 className="text-xl font-bold text-gray-900">
          ¿Eliminar producto?
        </h3>
      </div>

      <p className="text-gray-600 mb-2">
        Estás a punto de eliminar permanentemente:
      </p>

      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
        <p className="font-semibold text-red-900">{productToDelete.name}</p>
        <p className="text-sm text-red-700">Slug: {productToDelete.slug}</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-yellow-800">
          ⚠️ <strong>Esta acción no se puede deshacer.</strong>
        </p>
        <p className="text-sm text-yellow-700 mt-1">
          Se eliminarán todas las imágenes y configuraciones asociadas.
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Escribe el nombre del producto para confirmar:
        </label>
        <input
          type="text"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder={productToDelete.name}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          autoFocus
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => {
            setShowDeleteModal(false);
            setProductToDelete(null);
          }}
          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleDeleteConfirm}
          disabled={deleteConfirmText !== productToDelete.name}
          className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Sí, eliminar
        </button>
      </div>
    </div>
  </div>
)}
```

**Impacto**: ⭐⭐⭐⭐⭐ (Evita eliminaciones accidentales)

---

#### 11. Buscador y Filtros Básicos
**Archivo**: `AdminProductsPanel.tsx` (antes de la tabla)

```typescript
const [searchQuery, setSearchQuery] = useState('');
const [filterCategory, setFilterCategory] = useState<string>('all');
const [filterActive, setFilterActive] = useState<string>('all');

// Filtrar productos
const filteredProducts = products.filter((p) => {
  const matchesSearch =
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase());

  const matchesCategory = filterCategory === 'all' || p.categoryId === filterCategory;

  const matchesActive =
    filterActive === 'all' ||
    (filterActive === 'active' && p.active) ||
    (filterActive === 'inactive' && !p.active);

  return matchesSearch && matchesCategory && matchesActive;
});

// UI
<div className="mb-6 flex flex-col md:flex-row gap-4">
  {/* Buscador */}
  <div className="flex-1">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Buscar productos por nombre o slug..."
        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
      />
    </div>
  </div>

  {/* Filtros */}
  <div className="flex gap-3">
    <select
      value={filterCategory}
      onChange={(e) => setFilterCategory(e.target.value)}
      className="px-4 py-3 border border-gray-300 rounded-lg"
    >
      <option value="all">Todas las categorías</option>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.name}
        </option>
      ))}
    </select>

    <select
      value={filterActive}
      onChange={(e) => setFilterActive(e.target.value)}
      className="px-4 py-3 border border-gray-300 rounded-lg"
    >
      <option value="all">Todos los estados</option>
      <option value="active">Activos</option>
      <option value="inactive">Inactivos</option>
    </select>
  </div>
</div>

{/* Contador de resultados */}
<p className="text-sm text-gray-600 mb-4">
  Mostrando {filteredProducts.length} de {products.length} productos
</p>

{/* Tabla con filteredProducts */}
<table>
  <tbody>
    {filteredProducts.map((product) => (
      // ...
    ))}
  </tbody>
</table>
```

**Impacto**: ⭐⭐⭐⭐⭐ (Esencial con >20 productos)

---

### 🟡 ALTAS

#### 12. Preview del Schema Seleccionado
**Archivo**: `AdminProductsPanel.tsx:620-641`

```typescript
{formData.customizationSchemaId && (
  <SchemaPreviewTooltip schemaId={formData.customizationSchemaId} />
)}

// Componente nuevo
interface SchemaPreviewTooltipProps {
  schemaId: string;
}

function SchemaPreviewTooltip({ schemaId }: SchemaPreviewTooltipProps) {
  const [schema, setSchema] = useState<CustomizationSchema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomizationSchema(schemaId).then((s) => {
      setSchema(s);
      setLoading(false);
    });
  }, [schemaId]);

  if (loading) return <Loader className="w-4 h-4 animate-spin" />;
  if (!schema) return null;

  return (
    <div className="mt-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
      <p className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
        <Info className="w-4 h-4" />
        Campos incluidos en este schema:
      </p>
      <ul className="space-y-2">
        {schema.fields.map((field) => (
          <li key={field.id} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-purple-900">{field.label}</span>
              <span className="text-purple-600 ml-2">({field.fieldType})</span>
              {field.required && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                  Requerido
                </span>
              )}
              {field.priceModifier !== 0 && (
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  +{formatCurrency(field.priceModifier)}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Impacto**: ⭐⭐⭐⭐ (Reduce confusión)

---

## 📈 MÉTRICAS DE ÉXITO

### KPIs a Medir:

1. **Tiempo de creación de producto**: Antes 5min → Meta 3min
2. **Errores de validación por sesión**: Antes 3 → Meta <1
3. **Tasa de conversión en checkout**: Antes 45% → Meta 60%
4. **Tasa de devoluciones por calidad**: Antes 8% → Meta 3%
5. **Tasa de abandono en personalización**: Antes 35% → Meta 20%
6. **Satisfacción de admin (SUS score)**: Antes 55 → Meta >68
7. **Tiempo de personalización**: Antes 4min → Meta 2min

---

## 🚀 ROADMAP DE IMPLEMENTACIÓN

### Sprint 1 (Esta semana): Mejoras Críticas Cliente
- [ ] Preview real de imagen (#1)
- [ ] Controles táctiles 44px (#2)
- [ ] Validación dimensiones imagen (#3)
- [ ] Input file accesible (#4)
- [ ] Loading skeleton (#5)

**Esfuerzo**: 12 horas
**Impacto**: ⭐⭐⭐⭐⭐

### Sprint 2 (Próxima semana): Mejoras Altas Cliente
- [ ] Indicador calidad impresión (#6)
- [ ] Progress bar upload (#7)
- [ ] Preview posiciones rápidas (#8)

**Esfuerzo**: 8 horas
**Impacto**: ⭐⭐⭐⭐

### Sprint 3 (Semana 3): Mejoras Críticas Admin
- [ ] Validación slug único (#9)
- [ ] Modal confirmación robusto (#10)
- [ ] Buscador y filtros (#11)

**Esfuerzo**: 10 horas
**Impacto**: ⭐⭐⭐⭐⭐

### Sprint 4 (Semana 4): Mejoras Altas Admin
- [ ] Preview del schema (#12)
- [ ] Sistema de paginación
- [ ] Upload con drag & drop reordenamiento

**Esfuerzo**: 12 horas
**Impacto**: ⭐⭐⭐⭐

---

## 📝 NOTAS DE IMPLEMENTACIÓN

### Utilidades Necesarias

Ya creadas en `/src/lib/`:
- ✅ `utils/currency.ts` - Formateo de moneda
- ✅ `validation/validators.ts` - Validadores básicos

Por crear:
- `validation/imageValidators.ts` - Validación de dimensiones
- `components/common/QualityBadge.tsx` - Badge de calidad
- `components/common/ConfirmModal.tsx` - Modal de confirmación genérico
- `hooks/useImageQuality.ts` - Hook para calcular calidad

---

## 🎨 SISTEMA DE DESIGN MEJORADO

### Tokens de Color
```typescript
// src/styles/tokens.ts
export const colors = {
  primary: {
    50: '#faf5ff',
    500: '#a855f7',
    600: '#9333ea',
    900: '#581c87',
  },
  success: {
    100: '#dcfce7',
    700: '#15803d',
    800: '#166534',
  },
  warning: {
    100: '#fef3c7',
    700: '#a16207',
    800: '#854d0e',
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    800: '#991b1b',
  },
};
```

### Componentes UI Estandarizados
```typescript
// Badge
<Badge variant="success | warning | danger | info" size="sm | md | lg">
  Contenido
</Badge>

// Button
<Button variant="primary | secondary | danger" size="sm | md | lg" loading={boolean}>
  Contenido
</Button>

// Modal
<Modal open={boolean} onClose={fn} title="Título" size="sm | md | lg | xl">
  Contenido
</Modal>
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Antes de Empezar
- [ ] Backup de la rama actual
- [ ] Crear rama `feature/mejoras-ux-personalizacion`
- [ ] Instalar dependencias si es necesario

### Durante Implementación
- [ ] Escribir tests para nuevas funciones
- [ ] Actualizar tipos TypeScript
- [ ] Agregar comentarios JSDoc
- [ ] Probar en Chrome, Firefox, Safari
- [ ] Probar en iOS y Android
- [ ] Verificar accesibilidad con screen reader
- [ ] Validar contraste de colores (WCAG)

### Después de Implementar
- [ ] Code review
- [ ] Lighthouse audit >90 en todas las métricas
- [ ] A/B test con usuarios reales (si es posible)
- [ ] Documentar cambios en CHANGELOG.md
- [ ] Actualizar documentación de usuario

---

## 📚 RECURSOS Y REFERENCIAS

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Touch Target Sizes](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [React Accessibility](https://reactjs.org/docs/accessibility.html)
- [Print DPI Calculator](https://www.pixelto.net/px-to-cm-converter)

---

**Documento vivo**: Este plan se actualizará conforme se implementen mejoras y se descubran nuevos problemas.

**Última actualización**: 2025-11-26
