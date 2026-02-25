// src/pages/api/admin/set-admin-claim.ts
// Endpoint to set admin custom claim for authorized users

import type { APIRoute } from 'astro';
import { getAdminAuth } from '../../../lib/firebase-admin';
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../../lib/rate-limiter';

// SECURITY FIX HIGH-001: Use private ADMIN_EMAILS (not PUBLIC_)
const ADMIN_EMAILS = (import.meta.env.ADMIN_EMAILS || '')
  .split(',')
  .map((s: string) => s.trim().toLowerCase())
  .filter(Boolean);

export const POST: APIRoute = async ({ request }) => {
  // SECURITY FIX HIGH-004: Add rate limiting
  const rateLimitResult = await checkRateLimit(request, RATE_LIMIT_CONFIGS.VERY_STRICT, 'set-admin-claim');
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Get admin auth instance
    const adminAuth = getAdminAuth();

    // Verify the token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userEmail = decodedToken.email?.toLowerCase();

    if (!userEmail) {
      return new Response(JSON.stringify({ error: 'User email not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user is in admin list
    if (!ADMIN_EMAILS.includes(userEmail)) {
      return new Response(JSON.stringify({ error: 'User is not authorized as admin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if already has admin claim
    if (decodedToken.admin === true) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'User already has admin claim',
          email: userEmail,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY FIX HIGH-006: Only set necessary claims, not the entire token
    await adminAuth.setCustomUserClaims(decodedToken.uid, {
      admin: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Admin claim set successfully. Please log out and log back in.',
        email: userEmail,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[set-admin-claim] Error:', error);
    // SECURITY FIX HIGH-002: Don't expose error details in production
    return new Response(
      JSON.stringify({
        error: 'Error processing request',
        details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
