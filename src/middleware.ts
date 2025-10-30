// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';

/**
 * Middleware global de Astro
 *
 * Este middleware se ejecuta en cada request y agrega headers de seguridad.
 * Los headers protegen contra ataques comunes como XSS, clickjacking, etc.
 */

export const onRequest = defineMiddleware(async (context, next) => {
  // Ejecutar el request
  const response = await next();

  // Agregar headers de seguridad a la respuesta
  const securityHeaders = getSecurityHeaders();

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
});

/**
 * Headers de seguridad HTTP
 */
function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    ...(import.meta.env.PROD && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }),
    'Content-Security-Policy': getContentSecurityPolicy(),
  };
}

function getContentSecurityPolicy(): string {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: https://firebasestorage.googleapis.com https://*.googleapis.com https://*.stripe.com",
      "frame-src 'self' https://*.firebaseapp.com https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
  }

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://firebasestorage.googleapis.com",
    "font-src 'self' data:",
    "connect-src 'self' https://firebasestorage.googleapis.com https://*.googleapis.com https://*.stripe.com",
    "frame-src 'self' https://*.firebaseapp.com https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
}
