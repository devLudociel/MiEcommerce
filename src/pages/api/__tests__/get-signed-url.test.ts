import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../storage/get-signed-url';

const verifyIdTokenMock = vi.fn();
const getSignedUrlMock = vi.fn();

vi.mock('../../../lib/rate-limiter', () => ({
  checkRateLimit: vi.fn(async () => ({
    allowed: true,
    remaining: 59,
    limit: 60,
    resetAt: Date.now() + 60_000,
  })),
  createRateLimitResponse: vi.fn(
    () => new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
  ),
  RATE_LIMIT_CONFIGS: {
    STANDARD: { windowMs: 60_000, maxRequests: 60 },
  },
}));

vi.mock('../../../lib/firebase-admin', () => ({
  getAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
  }),
}));

vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({
    bucket: () => ({
      file: () => ({
        getSignedUrl: getSignedUrlMock,
      }),
    }),
  }),
}));

describe('API get-signed-url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 401 cuando verifyIdToken falla por token inválido', async () => {
    verifyIdTokenMock.mockRejectedValueOnce({ code: 'auth/id-token-expired' });

    const req = new Request('http://local/api/storage/get-signed-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid-token',
      },
      body: JSON.stringify({ path: 'users/uid/files/test.png' }),
    });

    const res = await POST({ request: req } as any);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Token inválido o expirado');
  });
});
