# 🎯 Mejoras de Accesibilidad Pendientes

## ✅ Completado (2/4)

1. ✅ **Modal Accesible Creado** - `AccessibleModal.tsx`
2. ✅ **AddReviewForm.tsx** - 4 alerts reemplazados con modales

---

## ⏳ Pendiente (8 archivos con alert())

### Prioridad Alta - Componentes de Usuario

#### 1. **src/components/auth/LoginPanel.tsx**

```tsx
Línea 167: alert('Te enviamos un email...')
Línea 188: alert('Te enviamos un enlace...')
```

**Acción**: Reemplazar con AccessibleModal

```tsx
import AccessibleModal from '../common/AccessibleModal';

// Agregar estado modal
const [modal, setModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });

// Reemplazar alerts:
showModal('success', 'Email enviado', 'Te enviamos un email para restablecer tu contraseña...');
```

---

#### 2. **src/components/cart/CheckoutPage.tsx**

```tsx
Línea 431: alert('Debes aceptar los términos...')
Línea 456: alert('Hubo un error al procesar...')
```

**Nota**: Este componente parece ser un duplicado de `Checkout.tsx`.

- Verificar si se usa
- Si no, eliminarlo
- Si se usa, aplicar el mismo patrón de Stripe Elements

---

#### 3. **src/components/sections/ProductDetail.tsx**

```tsx
// Buscar alerts relacionados con agregar al carrito
```

**Acción**: Usar `notify` de notifications.ts en lugar de alert(), o AccessibleModal para confirmaciones

---

### Prioridad Media - Componentes Admin

#### 4. **src/components/admin/AdminOrdersList.tsx**

```tsx
Línea 64: alert('Error cargando pedidos')
Línea 118: alert('Estado actualizado correctamente...')
Línea 121: alert('Error actualizando estado')
```

**Acción**: Reemplazar con modales + toast notifications

---

#### 5. **src/components/admin/AdminOrderDetail.tsx**

```tsx
Línea 37: alert('Pedido no encontrado')
Línea 45: alert('Error cargando pedido')
Línea 66: alert('Estado actualizado correctamente')
Línea 69: alert('Error actualizando estado')
```

**Acción**: Modal para errores críticos, toast para éxitos

---

### Prioridad Baja - Componentes de Cuenta

#### 6. **src/components/account/SettingsPanel.tsx**

Revisar alerts relacionados con guardado de configuración.

#### 7. **src/components/account/FilesPanel.tsx**

Revisar alerts relacionados con subida/eliminación de archivos.

#### 8. **src/components/sections/ProductsSection.tsx**

Revisar alerts relacionados con productos.

---

## 🎹 Mejoras de Navegación por Teclado

### Elementos que necesitan soporte de teclado:

#### 1. **Botones Personalizados (divs con onClick)**

Buscar y reemplazar:

```tsx
// ❌ MAL
<div onClick={handleClick}>Acción</div>

// ✅ BIEN
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  aria-label="Descripción de la acción"
>
  Acción
</button>
```

#### 2. **Elementos de Carrito**

- Botones +/- cantidad
- Botón eliminar
- Todos deben responder a Enter/Space

#### 3. **Selector de Estrellas (Rating)**

Ya implementado correctamente en AddReviewForm ✅

- Aplicar el mismo patrón a otros selectores de rating

---

## 🏷️ ARIA Labels Faltantes

### Buscar elementos sin labels:

```bash
# Buscar botones sin aria-label
grep -n '<button[^>]*>' src/components/**/*.tsx | grep -v 'aria-label'

# Buscar inputs sin label asociado
grep -n '<input' src/components/**/*.tsx | grep -v 'htmlFor\|aria-label'
```

### Patrones a aplicar:

#### Botones de iconos

```tsx
<button onClick={handleDelete} aria-label="Eliminar producto del carrito">
  <TrashIcon />
</button>
```

#### Links de navegación

```tsx
<a href="/cart" aria-label={`Carrito de compras (${itemCount} productos)`}>
  <CartIcon />
</a>
```

#### Inputs de formulario

```tsx
<label htmlFor="email" className="...">
  Email
</label>
<input
  id="email"
  type="email"
  name="email"
  aria-required="true"
  aria-invalid={errors.email ? 'true' : 'false'}
  aria-describedby={errors.email ? 'email-error' : undefined}
/>
{errors.email && (
  <span id="email-error" className="text-red-500">
    {errors.email}
  </span>
)}
```

---

## 📝 Form Labels y Validación

### Problemas comunes a arreglar:

