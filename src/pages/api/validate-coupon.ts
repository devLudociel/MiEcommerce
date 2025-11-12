// src/pages/api/validate-coupon.ts
import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';
import { validateCouponCodeSchema } from '../../lib/validation/schemas';
import { rateLimit } from '../../lib/rateLimit';
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';

// Simple console logger for API routes (avoids import issues)
const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
  debug: (msg: string, data?: any) => console.log(`[DEBUG] ${msg}`, data || ''),
};

export const POST: APIRoute = async ({ request }) => {
  // SECURITY: CSRF protection
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    logger.warn('[validate-coupon] CSRF validation failed', { reason: csrfCheck.reason });
    return createCSRFErrorResponse();
  }

  // Rate limit básico: 30/min por IP para este endpoint
  try {
    const { ok, remaining, resetAt } = await rateLimit(request, 'validate-coupon', {
      intervalMs: 60_000,
      max: 30,
    });
    if (!ok) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(resetAt),
        },
      });
    }
  } catch {}
  logger.info('[validate-coupon] Request received');

  try {
    const body = await request.json();
    logger.debug('[validate-coupon] Request body', { body });

    // Validate request with Zod
    const validationResult = validateCouponCodeSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn('[validate-coupon] Invalid request', validationResult.error);
      return new Response(
        JSON.stringify({
          error: 'Datos de validación inválidos',
          details: validationResult.error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { code, userId, cartTotal } = validationResult.data;

    // Get Firebase Admin DB
    let adminDb;
    try {
      adminDb = getAdminDb();
    } catch (adminInitError) {
      logger.error('[validate-coupon] Error initializing Firebase Admin', adminInitError);
      return new Response(
        JSON.stringify({
          error: 'Error del servidor al validar cupón',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Query coupon from Firestore
    const couponsRef = adminDb.collection('coupons');
    const couponQuery = await couponsRef
      .where('code', '==', code)
      .where('active', '==', true)
      .get();

    if (couponQuery.empty) {
      logger.info('[validate-coupon] Coupon not found or inactive', { code });
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Cupón no válido o inactivo',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const couponDoc = couponQuery.docs[0];
    const coupon = { id: couponDoc.id, ...couponDoc.data() } as any;

    logger.info('[validate-coupon] Coupon found', {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
    });

    // Validate expiration date
    if (coupon.endDate) {
      const expirationDate =
        typeof coupon.endDate?.toDate === 'function'
          ? coupon.endDate.toDate()
          : new Date(coupon.endDate);

      if (expirationDate < new Date()) {
        logger.info('[validate-coupon] Coupon expired');
        return new Response(
          JSON.stringify({
            valid: false,
            error: 'Este cupón ha expirado',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Validate start date
    if (coupon.startDate) {
      const startDate =
        typeof coupon.startDate?.toDate === 'function'
          ? coupon.startDate.toDate()
          : new Date(coupon.startDate);

      if (startDate > new Date()) {
        logger.info('[validate-coupon] Coupon not yet valid');
        return new Response(
          JSON.stringify({
            valid: false,
            error: 'Este cupón aún no es válido',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Validate minimum purchase
    if (coupon.minPurchase && cartTotal < coupon.minPurchase) {
      logger.info('[validate-coupon] Cart total below minimum purchase', {
        cartTotal,
        minPurchase: coupon.minPurchase,
      });
      return new Response(
        JSON.stringify({
          valid: false,
          error: `Compra mínima de €${coupon.minPurchase.toFixed(2)} requerida`,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate usage limit
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      logger.info('[validate-coupon] Coupon usage limit reached');
      return new Response(
        JSON.stringify({
          valid: false,
          error: 'Este cupón ha alcanzado su límite de usos',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate user-specific coupons
    if (
      coupon.userSpecific &&
      Array.isArray(coupon.userSpecific) &&
      coupon.userSpecific.length > 0
    ) {
      if (!userId) {
        logger.info('[validate-coupon] User-specific coupon requires authentication');
        return new Response(
          JSON.stringify({
            valid: false,
            error: 'Este cupón requiere iniciar sesión',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Check if userId's email is in the allowed list
      const usersRef = adminDb.collection('users');
      const userDoc = await usersRef.doc(userId).get();
      const userEmail = userDoc.data()?.email;

      if (!userEmail || !coupon.userSpecific.includes(userEmail)) {
        logger.info('[validate-coupon] User not eligible for this coupon');
        return new Response(
          JSON.stringify({
            valid: false,
            error: 'Este cupón no está disponible para tu cuenta',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Validate user usage limit per user
    if (coupon.maxUsesPerUser && userId) {
      const couponUsageRef = adminDb.collection('coupon_usage');
      const userUsageQuery = await couponUsageRef
        .where('couponId', '==', couponDoc.id)
        .where('userId', '==', userId)
        .get();

      if (userUsageQuery.size >= coupon.maxUsesPerUser) {
        logger.info('[validate-coupon] User has reached usage limit for this coupon');
        return new Response(
          JSON.stringify({
            valid: false,
            error: 'Has alcanzado el límite de usos para este cupón',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Calculate discount
    let discountAmount = 0;
    let freeShipping = false;

    switch (coupon.type) {
      case 'percentage':
        discountAmount = (cartTotal * coupon.value) / 100;
        // Apply max discount if set
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
          discountAmount = coupon.maxDiscount;
        }
        break;

      case 'fixed':
        discountAmount = Math.min(coupon.value, cartTotal); // Don't discount more than cart total
        break;

      case 'free_shipping':
        freeShipping = true;
        discountAmount = 0; // Shipping will be handled separately in checkout
        break;

      default:
        logger.error('[validate-coupon] Unknown coupon type', { type: coupon.type });
        return new Response(
          JSON.stringify({
            valid: false,
            error: 'Tipo de cupón no válido',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
    }

    logger.info('[validate-coupon] Coupon validated successfully', {
      code,
      discountAmount,
      freeShipping,
    });

    // Return valid coupon with discount details
    return new Response(
      JSON.stringify({
        valid: true,
        coupon: {
          id: couponDoc.id,
          code: coupon.code,
          description: coupon.description,
          type: coupon.type,
          value: coupon.value,
          discountAmount,
          freeShipping,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error('[validate-coupon] Unexpected error', error);
    return new Response(
      JSON.stringify({
        error: 'Error al validar el cupón',
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
