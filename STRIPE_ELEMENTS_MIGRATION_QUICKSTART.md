# 🚀 Guía Rápida: Completar Migración Stripe Elements

## ✅ Ya Completado

1. ✅ `checkout.astro` - Envuelto con `<StripeProvider>`
2. ✅ `PaymentInfo` interface - Campos de tarjeta eliminados
3. ✅ Estado `paymentInfo` - Campos de tarjeta eliminados
4. ✅ Validación `paymentValidation` - Eliminada

---

## 📝 Pasos Restantes (Manual)

### Paso 1: Eliminar función `processCardPayment`

**Buscar** (línea ~292): `const processCardPayment = useCallback`

**Eliminar** toda la función hasta la línea que tiene: `[paymentInfo, shippingInfo]`

**Reemplazar** con:

```tsx
// REMOVED: Old insecure processCardPayment function
// Now using Stripe Elements (PCI-DSS compliant)
```

---

### Paso 2: Eliminar/Actualizar `validateStep2`

**Buscar** (línea ~427): `const validateStep2 = async`

**Opción A - Simplificar**:

```tsx
const validateStep2 = async (): Promise<boolean> => {
  // Payment method validation only
  if (!paymentInfo.method) {
    notify.error('Selecciona un método de pago');
    return false;
  }

  // Card validation handled by Stripe Elements
  return true;
};
```

**Opción B - Eliminar** (si no se usa para otros métodos de pago)

---

### Paso 3: Actualizar la sección del formulario de tarjeta

**Buscar** (línea ~1340-1440): Los 3 inputs de tarjeta:

```tsx
<input type="text" value={paymentInfo.cardNumber} ...
<input type="text" value={paymentInfo.cardExpiry} ...
<input type="text" value={paymentInfo.cardCVV} ...
```

**Reemplazar CON**:

```tsx
{
  /* PCI-DSS Compliant Card Input */
}
{
  paymentInfo.method === 'card' && securePayment && (
    <div className="mt-4">{securePayment.CardElement}</div>
  );
}
```

---

### Paso 4: Agregar el Hook `useSecureCardPayment`

**Agregar** después de `useAuth()` (línea ~68):

```tsx
const { user } = useAuth();

// Stripe Elements - PCI-DSS Compliant Payment
const [orderId, setOrderId] = useState<string | null>(null);

const securePayment = orderId
  ? useSecureCardPayment({
      orderId,
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
        logger.info('[Checkout] Payment successful', { paymentIntentId });
        notify.success('¡Pago completado con éxito!');
        clearCart();
        setTimeout(() => {
          window.location.href = `/confirmacion?orderId=${orderId}`;
        }, 500);
      },
      onError: (error) => {
        logger.error('[Checkout] Payment failed', error);
        notify.error(error);
        setIsProcessing(false);
      },
    })
  : null;
```

---

### Paso 5: Actualizar `handlePlaceOrder`

**Buscar** (línea ~600-650): El flujo después de guardar la orden

**Modificar** para separar guardado de orden y procesamiento de pago:

```tsx
const handlePlaceOrder = async () => {
  if (!acceptTerms) {
    notify.warning('Debes aceptar los términos y condiciones');
    return;
  }

  logger.info('[Checkout] Placing order', { total, itemCount: cart.items.length });
  setIsProcessing(true);

  try {
    // Generar idempotency key
    const idempotencyKey = `order_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Preparar datos de la orden
    const orderData = {
      idempotencyKey,
      items: cart.items.map((item) => ({ ...item })),
      userId: user?.uid || 'guest',
      customerEmail: shippingInfo.email,
      shippingInfo: { ... },
      billingInfo: { ... },
      paymentMethod: paymentInfo.method,
      subtotal,
      couponDiscount,
      // ... resto de datos
      total,
      status: 'pending',
    };

    // Guardar orden
    const response = await fetch('/api/save-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      throw new Error('Error al guardar la orden');
    }

    const { orderId: newOrderId } = await response.json();
    setOrderId(newOrderId); // Esto activa el hook de pago

    logger.info('[Checkout] Order saved', { orderId: newOrderId });

    // Si es pago con tarjeta, procesar con Stripe Elements
    if (paymentInfo.method === 'card' && securePayment) {
      logger.info('[Checkout] Processing card payment...');
      const paymentResult = await securePayment.processPayment();

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Error procesando pago');
      }
      // El onSuccess del hook maneja la redirección
    } else {
      // Otros métodos de pago (PayPal, transferencia, efectivo)
      notify.success('¡Pedido realizado con éxito!');
      clearCart();
      setTimeout(() => {
        window.location.href = `/confirmacion?orderId=${newOrderId}`;
      }, 500);
    }
  } catch (error) {
    logger.error('[Checkout] Error placing order', error);
    notify.error('Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.');
    setIsProcessing(false);
  }
};
```

---

### Paso 6: Eliminar funciones helper de formateo de tarjeta

**Buscar y ELIMINAR**:

- `formatCardNumber`
- `formatCVV`
- Cualquier otra función relacionada con validación de tarjeta

**Ya NO se necesitan** - Stripe Elements las maneja

---

## 🧪 Testing

Después de hacer los cambios:

1. **Verificar que compile**:



2. **Probar flujo completo**:
   - Agregar producto al carrito
   - Ir a checkout
   - Llenar datos de envío
   - En pago, seleccionar tarjeta
   - Ver que aparece el Stripe Card Element (no los inputs antiguos)
   - Ingresar tarjeta de test: `4242 4242 4242 4242`
   - Completar pedido

---

## 🎯 Checklist

- [ ] Función `processCardPayment` eliminada
- [ ] Función `validateStep2` actualizada
- [ ] Inputs de tarjeta eliminados del JSX
- [ ] Hook `useSecureCardPayment` agregado
- [ ] `handlePlaceOrder` actualizado
- [ ] Funciones de formateo eliminadas
- [ ] Compila sin errores
- [ ] Probado con tarjeta de test

---

## ⚠️ Puntos Importantes

1. **No pierdas** los otros métodos de pago (PayPal, transferencia, cash)
2. **Mantén** la lógica de cupones y wallet
3. **El orderId se genera ANTES** del pago
4. **Stripe Elements se renderiza DESPUÉS** de crear la orden

---

## 🆘 Si algo falla

Revisa:

1. Console del navegador (errores de React)
2. Network tab (errores de API)
3. Que StripeProvider esté en checkout.astro
4. Que los imports sean correctos

---

¿Necesitas ayuda con algún paso específico?
