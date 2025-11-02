// src/pages/api/get-wallet-balance.ts
import type { APIRoute } from 'astro';
import { getAdminAuth, getAdminDb } from '../../lib/firebase-admin';

export const GET: APIRoute = async ({ request }) => {
  console.log('[API get-wallet-balance] Request received');

  try {
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');

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
      console.error('[API get-wallet-balance] Invalid token:', verificationError);
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
      console.error('[API get-wallet-balance] Error initializing Firebase Admin:', adminInitError);
      return new Response(JSON.stringify({ error: 'Error del servidor' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get wallet document
    const walletRef = adminDb.collection('wallets').doc(requestedUserId);
    const walletDoc = await walletRef.get();

    let balance = 0;

    if (walletDoc.exists) {
      const data = walletDoc.data();
      balance = data?.balance || 0;
    } else {
      // Create wallet if doesn't exist
      await walletRef.set({
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log('[API get-wallet-balance] Balance retrieved', { userId: requestedUserId, balance });

    return new Response(JSON.stringify({ balance }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // SECURITY: No exponer detalles internos
    console.error('[API get-wallet-balance] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al obtener el saldo',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
