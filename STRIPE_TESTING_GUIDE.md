# 🧪 Guía de Testing de Stripe Elements

## 📋 Checklist Pre-Testing

Antes de empezar, asegúrate de tener:

- [ ] ✅ Stripe en modo TEST (claves que empiezan con `pk_test_` y `sk_test_`)
- [ ] ✅ Variables de entorno configuradas (`npm run verify-env`)
- [ ] ✅ Servidor de desarrollo corriendo (`npm run dev`)
- [ ] ✅ Stripe CLI instalado (para webhooks locales)

---

## 🎯 **Escenarios de Testing**

### **1. Pago Exitoso (Happy Path)** ✅

**Tarjeta:** `4242 4242 4242 4242`

**Flujo completo:**
1. Navega a: `http://localhost:4321`
2. Agrega un producto al carrito
3. Ve a checkout: `http://localhost:4321/checkout`
4. Llena el formulario con datos de prueba:
   - Email: `test@example.com`
   - Nombre: `Test User`
   - Dirección: `Calle Test 123`
   - Ciudad: `Madrid`
   - CP: `28001`
5. Selecciona método de pago: **Tarjeta**
6. En el campo de Stripe Elements, ingresa:
   - **Número:** `4242 4242 4242 4242`
   - **Fecha:** `12/34` (cualquier fecha futura)
   - **CVC:** `123` (cualquier 3 dígitos)
   - **ZIP:** `12345`
7. Acepta términos y condiciones
8. Click "Realizar Pedido"

**Resultado esperado:**
- ✅ Notificación: "¡Pago completado con éxito!"
- ✅ Redirección a `/confirmacion?orderId=...`
- ✅ Página de confirmación muestra detalles del pedido
- ✅ Botón "Descargar Factura" funciona
- ✅ Pedido en Firestore con `status: 'paid'`

**Logs en consola:**
```
[Checkout] Placing order
[Checkout] Generated idempotency key: order_xxx
[Checkout] Order saved
[Checkout] Processing card payment...
[SecureCardPayment] Creating PaymentIntent
[SecureCardPayment] Payment successful
[Checkout] Payment successful
```

**Verificar en Stripe Dashboard:**
https://dashboard.stripe.com/test/payments
- Debería aparecer el pago con status "Succeeded"
- Monto correcto
- Metadata con orderId

---

### **2. Tarjeta Rechazada** ❌

**Tarjeta:** `4000 0000 0000 0002`

**Flujo:**
1-6. Igual que escenario 1
7. Ingresa tarjeta: `4000 0000 0000 0002`
8. Click "Realizar Pedido"

**Resultado esperado:**
- ❌ Notificación de error: "Tu tarjeta fue rechazada"
- ❌ No hay redirección
- ❌ Pedido en Firestore con `status: 'pending'` (no cambia a 'paid')
- ❌ Usuario puede intentar de nuevo

**Logs en consola:**
```
[Checkout] Placing order
[Checkout] Order saved
[Checkout] Processing card payment...
[SecureCardPayment] Payment failed: Your card was declined
[Checkout] Error placing order
```

**Verificar en Stripe Dashboard:**
- Pago aparece con status "Failed"

---

### **3. Fondos Insuficientes** 💳

**Tarjeta:** `4000 0000 0000 9995`

**Flujo:**
1-6. Igual que escenario 1
7. Ingresa tarjeta: `4000 0000 0000 9995`
8. Click "Realizar Pedido"

**Resultado esperado:**
- ❌ Notificación: "Fondos insuficientes"
- ❌ No hay redirección
- ❌ Usuario puede intentar con otra tarjeta

---

### **4. Requiere Autenticación 3D Secure** 🔐

**Tarjeta:** `4000 0025 0000 3155`

**Flujo:**
1-6. Igual que escenario 1
7. Ingresa tarjeta: `4000 0025 0000 3155`
8. Click "Realizar Pedido"

**Resultado esperado:**
- 🔐 Modal de Stripe aparece solicitando autenticación
- ✅ Click "Complete" en el modal
- ✅ Pago se completa exitosamente
- ✅ Redirección a confirmación

**Resultado si falla autenticación:**
- ❌ Click "Fail" en el modal
- ❌ Error: "Autenticación requerida"

