import { beforeEach, describe, expect, it, vi } from 'vitest';
import { USERS } from '../helpers/auth-factory';

const mockAdminAuth = {
  verifySessionCookie: vi.fn(),
  verifyIdToken: vi.fn(),
};

vi.mock('../../src/lib/firebase-admin', () => ({
  getAdminAuth: () => mockAdminAuth,
}));

async function loadRequireAdminPage() {
  vi.resetModules();
  return import('../../src/lib/auth/requireAdminPage');
}

describe('requireAdminPage', () => {
  beforeEach(() => {
    mockAdminAuth.verifySessionCookie.mockReset();
    mockAdminAuth.verifyIdToken.mockReset();
    vi.stubEnv('ADMIN_EMAILS', '');
  });

  it('allows access when the token has admin claim', async () => {
    vi.stubEnv('ADMIN_EMAILS', '');
    mockAdminAuth.verifySessionCookie.mockResolvedValue({
      admin: true,
      email: USERS.ADMIN.email,
    });

    const { requireAdminPage } = await loadRequireAdminPage();
    const request = new Request('http://localhost:4321/admin/products');
    const url = new URL(request.url);

    const response = await requireAdminPage(request, url, 'session-cookie');

    expect(response).toBeNull();
  });

  it('allows access when the email is listed in ADMIN_EMAILS even without admin claim', async () => {
    vi.stubEnv('ADMIN_EMAILS', USERS.USER.email);
    mockAdminAuth.verifySessionCookie.mockResolvedValue({
      admin: false,
      email: USERS.USER.email,
    });

    const { requireAdminPage } = await loadRequireAdminPage();
    const request = new Request('http://localhost:4321/admin/products');
    const url = new URL(request.url);

    const response = await requireAdminPage(request, url, 'session-cookie');

    expect(response).toBeNull();
  });

  it('redirects to /account when the user is authenticated but not authorized as admin', async () => {
    vi.stubEnv('ADMIN_EMAILS', USERS.ADMIN.email);
    mockAdminAuth.verifySessionCookie.mockResolvedValue({
      admin: false,
      email: USERS.USER.email,
    });

    const { requireAdminPage } = await loadRequireAdminPage();
    const request = new Request('http://localhost:4321/admin/products');
    const url = new URL(request.url);

    const response = await requireAdminPage(request, url, 'session-cookie');

    expect(response?.status).toBe(302);
    expect(response?.headers.get('location')).toBe('http://localhost:4321/account');
  });
});