#### 1. **Inputs sin label**

```tsx
// ❌ MAL
<input placeholder="Nombre" />

// ✅ BIEN
<label htmlFor="name">Nombre</label>
<input id="name" placeholder="Ej: Juan Pérez" />
```

#### 2. **Errores no asociados**

```tsx
// ❌ MAL
<input type="email" />;
{
  error && <span>{error}</span>;
}

// ✅ BIEN
<input type="email" aria-invalid={!!error} aria-describedby="email-error" />;
{
  error && (
    <span id="email-error" role="alert">
      {error}
    </span>
  );
}
```

#### 3. **Campos requeridos sin indicación**

```tsx
<label htmlFor="email">
  Email <span aria-label="campo requerido">*</span>
</label>
<input
  id="email"
  type="email"
  required
  aria-required="true"
/>
```

---

## 🎨 Mejoras de Contraste

### Verificar colores:

```bash
# Texto gris claro sobre fondo blanco (problema común)
# Ratio mínimo WCAG AA: 4.5:1 para texto normal
# Ratio mínimo WCAG AA: 3:1 para texto grande (18px+)
```

#### Colores a revisar:

- `text-gray-400` sobre `bg-white` ❌ (bajo contraste)
- `text-gray-500` sobre `bg-white` ✅ (ok para texto grande)
- `text-gray-600` sobre `bg-white` ✅ (ok)

**Acción**: Reemplazar `text-gray-400` con `text-gray-600` como mínimo.

---

## 🧪 Testing de Accesibilidad

### Herramientas recomendadas:

1. **axe DevTools** (Chrome Extension)
   - Analiza la página automáticamente
   - Detecta problemas WCAG

2. **Lighthouse** (Chrome DevTools)
   - Auditoría de accesibilidad integrada
   - Puntaje y recomendaciones

3. **NVDA / JAWS** (Screen Readers)
   - Probar navegación con screen reader
   - Verificar anuncios y labels

4. **Navegación por teclado**
   - Probar toda la app solo con Tab/Enter/Space
   - Verificar orden de foco lógico

### Checklist de testing:

```
[ ] Navegación completa con Tab
[ ] Todo funciona con Enter/Space
[ ] ESC cierra modales
[ ] Screen reader lee todo correctamente
[ ] Errores se anuncian
[ ] Foco visible en todos los elementos
[ ] Sin trampa de foco (keyboard trap)
[ ] Lighthouse Accessibility > 90
```

---

## 📋 Template para Reemplazar Alerts

Copia este patrón para cada componente:

```tsx
import { useState } from 'react';
import AccessibleModal from '../common/AccessibleModal';

export default function MiComponente() {
  // Modal state
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showModal = (
    type: 'info' | 'warning' | 'error' | 'success',
    title: string,
    message: string
  ) => {
    setModal({ isOpen: true, type, title, message });
  };

  const closeModal = () => {
    setModal({ ...modal, isOpen: false });
  };

  // En lugar de: alert('Mensaje')
  // Usar: showModal('info', 'Título', 'Mensaje')

  return (
    <>
      <AccessibleModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        type={modal.type}
      >
        {modal.message}
      </AccessibleModal>

      {/* Tu componente aquí */}
    </>
  );
}
```

---

## 🎯 Priorización

### Semana 1 (Alta Prioridad):

- [ ] LoginPanel.tsx - Flujo crítico de usuario
- [ ] CheckoutPage.tsx - Verificar si se usa, limpiar
- [ ] ProductDetail.tsx - Acción principal (agregar al carrito)

### Semana 2 (Media Prioridad):

- [ ] Admin components (4 archivos)
- [ ] Agregar ARIA labels faltantes
- [ ] Mejorar navegación por teclado

### Semana 3 (Baja Prioridad):

- [ ] Account components
- [ ] Revisar contraste de colores
- [ ] Testing completo con screen readers

---

## 📚 Recursos

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [React Accessibility](https://react.dev/learn/accessibility)
- [ARIA Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/)

---

## ✨ Beneficios de Completar Esto

- ✅ Compliance con regulaciones (ADA, Section 508)
- ✅ Mejor UX para todos los usuarios
- ✅ SEO mejorado (Google valora accesibilidad)
- ✅ Mayor alcance de mercado
- ✅ Reducción de riesgo legal

---

**Estado Actual**: 🟡 10% completado (1/9 archivos con alerts)
**Objetivo**: 100% WCAG 2.1 Level AA compliance
**Tiempo estimado**: 2-3 semanas (trabajando gradualmente)
