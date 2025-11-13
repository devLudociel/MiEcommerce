import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../../lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../lib/logger';

/**
 * POST /api/digital/download-file
 *
 * Genera una URL de descarga segura y temporal para un archivo digital
 * Verifica que el usuario tenga acceso al archivo
 * Registra la descarga
 *
 * Headers: Authorization: Bearer <token>
 * Body: { digitalAccessId: string, fileId: string }
 *
 * Returns: { downloadUrl: string, fileName: string, expiresIn: number }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Get auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await request.json();
    const { digitalAccessId, fileId } = body;

    if (!digitalAccessId || !fileId) {
      return new Response(
        JSON.stringify({ error: 'digitalAccessId y fileId son requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logger.info('[digital/download-file] Processing download request', {
      userId,
      digitalAccessId,
      fileId,
    });

    const db = getAdminDb();

    // Verify user has access to this digital product
    const accessDoc = await db.collection('digital_access').doc(digitalAccessId).get();

    if (!accessDoc.exists) {
      return new Response(
        JSON.stringify({ error: 'Acceso no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const accessData = accessDoc.data();

    // Verify ownership
    if (accessData?.userId !== userId) {
      return new Response(
        JSON.stringify({ error: 'No tienes acceso a este archivo' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the file
    const files = accessData?.files || [];
    const file = files.find((f: any) => f.id === fileId);

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'Archivo no encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed URL (valid for 1 hour)
    const storage = getStorage();
    const bucket = storage.bucket();

    // Extract file path from URL
    const fileUrl = file.fileUrl;
    const urlParts = fileUrl.split('/o/');
    if (urlParts.length < 2) {
      throw new Error('Invalid file URL format');
    }
    const encodedPath = urlParts[1].split('?')[0];
    const filePath = decodeURIComponent(encodedPath);

    const fileRef = bucket.file(filePath);

    // Generate signed URL valid for 1 hour
    const [downloadUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    // Update download stats
    await db.collection('digital_access').doc(digitalAccessId).update({
      totalDownloads: FieldValue.increment(1),
      lastDownloadAt: FieldValue.serverTimestamp(),
    });

    // Log the download
    await db.collection('download_logs').add({
      userId,
      digitalAccessId,
      productId: accessData?.productId,
      productName: accessData?.productName,
      fileId: file.id,
      fileName: file.name,
      downloadedAt: FieldValue.serverTimestamp(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    logger.info('[digital/download-file] Download URL generated', {
      userId,
      digitalAccessId,
      fileId,
      fileName: file.name,
    });

    return new Response(
      JSON.stringify({
        downloadUrl,
        fileName: file.name,
        expiresIn: 3600, // seconds
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return new Response(
        JSON.stringify({ error: 'Token inválido o expirado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logger.error('[digital/download-file] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error al generar descarga',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
