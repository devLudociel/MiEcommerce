import type { APIRoute } from 'astro';
import { getAdminAuth } from '../../../lib/firebase-admin';

const AUTH_COOKIE_NAME = 'auth_token';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5; // 5 days

function buildAuthCookie(token: string): string {
  const maxAgeSeconds = Math.floor(SESSION_MAX_AGE_MS / 1000);
  const secureFlag = import.meta.env.PROD ? '; Secure' : '';
  return `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; SameSite=Lax${secureFlag}`;
}

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
    await adminAuth.verifyIdToken(idToken);

    let cookieValue = idToken;

    try {
      cookieValue = await adminAuth.createSessionCookie(idToken, {
        expiresIn: SESSION_MAX_AGE_MS,
      });
    } catch (sessionCookieError) {
      console.warn(
        '[auth/session] Falling back to raw ID token cookie because session cookie creation failed',
        sessionCookieError
      );
    }

    const response = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    response.headers.append('Set-Cookie', buildAuthCookie(cookieValue));
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
