/**
 * Authentication factory for security tests
 * Provides predefined tokens and user profiles for testing auth flows
 */

export const TOKENS = {
  /** Valid token for regular authenticated user */
  VALID_USER: 'valid-user-token-abcdef1234567890',
  /** Valid token for admin user */
  VALID_ADMIN: 'valid-admin-token-abcdef1234567890',
  /** Valid token for a different user (used in IDOR tests) */
  OTHER_USER: 'other-user-token-abcdef1234567890',
  /** Expired token */
  EXPIRED: 'expired-token-abcdef1234567890',
  /** Malformed / not a real token */
  MALFORMED: 'not-a-jwt-at-all',
  /** Empty string token */
  EMPTY: '',
} as const;

export const USERS = {
  USER: {
    uid: 'user-123',
    email: 'user@test.com',
    admin: false,
  },
  ADMIN: {
    uid: 'admin-456',
    email: 'admin@test.com',
    admin: true,
  },
  OTHER: {
    uid: 'user-999',
    email: 'other@test.com',
    admin: false,
  },
} as const;

/**
 * Token to user mapping for mock auth verification
 */
export const TOKEN_MAP: Record<string, { uid: string; email: string; admin: boolean }> = {
  [TOKENS.VALID_USER]: USERS.USER,
  [TOKENS.VALID_ADMIN]: USERS.ADMIN,
  [TOKENS.OTHER_USER]: USERS.OTHER,
};

/**
 * Tokens that should cause auth failure
 */
export const INVALID_TOKENS = [TOKENS.EXPIRED, TOKENS.MALFORMED, TOKENS.EMPTY] as const;

/**
 * Create a mock verifyAuthToken function that uses the token map
 */
export function createMockVerifyAuthToken() {
  return async (request: Request) => {
    const authHeader =
      request.headers.get('authorization') || request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: new Response(JSON.stringify({ error: 'Autenticación requerida' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      };
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!token || token === TOKENS.EMPTY) {
      return {
        success: false,
        error: new Response(JSON.stringify({ error: 'Autenticación requerida' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      };
    }

    const user = TOKEN_MAP[token];
    if (!user) {
      return {
        success: false,
        error: new Response(JSON.stringify({ error: 'Token inválido o expirado' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      };
    }

    return {
      success: true,
      uid: user.uid,
      email: user.email,
      isAdmin: user.admin,
    };
  };
}

/**
 * Create a mock verifyAdminAuth function
 */
export function createMockVerifyAdminAuth() {
  const verifyAuthToken = createMockVerifyAuthToken();

  return async (request: Request) => {
    const authResult = await verifyAuthToken(request);

    if (!authResult.success) {
      return authResult;
    }

    if (!authResult.isAdmin) {
      return {
        success: false,
        error: new Response(
          JSON.stringify({ error: 'Acceso denegado - Requiere permisos de administrador' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }

    return authResult;
  };
}
