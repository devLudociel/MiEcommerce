/**
 * Astro Middleware Global
 *
 * Aplica seguridad a todas las peticiones:
 * - Security Headers (CSP, HSTS, X-Frame-Options, etc.)
 * - HTTPS Enforcement en producción
 * - Logging de peticiones
 */

import type { MiddlewareHandler } from 'astro';
import { getSecurityHeaders, isSecureConnection, redirectToHttps } from './lib/securityHeaders';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request, url } = context;
  const isProd = import.meta.env.PROD;

  // 1. HTTPS Enforcement en producción
  if (isProd && !isSecureConnection(request)) {
    console.warn(`[Security] Redirecting insecure connection to HTTPS: ${url.pathname}`);
    return redirectToHttps(request);
  }

  // 2. Logging de peticiones (solo métodos que modifican datos)
  const method = request.method;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    console.log(`[Request] ${method} ${url.pathname}`);
  }

  // 3. Procesar la petición
  const response = await next();

  // 4. Aplicar Security Headers a la respuesta
  try {
    const securityHeaders = getSecurityHeaders({
      mode: isProd ? 'production' : 'development',
      trustedDomains: {
        connect: [
          // Agregar aquí dominios adicionales si es necesario
          'https://api.resend.com', // Resend API
        ],
      },
    });

    // Aplicar headers que no estén ya establecidos
    Object.entries(securityHeaders).forEach(([key, value]) => {
      if (!response.headers.has(key)) {
        response.headers.set(key, value);
      }
    });
  } catch (error) {
    console.error('[Middleware] Error applying security headers:', error);
  }

  return response;
};

