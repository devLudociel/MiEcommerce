// ============================================
// Email Service - Imprime Arte
// Using Resend + HTML Templates
// ============================================

import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

// General configuration
const EMAIL_CONFIG = {
  from: 'Imprime Arte <pedidos@imprimearte.es>',
  replyTo: 'pedidos@imprimearte.es', // Change if you want replies to a different email
  businessName: 'Imprime Arte',
  businessUrl: 'https://imprimearte.es',
  businessPhone: '+34 XXX XXX XXX', // Replace with your real phone
  businessAddress: 'La Palma, Islas Canarias',
};

// ============================================
// Types
// ============================================

interface OrderItem {
  nombre: string;
  cantidad: number;
  precio: number;
  imagen?: string;
}

interface OrderEmailData {
  clienteEmail: string;
  clienteNombre: string;
  numeroPedido: string;
  items: OrderItem[];
  total: number;
  metodoPago: string;
  direccionEnvio?: string;
}

interface WelcomeEmailData {
  email: string;
  nombre: string;
}

interface AbandonedCartData {
  email: string;
  nombre: string;
  items: OrderItem[];
  totalCarrito: number;
  urlRecuperacion: string;
}

interface NewsletterData {
  email: string;
  nombre: string;
  asunto: string;
  contenidoHtml: string;
}

// ============================================
// 1. ORDER CONFIRMATION EMAIL
// ============================================

export async function enviarConfirmacionPedido(data: OrderEmailData) {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          ${
            item.imagen
              ? `<img src="${item.imagen}" width="50" height="50" style="border-radius: 8px; object-fit: cover;" />`
              : ''
          }
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.nombre}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.cantidad}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${item.precio.toFixed(2)} EUR</td>
      </tr>
    `
    )
    .join('');

  const { data: result, error } = await resend.emails.send({
    from: EMAIL_CONFIG.from,
    to: data.clienteEmail,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: `Pedido #${data.numeroPedido} confirmado - Imprime Arte`,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Imprime Arte</h1>
          <p style="color: #a0a0c0; margin: 8px 0 0;">Tu pedido ha sido confirmado</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #1a1a2e; margin-top: 0;">Hola ${data.clienteNombre}</h2>
          <p style="color: #555; line-height: 1.6;">
            Hemos recibido tu pedido <strong>#${data.numeroPedido}</strong> correctamente. 
            Estamos preparandolo con mucho carino.
          </p>

          <!-- Order summary -->
          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1a1a2e;">Resumen del pedido</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #e9ecef;">
                  <th style="padding: 10px; text-align: left;"></th>
                  <th style="padding: 10px; text-align: left;">Producto</th>
                  <th style="padding: 10px; text-align: center;">Cant.</th>
                  <th style="padding: 10px; text-align: right;">Precio</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div style="border-top: 2px solid #1a1a2e; margin-top: 15px; padding-top: 15px; text-align: right;">
              <strong style="font-size: 18px; color: #1a1a2e;">Total: ${data.total.toFixed(2)} EUR</strong>
            </div>
          </div>

          <!-- Additional info -->
          <div style="display: flex; gap: 10px; margin: 20px 0;">
            <div style="flex: 1; background: #e8f5e9; border-radius: 8px; padding: 15px;">
              <strong style="color: #2e7d32;">Pago</strong>
              <p style="margin: 5px 0 0; color: #555; font-size: 14px;">${data.metodoPago}</p>
            </div>
            ${
              data.direccionEnvio
                ? `
            <div style="flex: 1; background: #e3f2fd; border-radius: 8px; padding: 15px;">
              <strong style="color: #1565c0;">Envio</strong>
              <p style="margin: 5px 0 0; color: #555; font-size: 14px;">${data.direccionEnvio}</p>
            </div>`
                : ''
            }
          </div>

          <p style="color: #555; line-height: 1.6;">
            Te enviaremos otro email cuando tu pedido este listo. 
            Si tienes alguna duda, responde a este email o contactanos por WhatsApp.
          </p>

          <!-- CTA -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${EMAIL_CONFIG.businessUrl}" 
               style="background: #1a1a2e; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Ver mi pedido
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            ${EMAIL_CONFIG.businessName} · ${EMAIL_CONFIG.businessAddress}<br>
            ${EMAIL_CONFIG.businessPhone}
          </p>
        </div>
      </div>
    </body>
    </html>
    `,
  });

  if (error) {
    console.error('Error sending order confirmation:', error);
    throw new Error(`Error sending email: ${error.message}`);
  }

  console.log('Order confirmation email sent:', result?.id);
  return result;
}

// ============================================
// 2. WELCOME EMAIL
// ============================================

export async function enviarEmailBienvenida(data: WelcomeEmailData) {
  const { data: result, error } = await resend.emails.send({
    from: EMAIL_CONFIG.from,
    to: data.email,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: 'Bienvenido/a a Imprime Arte',
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Bienvenido/a</h1>
          <p style="color: #a0a0c0; margin: 10px 0 0; font-size: 16px;">Ya formas parte de la familia Imprime Arte</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #1a1a2e; margin-top: 0;">Hola ${data.nombre}</h2>
          <p style="color: #555; line-height: 1.6;">
            Nos alegra mucho que te hayas unido. En Imprime Arte personalizamos todo tipo de productos 
            para que tus ideas cobren vida.
          </p>

          <!-- Services -->
          <div style="margin: 25px 0;">
            <h3 style="color: #1a1a2e;">Lo que podemos hacer por ti:</h3>
            <div style="display: grid; gap: 10px;">
              <div style="background: #f0f4ff; border-radius: 8px; padding: 15px; border-left: 4px solid #3b82f6;">
                Textil personalizado — Camisetas, sudaderas, gorras con DTF y sublimacion
              </div>
              <div style="background: #f0fff4; border-radius: 8px; padding: 15px; border-left: 4px solid #22c55e;">
                Regalos unicos — Tazas, llaveros, fundas y mucho mas
              </div>
              <div style="background: #fff7ed; border-radius: 8px; padding: 15px; border-left: 4px solid #f97316;">
                Para tu negocio — Rotulos, tarjetas, merchandising corporativo
              </div>
              <div style="background: #fdf2f8; border-radius: 8px; padding: 15px; border-left: 4px solid #ec4899;">
                Eventos — Bodas, cumpleanos, comuniones, fiestas
              </div>
            </div>
          </div>

          <p style="color: #555; line-height: 1.6;">
            Como regalo de bienvenida, disfruta de un <strong style="color: #1a1a2e;">10% de descuento</strong> 
            en tu primer pedido con el codigo:
          </p>

          <div style="background: #1a1a2e; color: #fff; text-align: center; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 3px;">BIENVENIDO10</span>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${EMAIL_CONFIG.businessUrl}" 
               style="background: #1a1a2e; color: white; padding: 14px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Explorar productos
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            ${EMAIL_CONFIG.businessName} · ${EMAIL_CONFIG.businessAddress}<br>
            ${EMAIL_CONFIG.businessPhone}
          </p>
        </div>
      </div>
    </body>
    </html>
    `,
  });

  if (error) {
    console.error('Error sending welcome email:', error);
    throw new Error(`Error sending email: ${error.message}`);
  }

  console.log('Welcome email sent:', result?.id);
  return result;
}

