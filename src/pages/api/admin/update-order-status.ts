import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const db = getAdminDb();
    await db.collection('orders').doc(String(id)).set({ status: String(status), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Error actualizando estado' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

