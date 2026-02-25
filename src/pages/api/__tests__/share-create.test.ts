import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../share/create';

const setMock = vi.fn();

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
  getAdminDb: () => ({
    collection: () => ({
      doc: () => ({
        set: setMock,
      }),
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

describe('API share/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no expone error.message interno en respuesta 500', async () => {
    setMock.mockRejectedValueOnce(new Error('SENSITIVE_INTERNAL_ERROR'));

    const req = new Request('http://local/api/share/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: 'p1',
        productName: 'Producto test',
        designData: { color: 'red' },
      }),
    });

    const res = await POST({ request: req } as any);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Error creating share link');
    expect(JSON.stringify(body)).not.toContain('SENSITIVE_INTERNAL_ERROR');
  });
});
