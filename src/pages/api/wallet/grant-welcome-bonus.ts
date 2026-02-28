import type { APIRoute } from 'astro';
import { getAdminAuth, getAdminDb } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const BONUS_AMOUNT = 5;
const MIN_PURCHASE = 50;

const payloadSchema = z.object({
  subscribe: z.boolean().optional(),
});

const logger = {
  info: (msg: string, data?: unknown) => console.log(`[INFO] ${msg}`, data ?? ''),
  warn: (msg: string, data?: unknown) => console.warn(`[WARN] ${msg}`, data ?? ''),
  error: (msg: string, error?: unknown) => console.error(`[ERROR] ${msg}`, error ?? ''),
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const idToken = authHeader.replace('Bearer ', '').trim();
    const decoded = await getAdminAuth().verifyIdToken(idToken);

    const uid = decoded.uid;
    const email = (decoded.email || '').toLowerCase().trim();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = payloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Payload inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subscribe = parsed.data.subscribe !== false;

    const db = getAdminDb();
    const bonusUserRef = db.collection('welcome_bonus_users').doc(uid);
    const bonusEmailRef = db.collection('welcome_bonus_emails').doc(email);
    const walletRef = db.collection('wallets').doc(uid);
    const txRef = db.collection('wallet_transactions').doc();

    let alreadyGranted = false;

    await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(bonusUserRef);
      const emailSnap = await transaction.get(bonusEmailRef);
      if (userSnap.exists || emailSnap.exists) {
        alreadyGranted = true;
        return;
      }

      const walletSnap = await transaction.get(walletRef);
      const walletData = (walletSnap.data() || {}) as Record<string, unknown>;
      const currentBalance = Number(walletData.balance || 0);
      const currentPromo = Number(walletData.promoBalance || 0);
      const currentTotalEarned = Number(walletData.totalEarned || 0);

      transaction.set(
        walletRef,
        {
          userId: uid,
          balance: Number((currentBalance + BONUS_AMOUNT).toFixed(2)),
          promoBalance: Number((currentPromo + BONUS_AMOUNT).toFixed(2)),
          promoMinPurchase: MIN_PURCHASE,
          totalEarned: Number((currentTotalEarned + BONUS_AMOUNT).toFixed(2)),
          updatedAt: FieldValue.serverTimestamp(),
          ...(walletSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        },
        { merge: true }
      );

      transaction.set(txRef, {
        userId: uid,
        type: 'credit',
        amount: BONUS_AMOUNT,
        description: `Bono de bienvenida (+€${BONUS_AMOUNT.toFixed(2)})`,
        createdAt: FieldValue.serverTimestamp(),
        meta: {
          source: 'welcome_bonus',
          minPurchase: MIN_PURCHASE,
        },
      });

      transaction.set(bonusUserRef, {
        userId: uid,
        email,
        amount: BONUS_AMOUNT,
        minPurchase: MIN_PURCHASE,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.set(bonusEmailRef, {
        userId: uid,
        email,
        amount: BONUS_AMOUNT,
        minPurchase: MIN_PURCHASE,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    if (alreadyGranted) {
      return new Response(
        JSON.stringify({
          granted: false,
          alreadyGranted: true,
          amount: BONUS_AMOUNT,
          minPurchase: MIN_PURCHASE,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (subscribe) {
      try {
        const subscribersRef = db.collection('newsletter_subscribers');
        const existingQuery = await subscribersRef.where('email', '==', email).limit(1).get();

        if (!existingQuery.empty) {
          const doc = existingQuery.docs[0];
          const data = doc.data() || {};
          if (data.status === 'unsubscribed') {
            await doc.ref.update({
              status: 'active',
              resubscribedAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
              source: data.source || 'registration',
            });
          }
        } else {
          await subscribersRef.add({
            email,
            status: 'active',
            source: 'registration',
            subscribedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            emailsSent: 0,
            emailsOpened: 0,
            emailsClicked: 0,
            lastEmailSentAt: null,
            preferences: {
              offers: true,
              newProducts: true,
              tips: true,
            },
          });
        }
      } catch (err) {
        logger.warn('[grant-welcome-bonus] Newsletter subscribe failed (non-critical)', err);
      }
    }

    return new Response(
      JSON.stringify({
        granted: true,
        amount: BONUS_AMOUNT,
        minPurchase: MIN_PURCHASE,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('[grant-welcome-bonus] Error', error);
    return new Response(JSON.stringify({ error: 'Error al otorgar bono' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
