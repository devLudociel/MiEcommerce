import type { APIRoute } from 'astro';
import { getAdminAuth } from '../../../lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { z } from 'zod';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../../lib/rate-limiter';

const requestSchema = z.object({
  path: z.string().min(1).max(500),
});

function normalizePath(path: string): string {
  return path.replace(/\.\./g, '').replace(/\/+/g, '/').replace(/^\/+/, '');
}

function isAllowedPath(path: string, uid: string, isAdmin: boolean): boolean {
  const userPrefixes = [
    `users/${uid}/files/`,
    `users/${uid}/customizer-designs/`,
    `uploads/${uid}/`,
    `personalizaciones/${uid}/`,
    `profiles/${uid}/`,
  ];

  if (!isAdmin) {
    return userPrefixes.some((prefix) => path.startsWith(prefix));
  }

  const adminPrefixes = [
    'users/',
    'uploads/',
    'personalizaciones/',
    'profiles/',
    'customization/',
  ];

  return adminPrefixes.some((prefix) => path.startsWith(prefix));
}

export const POST: APIRoute = async ({ request }) => {
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.STANDARD, 'signed-url');
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const uid = decodedToken.uid;
    const isAdmin = decodedToken.admin === true;

    const body = await request.json();
    const validationResult = requestSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Datos inválidos',
          details: import.meta.env.DEV ? validationResult.error.format() : undefined,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const normalizedPath = normalizePath(validationResult.data.path);

    if (!isAllowedPath(normalizedPath, uid, isAdmin)) {
      return new Response(JSON.stringify({ error: 'Ruta no permitida' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const storage = getStorage();
    const bucket = storage.bucket();
    const expiresInSeconds = 5 * 60;
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    const [url] = await bucket.file(normalizedPath).getSignedUrl({
      action: 'read',
      expires: expiresAt,
    });

    return new Response(JSON.stringify({ url, expiresIn: expiresInSeconds }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'No se pudo generar la URL de descarga',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
