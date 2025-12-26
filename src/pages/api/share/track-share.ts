import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../lib/logger';
import { z } from 'zod';

const trackShareSchema = z.object({
  shareId: z.string().min(1),
  platform: z.enum(['whatsapp', 'facebook', 'instagram', 'twitter', 'pinterest', 'email', 'link']),
});

/**
 * POST /api/share/track-share
 *
 * Trackea cuando un diseño es compartido en una plataforma
 *
 * Body: { shareId: string; platform: string }
 *
 * Returns: { success: boolean }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const rawData = await request.json();

    // Validate input
    const validationResult = trackShareSchema.safeParse(rawData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          details: validationResult.error.format(),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { shareId, platform } = validationResult.data;

    logger.info('[share/track-share] Tracking share:', { shareId, platform });

    const db = getAdminDb();
    const shareRef = db.collection('shared_designs').doc(shareId);

    // Check if share exists
    const shareSnap = await shareRef.get();
    if (!shareSnap.exists) {
      return new Response(JSON.stringify({ error: 'Share not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Increment platform counter and total share count
    await shareRef.update({
      shareCount: FieldValue.increment(1),
      [`platform.${platform}`]: FieldValue.increment(1),
    });

    logger.info('[share/track-share] Share tracked successfully');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('[share/track-share] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error tracking share',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
