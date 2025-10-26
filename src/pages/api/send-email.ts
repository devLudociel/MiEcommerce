// src/pages/api/send-email.ts
import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { getOrderById } from '../../lib/firebase';
import { orderConfirmationTemplate, orderStatusUpdateTemplate } from '../../lib/emailTemplates';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  console.log('📧 API send-email: Solicitud recibida');

  try {
    const { orderId, type, newStatus } = await request.json();

    console.log('📧 Datos recibidos:', { orderId, type, newStatus });

    // Validar datos
    if (!orderId || !type) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Obtener pedido
    const order = await getOrderById(orderId);
    if (!order) {
      return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let subject: string;
    let html: string;

    // Generar contenido según tipo
    if (type === 'confirmation') {
      const template = orderConfirmationTemplate(order);
      subject = template.subject;
      html = template.html;
    } else if (type === 'status-update' && newStatus) {
      const template = orderStatusUpdateTemplate(order, newStatus);
      subject = template.subject;
      html = template.html;
    } else {
      return new Response(JSON.stringify({ error: 'Tipo de email inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('📧 Enviando email a:', order.shippingInfo.email);

    // Enviar email con Resend
    const response = await resend.emails.send({
      from: import.meta.env.EMAIL_FROM || 'noreply@imprimearte.es',
      to: [order.shippingInfo.email],
      subject,
      html,
    });

    console.log('✅ Email enviado correctamente:', response);

    // Resend v4 retorna { data: {...}, error: null }
    const emailId = response.data?.id || (response as any).id;

    return new Response(
      JSON.stringify({
        success: true,
        emailId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Error enviando email:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Error enviando email',
        details: error.stack,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
