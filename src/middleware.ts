// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { randomBytes } from 'crypto';
import { getAdminAuth } from './lib/firebase-admin';

/**
 * Middleware global de Astro
 *
 * Este middleware se ejecuta en cada request y agrega headers de seguridad.
 * Los headers protegen contra ataques comunes como XSS, clickjacking, etc.
 */

const ADMIN_PATH_PREFIX = '/admin';
const AUTH_COOKIE_NAME = 'auth_token';

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.trim().split('=');
    if (key === name) {
      const rawValue = rest.join('=');
      return rawValue ? decodeURIComponent(rawValue) : null;
    }
  }
  return null;
}

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.replace('Bearer ', '').trim();
}

async function verifyAdminToken(token: string): Promise<{ admin?: boolean } | null> {
  const adminAuth = getAdminAuth();
  try {
    return await adminAuth.verifySessionCookie(token, true);
  } catch {
    try {
      return await adminAuth.verifyIdToken(token);
    } catch {
      return null;
    }
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, search } = context.url;
  const nonce = randomBytes(16).toString('base64');
  context.locals.cspNonce = nonce;

  if (pathname === ADMIN_PATH_PREFIX || pathname.startsWith(`${ADMIN_PATH_PREFIX}/`)) {
    const headerToken = getBearerToken(context.request);
    const cookieToken = getCookieValue(context.request.headers.get('cookie'), AUTH_COOKIE_NAME);
    const token = headerToken || cookieToken;

    if (!token) {
      const redirectUrl = new URL('/login', context.url.origin);
      redirectUrl.searchParams.set('redirect', `${pathname}${search}`);
      const response = Response.redirect(redirectUrl, 302);
      const securityHeaders = getSecurityHeaders();
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    try {
      const decodedToken = await verifyAdminToken(token);
      if (!decodedToken?.admin) {
        const redirectUrl = new URL('/account', context.url.origin);
        const response = Response.redirect(redirectUrl, 302);
        const securityHeaders = getSecurityHeaders();
        Object.entries(securityHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }
    } catch (error) {
      const redirectUrl = new URL('/login', context.url.origin);
      redirectUrl.searchParams.set('redirect', `${pathname}${search}`);
      const response = Response.redirect(redirectUrl, 302);
      const securityHeaders = getSecurityHeaders();
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }
  }

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
  };
}
