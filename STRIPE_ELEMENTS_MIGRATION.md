# 🔐 Migración a Stripe Elements (PCI-DSS Compliant)

## ⚠️ Problema Actual

El checkout **ACTUAL** envía datos de tarjeta al servidor:
```
Browser → Servidor (card data) → Stripe
```

**Esto viola PCI-DSS** y expone tu negocio a:
- Riesgos legales
- Multas por incumplimiento
- Vulnerabilidades de seguridad
- Responsabilidad por datos de tarjeta

---

## ✅ Solución: Stripe Elements

Los datos de tarjeta van **directo a Stripe**:
```
Browser (Stripe iframe) → Stripe ✓
Servidor solo recibe tokens ✓
```

**Beneficios**:
- ✅ 100% PCI-DSS compliant
- ✅ Sin certificación PCI requerida
- ✅ Stripe maneja la seguridad
- ✅ Reducción de responsabilidad legal

---

## 📦 Componentes Creados

### 1. **StripeProvider.tsx**
Envuelve el checkout con el proveedor de Stripe Elements.

```tsx
import StripeProvider from './components/checkout/StripeProvider';

<StripeProvider>
  <Checkout />
</StripeProvider>
```

### 2. **StripeCardElement.tsx**
Componente seguro para entrada de tarjeta (iframe de Stripe).

- Datos de tarjeta en iframe aislado
- Nunca toca tu código JavaScript
- Validación automática
- Estilizado personalizable

### 3. **SecureCardPayment.tsx**
Hook completo para procesar pagos de forma segura.

```tsx
const payment = useSecureCardPayment({
  orderId: 'order_123',
  orderTotal: 99.99,
  billingDetails: { ... },
  onSuccess: (paymentIntentId) => { ... },
  onError: (error) => { ... },
});

// Renderizar el elemento de tarjeta
{payment.CardElement}

// Procesar el pago
await payment.processPayment();
```

---

## 🔧 Pasos de Migración

### Paso 1: Envolver Checkout con StripeProvider

**Antes** (`src/pages/checkout.astro`):
```astro
<Checkout client:load />
```

**Después**:
```astro
import StripeProvider from '../components/checkout/StripeProvider';

<StripeProvider client:only="react">
  <Checkout client:load />
</StripeProvider>
```

### Paso 2: Actualizar Checkout.tsx

**Reemplazar** los campos de tarjeta (líneas 1349-1440):

```tsx
// ❌ ELIMINAR ESTO:
<input type="text" value={paymentInfo.cardNumber} ... />
<input type="text" value={paymentInfo.cardExpiry} ... />
<input type="text" value={paymentInfo.cardCVV} ... />
```

```tsx
// ✅ USAR ESTO:
import { useSecureCardPayment } from '../checkout/SecureCardPayment';

// Dentro del componente:
const securePayment = useSecureCardPayment({
  orderId: '...', // Se obtiene después de crear la orden
  orderTotal: total,
  billingDetails: {
    name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
    email: shippingInfo.email,
    phone: shippingInfo.phone,
    address: {
      line1: shippingInfo.address,
      city: shippingInfo.city,
      postal_code: shippingInfo.zipCode,
      state: shippingInfo.state,
      country: 'ES',
    },
  },
  onSuccess: (paymentIntentId) => {
    notify.success('¡Pago completado!');
    // Continuar con el flujo
  },
  onError: (error) => {
    notify.error(error);
  },
});

// En el formulario de pago:
{securePayment.CardElement}
```

### Paso 3: Actualizar processCardPayment

**ELIMINAR** toda la función `processCardPayment` (líneas 303-420).

**REEMPLAZAR** con:

```tsx
const handlePayment = async (orderId: string) => {
  const result = await securePayment.processPayment();

  if (result.success) {
    // Pago exitoso
    clearCart();
    window.location.href = `/confirmacion?orderId=${orderId}`;
  } else {
    // Error manejado por onError callback
    console.error('Payment failed:', result.error);
  }
};
```

### Paso 4: Actualizar PaymentInfo interface

**ELIMINAR** campos de tarjeta:

```tsx
interface PaymentInfo {
  method: 'card' | 'paypal' | 'transfer' | 'cash';
  // ❌ ELIMINAR:
  // cardNumber?: string;
  // cardName?: string;
  // cardExpiry?: string;
  // cardCVV?: string;
}
```

### Paso 5: Eliminar endpoint inseguro

Una vez completada la migración:

```bash
rm src/pages/api/create-payment-method.ts
```

---

## 🧪 Testing

### Test de Tarjetas Stripe

Usa estas tarjetas de test en desarrollo:

| Tarjeta | Resultado |
|---------|-----------|
| `4242 4242 4242 4242` | ✅ Pago exitoso |
| `4000 0000 0000 9995` | ❌ Tarjeta rechazada |
| `4000 0025 0000 3155` | 🔐 Requiere 3D Secure |

**CVC**: Cualquier 3 dígitos
**Fecha**: Cualquier fecha futura
**ZIP**: Cualquier código postal

---

## 📝 Checklist de Migración

- [ ] Instalar dependencias (`@stripe/react-stripe-js` - ✅ YA INSTALADO)
- [ ] Envolver Checkout con StripeProvider
- [ ] Reemplazar campos de tarjeta con StripeCardElement
- [ ] Eliminar función processCardPayment
- [ ] Integrar useSecureCardPayment
- [ ] Actualizar handlePlaceOrder
- [ ] Eliminar validación de tarjeta en paymentInfoSchema
- [ ] Probar flujo completo con tarjetas de test
- [ ] Eliminar /api/create-payment-method
- [ ] Desplegar a producción
- [ ] Verificar en producción con tarjeta real

---

## 🚨 Estado Actual

- ✅ Componentes Stripe Elements creados
- ✅ Endpoint inseguro marcado como deprecated
- ⏳ **Migración de Checkout.tsx pendiente** (manual)
- ⏳ Eliminación de endpoint inseguro pendiente

---

## 💡 Beneficios Post-Migración

1. **Compliance**: 100% PCI-DSS compliant
2. **Seguridad**: Datos de tarjeta nunca en tu servidor
3. **Responsabilidad**: Stripe asume riesgo de datos
4. **Legal**: Sin exposición a multas PCI
5. **UX**: Validación en tiempo real de Stripe
6. **Mantenimiento**: Stripe maneja actualizaciones de seguridad

---

## 📚 Documentación de Referencia

- [Stripe Elements](https://stripe.com/docs/stripe-js)
- [React Stripe.js](https://stripe.com/docs/stripe-js/react)
- [PCI DSS Compliance](https://stripe.com/docs/security/guide)
- [Payment Intents](https://stripe.com/docs/payments/payment-intents)

---

## ❓ Preguntas Frecuentes

### ¿Por qué no puedo seguir enviando tarjetas al servidor?

Porque viola PCI-DSS Level 1 requirements. Almacenar o transmitir datos de tarjeta requiere:
- Auditorías anuales costosas ($50,000+)
- Infraestructura altamente segura
- Certificaciones y compliance
- Responsabilidad legal por brechas

Stripe Elements te libera de todo esto.

### ¿Qué pasa con órdenes existentes?

El endpoint antiguo seguirá funcionando durante la migración, pero **debes completar la migración lo antes posible**.

### ¿Afecta a otros métodos de pago?

No. PayPal, transferencia y efectivo siguen igual. Solo cambia el procesamiento de tarjetas.

---

**Última actualización**: 2025-11-02
**Estado**: 🟡 Migración en progreso
