// src/pages/api/send-email.ts
import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { getAdminDb } from '../../lib/firebase-admin';
import { orderConfirmationTemplate, orderStatusUpdateTemplate } from '../../lib/emailTemplates';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  console.log('📧 API send-email: Solicitud recibida');

  try {
    const { orderId, type, newStatus } = await request.json();
    console.log('📧 Datos recibidos:', { orderId, type, newStatus });

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

    console.log('📧 Enviando email a:', order.shippingInfo?.email);
    const response = await resend.emails.send({
      from: import.meta.env.EMAIL_FROM || 'noreply@imprimearte.es',
      to: [order.shippingInfo?.email || ''],
      subject,
      html,
    });
    console.log('📧 Email enviado correctamente:', response);

    const emailId = (response as any).data?.id || (response as any).id;
    return new Response(JSON.stringify({ success: true, emailId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Error enviando email:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Error enviando email', details: error?.stack }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
