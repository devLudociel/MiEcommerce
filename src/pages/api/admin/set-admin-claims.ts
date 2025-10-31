// src/pages/api/admin/set-admin-claims.ts
import type { APIRoute } from 'astro';
import { getAdminApp } from '../../../lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

/**
 * Endpoint para asignar custom claims de admin a usuarios
 *
 * SEGURIDAD: Este endpoint debe ser protegido.
 * Solo debe ser accesible por admins existentes o mediante un secret key inicial.
 *
 * USO:
 * POST /api/admin/set-admin-claims
 * Body: { email: "user@example.com", secret: "YOUR_ADMIN_SECRET" }
 */

// Secret key para proteger este endpoint (cambiar en producción)
const ADMIN_SECRET = import.meta.env.ADMIN_SETUP_SECRET || 'change-this-secret-in-production';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, secret, remove } = await request.json();

    // Validar secret key
    if (secret !== ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid secret key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Obtener Auth instance
    const app = getAdminApp();
    const auth = getAuth(app);

    // Buscar usuario por email
    const user = await auth.getUserByEmail(email);

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Asignar o remover custom claim de admin
    if (remove) {
      await auth.setCustomUserClaims(user.uid, { admin: false });
      console.log(`✅ Admin claims removed from user: ${email}`);

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
      console.log(`✅ Admin claims set for user: ${email}`);

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
  } catch (error: any) {
    console.error('❌ Error setting admin claims:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Error setting admin claims',
        details: error.stack,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
