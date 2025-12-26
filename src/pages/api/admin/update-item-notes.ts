import type { APIRoute } from 'astro';
import { verifyAdminAuth } from '../../../lib/auth-helpers';
import { getAdminDb } from '../../../lib/firebase-admin';

/**
 * API endpoint to update production notes for a specific order item
 * POST /api/admin/update-item-notes
 *
 * Body: { orderId: string, itemIndex: number, notes: string }
 * Headers: Authorization: Bearer <firebase-token>
 *
 * Only accessible by authenticated admin users
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Verify admin authentication
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

    // Parse request body
    const { orderId, itemIndex, notes } = await request.json();

    if (!orderId || itemIndex === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: orderId, itemIndex' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the order from Firestore
    const adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const orderData = orderDoc.data();
    if (!orderData || !orderData.items || !orderData.items[itemIndex]) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the specific item's production notes
    const updatedItems = [...orderData.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      productionNotes: notes || '',
    };

    // Save back to Firestore
    await orderRef.update({
      items: updatedItems,
      updatedAt: new Date(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Production notes updated successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[update-item-notes] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
