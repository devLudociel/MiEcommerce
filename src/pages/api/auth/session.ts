import type { APIRoute } from 'astro';
import { getAdminAuth } from '../../../lib/firebase-admin';

const AUTH_COOKIE_NAME = 'auth_token';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5; // 5 days

export const POST: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const idToken = authHeader.replace('Bearer ', '').trim();

  try {
    const adminAuth = getAdminAuth();
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    });

    const maxAgeSeconds = Math.floor(SESSION_MAX_AGE_MS / 1000);
    const secureFlag = import.meta.env.PROD ? '; Secure' : '';
    const cookie = `${AUTH_COOKIE_NAME}=${sessionCookie}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; SameSite=Lax${secureFlag}`;

    const response = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    response.headers.append('Set-Cookie', cookie);
    return response;
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'No se pudo crear la sesión',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
