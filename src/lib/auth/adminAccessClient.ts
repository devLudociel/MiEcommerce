import { getIdTokenResult, type User } from 'firebase/auth';
import { logger } from '../logger';

const ADMIN_CLAIM_ENDPOINT = '/api/admin/set-admin-claim';
const CLAIM_REFRESH_ATTEMPTS = 3;
const CLAIM_REFRESH_DELAY_MS = 300;
const PUBLIC_ADMIN_EMAILS = (import.meta.env.PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

function hasAdminEmail(email?: string | null): boolean {
  const normalizedEmail = email?.toLowerCase();
  return !!normalizedEmail && PUBLIC_ADMIN_EMAILS.includes(normalizedEmail);
}

async function requestAdminClaimBootstrap(token: string): Promise<boolean> {
  try {
    const response = await fetch(ADMIN_CLAIM_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    logger.warn('[adminAccessClient] Could not bootstrap admin claim', error);
    return false;
  }
}

async function waitForAdminClaim(user: User) {
  let latestToken = '';

  for (let attempt = 0; attempt < CLAIM_REFRESH_ATTEMPTS; attempt += 1) {
    const tokenResult = await getIdTokenResult(user, true);
    latestToken = tokenResult.token;

    if (tokenResult.claims?.admin) {
      return {
        isAdmin: true,
        token: tokenResult.token,
      };
    }

    if (attempt < CLAIM_REFRESH_ATTEMPTS - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, CLAIM_REFRESH_DELAY_MS));
    }
  }

  return {
    isAdmin: hasAdminEmail(user.email),
    token: latestToken || null,
  };
}

export async function resolveAdminAccess(user: User): Promise<{
  isAdmin: boolean;
  token: string | null;
}> {
  const initialTokenResult = await getIdTokenResult(user, true);

  if (initialTokenResult.claims?.admin) {
    return {
      isAdmin: true,
      token: initialTokenResult.token,
    };
  }

  const bootstrapSucceeded = await requestAdminClaimBootstrap(initialTokenResult.token);
  if (!bootstrapSucceeded) {
    return {
      isAdmin: hasAdminEmail(user.email),
      token: initialTokenResult.token,
    };
  }

  return waitForAdminClaim(user);
}
