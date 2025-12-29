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

// SECURITY FIX: Define valid statuses as enum for type safety
const VALID_STATUSES = ['pending', 'in_production', 'ready', 'shipped'] as const;

// SECURITY FIX: Zod schema for input validation
const updateItemStatusSchema = z.object({
  orderId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid orderId format'),
  itemIndex: z.number().int().min(0).max(1000),
  status: z.enum(VALID_STATUSES),
});

/**
 * API endpoint to update production status for a specific order item
 * POST /api/admin/update-item-status
 *
 * Body: { orderId: string, itemIndex: number, status: string }
 * Headers: Authorization: Bearer <firebase-token>
 *
 * Only accessible by authenticated admin users
 */
export const POST: APIRoute = async ({ request }) => {
  // SECURITY FIX: Add rate limiting
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.STANDARD, 'admin-update-item-status');
  if (!rateLimitResult.allowed) {
    logger.warn('[update-item-status] Rate limit exceeded');
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
    const validationResult = updateItemStatusSchema.safeParse(rawData);

    if (!validationResult.success) {
      logger.warn('[update-item-status] Validation failed:', validationResult.error.format());
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

    const { orderId, itemIndex, status } = validationResult.data;

    // Get the order from Firestore
    const adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: getSecurityHeaders(),
      });
    }

    const orderData = orderDoc.data();
    if (!orderData || !orderData.items || !orderData.items[itemIndex]) {
      return new Response(JSON.stringify({ error: 'Item not found' }), {
        status: 404,
        headers: getSecurityHeaders(),
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

    logger.info('[update-item-status] Status updated by admin:', authResult.uid);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Production status updated successfully',
      }),
      {
        status: 200,
        headers: getSecurityHeaders(),
      }
    );
  } catch (error) {
    logger.error('[update-item-status] Error:', error);
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
