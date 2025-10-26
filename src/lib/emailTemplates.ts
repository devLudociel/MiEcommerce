// src/lib/emailTemplates.ts
import type { OrderData } from './firebase';

/**
 * Plantilla de email de confirmación de pedido
 */
export function orderConfirmationTemplate(order: OrderData): { subject: string; html: string } {
  const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
  const estimatedDelivery = new Date(orderDate);
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

  return {
    subject: `✅ Pedido Confirmado #${order.id?.slice(0, 8)} - ImprimeArte`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirmación de Pedido</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">¡Pedido Confirmado! 🎉</h1>
                    <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Gracias por tu compra, ${order.shippingInfo.firstName}</p>
                  </td>
                </tr>

                <!-- Información del pedido -->
                <tr>
                  <td style="padding: 40px;">
                    <table width="100%" cellpadding="10" cellspacing="0" style="margin-bottom: 30px;">
                      <tr>
                        <td style="background-color: #f0fdfa; padding: 20px; border-radius: 8px;">
                          <table width="100%">
                            <tr>
                              <td style="width: 33%; text-align: center; padding: 10px;">
                                <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Número de Pedido</div>
                                <div style="font-size: 18px; font-weight: bold; color: #0891b2;">#${order.id?.slice(0, 8)}</div>
                              </td>
                              <td style="width: 33%; text-align: center; padding: 10px; border-left: 1px solid #cbd5e1;">
                                <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Fecha</div>
                                <div style="font-size: 18px; font-weight: bold; color: #0891b2;">${orderDate.toLocaleDateString('es-ES')}</div>
                              </td>
                              <td style="width: 33%; text-align: center; padding: 10px; border-left: 1px solid #cbd5e1;">
                                <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Total</div>
                                <div style="font-size: 18px; font-weight: bold; color: #0891b2;">€${order.total.toFixed(2)}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Productos -->
                    <h2 style="font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 15px;">Productos</h2>
                    ${order.items
                      .map(
                        (item) => `
                      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
                        <table width="100%">
                          <tr>
                            <td style="width: 70%;">
                              <div style="font-weight: bold; color: #1e293b; margin-bottom: 5px;">${item.name}</div>
                              ${item.variantName ? `<div style="font-size: 12px; color: #64748b;">Variante: ${item.variantName}</div>` : ''}
                              ${item.customization ? '<div style="font-size: 12px; color: #9333ea; font-weight: bold;">✨ Personalizado</div>' : ''}
                            </td>
                            <td style="width: 30%; text-align: right;">
                              <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Cantidad: ${item.quantity}</div>
                              <div style="font-weight: bold; color: #0891b2; font-size: 16px;">€${(item.price * item.quantity).toFixed(2)}</div>
                            </td>
                          </tr>
                        </table>
                      </div>
                    `
                      )
                      .join('')}

                    <!-- Totales -->
                    <table width="100%" cellpadding="8" cellspacing="0" style="margin-top: 20px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
                      <tr>
                        <td style="text-align: right; color: #64748b;">Subtotal:</td>
                        <td style="text-align: right; font-weight: bold; color: #1e293b; width: 100px;">€${order.subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="text-align: right; color: #64748b;">Envío:</td>
                        <td style="text-align: right; font-weight: bold; color: #1e293b;">€${order.shipping.toFixed(2)}</td>
                      </tr>
                      <tr style="border-top: 2px solid #e2e8f0;">
                        <td style="text-align: right; font-size: 18px; font-weight: bold; color: #1e293b; padding-top: 10px;">Total:</td>
                        <td style="text-align: right; font-size: 18px; font-weight: bold; color: #0891b2; padding-top: 10px;">€${order.total.toFixed(2)}</td>
                      </tr>
                    </table>

                    <!-- Dirección de envío -->
                    <div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
                      <h3 style="font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 10px;">📍 Dirección de Envío</h3>
                      <p style="margin: 5px 0; color: #64748b; line-height: 1.6;">
                        <strong>${order.shippingInfo.firstName} ${order.shippingInfo.lastName}</strong><br>
                        ${order.shippingInfo.address}<br>
                        ${order.shippingInfo.zipCode} ${order.shippingInfo.city}, ${order.shippingInfo.state}<br>
                        ${order.shippingInfo.country}<br>
                        <br>
                        📧 ${order.shippingInfo.email}<br>
                        📱 ${order.shippingInfo.phone}
                      </p>
                    </div>

                    <!-- Próximos pasos -->
                    <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%); border-radius: 8px;">
                      <h3 style="font-size: 16px; font-weight: bold; color: #92400e; margin-bottom: 10px;">¿Qué sigue ahora?</h3>
                      <ol style="color: #92400e; margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li>Revisaremos tu pedido y los diseños personalizados</li>
                        <li>Te enviaremos una prueba si tu producto requiere aprobación</li>
                        <li>Comenzaremos la producción una vez aprobado</li>
                        <li>Te notificaremos cuando tu pedido sea enviado</li>
                      </ol>
                      <p style="color: #92400e; margin: 15px 0 0 0; font-size: 14px;">
                        <strong>Entrega estimada:</strong> ${estimatedDelivery.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px;">
                      ¿Tienes preguntas? Contáctanos respondiendo a este email
                    </p>
                    <a href="https://imprimearte.es" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">
                      Visitar Nuestra Tienda
                    </a>
                    <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 12px;">
                      © ${new Date().getFullYear()} ImprimeArte. Todos los derechos reservados.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };
}

/**
 * Plantilla de email de cambio de estado
 */
export function orderStatusUpdateTemplate(
  order: OrderData,
  newStatus: string
): { subject: string; html: string } {
  const statusInfo: Record<
    string,
    { title: string; emoji: string; message: string; color: string }
  > = {
    paid: {
      title: 'Pago Confirmado',
      emoji: '💳',
      message: 'Hemos recibido tu pago correctamente. Comenzaremos a procesar tu pedido.',
      color: '#10b981',
    },
    processing: {
      title: 'En Producción',
      emoji: '🔨',
      message:
        '¡Estamos trabajando en tu pedido! Nuestro equipo está produciendo tus productos personalizados.',
      color: '#3b82f6',
    },
    shipped: {
      title: 'Pedido Enviado',
      emoji: '📦',
      message: '¡Tu pedido va en camino! Recibirás tu paquete pronto.',
      color: '#8b5cf6',
    },
    delivered: {
      title: 'Pedido Entregado',
      emoji: '🏠',
      message: '¡Tu pedido ha sido entregado! Esperamos que disfrutes tus productos.',
      color: '#6b7280',
    },
    cancelled: {
      title: 'Pedido Cancelado',
      emoji: '❌',
      message: 'Tu pedido ha sido cancelado. Si tienes preguntas, contáctanos.',
      color: '#ef4444',
    },
  };

  const status = statusInfo[newStatus] || {
    title: 'Actualización de Pedido',
    emoji: '📋',
    message: 'El estado de tu pedido ha sido actualizado.',
    color: '#06b6d4',
  };

  return {
    subject: `${status.emoji} ${status.title} - Pedido #${order.id?.slice(0, 8)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${status.title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

                <!-- Header -->
                <tr>
                  <td style="background-color: ${status.color}; padding: 40px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">${status.emoji}</div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">${status.title}</h1>
                  </td>
                </tr>

                <!-- Contenido -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-bottom: 20px;">
                      Hola <strong>${order.shippingInfo.firstName}</strong>,
                    </p>
                    <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin-bottom: 30px;">
                      ${status.message}
                    </p>

                    <!-- Info del pedido -->
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                      <table width="100%">
                        <tr>
                          <td style="padding: 10px;">
                            <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Número de Pedido</div>
                            <div style="font-size: 16px; font-weight: bold; color: #1e293b;">#${order.id?.slice(0, 8)}</div>
                          </td>
                          <td style="padding: 10px; text-align: right;">
                            <div style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Total</div>
                            <div style="font-size: 16px; font-weight: bold; color: #0891b2;">€${order.total.toFixed(2)}</div>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <a href="https://imprimearte.es/admin/orders/${order.id}" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">
                      Ver Estado del Pedido
                    </a>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                      ¿Tienes preguntas? Contáctanos respondiendo a este email
                    </p>
                    <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 12px;">
                      © ${new Date().getFullYear()} ImprimeArte. Todos los derechos reservados.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };
}
