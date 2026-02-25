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
      const securityHeaders = getSecurityHeaders(nonce);
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
        const securityHeaders = getSecurityHeaders(nonce);
        Object.entries(securityHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }
    } catch (error) {
      const redirectUrl = new URL('/login', context.url.origin);
      redirectUrl.searchParams.set('redirect', `${pathname}${search}`);
      const response = Response.redirect(redirectUrl, 302);
      const securityHeaders = getSecurityHeaders(nonce);
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }
  }

  // Ejecutar el request
  const response = await next();

  // Agregar headers de seguridad a la respuesta
  const securityHeaders = getSecurityHeaders(nonce);

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
});

/**
 * Headers de seguridad HTTP
 */
function getSecurityHeaders(nonce?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    ...(import.meta.env.PROD && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }),
  };

  if (import.meta.env.PROD && nonce) {
    headers['Content-Security-Policy'] = getContentSecurityPolicy(nonce);
  }

  return headers;
}

function getContentSecurityPolicy(nonce: string): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'sha256-QzWFZi+FLIx23tnm9SBU4aEgx4x8DsuASP07mfqol/c='",
    "'sha256-U7a72oKuFFz8D7GUHLA1NZ0ciymHmDOc9T9aVDg2rWU='",
    "'sha256-Q2BPg90ZMplYY+FSdApNErhpWafg2hcRRbndmvxuL/Q='",
    "'sha256-BF0290pkb3jxQsE7z00xR8Imp8X34FLC88L0lkMnrGw='",
    "'sha256-eIXWvAmxkr251LJZkjniEK5LcPF3NkapbJepohwYRIc='",
    'https://*.google.com',
    'https://*.googleapis.com',
    'https://www.googletagmanager.com',
    'https://connect.facebook.net',
    'https://js.stripe.com',
  ];

  const styleSrc = ["'self'", "'unsafe-inline'", 'https://*.googleapis.com'];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    `style-src ${styleSrc.join(' ')}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.googleusercontent.com https://*.google.com https://*.google-analytics.com https://images.unsplash.com https://www.facebook.com",
    "font-src 'self' data: https://*.googleapis.com https://*.gstatic.com",
    "connect-src 'self' blob: https://firebasestorage.googleapis.com https://*.googleapis.com https://*.google.com https://*.google-analytics.com https://*.googletagmanager.com https://*.stripe.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.zippopotam.us https://api.geoapify.com https://www.facebook.com https://graph.facebook.com https://connect.facebook.net",
    "frame-src 'self' https://*.firebaseapp.com https://js.stripe.com https://accounts.google.com https://*.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}
