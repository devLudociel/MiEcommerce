# 📋 Sistema de Validaciones con Zod

Documentación completa del sistema de validación de formularios implementado en el proyecto.

## 🎯 Descripción

Sistema robusto de validación de formularios utilizando **Zod** para:
- Validación en tiempo real (on-blur)
- Validación al enviar formularios
- Mensajes de error amigables
- Integración con notificaciones toast
- Logging profesional
- TypeScript type-safe

---

## 📁 Estructura de Archivos

```
src/
├── lib/
│   └── validation/
│       └── schemas.ts          # Schemas de Zod centralizados
├── hooks/
│   └── useFormValidation.ts    # Hook reutilizable para validación
└── components/
    ├── pages/
    │   └── Checkout.tsx        # ✅ Integrado con validaciones
    └── admin/
        └── AdminProductsPanel.tsx  # ✅ Integrado con validaciones
```

---

## 🔧 Componentes del Sistema

### 1. Schemas de Validación (`schemas.ts`)

Contiene todos los schemas de Zod para diferentes formularios.

#### Schemas Disponibles:

##### `shippingInfoSchema`
Valida información de envío en el checkout.

```typescript
const data = {
  firstName: 'Juan',
  lastName: 'García',
  email: 'juan@example.com',
  phone: '612 345 678',
  address: 'Calle Principal 123',
  city: 'Madrid',
  state: 'Madrid',
  zipCode: '28001',
  country: 'España',
  notes: 'Opcional'
};
```

**Validaciones:**
- ✅ Nombres: Solo letras, 2-50 caracteres
- ✅ Email: Formato válido, normalizado a lowercase
- ✅ Teléfono: Formato español (+34 xxx xxx xxx)
- ✅ Código postal: 5 dígitos numéricos
- ✅ Campos requeridos con min/max lengths

##### `paymentInfoSchema`
Valida información de pago con discriminated union.

```typescript
// Pago con tarjeta
const cardPayment = {
  method: 'card',
  cardNumber: '4532 1234 5678 9010',  // Validado con algoritmo de Luhn
  cardName: 'JUAN GARCIA',
  cardExpiry: '12/25',                 // MM/AA, valida fecha futura
  cardCVV: '123'                       // 3-4 dígitos
};

// Otros métodos
const otherPayment = {
  method: 'paypal' | 'transfer' | 'cash'
};
```

**Validaciones especiales:**
- ✅ **Algoritmo de Luhn**: Valida números de tarjeta reales
- ✅ **Fecha de expiración**: Verifica que no esté vencida
- ✅ **Discriminated union**: Diferentes validaciones según método

##### `productSchema`
Valida productos en el panel de admin.

```typescript
const product = {
  name: 'Camiseta Personalizada',
  description: 'Camiseta de algodón 100%',
  slug: 'camiseta-personalizada',
  categoryId: '2',
  subcategoryId: '4',
  basePrice: 19.99,
  salePrice: 14.99,           // Opcional, debe ser < basePrice
  onSale: true,
  featured: false,
  active: true,
  attributes: [
    { attributeId: '3', value: 'Camiseta' }
  ],
  tags: ['textil', 'personalizable'],
  images: ['https://...'],
  customizerType: 'shirt'
};
```

**Validaciones:**
- ✅ Slug: URL-friendly (solo minúsculas, números y guiones)
- ✅ Precios: >= 0.01, máximo 2 decimales
- ✅ Sale price: Debe ser menor que basePrice
- ✅ Validaciones cross-field (refine)

---

### 2. Hook de Validación (`useFormValidation.ts`)

Hook reutilizable para manejar validación de formularios.

#### API del Hook:

```typescript
const {
  errors,          // Record<string, string> - Errores por campo
  isValidating,    // boolean - Estado de validación
  validate,        // (data) => Promise<Result> - Valida todo el form
  validateField,   // (name, value) => Promise - Valida un campo
  clearErrors,     // () => void - Limpia todos los errores
  clearFieldError, // (name) => void - Limpia un error
  setFieldError,   // (name, error) => void - Set error manual
  setErrors,       // (errors) => void - Set múltiples errores
  handleChange,    // (name, value) => void - Handler onChange
  handleBlur,      // (name, value) => void - Handler onBlur
} = useFormValidation(schema, options);
```

#### Opciones de Configuración:

```typescript
const options = {
  validateOnChange: false,    // Validar al escribir
  validateOnBlur: true,       // Validar al perder foco
  showToastOnError: false,    // Mostrar toast en error
  formName: 'MiFormulario'    // Nombre para logs
};
```

#### Hook Simplificado:

Para formularios simples, usa `useSimpleFormValidation`:

```typescript
const { errors, validate } = useSimpleFormValidation(productSchema);
```

Equivale a:
```typescript
useFormValidation(schema, {
  validateOnChange: false,
  validateOnBlur: false,
  showToastOnError: true
});
```

---

## 💻 Ejemplos de Uso

### Ejemplo 1: Formulario con Validación On-Blur

```typescript
import { useFormValidation } from '../hooks/useFormValidation';
import { shippingInfoSchema } from '../lib/validation/schemas';

function CheckoutForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    // ...
  });

  const validation = useFormValidation(shippingInfoSchema, {
    validateOnBlur: true,
    showToastOnError: false,
    formName: 'Checkout'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await validation.validate(formData);

    if (result.success) {
      // ✅ Datos válidos, proceder
      console.log('Datos validados:', result.data);
    } else {
      // ❌ Errores de validación
      console.error('Errores:', result.errors);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.firstName}
        onChange={(e) => {
          setFormData({ ...formData, firstName: e.target.value });
          validation.handleChange('firstName', e.target.value);
        }}
        onBlur={(e) => validation.handleBlur('firstName', e.target.value)}
        className={validation.errors.firstName ? 'border-red-500' : ''}
      />
      {validation.errors.firstName && (
        <p className="text-red-500">{validation.errors.firstName}</p>
      )}

      <button type="submit" disabled={validation.isValidating}>
        Enviar
      </button>
    </form>
  );
}
```

