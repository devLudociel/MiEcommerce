import type { APIRoute } from 'astro';
import { verifyAdminAuth, getSecurityHeaders } from '../../../lib/auth-helpers';
import { getAdminDb } from '../../../lib/firebase-admin';
import { z } from 'zod';

/**
 * API endpoint to update production status for a specific order item
 * POST /api/admin/update-item-status
 *
 * Body: { orderId: string, itemIndex: number, status: string }
 * Headers: Authorization: Bearer <firebase-token>
 *
 * Only accessible by authenticated admin users
 */
const validStatuses = ['pending', 'in_production', 'ready', 'shipped'] as const;

const updateItemStatusSchema = z.object({
  orderId: z.string().min(1).max(255),
  itemIndex: z.coerce.number().int().min(0),
  status: z.enum(validStatuses),
});

export const POST: APIRoute = async ({ request }) => {
  const headers = getSecurityHeaders();

  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);

    if (!authResult.isAuthenticated || !authResult.isAdmin) {
      return new Response(
        JSON.stringify({ error: authResult.error || 'Forbidden: Admin access required' }),
        {
          status: authResult.isAuthenticated ? 403 : 401,
          headers,
        }
      );
    }

    // Parse request body
    const rawData = await request.json();
    const validationResult = updateItemStatusSchema.safeParse(rawData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Datos inválidos',
          details: import.meta.env.DEV ? validationResult.error.format() : undefined,
        }),
        { status: 400, headers }
      );
    }

    const { orderId, itemIndex, status } = validationResult.data;

    // Get the order from Firestore
    const adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers,
      });
    }

    const orderData = orderDoc.data();
    if (!orderData || !orderData.items || !orderData.items[itemIndex]) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers,
      });
    }

    // Update the specific item's production status
    const updatedItems = [...orderData.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      productionStatus: status,
    };

    // Save back to Firestore
    await orderRef.update({
      items: updatedItems,
      updatedAt: new Date(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Production status updated successfully',
      }),
      {
        status: 200,
        headers,
      }
    );
  } catch (error) {
    console.error('[update-item-status] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
};
