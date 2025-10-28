// src/pages/api/admin/set-admin-claims.ts
import type { APIRoute } from 'astro';
import { getAdminApp, getAdminDb } from '../../../lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminAuth } from '../../../lib/authMiddleware';
import {
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  successResponse,
  errorResponse,
} from '../../../lib/errorHandler';

/**
 * Endpoint para asignar custom claims de admin a usuarios
 *
 * SEGURIDAD:
 * - Dos métodos de autenticación:
 *   1. Admin existente con ID Token (método recomendado)
 *   2. Secret inicial para primer admin (se desactiva con ADMIN_SETUP_DISABLED=true)
 * - Rate limiting recomendado en producción
 * - Todas las acciones se registran en audit logs
 *
 * USO MÉTODO 1 (Admin existente):
 * POST /api/admin/set-admin-claims
 * Headers: { Authorization: "Bearer <idToken>" }
 * Body: { email: "user@example.com", remove: false }
 *
 * USO MÉTODO 2 (Setup inicial - solo primera vez):
 * POST /api/admin/set-admin-claims
 * Body: { email: "user@example.com", secret: "YOUR_ADMIN_SECRET" }
 */

// Secret key para setup inicial (cambiar en producción)
const ADMIN_SECRET = import.meta.env.ADMIN_SETUP_SECRET;

// Flag para deshabilitar el endpoint después del setup inicial
const SETUP_DISABLED = import.meta.env.ADMIN_SETUP_DISABLED === 'true';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, secret, remove } = await request.json();

    if (!email) {
      return validationErrorResponse('Email es requerido');
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return validationErrorResponse('Formato de email inválido');
    }

    let performedBy = 'system';
    let performedByEmail = 'system';
    let authMethod = 'unknown';

    // MÉTODO 1: Autenticación con admin existente (RECOMENDADO)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const authResult = await verifyAdminAuth(request);

      if (!authResult.success) {
        return forbiddenResponse('Se requieren permisos de administrador para esta acción');
      }

      performedBy = authResult.decodedToken!.uid;
      performedByEmail = authResult.decodedToken!.email || 'unknown';
      authMethod = 'admin_token';

      console.log(`[set-admin-claims] Admin ${performedByEmail} modificando claims de ${email}`);
    }
    // MÉTODO 2: Secret inicial (solo para primer setup)
    else if (secret) {
      // Verificar si el endpoint está deshabilitado
      if (SETUP_DISABLED) {
        return forbiddenResponse(
          'El setup inicial está deshabilitado. Use autenticación de admin existente.'
        );
      }

      // Validar que el secret esté configurado
      if (!ADMIN_SECRET) {
        console.error('[set-admin-claims] ADMIN_SETUP_SECRET no configurado');
        return forbiddenResponse('Endpoint no configurado correctamente');
      }

      // Validar que no sea el secret por defecto
      if (ADMIN_SECRET === 'change-this-secret-in-production') {
        console.error('[set-admin-claims] Usando secret por defecto inseguro');
        return forbiddenResponse('Secret de seguridad no configurado');
      }

      // Validar secret
      if (secret !== ADMIN_SECRET) {
        console.warn('[set-admin-claims] Intento de acceso con secret inválido');
        return unauthorizedResponse('Secret inválido');
      }

      authMethod = 'setup_secret';
      console.log(`[set-admin-claims] Setup inicial: asignando admin a ${email}`);
    } else {
      return unauthorizedResponse(
        'Se requiere autenticación: proporcione Authorization header o secret'
      );
    }

    // Obtener Auth instance
    const app = getAdminApp();
    const auth = getAuth(app);

    // Buscar usuario por email
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return validationErrorResponse(`No se encontró usuario con email: ${email}`);
      }
      throw error;
    }

    // Asignar o remover custom claim de admin
    const isRemoving = remove === true;
    await auth.setCustomUserClaims(user.uid, { admin: !isRemoving });

    // Registrar en audit log
    const db = getAdminDb();
    await db.collection('audit_logs').add({
      action: isRemoving ? 'REMOVE_ADMIN_CLAIMS' : 'SET_ADMIN_CLAIMS',
      performedBy,
      performedByEmail,
      targetUserId: user.uid,
      targetUserEmail: email,
      authMethod,
      timestamp: FieldValue.serverTimestamp(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    const action = isRemoving ? 'removidos de' : 'asignados a';
    console.log(`✅ Admin claims ${action} ${email} por ${performedByEmail}`);

    return successResponse({
      success: true,
      message: isRemoving
        ? `Permisos de admin removidos de ${email}`
        : `Permisos de admin asignados a ${email}. El usuario debe cerrar sesión y volver a iniciar sesión para que los cambios tomen efecto.`,
      uid: user.uid,
      action: isRemoving ? 'removed' : 'granted',
    });
  } catch (error: any) {
    console.error('❌ Error setting admin claims:', error);
    return errorResponse(error, 'set-admin-claims');
  }
};
