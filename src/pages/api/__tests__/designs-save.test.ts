import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../designs/save';

const verifyIdTokenMock = vi.fn();
const addMock = vi.fn();

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

vi.mock('../../../lib/csrf', () => ({
  validateCSRF: vi.fn(() => ({ valid: true })),
  createCSRFErrorResponse: vi.fn(),
}));

vi.mock('../../../lib/firebase-admin', () => ({
  getAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
  }),
  getAdminDb: () => ({
    collection: () => ({
      add: addMock,
    }),
  }),
}));

vi.mock('../../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('API designs/save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdTokenMock.mockResolvedValue({ uid: 'user-123' });
    addMock.mockResolvedValue({ id: 'design-1' });
  });

  it('rechaza payload sin designData con 400', async () => {
    const req = new Request('http://local/api/designs/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({
        name: 'Diseño test',
        productId: 'p1',
        productName: 'Producto',
        categoryId: 'cat1',
      }),
    });

    const res = await POST({ request: req } as any);
    expect(res.status).toBe(400);
  });
});
