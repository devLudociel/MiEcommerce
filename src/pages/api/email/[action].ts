// ============================================
// Email API Endpoints - Imprime Arte
// File: src/pages/api/email/[action].ts
// ============================================

import type { APIRoute } from 'astro';
import {
  enviarConfirmacionPedido,
  enviarEmailBienvenida,
  enviarCarritoAbandonado,
  enviarNewsletter,
} from '../../../lib/Email';
import { z } from 'zod';
import { validateCSRF, createCSRFErrorResponse } from '../../../lib/csrf';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../../lib/rate-limiter';

const logger = {
  info: (msg: string, data?: unknown) => console.log(`[INFO] ${msg}`, data ?? ''),
  warn: (msg: string, data?: unknown) => console.warn(`[WARN] ${msg}`, data ?? ''),
  error: (msg: string, error?: unknown) => console.error(`[ERROR] ${msg}`, error ?? ''),
};

const orderItemSchema = z.object({
  nombre: z.string().min(1),
  cantidad: z.number().min(1),
  precio: z.number().min(0),
  imagen: z.string().url().optional(),
});

const confirmacionSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(1),
  numeroPedido: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  total: z.number().min(0),
  metodoPago: z.string().min(1),
  direccionEnvio: z.string().optional(),
});

const bienvenidaSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(1),
});

const carritoSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(1),
  items: z.array(orderItemSchema).min(1),
  totalCarrito: z.number().min(0),
  urlRecuperacion: z.string().url(),
});

const newsletterSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(1),
  asunto: z.string().min(1),
  contenidoHtml: z.string().min(1),
});

export const POST: APIRoute = async ({ params, request }) => {
  const { action } = params;

  // Rate limit (strict)
  const rateLimitResult = await checkRateLimit(request, RATE_LIMIT_CONFIGS.STRICT, 'email-api');
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  // CSRF protection
  const csrfResult = validateCSRF(request);
  if (!csrfResult.valid) {
    return createCSRFErrorResponse();
  }

  try {
    const body = await request.json();

    switch (action) {
      case 'confirmacion': {
        const parsed = confirmacionSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: 'Datos invalidos' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const result = await enviarConfirmacionPedido({
          clienteEmail: parsed.data.email,
          clienteNombre: parsed.data.nombre,
          numeroPedido: parsed.data.numeroPedido,
          items: parsed.data.items,
          total: parsed.data.total,
          metodoPago: parsed.data.metodoPago,
          direccionEnvio: parsed.data.direccionEnvio,
        });

        return new Response(JSON.stringify({ success: true, emailId: result?.id }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'bienvenida': {
        const parsed = bienvenidaSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: 'Datos invalidos' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const result = await enviarEmailBienvenida({
          email: parsed.data.email,
          nombre: parsed.data.nombre,
        });

        return new Response(JSON.stringify({ success: true, emailId: result?.id }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'carrito-abandonado': {
        const parsed = carritoSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: 'Datos invalidos' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const result = await enviarCarritoAbandonado({
          email: parsed.data.email,
          nombre: parsed.data.nombre,
          items: parsed.data.items,
          totalCarrito: parsed.data.totalCarrito,
          urlRecuperacion: parsed.data.urlRecuperacion,
        });

        return new Response(JSON.stringify({ success: true, emailId: result?.id }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      case 'newsletter': {
        const parsed = newsletterSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: 'Datos invalidos' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const result = await enviarNewsletter({
          email: parsed.data.email,
          nombre: parsed.data.nombre,
          asunto: parsed.data.asunto,
          contenidoHtml: parsed.data.contenidoHtml,
        });

        return new Response(JSON.stringify({ success: true, emailId: result?.id }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Accion no valida' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    logger.error(`Error en /api/email/${action}:`, error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
