import type { APIRoute } from 'astro';
import { getAdminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../lib/logger';
import { z } from 'zod';

const incrementUsageSchema = z.object({
  templateId: z.string().min(1),
});

/**
 * POST /api/templates/increment-usage
 *
 * Incrementa el contador de popularidad de una plantilla
 *
 * Body: { templateId: string }
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

    const { templateId } = validationResult.data;

    logger.info('[increment-usage] Incrementing usage for template:', templateId);

    const db = getAdminDb();
    const templateRef = db.collection('design_templates').doc(templateId);

    // Check if template exists
    const templateSnap = await templateRef.get();
    if (!templateSnap.exists) {
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Increment popularity counter
    await templateRef.update({
      popularity: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info('[increment-usage] Successfully incremented usage');

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('[increment-usage] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error incrementing usage',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
