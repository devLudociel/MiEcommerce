# Configuración de Stripe para Pagos

## 📋 Pasos para configurar Stripe

### 1. Crear cuenta en Stripe

1. Ve a [https://stripe.com](https://stripe.com)
2. Haz clic en "Empezar ahora"
3. Regístrate con tu email
4. Completa la información de tu negocio

### 2. Obtener las claves de API (Modo Test)

1. Accede a [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. Encontrarás dos claves:
   - **Clave publicable** (comienza con `pk_test_...`)
   - **Clave secreta** (comienza con `sk_test_...`, haz clic en "Revelar clave de prueba")

### 3. Configurar las variables de entorno

1. Abre el archivo `.env` en la raíz del proyecto
2. Reemplaza los valores de Stripe:

```env
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_TU_CLAVE_PUBLICA_AQUI
STRIPE_SECRET_KEY=sk_test_TU_CLAVE_SECRETA_AQUI
```

### 4. Tarjetas de prueba de Stripe

Para hacer pruebas, usa estas tarjetas:

**Pago exitoso:**
- Número: `4242 4242 4242 4242`
- Fecha: Cualquier fecha futura (ej: `12/25`)
- CVV: Cualquier 3 dígitos (ej: `123`)
- Código postal: Cualquiera

**Pago rechazado:**
- Número: `4000 0000 0000 0002`

**Requiere autenticación 3D Secure:**
- Número: `4000 0025 0000 3155`

Más tarjetas de prueba: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)

### 5. Probar el flujo de pago

1. Inicia el servidor: `npm run dev`
2. Agrega productos al carrito
3. Ve a checkout
4. Completa la información de envío
5. Selecciona "Tarjeta de Crédito/Débito"
6. Usa una tarjeta de prueba
7. Completa el pedido

### 6. Ver transacciones

Accede al dashboard de Stripe para ver:
- Pagos: [https://dashboard.stripe.com/test/payments](https://dashboard.stripe.com/test/payments)
- Clientes: [https://dashboard.stripe.com/test/customers](https://dashboard.stripe.com/test/customers)

## 🔄 Cambiar a producción

Cuando estés listo para aceptar pagos reales:

1. Completa la activación de tu cuenta en Stripe
2. Cambia las claves en `.env` a las de producción:
   - `pk_live_...` (clave publicable)
   - `sk_live_...` (clave secreta)
3. Configura webhooks para recibir notificaciones de pago

## 🏦 Integrar pasarela del banco

Cuando tu banco te dé acceso a su pasarela (ej: Redsys):

1. El técnico del banco te proporcionará:
   - Número de comercio
   - Clave secreta
   - Terminal

2. Necesitarás crear un nuevo endpoint en `/src/pages/api/redsys-payment.ts`
3. Reemplazar la lógica de Stripe en `Checkout.tsx`

## ⚙️ Otros métodos de pago

Los siguientes métodos ya están configurados pero no procesan pagos reales:

- **Transferencia bancaria**: El pedido se crea como "pendiente"
- **Contra reembolso**: El pedido se crea como "pendiente" con +3€ extra

## 🔐 Seguridad

**IMPORTANTE:**
- NUNCA subas el archivo `.env` a Git (ya está en `.gitignore`)
- NUNCA compartas tus claves secretas (`sk_test_...` o `sk_live_...`)
- Las claves publicables (`pk_test_...` o `pk_live_...`) son seguras para el frontend

## 📊 Monitoreo

Stripe te notificará por email cuando:
- Hay un pago exitoso
- Hay un pago fallido
- Hay una disputa o devolución

## 🆘 Soporte

Si tienes problemas:
- Documentación de Stripe: [https://stripe.com/docs](https://stripe.com/docs)
- Soporte de Stripe: [https://support.stripe.com](https://support.stripe.com)
