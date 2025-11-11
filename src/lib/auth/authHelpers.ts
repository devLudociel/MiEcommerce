/**
 * Authentication and authorization helpers for API endpoints
 */

import { logger } from '../../lib/logger';
import { getAdminAuth } from '../firebase-admin';

export interface AuthResult {
  success: boolean;
  uid?: string;
  email?: string;
  isAdmin?: boolean;
  error?: Response;
}

/**
 * Verify user authentication from Bearer token
 * @param request - API request
 * @returns Auth result with user info or error response
 */
export async function verifyAuthToken(request: Request): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[verifyAuthToken] Missing or invalid authorization header');
      return {
        success: false,
        error: new Response(
          JSON.stringify({ error: 'Autenticación requerida' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }

    const idToken = authHeader.replace('Bearer ', '').trim();

    try {
      const decodedToken = await getAdminAuth().verifyIdToken(idToken);

      return {
        success: true,
        uid: decodedToken.uid,
        email: decodedToken.email,
        isAdmin: decodedToken.admin === true,
      };
    } catch (verificationError) {
      logger.error('[verifyAuthToken] Token verification failed:', verificationError);
      return {
        success: false,
        error: new Response(
          JSON.stringify({ error: 'Token inválido o expirado' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }
  } catch (error) {
    logger.error('[verifyAuthToken] Unexpected error:', error);
    return {
      success: false,
      error: new Response(
        JSON.stringify({ error: 'Error de autenticación' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }
}

/**
 * Verify admin authentication and authorization
 * @param request - API request
 * @returns Auth result with admin verification or error response
 */
export async function verifyAdminAuth(request: Request): Promise<AuthResult> {
  const authResult = await verifyAuthToken(request);

  if (!authResult.success) {
    return authResult;
  }

  // Check admin role from custom claims
  if (authResult.isAdmin) {
    return authResult;
  }

  // Fallback: Check against PUBLIC_ADMIN_EMAILS
  const adminEmails = (import.meta.env.PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  const email = (authResult.email || '').toLowerCase();
  const isAdminByEmail = email && adminEmails.includes(email);

  if (isAdminByEmail) {
    return {
      ...authResult,
      isAdmin: true,
    };
  }

  // Not an admin
  logger.warn('[verifyAdminAuth] Non-admin user attempted admin action:', {
    uid: authResult.uid,
    email: authResult.email,
  });

  return {
    success: false,
    error: new Response(
      JSON.stringify({ error: 'Acceso denegado - Requiere permisos de administrador' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    ),
  };
}
