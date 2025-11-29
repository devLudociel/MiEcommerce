import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminAuth } from '../../../lib/auth-helpers';

export const POST: APIRoute = async ({ request }) => {
  try {
    // SECURITY: Verify admin authentication
    const authResult = await verifyAdminAuth(request);

    if (!authResult.isAuthenticated || !authResult.isAdmin) {
      return new Response(
        JSON.stringify({ error: authResult.error || 'Forbidden: Admin access required' }),
        {
          status: authResult.isAuthenticated ? 403 : 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { id, status } = await request.json();
    if (!id || !status) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const db = getAdminDb();
    await db
      .collection('orders')
      .doc(String(id))
      .set({ status: String(status), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Error actualizando estado';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
