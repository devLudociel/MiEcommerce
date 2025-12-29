import type { APIRoute } from 'astro';
import { verifyAdminAuth, getSecurityHeaders } from '../../../lib/auth-helpers';
import { getAdminDb } from '../../../lib/firebase-admin';
import { z } from 'zod';
import { logger } from '../../../lib/logger';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../../lib/rate-limiter';

// SECURITY FIX: Zod schema for input validation
const updateItemNotesSchema = z.object({
  orderId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid orderId format'),
  itemIndex: z.number().int().min(0).max(1000),
  notes: z.string().max(5000).default(''), // Limit notes length to prevent abuse
});

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
  // SECURITY FIX: Add rate limiting
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.STANDARD, 'admin-update-item-notes');
  if (!rateLimitResult.allowed) {
    logger.warn('[update-item-notes] Rate limit exceeded');
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);

    if (!authResult.isAuthenticated || !authResult.isAdmin) {
      return new Response(
        JSON.stringify({ error: authResult.error || 'Forbidden: Admin access required' }),
        {
          status: authResult.isAuthenticated ? 403 : 401,
          headers: getSecurityHeaders(),
        }
      );
    }

    // Parse and validate request body
    const rawData = await request.json();
    const validationResult = updateItemNotesSchema.safeParse(rawData);

    if (!validationResult.success) {
      logger.warn('[update-item-notes] Validation failed:', validationResult.error.format());
      return new Response(
        JSON.stringify({
          error: 'Invalid input data',
          details: import.meta.env.DEV ? validationResult.error.format() : undefined,
        }),
        {
          status: 400,
          headers: getSecurityHeaders(),
        }
      );
    }

    const { orderId, itemIndex, notes } = validationResult.data;

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

    logger.info('[update-item-notes] Notes updated by admin:', authResult.uid);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Production notes updated successfully',
      }),
      {
        status: 200,
        headers: getSecurityHeaders(),
      }
    );
  } catch (error) {
    logger.error('[update-item-notes] Error:', error);
    // SECURITY FIX: Don't expose internal error details
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      {
        status: 500,
        headers: getSecurityHeaders(),
      }
    );
  }
};
