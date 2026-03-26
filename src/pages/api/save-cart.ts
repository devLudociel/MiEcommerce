// src/pages/api/save-cart.ts
import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { z } from 'zod';

export const prerender = false;

const cartItemSchema = z.object({
  productId: z.string().min(1).max(255),
  name: z.string().min(1).max(500),
  quantity: z.number().int().positive().max(999),
  price: z.number().nonnegative(),
  image: z.string().url().optional(),
  variantId: z.string().max(255).optional(),
  variantName: z.string().max(255).optional(),
});

const saveCartSchema = z.object({
  cartId: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  userId: z.string().max(255).optional(),
  items: z.array(cartItemSchema).max(100),
});

/**
 * Persists the cart to Firestore so n8n can detect abandoned carts.
 * Called from the frontend whenever the cart changes.
 * Does NOT require authentication (supports guest carts).
 */
export const POST: APIRoute = async ({ request }) => {
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    return createCSRFErrorResponse();
  }

  let rawData: unknown;
  try {
    rawData = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const validationResult = saveCartSchema.safeParse(rawData);
  if (!validationResult.success) {
    return new Response(
      JSON.stringify({ error: 'Datos inválidos', details: validationResult.error.format() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { cartId, email, phone, userId, items } = validationResult.data;

  try {
    const db = getAdminDb();
    const cartRef = db.collection('carts').doc(cartId);

    if (items.length === 0) {
      // Empty cart: delete it
      await cartRef.delete();
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await cartRef.set(
      {
        cartId,
        ...(userId && { userId }),
        ...(email && { email }),
        ...(phone && { phone }),
        items,
        updatedAt: FieldValue.serverTimestamp(),
        convertedToOrder: false,
        abandonedWhatsappSent: false,
        abandonedEmailSent: false,
      },
      { merge: true }
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[save-cart] Error saving cart:', error);
    return new Response(JSON.stringify({ error: 'Error guardando carrito' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
