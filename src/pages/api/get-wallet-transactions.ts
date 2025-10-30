// src/pages/api/get-wallet-transactions.ts
import type { APIRoute } from 'astro';
import { getAdminAuth, getAdminDb } from '../../lib/firebase-admin';

export const GET: APIRoute = async ({ request }) => {
  console.log('[API get-wallet-transactions] Request received');

  try {
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const idToken = authHeader.replace('Bearer ', '').trim();

    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(idToken);
    } catch (verificationError) {
      console.error('[API get-wallet-transactions] Invalid token:', verificationError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const requestedUserId = userIdParam || decodedToken.uid;

    if (requestedUserId !== decodedToken.uid && !decodedToken.admin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get Firebase Admin DB
    let adminDb;
    try {
      adminDb = getAdminDb();
    } catch (adminInitError) {
      console.error(
        '[API get-wallet-transactions] Error initializing Firebase Admin:',
        adminInitError
      );
      return new Response(JSON.stringify({ error: 'Error del servidor' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get transactions from wallet_transactions collection
    const transactionsRef = adminDb
      .collection('wallet_transactions')
      .where('userId', '==', requestedUserId)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    const snapshot = await transactionsRef.get();

    const transactions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        amount: data.amount,
        description: data.description,
        orderId: data.orderId,
        createdAt:
          typeof data.createdAt?.toDate === 'function'
            ? data.createdAt.toDate().toISOString()
            : new Date(data.createdAt).toISOString(),
      };
    });

    console.log('[API get-wallet-transactions] Transactions retrieved', {
      userId: requestedUserId,
      count: transactions.length,
    });

    return new Response(JSON.stringify({ transactions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API get-wallet-transactions] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al obtener las transacciones',
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
