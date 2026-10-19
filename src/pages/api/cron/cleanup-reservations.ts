import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { cleanupExpiredReservations } from '../../../lib/orders/stock';

const NO_STORE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

export const prerender = false;

function isAuthorized(request: Request): boolean {
  const secret = import.meta.env.CRON_SECRET as string | undefined;
  if (!secret) {
    // Fail closed in production. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
    // once the variable is set in the project.
    if (import.meta.env.PROD) {
      console.error('[cron/cleanup-reservations] CRON_SECRET is not set; refusing request');
      return false;
    }
    return true;
  }
  const authHeader = request.headers.get('authorization') || '';
  return authHeader === `Bearer ${secret}`;
}

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: NO_STORE_HEADERS,
    });
  }

  const db = getAdminDb();
  const processed = await cleanupExpiredReservations(db);
  return new Response(JSON.stringify({ processed }), {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
};

export const POST: APIRoute = async ({ request }) => {
  return GET({ request } as any);
};
