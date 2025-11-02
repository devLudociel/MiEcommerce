// src/lib/csrf.ts
/**
 * CSRF Protection Utilities
 *
 * Implementa protección contra Cross-Site Request Forgery usando:
 * - SameSite cookies (principal defensa)
 * - Origin/Referer validation
 * - Custom headers para requests AJAX
 */

/**
 * Validate that the request comes from the same origin
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  // For requests from the same origin, either origin or referer should match
  if (origin) {
    try {
      const originUrl = new URL(origin);
      return originUrl.host === host;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === host;
    } catch {
      return false;
    }
  }

  // No origin or referer (might be direct navigation) - allow GET but not POST
  return request.method === 'GET';
}

/**
 * Verify custom header for AJAX requests
 * This prevents simple form submissions from foreign sites
 */
export function hasCustomHeader(request: Request): boolean {
  return request.headers.get('X-Requested-With') === 'XMLHttpRequest' ||
         request.headers.get('Content-Type')?.includes('application/json') ||
         false;
}

/**
 * Comprehensive CSRF protection check
 */
export function validateCSRF(request: Request): { valid: boolean; reason?: string } {
  // GET, HEAD, OPTIONS are safe methods (read-only)
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return { valid: true };
  }

  // For POST, PUT, DELETE, PATCH - validate origin
  if (!validateOrigin(request)) {
    console.warn('[CSRF] Origin validation failed', {
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      host: request.headers.get('host'),
      method: request.method,
    });
    return {
      valid: false,
      reason: 'Origin validation failed. Request may be from unauthorized source.',
    };
  }

  // Additional check: AJAX requests should have custom headers
  if (!hasCustomHeader(request)) {
    console.warn('[CSRF] Missing custom header for AJAX request', {
      method: request.method,
      contentType: request.headers.get('Content-Type'),
    });
    return {
      valid: false,
      reason: 'Missing required headers for this type of request',
    };
  }

  return { valid: true };
}

/**
 * Create CSRF error response
 */
export function createCSRFErrorResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'CSRF validation failed',
      message: 'This request appears to come from an unauthorized source',
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