// ============================================
// 3. ABANDONED CART EMAIL
// ============================================

export async function enviarCarritoAbandonado(data: AbandonedCartData) {
  const itemsHtml = data.items
    .map(
      (item) => `
      <div style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #eee;">
        ${
          item.imagen
            ? `<img src="${item.imagen}" width="60" height="60" style="border-radius: 8px; object-fit: cover; margin-right: 15px;" />`
            : ''
        }
        <div style="flex: 1;">
          <strong style="color: #1a1a2e;">${item.nombre}</strong>
          <p style="margin: 4px 0 0; color: #888; font-size: 14px;">Cantidad: ${item.cantidad}</p>
        </div>
        <strong style="color: #1a1a2e;">${item.precio.toFixed(2)} EUR</strong>
      </div>
    `
    )
    .join('');

  const { data: result, error } = await resend.emails.send({
    from: EMAIL_CONFIG.from,
    to: data.email,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: 'Te dejaste algo en el carrito',
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">No te olvides</h1>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #1a1a2e; margin-top: 0;">Hola ${data.nombre}</h2>
          <p style="color: #555; line-height: 1.6;">
            Vimos que dejaste algunos productos en tu carrito. Los hemos guardado para ti.
          </p>

          <!-- Products -->
          <div style="background: #f8f9fa; border-radius: 12px; padding: 5px 15px; margin: 20px 0;">
            ${itemsHtml}
            <div style="padding: 15px; text-align: right;">
              <strong style="font-size: 18px; color: #1a1a2e;">Total: ${data.totalCarrito.toFixed(2)} EUR</strong>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.urlRecuperacion}" 
               style="background: #e74c3c; color: white; padding: 16px 35px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              Completar mi pedido
            </a>
          </div>

          <p style="color: #888; font-size: 14px; text-align: center;">
            Necesitas ayuda? Responde a este email o escribenos por WhatsApp.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            ${EMAIL_CONFIG.businessName} · ${EMAIL_CONFIG.businessAddress}
          </p>
        </div>
      </div>
    </body>
    </html>
    `,
  });

  if (error) {
    console.error('Error sending abandoned cart email:', error);
    throw new Error(`Error sending email: ${error.message}`);
  }

  console.log('Abandoned cart email sent:', result?.id);
  return result;
}

// ============================================
// 4. NEWSLETTER EMAIL
// ============================================

export async function enviarNewsletter(data: NewsletterData) {
  const { data: result, error } = await resend.emails.send({
    from: EMAIL_CONFIG.from,
    to: data.email,
    replyTo: EMAIL_CONFIG.replyTo,
    subject: data.asunto,
    html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Imprime Arte</h1>
        </div>

        <!-- Dynamic content -->
        <div style="padding: 30px;">
          <p style="color: #555;">Hola ${data.nombre},</p>
          ${data.contenidoHtml}
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            ${EMAIL_CONFIG.businessName} · ${EMAIL_CONFIG.businessAddress}<br>
            <a href="${EMAIL_CONFIG.businessUrl}/desuscribir" style="color: #999;">Cancelar suscripcion</a>
          </p>
        </div>
      </div>
    </body>
    </html>
    `,
  });

  if (error) {
    console.error('Error sending newsletter email:', error);
    throw new Error(`Error sending email: ${error.message}`);
  }

  console.log('Newsletter sent:', result?.id);
  return result;
}