---

### **5. Tarjeta Expirada** 📅

**Tarjeta:** `4000 0000 0000 0069`

**Flujo:**
1-6. Igual que escenario 1
7. Ingresa tarjeta: `4000 0000 0000 0069`
8. Click "Realizar Pedido"

**Resultado esperado:**
- ❌ Error: "Tu tarjeta ha expirado"

---

### **6. CVC Incorrecto** 🔢

**Tarjeta:** `4000 0000 0000 0127`

**Flujo:**
1-6. Igual que escenario 1
7. Ingresa tarjeta: `4000 0000 0000 0127`
8. Click "Realizar Pedido"

**Resultado esperado:**
- ❌ Error: "El código de seguridad de tu tarjeta es incorrecto"

---

### **7. Processing Error** ⚠️

**Tarjeta:** `4000 0000 0000 0119`

**Flujo:**
1-6. Igual que escenario 1
7. Ingresa tarjeta: `4000 0000 0000 0119`
8. Click "Realizar Pedido"

**Resultado esperado:**
- ❌ Error: "Ocurrió un error al procesar tu pago"

---

### **8. Idempotency - Prevenir Duplicados** 🔄

**Propósito:** Verificar que no se crean pedidos duplicados si el usuario hace doble-click

**Flujo:**
1-6. Igual que escenario 1
7. Ingresa tarjeta: `4242 4242 4242 4242`
8. Click "Realizar Pedido" **DOS VECES rápidamente**

**Resultado esperado:**
- ✅ Solo se crea UN pedido
- ✅ Solo se hace UN cargo en Stripe
- ✅ Segunda llamada devuelve el mismo orderId
- ✅ Logs muestran: "Order already exists with this idempotency key"

---

## 🎨 **Testing UI/UX**

### **Validaciones de Formulario**

#### **Test 1: Campos requeridos vacíos**
1. Ve a checkout
2. Click "Continuar al Pago" SIN llenar campos

**Esperado:**
- ❌ Errores en campos vacíos
- ❌ No avanza al paso 2

#### **Test 2: Email inválido**
1. Ingresa: `invalid-email`
2. Click "Continuar al Pago"

**Esperado:**
- ❌ Error: "Email válido requerido"

#### **Test 3: Código postal inválido**
1. Ingresa: `123` (menos de 5 dígitos)
2. Click "Continuar al Pago"

**Esperado:**
- ❌ Error: "Código postal debe tener 5 dígitos"

### **Stripe Elements Validación**

#### **Test 4: Número de tarjeta incompleto**
1. Ingresa: `4242 4242`
2. Click "Realizar Pedido"

**Esperado:**
- ❌ Campo de tarjeta muestra error
- ❌ Botón permanece habilitado pero el procesamiento falla

#### **Test 5: Fecha expirada**
1. Ingresa fecha: `12/20` (pasado)
2. Click "Realizar Pedido"

**Esperado:**
- ❌ Campo muestra error: "Tu tarjeta ha expirado"

---

## 🔗 **Testing de Webhooks**

### **Setup Webhook Local**

```bash
# Terminal 1: Servidor de desarrollo
npm run dev

# Terminal 2: Stripe CLI
stripe listen --forward-to localhost:4321/api/stripe-webhook
```

**Resultado:**
```
Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

Copia el `whsec_xxx` y agrégalo a `.env`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### **Test de Webhook**

1. Realiza un pago exitoso (tarjeta `4242...`)
2. Observa logs de Stripe CLI:

**Esperado:**
```
<- payment_intent.created
-> POST /api/stripe-webhook [200]
<- payment_intent.succeeded
-> POST /api/stripe-webhook [200]
```

3. Verifica en logs del servidor:
```
[stripe-webhook] Received event: payment_intent.succeeded
[stripe-webhook] Order updated to paid
```

---

## 🐛 **Troubleshooting**

### **Error: "Stripe Elements not found"**

**Causa:** `StripeProvider` no está envolviendo el componente

**Solución:**
```tsx
// checkout.astro
<CheckoutWithStripe client:load />

// CheckoutWithStripe.tsx
<StripeProvider>
  <Checkout />
