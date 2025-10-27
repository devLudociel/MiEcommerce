// src/pages/api/get-wallet-balance.ts
import type { APIRoute } from 'astro';
import { getAdminDb } from '../../lib/firebase-admin';

export const GET: APIRoute = async ({ request }) => {
  console.log('[API get-wallet-balance] Request received');

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Firebase Admin DB
    let adminDb;
    try {
      adminDb = getAdminDb();
    } catch (adminInitError) {
      console.error('[API get-wallet-balance] Error initializing Firebase Admin:', adminInitError);
      return new Response(
        JSON.stringify({ error: 'Error del servidor' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get wallet document
    const walletRef = adminDb.collection('wallets').doc(userId);
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

    console.log('[API get-wallet-balance] Balance retrieved', { userId, balance });

    return new Response(
      JSON.stringify({ balance }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[API get-wallet-balance] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al obtener el saldo',
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
