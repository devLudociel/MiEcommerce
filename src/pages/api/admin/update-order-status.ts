import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminAuth } from '../../../lib/auth-helpers';
import { z } from 'zod';

// SECURITY FIX HIGH-005: Zod validation with whitelist of allowed statuses
const validStatuses = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
  'on_hold',
  'completed',
] as const;

const updateOrderSchema = z.object({
  id: z.string().min(1).max(255),
  status: z.enum(validStatuses),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    // SECURITY: Verify admin authentication
    const authResult = await verifyAdminAuth(request);

    // FIX: Changed && to || (same pattern as CRIT-002)
    if (!authResult.success || !authResult.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        {
          status: authResult.success ? 403 : 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // SECURITY FIX HIGH-005: Validate input with Zod
    const rawData = await request.json();
    const validationResult = updateOrderSchema.safeParse(rawData);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Datos inválidos',
          details: import.meta.env.DEV ? validationResult.error.format() : undefined,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id, status } = validationResult.data;

    const db = getAdminDb();

    // Verify order exists before updating
    const orderRef = db.collection('orders').doc(id);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return new Response(JSON.stringify({ error: 'Pedido no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await orderRef.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    // SECURITY FIX HIGH-002: Don't expose error details in production
    console.error('[update-order-status] Error:', e);
    return new Response(
      JSON.stringify({
        error: 'Error actualizando estado',
        details: import.meta.env.DEV ? (e instanceof Error ? e.message : undefined) : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