</StripeProvider>
```

### **Error: "Invalid API Key"**

**Causa:** Variable de entorno mal configurada

**Solución:**
```bash
# Verifica que existan y sean correctas
npm run verify-env

# O manualmente:
echo $PUBLIC_STRIPE_PUBLISHABLE_KEY  # Debe empezar con pk_test_
echo $STRIPE_SECRET_KEY               # Debe empezar con sk_test_
```

### **Error: "No such PaymentIntent"**

**Causa:** orderId no se está pasando correctamente

**Solución:**
Verifica que `handlePlaceOrder` guarde el orderId antes de llamar `processPayment`:
```typescript
const { orderId: newOrderId } = await response.json();
setOrderId(newOrderId);
const paymentResult = await securePayment.processPayment(newOrderId);
```

### **Webhook no recibe eventos**

**Causa:** `STRIPE_WEBHOOK_SECRET` no configurado o `stripe listen` no está corriendo

**Solución:**
```bash
# 1. Verifica que stripe listen esté corriendo
stripe listen --forward-to localhost:4321/api/stripe-webhook

# 2. Verifica .env
echo $STRIPE_WEBHOOK_SECRET  # Debe empezar con whsec_
```

### **Payment Intent se crea pero no se confirma**

**Causa:** Error en `confirmCardPayment`

**Solución:**
Revisa logs en consola del navegador y busca errores en:
- Configuración de Stripe Elements
- Validación de billing details
- Red (CORS, fetch failed)

---

## 📊 **Checklist de Testing Completo**

### **Funcional:**
- [ ] ✅ Pago exitoso con tarjeta válida
- [ ] ❌ Pago rechazado manejado correctamente
- [ ] ❌ Fondos insuficientes manejado
- [ ] 🔐 3D Secure funciona
- [ ] 📅 Tarjeta expirada rechazada
- [ ] 🔢 CVC incorrecto rechazado
- [ ] ⚠️ Processing error manejado
- [ ] 🔄 Idempotency previene duplicados

### **UI/UX:**
- [ ] Validaciones de formulario funcionan
- [ ] Mensajes de error son claros
- [ ] Loading states durante procesamiento
- [ ] Botón deshabilitado durante procesamiento
- [ ] Redirección exitosa a confirmación
- [ ] Factura descargable

### **Seguridad:**
- [ ] Datos de tarjeta NO llegan al servidor
- [ ] Solo Stripe ve los datos sensibles
- [ ] CSRF token validado
- [ ] Idempotency key implementado
- [ ] Rate limiting funciona

### **Webhooks:**
- [ ] Eventos recibidos correctamente
- [ ] Pedido actualizado a 'paid'
- [ ] Logs de webhook en servidor
- [ ] Signature validation pasa

---

## 🎯 **Test Matrix**

| Tarjeta | CVV | Resultado | Status Code |
|---------|-----|-----------|-------------|
| 4242 4242 4242 4242 | 123 | ✅ Éxito | 200 |
| 4000 0000 0000 0002 | 123 | ❌ Rechazada | 402 |
| 4000 0000 0000 9995 | 123 | ❌ Fondos insuficientes | 402 |
| 4000 0025 0000 3155 | 123 | 🔐 Requiere 3DS | 200 |
| 4000 0000 0000 0069 | 123 | ❌ Expirada | 402 |
| 4000 0000 0000 0127 | 123 | ❌ CVC incorrecto | 402 |
| 4000 0000 0000 0119 | 123 | ❌ Processing error | 402 |

---

## 📚 **Referencias**

- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Elements Best Practices](https://stripe.com/docs/stripe-js)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [3D Secure Testing](https://stripe.com/docs/testing#regulatory-cards)

---

## ✅ **Resultado Final**

Si todos los tests pasan:
- ✅ **PCI-DSS Compliant** - Datos de tarjeta nunca tocan tu servidor
- ✅ **Robusto** - Maneja todos los casos de error
- ✅ **Seguro** - CSRF, rate limiting, idempotency
- ✅ **Confiable** - Webhooks sincronizan estado
- ✅ **Listo para producción** 🚀

---

🎉 **¡Felicidades!** Tu integración de Stripe Elements está completa y testeada.

**Próximo paso:** Cambiar a claves de producción cuando estés listo para lanzar.
