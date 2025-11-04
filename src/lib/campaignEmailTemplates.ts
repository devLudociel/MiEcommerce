// src/lib/campaignEmailTemplates.ts
/**
 * Plantillas de email para campañas de marketing
 */

/**
 * Plantilla de email para nuevo cupón
 */
export function newCouponCampaignTemplate(params: {
  couponCode: string;
  discountValue: string;
  expiryDate: string;
  description?: string;
}): { subject: string; html: string } {
  const { couponCode, discountValue, expiryDate, description } = params;

  return {
    subject: `🎁 ¡Nuevo Cupón! ${discountValue} de Descuento - ImprimeArte`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nuevo Cupón Disponible</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 50px 40px; text-align: center;">
                    <div style="font-size: 64px; margin-bottom: 15px;">🎁</div>
                    <h1 style="color: #ffffff; margin: 0 0 15px 0; font-size: 36px; font-weight: bold;">¡Nuevo Cupón!</h1>
                    <p style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold;">
                      ${discountValue} de Descuento
                    </p>
                  </td>
                </tr>

                <!-- Contenido -->
                <tr>
                  <td style="padding: 40px;">
                    ${description ? `<p style="font-size: 16px; color: #1e293b; line-height: 1.8; margin-bottom: 30px; text-align: center;">${description}</p>` : ''}

                    <!-- Cupón destacado -->
                    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fce7f3 100%); border: 3px dashed #f59e0b; padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center;">
                      <p style="margin: 0 0 15px 0; color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">
                        TU CÓDIGO DE DESCUENTO
                      </p>
                      <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
                        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #b45309; letter-spacing: 3px;">
                          ${couponCode}
                        </p>
                      </div>
                      <p style="margin: 0; color: #92400e; font-size: 14px;">
                        ⏰ Válido hasta: <strong>${expiryDate}</strong>
                      </p>
                    </div>

                    <!-- CTA -->
                    <div style="text-align: center; margin: 40px 0;">
                      <a href="https://imprimearte.com" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 12px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        Usar Cupón Ahora
                      </a>
                    </div>

                    <!-- Info adicional -->
                    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0891b2; margin-top: 30px;">
                      <p style="margin: 0; color: #0c4a6e; font-size: 14px; line-height: 1.6;">
                        <strong>💡 Consejo:</strong> Copia el código o guárdalo. Introdúcelo en el checkout para aplicar tu descuento.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 12px;">
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
 * Plantilla de email para nuevo producto
 */
export function newProductCampaignTemplate(params: {
  productName: string;
  productDescription: string;
  productImage: string;
  productPrice: string;
  productUrl: string;
}): { subject: string; html: string } {
  const { productName, productDescription, productImage, productPrice, productUrl } = params;

  return {
    subject: `🚀 ¡Nuevo Producto! ${productName} - ImprimeArte`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nuevo Producto Disponible</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); padding: 50px 40px; text-align: center;">
                    <div style="font-size: 64px; margin-bottom: 15px;">🚀</div>
                    <h1 style="color: #ffffff; margin: 0 0 15px 0; font-size: 36px; font-weight: bold;">¡Nuevo Producto!</h1>
                    <p style="color: #ffffff; margin: 0; font-size: 18px;">
                      Sé de los primeros en descubrirlo
                    </p>
                  </td>
                </tr>

                <!-- Imagen del producto -->
                <tr>
                  <td style="padding: 0;">
                    <img src="${productImage}" alt="${productName}" style="width: 100%; height: 300px; object-fit: cover;" />
                  </td>
                </tr>

                <!-- Contenido -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="font-size: 28px; font-weight: bold; color: #1e293b; margin: 0 0 20px 0; text-align: center;">
                      ${productName}
                    </h2>

                    <p style="font-size: 16px; color: #64748b; line-height: 1.8; margin-bottom: 30px; text-align: center;">
                      ${productDescription}
                    </p>

                    <!-- Precio -->
                    <div style="text-align: center; margin: 30px 0;">
                      <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                        Precio
                      </p>
                      <p style="margin: 0; font-size: 42px; font-weight: bold; color: #8b5cf6;">
                        ${productPrice}
                      </p>
                    </div>

                    <!-- CTA -->
                    <div style="text-align: center; margin: 40px 0;">
                      <a href="${productUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 12px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        Ver Producto
                      </a>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 12px;">
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
