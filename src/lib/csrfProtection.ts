/**
 * CSRF Protection Middleware
 *
 * Protege contra ataques Cross-Site Request Forgery (CSRF) verificando
 * que las peticiones POST/PUT/DELETE/PATCH vengan del mismo origen.
 *
 * Implementa dos mecanismos:
 * 1. Same-Origin Policy (verifica Origin/Referer headers)
 * 2. Double Submit Cookie Pattern (token CSRF en cookie + header)
 */

import { randomBytes } from 'crypto';

export interface CsrfValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Lista de paths que NO requieren protección CSRF
 * (webhooks externos, endpoints públicos de solo lectura, etc.)
 */
const CSRF_EXEMPT_PATHS = [
  '/api/stripe-webhook',
  '/api/validate-coupon', // GET
  '/api/get-order', // GET con auth
  '/api/get-wallet-balance', // GET con auth
  '/api/get-wallet-transactions', // GET con auth
];

/**
 * Métodos HTTP que requieren protección CSRF
 */
const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Genera un token CSRF aleatorio
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Valida que una petición sea segura contra CSRF
 *
 * Verifica:
 * 1. Métodos seguros (GET, HEAD, OPTIONS) pasan automáticamente
 * 2. Paths exentos pasan automáticamente
 * 3. Same-Origin Policy: Origin/Referer debe coincidir con el host
 * 4. CSRF Token: Si está presente, debe coincidir con la cookie
 *
 * @param request - Request object de Astro/Fetch API
 * @returns CsrfValidationResult con valid=true si es seguro
 */
export function validateCsrfToken(request: Request): CsrfValidationResult {
  const method = request.method.toUpperCase();
  const url = new URL(request.url);
  const path = url.pathname;

  // 1. Métodos seguros no requieren protección CSRF
  if (!CSRF_PROTECTED_METHODS.includes(method)) {
    return { valid: true };
  }

  // 2. Paths exentos (webhooks, etc.)
  if (CSRF_EXEMPT_PATHS.includes(path)) {
    return { valid: true };
  }

  // 3. Validar Same-Origin Policy
  const origin = request.headers.get('origin') || request.headers.get('Origin');
  const referer = request.headers.get('referer') || request.headers.get('Referer');

  // El host puede venir del header o de la URL
  const hostHeader = request.headers.get('host') || request.headers.get('Host');
  const host = hostHeader || url.host;

  // Construir el expected origin
  const protocol = url.protocol; // 'http:' o 'https:'
  const expectedOrigin = `${protocol}//${host}`;

  // Verificar Origin header (preferido)
  if (origin) {
    if (origin !== expectedOrigin) {
      console.warn(`[CSRF] Origin mismatch: ${origin} !== ${expectedOrigin}`);
      return {
        valid: false,
        error: 'CSRF validation failed: Invalid origin',
      };
    }
  }
  // Fallback a Referer header
  else if (referer) {
    const refererUrl = new URL(referer);
    const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;

    if (refererOrigin !== expectedOrigin) {
      console.warn(`[CSRF] Referer mismatch: ${refererOrigin} !== ${expectedOrigin}`);
      return {
        valid: false,
        error: 'CSRF validation failed: Invalid referer',
      };
    }
  }
  // Ningún header de origen presente
  else {
    console.warn(`[CSRF] No origin or referer header present for ${method} ${path}`);
    return {
      valid: false,
      error: 'CSRF validation failed: Missing origin/referer header',
    };
  }

  // 4. Validar CSRF Token (opcional pero recomendado)
  // Si el cliente envía un token, debe coincidir con la cookie
  const csrfTokenHeader = request.headers.get('x-csrf-token') || request.headers.get('X-CSRF-Token');
  const cookieHeader = request.headers.get('cookie');

  if (csrfTokenHeader) {
    if (!cookieHeader) {
      return {
        valid: false,
        error: 'CSRF validation failed: Token present but no cookies',
      };
    }

    // Extraer CSRF token de las cookies
    const cookies = parseCookies(cookieHeader);
    const csrfTokenCookie = cookies['csrf-token'];

    if (!csrfTokenCookie) {
      return {
        valid: false,
        error: 'CSRF validation failed: Token present but no CSRF cookie',
      };
    }

    if (csrfTokenHeader !== csrfTokenCookie) {
      console.warn('[CSRF] Token mismatch');
      return {
        valid: false,
        error: 'CSRF validation failed: Token mismatch',
      };
    }
  }

  return { valid: true };
}

/**
 * Crea una Response con error CSRF
 */
export function csrfErrorResponse(message: string = 'CSRF validation failed'): Response {
  return new Response(
    JSON.stringify({
      error: message,
      code: 'CSRF_VALIDATION_FAILED',
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Parsea cookies de un header de cookies
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.split('=');
    const value = rest.join('=').trim();
    if (name && value) {
      cookies[name.trim()] = decodeURIComponent(value);
    }
  });

  return cookies;
}

/**
 * Aplica protección CSRF a un endpoint
 * Uso en endpoints:
 *
 * export const POST: APIRoute = async ({ request }) => {
 *   const csrfResult = validateCsrfToken(request);
 *   if (!csrfResult.valid) {
 *     return csrfErrorResponse(csrfResult.error);
 *   }
 *   // ... resto del código
 * };
 */
