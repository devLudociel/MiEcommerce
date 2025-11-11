// src/pages/api/admin/set-admin-claims.ts
import { logger } from '../../lib/logger';
import type { APIRoute } from 'astro';
import { getAdminApp } from '../../../lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { rateLimitPersistent } from '../../../lib/rateLimitPersistent';
import { logErrorSafely, createErrorResponse } from '../../../lib/auth-helpers';

/**
 * Endpoint para asignar custom claims de admin a usuarios
 *
 * SEGURIDAD: Este endpoint está protegido con:
 * - Secret key fuerte (DEBE configurarse en .env)
 * - Rate limiting estricto (3 intentos por hora)
 * - Sin exposición de stack traces
 *
 * USO:
 * POST /api/admin/set-admin-claims
 * Body: { email: "user@example.com", secret: "YOUR_ADMIN_SECRET" }
 */

// Secret key OBLIGATORIO - debe configurarse en .env
const ADMIN_SECRET = import.meta.env.ADMIN_SETUP_SECRET;

// CRITICAL SECURITY: Verificar que el secret esté configurado
if (!ADMIN_SECRET || ADMIN_SECRET === 'change-this-secret-in-production') {
  throw new Error(
    'CRITICAL: ADMIN_SETUP_SECRET must be set in .env with a strong secret. ' +
      'This endpoint allows granting admin privileges and MUST be protected.'
  );
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // SECURITY: Rate limiting estricto - 3 intentos por hora (PERSISTENT)
    const rateLimitResult = await rateLimitPersistent(request, 'admin-claims', {
      intervalMs: 60 * 60 * 1000, // 1 hora
      max: 3, // Solo 3 intentos por hora
    });

    if (!rateLimitResult.ok) {
      logger.warn('[set-admin-claims] Rate limit exceeded', {
        resetAt: new Date(rateLimitResult.resetAt).toISOString(),
      });
      return createErrorResponse('Too many requests. Please try again later.', 429);
    }

    const { email, secret, remove } = await request.json();

    // SECURITY: Validar secret key primero
    if (!secret || secret !== ADMIN_SECRET) {
      logger.warn('[set-admin-claims] Invalid secret attempt', {
        hasSecret: !!secret,
        timestamp: new Date().toISOString(),
      });
      return createErrorResponse('Unauthorized: Invalid secret key', 401);
    }

    if (!email || typeof email !== 'string') {
      return createErrorResponse('Email is required', 400);
    }

    // Obtener Auth instance
    const app = getAdminApp();
    const auth = getAuth(app);

    // Buscar usuario por email
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (getUserError) {
      logErrorSafely('set-admin-claims', getUserError);
      return createErrorResponse('User not found', 404);
    }

    // Asignar o remover custom claim de admin
    if (remove) {
      await auth.setCustomUserClaims(user.uid, { admin: false });
      logger.info(`✅ Admin claims removed from user: ${email}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Admin claims removed from ${email}`,
          uid: user.uid,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      await auth.setCustomUserClaims(user.uid, { admin: true });
      logger.info(`✅ Admin claims set for user: ${email}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Admin claims set for ${email}. User must sign out and sign in again for changes to take effect.`,
          uid: user.uid,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error: unknown) {
    // SECURITY: No exponer stack traces ni detalles internos
    logErrorSafely('set-admin-claims', error);
    return createErrorResponse('Error setting admin claims', 500);
  }
};
