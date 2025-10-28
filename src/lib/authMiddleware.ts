// src/lib/authMiddleware.ts

import { getAdminAuth } from './firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Resultado de verificación de autenticación
 */
export interface AuthResult {
  success: boolean;
  decodedToken?: DecodedIdToken;
  error?: string;
}

/**
 * Verifica el token de autenticación de Firebase desde el header Authorization
 *
 * @param request - Request de Astro
 * @returns AuthResult con el token decodificado o error
 */
export async function verifyAuthToken(request: Request): Promise<AuthResult> {
  try {
    // Obtener header de autorización (case-insensitive)
    const authHeader =
      request.headers.get('authorization') ||
      request.headers.get('Authorization');

    if (!authHeader) {
      return {
        success: false,
        error: 'No se proporcionó token de autenticación',
      };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Formato de token inválido. Use: Bearer <token>',
      };
    }

    // Extraer el token
    const idToken = authHeader.replace('Bearer ', '').trim();

    if (!idToken) {
      return {
        success: false,
        error: 'Token vacío',
      };
    }

    // Verificar el token con Firebase Admin
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);

    return {
      success: true,
      decodedToken,
    };
  } catch (error: any) {
    console.error('[authMiddleware] Error verificando token:', error);

    // Manejar errores específicos de Firebase
    if (error.code === 'auth/id-token-expired') {
      return {
        success: false,
        error: 'Token expirado. Por favor, inicie sesión nuevamente',
      };
    }

    if (error.code === 'auth/argument-error') {
      return {
        success: false,
        error: 'Token inválido',
      };
    }

    return {
      success: false,
      error: 'Error verificando autenticación',
    };
  }
}

/**
 * Verifica que el usuario tenga permisos de administrador
 *
 * @param decodedToken - Token decodificado de Firebase
 * @returns true si es admin, false en caso contrario
 */
export function isAdmin(decodedToken: DecodedIdToken): boolean {
  return decodedToken.admin === true;
}

/**
 * Verifica autenticación y permisos de admin en un solo paso
 *
 * @param request - Request de Astro
 * @returns AuthResult con verificación de admin
 */
export async function verifyAdminAuth(request: Request): Promise<AuthResult> {
  const authResult = await verifyAuthToken(request);

  if (!authResult.success || !authResult.decodedToken) {
    return authResult;
  }

  // Verificar permisos de admin
  if (!isAdmin(authResult.decodedToken)) {
    return {
      success: false,
      error: 'Se requieren permisos de administrador',
    };
  }

  return authResult;
}

/**
 * Verifica que el usuario esté autenticado y sea el propietario del recurso
 *
 * @param request - Request de Astro
 * @param resourceUserId - ID del usuario propietario del recurso
 * @returns AuthResult con verificación de propiedad o admin
 */
export async function verifyOwnerOrAdmin(
  request: Request,
  resourceUserId: string
): Promise<AuthResult> {
  const authResult = await verifyAuthToken(request);

  if (!authResult.success || !authResult.decodedToken) {
    return authResult;
  }

  const { decodedToken } = authResult;

  // Permitir si es el propietario o es admin
  const isOwner = decodedToken.uid === resourceUserId;
  const isUserAdmin = isAdmin(decodedToken);

  if (!isOwner && !isUserAdmin) {
    return {
      success: false,
      error: 'No tiene permisos para acceder a este recurso',
    };
  }

  return authResult;
}
