import type { APIRoute } from 'astro';
import { verifyAdminAuth, getSecurityHeaders } from '../../../lib/auth-helpers';
import { getAdminDb } from '../../../lib/firebase-admin';
import { z } from 'zod';

/**
 * Datos de planificación de un pedido.
 * POST /api/admin/update-production
 *
 * Dos operaciones sobre el mismo pedido, ambas opcionales:
 *  - `order`: fecha prometida y modo de entrega
 *  - `item`:  tipo de trabajo, minutos y fecha límite de una línea
 *
 * Los minutos llegan ya calculados desde el panel y se guardan tal cual, para
 * que cambiar la tabla de tiempos más adelante no reescriba la carga de
 * trabajos ya planificados.
 *
 * Cabecera: Authorization: Bearer <firebase-token>
 */

const fechaIso = z.string().datetime().nullable();

const schema = z
  .object({
    orderId: z.string().min(1).max(255),
    order: z
      .object({
        promisedDate: fechaIso.optional(),
        deliveryMode: z.enum(['pickup', 'local', 'island']).optional(),
      })
      .optional(),
    item: z
      .object({
        itemIndex: z.coerce.number().int().min(0),
        productionTypeId: z.string().max(255).nullable().optional(),
        personMinutes: z.coerce.number().min(0).max(100_000).nullable().optional(),
        machineMinutes: z.coerce.number().min(0).max(100_000).nullable().optional(),
        productionDueDate: fechaIso.optional(),
      })
      .optional(),
  })
  .refine((valor) => valor.order || valor.item, {
    message: 'Indica al menos order o item',
  });

/** `null` borra el campo; `undefined` lo deja como estaba. */
const asignar = (destino: Record<string, unknown>, clave: string, valor: unknown) => {
  if (valor === undefined) return;
  destino[clave] = valor === null ? null : valor;
};

export const POST: APIRoute = async ({ request }) => {
  const headers = getSecurityHeaders();

  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.isAuthenticated || !authResult.isAdmin) {
      return new Response(
        JSON.stringify({ error: authResult.error || 'Forbidden: Admin access required' }),
        { status: authResult.isAuthenticated ? 403 : 401, headers }
      );
    }

    const rawData = await request.json();
    const validationResult = schema.safeParse(rawData);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Datos inválidos',
          details: import.meta.env.DEV ? validationResult.error.format() : undefined,
        }),
        { status: 400, headers }
      );
    }

    const { orderId, order, item } = validationResult.data;

    const adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers });
    }

    const orderData = orderDoc.data();
    const actualizacion: Record<string, unknown> = { updatedAt: new Date() };

    if (order) {
      asignar(
        actualizacion,
        'promisedDate',
        order.promisedDate === undefined
          ? undefined
          : order.promisedDate === null
            ? null
            : new Date(order.promisedDate)
      );
      asignar(actualizacion, 'deliveryMode', order.deliveryMode);
    }

    if (item) {
      const items = Array.isArray(orderData?.items) ? [...orderData.items] : [];
      if (!items[item.itemIndex]) {
        return new Response(JSON.stringify({ error: 'Item not found' }), { status: 404, headers });
      }
      const linea = { ...items[item.itemIndex] };
      asignar(linea, 'productionTypeId', item.productionTypeId);
      asignar(linea, 'personMinutes', item.personMinutes);
      asignar(linea, 'machineMinutes', item.machineMinutes);
      asignar(
        linea,
        'productionDueDate',
        item.productionDueDate === undefined
          ? undefined
          : item.productionDueDate === null
            ? null
            : new Date(item.productionDueDate)
      );
      items[item.itemIndex] = linea;
      actualizacion.items = items;
    }

    await orderRef.update(actualizacion);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers });
  } catch (error) {
    console.error('[update-production] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
  }
};
