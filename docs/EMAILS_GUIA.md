# Guia de uso - Sistema de Emails Imprime Arte

## Instalacion

1. Instala Resend:

```bash
npm install resend
```

2. Configura la variable de entorno:

```env
RESEND_API_KEY=re_tu_clave_aqui
```

## Estructura de archivos

- `src/lib/Email.ts`  
  Funciones de envio (confirmacion, bienvenida, carrito, newsletter).
- `src/pages/api/email/[action].ts`  
  Endpoints API que llaman a las funciones anteriores.

## Ejemplo 1: Enviar confirmacion de pedido

Uso tipico cuando el cliente completa el pago.

```ts
async function ejemploConfirmacionPedido() {
  const response = await fetch('/api/email/confirmacion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'cliente@gmail.com',
      nombre: 'Maria Garcia',
      numeroPedido: 'IMP-2025-001',
      items: [
        {
          nombre: 'Camiseta personalizada DTF',
          cantidad: 2,
          precio: 15.99,
          imagen: 'https://imprimearte.es/productos/camiseta.jpg',
        },
        {
          nombre: 'Taza sublimacion',
          cantidad: 1,
          precio: 12.5,
        },
      ],
      total: 44.48,
      metodoPago: 'Tarjeta de credito',
      direccionEnvio: 'Calle Los Llanos 15, La Palma',
    }),
  });

  const data = await response.json();
  console.log('Resultado:', data);
}
```

## Ejemplo 2: Enviar email de bienvenida

Uso tipico cuando alguien se registra.

```ts
async function ejemploBienvenida() {
  const response = await fetch('/api/email/bienvenida', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nuevo-cliente@gmail.com',
      nombre: 'Pedro',
    }),
  });

  const data = await response.json();
  console.log('Resultado:', data);
}
```

## Ejemplo 3: Enviar carrito abandonado

Uso tipico con n8n o un cron.

```ts
async function ejemploCarritoAbandonado() {
  const response = await fetch('/api/email/carrito-abandonado', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'cliente@gmail.com',
      nombre: 'Ana',
      items: [
        {
          nombre: 'Sudadera bordada personalizada',
          cantidad: 1,
          precio: 35.0,
          imagen: 'https://imprimearte.es/productos/sudadera.jpg',
        },
      ],
      totalCarrito: 35.0,
      urlRecuperacion: 'https://imprimearte.es/carrito?recover=abc123',
    }),
  });

  const data = await response.json();
  console.log('Resultado:', data);
}
```

## Ejemplo 4: Enviar newsletter

```ts
async function ejemploNewsletter() {
  const response = await fetch('/api/email/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'suscriptor@gmail.com',
      nombre: 'Carlos',
      asunto: 'Ofertas de primavera - 20% en todo',
      contenidoHtml: `
        <h2 style="color: #1a1a2e;">Llega la primavera con descuentos</h2>
        <p style="color: #555; line-height: 1.6;">
          Durante esta semana, disfruta de un <strong>20% de descuento</strong> en todos nuestros productos.
          Personaliza camisetas, tazas, regalos y mucho mas.
        </p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="https://imprimearte.es/ofertas" 
             style="background: #e74c3c; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Ver ofertas
          </a>
        </div>
      `,
    }),
  });

  const data = await response.json();
  console.log('Resultado:', data);
}
```

## Integracion con checkout

Despues de confirmar el pago:

```tsx
const handlePagoExitoso = async (datosPedido) => {
  // 1. Guardar pedido en Firebase
  const pedidoRef = await addDoc(collection(db, 'pedidos'), datosPedido);

  // 2. Enviar email de confirmacion
  await fetch('/api/email/confirmacion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: datosPedido.clienteEmail,
      nombre: datosPedido.clienteNombre,
      numeroPedido: pedidoRef.id,
      items: datosPedido.items,
      total: datosPedido.total,
      metodoPago: datosPedido.metodoPago,
    }),
  });

  // 3. Redirigir a pagina de exito
  window.location.href = `/pedido-confirmado/${pedidoRef.id}`;
};
```

## Integracion con n8n (carrito abandonado)

1. Crea un workflow en n8n.
2. Trigger: Cron (cada 1 hora).
3. Nodo Firebase: buscar carritos con mas de 30 min sin actividad.
4. Nodo HTTP Request: POST a `/api/email/carrito-abandonado`.
5. Envia los datos del carrito al endpoint.
