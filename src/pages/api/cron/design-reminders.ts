import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { getAdminDb } from '../../../lib/firebase-admin';
import { designReminderTemplate } from '../../../lib/emailTemplates';
import type { OrderData, OrderItem } from '../../../types/firebase';

/**
 * Cron: recordatorio a clientes con diseño "lo envío después" pendiente.
 * GET /api/cron/design-reminders            → envía y marca designReminder en el pedido
 * GET /api/cron/design-reminders?dry=1      → solo lista candidatos, no envía nada
 *
 * Un pedido recibe recordatorio si:
 *  - createdAt entre 48h y 7 días atrás (la ventana evita spamear pedidos antiguos)
 *  - status/paymentStatus no cancelado/fallido/reembolsado
 *  - aún no tiene designReminder.sentAt
 *  - contiene ≥1 item con customization.designMode === 'send-later' sin archivo
 *    (sin uploadedImage, sin uploadedFiles) y productionStatus aún 'pending'
 */

const NO_STORE_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

export const prerender = false;

const MIN_AGE_MS = 48 * 60 * 60 * 1000;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_EMAILS_PER_RUN = 20;
const SKIP_STATUSES = new Set(['cancelled', 'canceled', 'refunded', 'failed', 'returned']);

function isAuthorized(request: Request): boolean {
  const secret = import.meta.env.CRON_SECRET as string | undefined;
  if (!secret) return true;
  const authHeader = request.headers.get('authorization') || '';
  return authHeader === `Bearer ${secret}`;
}

type StoredOrder = OrderData & { designReminder?: { sentAt?: unknown } };

function getPendingDesignItems(
  items: OrderItem[] | undefined
): Array<{ name: string; quantity: number }> {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => {
      const customization = item.customization;
      if (!customization || customization.designMode !== 'send-later') return false;
      if (customization.uploadedImage) return false;
      if (Array.isArray(item.uploadedFiles) && item.uploadedFiles.length > 0) return false;
      if (item.productionStatus && item.productionStatus !== 'pending') return false;
      return true;
    })
    .map((item) => ({
      // Los pedidos guardados llevan `name`; OrderItem tipa `productName` — aceptar ambos
      name: String(
        (item as Record<string, unknown>).name ?? item.productName ?? 'Producto personalizado'
      ),
      quantity: Number(item.quantity ?? 1),
    }));
}

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: NO_STORE_HEADERS,
    });
  }

  const dryRun = new URL(request.url).searchParams.get('dry') === '1';
  const resendApiKey = import.meta.env.RESEND_API_KEY as string | undefined;
  if (!dryRun && !resendApiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY no configurada' }), {
      status: 500,
      headers: NO_STORE_HEADERS,
    });
  }

  try {
    const db = getAdminDb();
    const now = Date.now();
    const snapshot = await db
      .collection('orders')
      .where('createdAt', '>=', new Date(now - MAX_AGE_MS))
      .where('createdAt', '<=', new Date(now - MIN_AGE_MS))
      .get();

    const resend = dryRun ? null : new Resend(resendApiKey);
    const fromAddress =
      (import.meta.env.EMAIL_FROM as string | undefined) || 'noreply@imprimearte.es';

    const results: Array<Record<string, unknown>> = [];
    let sent = 0;
    let errors = 0;

    for (const doc of snapshot.docs) {
      if (sent >= MAX_EMAILS_PER_RUN) break;

      const data = doc.data() as StoredOrder;

      if (data.designReminder?.sentAt) continue;

      const status = String(data.status || '').toLowerCase();
      const paymentStatus = String(data.paymentStatus || '').toLowerCase();
      if (SKIP_STATUSES.has(status) || SKIP_STATUSES.has(paymentStatus)) continue;

      const email = data.shippingInfo?.email;
      if (!email) continue;

      const pendingItems = getPendingDesignItems(data.items);
      if (pendingItems.length === 0) continue;

      const order: OrderData = { ...data, id: doc.id };

      if (dryRun) {
        results.push({
          orderId: doc.id,
          email: email.replace(/^(.{2}).*(@.*)$/, '$1***$2'),
          items: pendingItems,
        });
        continue;
      }

      if (!resend) continue;

      try {
        const template = designReminderTemplate(order, pendingItems);
        const response = await resend.emails.send({
          from: fromAddress,
          to: [email],
          replyTo: 'pedidos@imprimearte.es',
          subject: template.subject,
          html: template.html,
        });

        const emailId =
          (response as { data?: { id?: string } | null }).data?.id ??
          (response as { id?: string }).id ??
          null;
        const sendError = (response as { error?: { message?: string } | null }).error;
        if (sendError) {
          throw new Error(sendError.message || 'Resend devolvió error');
        }

        await doc.ref.update({
          designReminder: { sentAt: new Date(), emailId },
          updatedAt: new Date(),
        });

        sent += 1;
        results.push({ orderId: doc.id, sent: true, emailId });
      } catch (error) {
        errors += 1;
        console.error(`[design-reminders] Error en pedido ${doc.id}:`, error);
        results.push({
          orderId: doc.id,
          sent: false,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }
    }

    return new Response(JSON.stringify({ dryRun, scanned: snapshot.size, sent, errors, results }), {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    console.error('[design-reminders] Error general:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: NO_STORE_HEADERS,
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  return GET({ request } as Parameters<APIRoute>[0]);
};
