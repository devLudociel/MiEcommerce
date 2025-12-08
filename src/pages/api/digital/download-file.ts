import type { APIRoute } from 'astro';
import { getAdminDb, getAdminAuth } from '../../../lib/firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '../../../lib/logger';

/** Digital file structure stored in Firestore */
interface DigitalFile {
  id: string;
  name: string;
  storagePath: string;
  fileType?: string;
}

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
    const files = (accessData?.files || []) as DigitalFile[];
    const file = files.find((f) => f.id === fileId);

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

    // Download the file from storage
    const [fileBuffer] = await fileRef.download();

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

    logger.info('[digital/download-file] File downloaded successfully', {
      userId,
      digitalAccessId,
      fileId,
      fileName: file.name,
    });

    // Return the file as a blob
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': file.fileType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.name}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    const firebaseError = error as { code?: string };
    if (firebaseError.code === 'auth/id-token-expired' || firebaseError.code === 'auth/argument-error') {
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
