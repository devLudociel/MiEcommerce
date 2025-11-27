// src/lib/auth-helpers.ts
import { getAdminAuth } from './firebase-admin';

// Simple console logger for server-side code (avoids import issues)
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
  debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data || ''),
};

export interface AuthResult {
  success: boolean;
  isAuthenticated: boolean;
  uid?: string;
  isAdmin?: boolean;
  error?: string;
}

/**
 * Verifica el token de autenticación de Firebase desde el header Authorization
 */
export async function verifyAuthToken(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      isAuthenticated: false,
      error: 'Unauthorized - No token provided',
    };
  }

  const idToken = authHeader.replace('Bearer ', '').trim();

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    return {
      success: true,
      isAuthenticated: true,
      uid: decodedToken.uid,
      isAdmin: !!decodedToken.admin,
    };
  } catch (verificationError) {
    logger.error('[auth-helpers] Invalid token:', verificationError);
    return {
      success: false,
      isAuthenticated: false,
      error: 'Unauthorized - Invalid token',
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
    logger.warn('[auth-helpers] Non-admin user attempted admin access:', authResult.uid);
    return {
      success: false,
      isAuthenticated: true,
      isAdmin: false,
      uid: authResult.uid,
      error: 'Forbidden - Admin access required',
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
  logger.error(`[${context}] Error:`, error);

  // Si es producción, no enviar stack traces al cliente
  if (import.meta.env.PROD) {
    logger.info(`[${context}] Stack traces ocultos en producción`);
  }
}
