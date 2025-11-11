// src/pages/api/send-email.ts
import { logger } from '../../lib/logger';
import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { getAdminDb } from '../../lib/firebase-admin';
import { orderConfirmationTemplate, orderStatusUpdateTemplate, newsletterWelcomeTemplate } from '../../lib/emailTemplates';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  logger.info('📧 API send-email: Solicitud recibida');

  try {
    const { orderId, type, newStatus, email } = await request.json();
    logger.info('📧 Datos recibidos:', { orderId, type, newStatus, email });

    // Newsletter welcome doesn't need orderId, just email
    if (type === 'newsletter-welcome') {
      if (!email) {
        return new Response(JSON.stringify({ error: 'Email requerido para newsletter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const template = newsletterWelcomeTemplate(email);
      logger.info('📧 Enviando email de bienvenida a:', email);

      const response = await resend.emails.send({
        from: import.meta.env.EMAIL_FROM || 'noreply@imprimearte.es',
        to: [email],
        subject: template.subject,
        html: template.html,
      });

      logger.info('📧 Email de newsletter enviado correctamente:', response);

      const emailId = (response as any).data?.id || (response as any).id;
      return new Response(JSON.stringify({ success: true, emailId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Order emails need orderId
    if (!orderId || !type) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Obtener pedido con Admin SDK
    const adminDb = getAdminDb();
    const orderSnap = await adminDb.collection('orders').doc(String(orderId)).get();
    if (!orderSnap.exists) {
      return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const order: any = { id: orderSnap.id, ...orderSnap.data() };

    let subject = '';
    let html = '';
    if (type === 'confirmation') {
      const t = orderConfirmationTemplate(order);
      subject = t.subject;
      html = t.html;
    } else if (type === 'status-update' && newStatus) {
      const t = orderStatusUpdateTemplate(order, String(newStatus));
      subject = t.subject;
      html = t.html;
    } else {
      return new Response(JSON.stringify({ error: 'Tipo de email inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    logger.info('📧 Enviando email a:', order.shippingInfo?.email);
    const response = await resend.emails.send({
      from: import.meta.env.EMAIL_FROM || 'noreply@imprimearte.es',
      to: [order.shippingInfo?.email || ''],
      subject,
      html,
    });
    logger.info('📧 Email enviado correctamente:', response);

    const emailId = (response as any).data?.id || (response as any).id;
    return new Response(JSON.stringify({ success: true, emailId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logger.error('❌ Error enviando email:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error enviando email',
        details: error instanceof Error ? error.stack : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
