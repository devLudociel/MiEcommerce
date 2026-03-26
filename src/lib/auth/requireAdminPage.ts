import { getAdminAuth } from '../firebase-admin';

const AUTH_COOKIE_NAME = 'auth_token';
const ADMIN_EMAILS = (import.meta.env.ADMIN_EMAILS || '')
  .split(',')
  .map((value: string) => value.trim().toLowerCase())
  .filter(Boolean);

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.replace('Bearer ', '').trim();
}

function getCookieToken(cookieValue?: string | null): string | null {
  if (!cookieValue) return null;
  try {
    return decodeURIComponent(cookieValue);
  } catch {
    return cookieValue;
  }
}

async function verifyAdminToken(token: string): Promise<{ admin?: boolean; email?: string } | null> {
  const adminAuth = getAdminAuth();
  try {
    return await adminAuth.verifySessionCookie(token, true);
  } catch {
    try {
      return await adminAuth.verifyIdToken(token);
    } catch {
      return null;
    }
  }
}

function hasAdminAccess(decodedToken: { admin?: boolean; email?: string } | null): boolean {
  if (!decodedToken) return false;
  if (decodedToken.admin) return true;

  const email = decodedToken.email?.toLowerCase();
  return !!email && ADMIN_EMAILS.includes(email);
}

function redirectToLogin(url: URL): Response {
  const redirectUrl = new URL('/login', url.origin);
  redirectUrl.searchParams.set('redirect', `${url.pathname}${url.search}`);
  return Response.redirect(redirectUrl, 302);
}

function redirectToAccount(url: URL): Response {
  return Response.redirect(new URL('/account', url.origin), 302);
}

export async function requireAdminPage(
  request: Request,
  url: URL,
  cookieValue?: string | null
): Promise<Response | null> {
  const token = getBearerToken(request) || getCookieToken(cookieValue);
  if (!token) {
    return redirectToLogin(url);
  }

  try {
    const decodedToken = await verifyAdminToken(token);
    if (!hasAdminAccess(decodedToken)) {
      return redirectToAccount(url);
    }
    return null;
  } catch {
    return redirectToLogin(url);
  }
}

export { AUTH_COOKIE_NAME };
