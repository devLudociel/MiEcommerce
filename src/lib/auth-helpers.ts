// src/lib/auth-helpers.ts
import { getAdminAuth } from './firebase-admin';

export interface AuthResult {
  success: boolean;
  uid?: string;
  isAdmin?: boolean;
  error?: Response;
}

/**
 * Verifica el token de autenticación de Firebase desde el header Authorization
 */
export async function verifyAuthToken(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: new Response(JSON.stringify({ error: 'Unauthorized - No token provided' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const idToken = authHeader.replace('Bearer ', '').trim();

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    return {
      success: true,
      uid: decodedToken.uid,
      isAdmin: !!decodedToken.admin,
    };
  } catch (verificationError) {
    console.error('[auth-helpers] Invalid token:', verificationError);
    return {
      success: false,
      error: new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
}

/**
 * Verifica que el usuario autenticado sea admin
 */
export async function verifyAdminAuth(request: Request): Promise<AuthResult> {
  const authResult = await verifyAuthToken(request);

  if (!authResult.success) {
    return authResult;
  }

  if (!authResult.isAdmin) {
    console.warn('[auth-helpers] Non-admin user attempted admin access:', authResult.uid);
    return {
      success: false,
      error: new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return authResult;
}

/**
 * Crea una respuesta de error genérica sin exponer detalles internos
 */
export function createErrorResponse(message: string, status: number = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Logs de error seguros que no exponen información sensible al cliente
 */
export function logErrorSafely(context: string, error: unknown): void {
  // Log completo en servidor para debugging
  console.error(`[${context}] Error:`, error);

  // Si es producción, no enviar stack traces al cliente
  if (import.meta.env.PROD) {
    console.log(`[${context}] Stack traces ocultos en producción`);
  }
}
