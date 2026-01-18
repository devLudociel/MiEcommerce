// src/pages/api/send-email.ts
import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { getAdminDb } from '../../lib/firebase-admin';
import {
  orderConfirmationTemplate,
  orderStatusUpdateTemplate,
  newsletterWelcomeTemplate,
} from '../../lib/emailTemplates';
import type { OrderData } from '../../types/firebase';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../lib/rate-limiter';
import { verifyAdminAuth } from '../../lib/auth/authHelpers';
import { z } from 'zod';

// Simple console logger for API routes (avoids import issues)
const logger = {
  info: (msg: string, data?: unknown) => console.log(`[INFO] ${msg}`, data ?? ''),
  warn: (msg: string, data?: unknown) => console.warn(`[WARN] ${msg}`, data ?? ''),
  error: (msg: string, error?: unknown) => console.error(`[ERROR] ${msg}`, error ?? ''),
  debug: (msg: string, data?: unknown) => console.log(`[DEBUG] ${msg}`, data ?? ''),
};

// Type for Resend API response
interface ResendResponse {
  data?: { id: string } | null;
  id?: string;
  error?: { message: string; name: string } | null;
}

// SECURITY: Zod schema for input validation
const sendEmailSchema = z.object({
  orderId: z.string().min(1).max(255).optional(),
  type: z.enum(['confirmation', 'status-update', 'newsletter-welcome', 'tracking-update']),
  newStatus: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
  trackingNumber: z.string().max(100).optional(),
  carrier: z.string().max(100).optional(),
  trackingUrl: z.string().url().max(500).optional(),
  customerEmail: z.string().email().max(255).optional(),
});

// Internal API secret for server-to-server calls (newsletter subscription)
const INTERNAL_API_SECRET = import.meta.env.INTERNAL_API_SECRET || '';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  logger.info('📧 API send-email: Solicitud recibida');

  // SECURITY FIX CRIT-003: Rate limiting
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.STRICT, 'send-email');
  if (!rateLimitResult.allowed) {
    logger.warn('📧 Rate limit exceeded for send-email');
    return createRateLimitResponse(rateLimitResult);
  }

  // SECURITY FIX CRIT-003: CSRF validation
  const csrfResult = validateCSRF(request);
  if (!csrfResult.valid) {
    logger.warn('📧 CSRF validation failed:', csrfResult.reason);
    return createCSRFErrorResponse();
  }

  // Check for internal API call (from newsletter subscription)
  const internalSecret = request.headers.get('X-Internal-Secret');
  const isInternalCall = internalSecret && internalSecret === INTERNAL_API_SECRET && INTERNAL_API_SECRET.length > 0;

  try {
    const rawData = await request.json();

    // SECURITY FIX CRIT-003: Validate input with Zod
    const validationResult = sendEmailSchema.safeParse(rawData);
    if (!validationResult.success) {
      logger.warn('📧 Invalid input:', validationResult.error.format());
      return new Response(
        JSON.stringify({ error: 'Datos inválidos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, type, newStatus, email } = validationResult.data;
    logger.info('📧 Datos recibidos:', { orderId, type, newStatus, email: email ? '***@***' : undefined });

    // Newsletter welcome doesn't need orderId, just email
    if (type === 'newsletter-welcome') {
      // SECURITY: Newsletter welcome only allowed from internal calls
      if (!isInternalCall) {
        logger.warn('📧 Unauthorized newsletter-welcome attempt (not internal call)');
        return new Response(
          JSON.stringify({ error: 'No autorizado' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (!email) {
        return new Response(JSON.stringify({ error: 'Email requerido para newsletter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const template = newsletterWelcomeTemplate(email);
      logger.info('📧 Enviando email de bienvenida');

      const response = await resend.emails.send({
        from: import.meta.env.EMAIL_FROM || 'noreply@imprimearte.es',
        to: [email],
        subject: template.subject,
        html: template.html,
      });

      logger.info('📧 Email de newsletter enviado correctamente');

      const resendResponse = response as ResendResponse;
      const emailId = resendResponse.data?.id ?? resendResponse.id;
      return new Response(JSON.stringify({ success: true, emailId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // SECURITY FIX CRIT-003: Order emails require admin authentication OR internal call
    if (!isInternalCall) {
      const authResult = await verifyAdminAuth(request);
      if (!authResult.success || !authResult.isAdmin) {
        logger.warn('📧 Unauthorized order email attempt');
        return new Response(
          JSON.stringify({ error: 'No autorizado - Se requiere autenticación de administrador' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
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
    const orderData = orderSnap.data();
    const order: OrderData = {
      id: orderSnap.id,
      ...orderData,
    } as OrderData;

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

    const resendResponse = response as ResendResponse;
    const emailId = resendResponse.data?.id ?? resendResponse.id;
    return new Response(JSON.stringify({ success: true, emailId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    logger.error('❌ Error enviando email:', error);
    // SECURITY FIX: Don't expose error details in production
    return new Response(
      JSON.stringify({
        error: 'Error enviando email',
        // Only include details in development
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