### Ejemplo 2: Formulario Simple (Solo Submit)

```typescript
import { useSimpleFormValidation } from '../hooks/useFormValidation';
import { productSchema } from '../lib/validation/schemas';

function ProductForm() {
  const [product, setProduct] = useState({
    name: '',
    description: '',
    // ...
  });

  const { errors, validate } = useSimpleFormValidation(productSchema);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await validate(product);
    if (!result.success) {
      // El hook ya muestra el toast de error
      return;
    }

    // Procesar producto
    await saveProduct(result.data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* campos del formulario */}
    </form>
  );
}
```

### Ejemplo 3: Validación Manual de Campo

```typescript
const { validateField } = useFormValidation(schema);

const handleEmailBlur = async (email: string) => {
  const result = await validateField('email', email);

  if (!result.valid) {
    console.error('Email inválido:', result.error);
  }
};
```

---

## 🎨 Integración con UI

### Con LoadingButton

```typescript
import LoadingButton from '../components/ui/LoadingButton';

<LoadingButton
  type="submit"
  loading={validation.isValidating}
  loadingText="Validando..."
>
  Guardar
</LoadingButton>
```

### Con Notificaciones

```typescript
const result = await validation.validate(data);

if (result.success) {
  notify.success('Formulario válido');
} else {
  notify.error('Por favor, corrige los errores');
}
```

---

## 🔍 Validaciones Personalizadas

### Añadir Schema Nuevo

En `src/lib/validation/schemas.ts`:

```typescript
export const contactSchema = z.object({
  name: z.string().min(2, 'Nombre demasiado corto'),
  email: emailSchema,  // Reutilizar schema existente
  message: z.string().min(10, 'Mensaje muy corto').max(500),
});

export type ContactFormData = z.infer<typeof contactSchema>;
```

### Validaciones Cross-Field

Usa `.refine()` para validar relaciones entre campos:

```typescript
const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']  // Asignar error a este campo
  }
);
```

### Validaciones Async

```typescript
const schema = z.object({
  email: z.string().email().refine(
    async (email) => {
      const exists = await checkEmailExists(email);
      return !exists;
    },
    { message: 'Este email ya está registrado' }
  )
});
```

---

## 📊 Utilidades Incluidas

### `formatZodError()`

Convierte errores de Zod en formato UI-friendly:

```typescript
import { formatZodError } from '../lib/validation/schemas';

try {
  schema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    const errors = formatZodError(error);
    // { firstName: 'Nombre requerido', email: 'Email inválido' }
  }
}
```

### `validateSchema()`

Validación segura sin throws:

```typescript
import { validateSchema } from '../lib/validation/schemas';

const result = validateSchema(schema, data);

if (result.success) {
  console.log(result.data);  // Datos validados y tipados
} else {
  console.log(result.errors);  // { field: 'error message' }
}
```

### `validateField()`

Valida un campo individual:

```typescript
import { validateField, emailSchema } from '../lib/validation/schemas';

const result = validateField(emailSchema, 'test@example.com');

if (result.valid) {
  console.log('Email válido');
} else {
  console.error(result.error);
}
```

---

## 🐛 Debugging

### Logs Automáticos

El sistema incluye logging automático:

```typescript
// En desarrollo (DEV mode)
[Checkout-Shipping] Validating form
[Checkout-Shipping] Validation successful

// En producción
// Solo se logean errores
```

### Ver Logs en Consola

```typescript
logger.debug('[MiFormulario] Debug info');
logger.info('[MiFormulario] Info message');
logger.warn('[MiFormulario] Warning', { data });
logger.error('[MiFormulario] Error', error);
```

### Acceder al Logger en DevTools

En modo desarrollo:

```javascript
// En la consola del navegador
__logger.debug('Test');
__setLogLevel('DEBUG');  // DEBUG | INFO | WARN | ERROR
```

---

## ✅ Mejores Prácticas

1. **Centralizar Schemas**
   - Define todos los schemas en `schemas.ts`
   - Reutiliza schemas parciales (ej: `emailSchema`)

2. **Usar TypeScript**
   - Infiere tipos con `z.infer<typeof schema>`
   - Evita type assertions

3. **Validar en Múltiples Capas**
   - Frontend: UX y feedback inmediato
   - Backend: Seguridad y validación definitiva

4. **Mensajes Claros**
   - Usa mensajes específicos y accionables
   - Evita jerga técnica para usuarios finales

5. **Logging Apropiado**
   - DEBUG: Información de desarrollo
   - INFO: Operaciones normales
   - WARN: Validaciones fallidas
   - ERROR: Errores inesperados

---

## 🚀 Próximas Mejoras

- [ ] Validación i18n (multi-idioma)
- [ ] Validación de archivos (tamaño, tipo)
- [ ] Validación de imágenes (dimensiones)
- [ ] Rate limiting en validaciones async
- [ ] Cache de validaciones costosas
- [ ] Tests unitarios con Vitest

---

## 📚 Referencias

- [Zod Documentation](https://zod.dev/)
- [React Hook Form + Zod](https://react-hook-form.com/get-started#SchemaValidation)
- [TypeScript Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)

---

**Última actualización**: 2025-01-27
**Versión**: 1.0.0
