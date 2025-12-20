// src/pages/api/admin/set-admin-claim.ts
// Endpoint to set admin custom claim for authorized users

import type { APIRoute } from 'astro';
import { getAdminAuth } from '../../../lib/firebase-admin';

// Admin emails from environment
const ADMIN_EMAILS = (process.env.PUBLIC_ADMIN_EMAILS || import.meta.env.PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map((s: string) => s.trim().toLowerCase())
  .filter(Boolean);

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Get admin auth instance
    const adminAuth = getAdminAuth();

    // Verify the token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userEmail = decodedToken.email?.toLowerCase();

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'User email not found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is in admin list
    if (!ADMIN_EMAILS.includes(userEmail)) {
      return new Response(
        JSON.stringify({ error: 'User is not authorized as admin' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if already has admin claim
    if (decodedToken.admin === true) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'User already has admin claim',
          email: userEmail
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Set the admin custom claim
    await adminAuth.setCustomUserClaims(decodedToken.uid, {
      ...decodedToken,
      admin: true
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin claim set successfully. Please log out and log back in.',
        email: userEmail
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[set-admin-claim] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
