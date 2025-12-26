import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../lib/logger';
import { z } from 'zod';

const incrementUsageSchema = z.object({
  clipartId: z.string().min(1),
});

/**
 * POST /api/cliparts/increment-usage
 *
 * Incrementa el contador de uso de un clipart
 *
 * Body: { clipartId: string }
 *
 * Returns: { success: boolean }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const rawData = await request.json();

    // Validate input
    const validationResult = incrementUsageSchema.safeParse(rawData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { clipartId } = validationResult.data;

    logger.info('[cliparts/increment-usage] Incrementing usage for clipart:', clipartId);

    const db = getAdminDb();
    const clipartRef = db.collection('cliparts').doc(clipartId);

    // Check if clipart exists
    const clipartSnap = await clipartRef.get();
    if (!clipartSnap.exists) {
      return new Response(JSON.stringify({ error: 'Clipart not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Increment usage counter
    await clipartRef.update({
      usageCount: FieldValue.increment(1),
    });

    logger.info('[cliparts/increment-usage] Successfully incremented usage');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('[cliparts/increment-usage] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error incrementing usage',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
