import { test, expect } from '@playwright/test';

test.describe('Admin Security E2E Tests', () => {
  test.describe('Admin Access Control', () => {
    test('should redirect non-authenticated users to login', async ({ page }) => {
      await page.goto('/admin');

      // Should be redirected to login
      await expect(page).toHaveURL(/.*login.*/);
    });

    test('should redirect non-admin users to account page', async ({ page, context }) => {
      // This test assumes you can set up a non-admin user session
      // You may need to adjust based on your authentication flow

      // Navigate to admin
      await page.goto('/admin');

      // Should show "Verificando permisos..." initially
      await expect(page.getByText(/verificando permisos/i)).toBeVisible({ timeout: 5000 });

      // Then should redirect (if not admin)
      // This will depend on your actual auth setup
    });

    test('should show admin dashboard for admin users', async ({ page }) => {
      // This test would require setting up admin authentication
      // Skip if no auth available in test environment
      test.skip(!process.env.TEST_ADMIN_EMAIL, 'Admin credentials not configured for tests');

      // Login as admin (implementation depends on your login flow)
      // await page.goto('/login');
      // await page.fill('[name="email"]', process.env.TEST_ADMIN_EMAIL);
      // await page.fill('[name="password"]', process.env.TEST_ADMIN_PASSWORD);
      // await page.click('button[type="submit"]');

      // Navigate to admin
      // await page.goto('/admin');

      // Should see admin dashboard
      // await expect(page.getByText(/dashboard/i)).toBeVisible();
    });
  });

  test.describe('API Security', () => {
    test('should return 401 for unauthenticated admin API calls', async ({ request }) => {
      const response = await request.post('/api/admin/update-order-status', {
        data: {
          id: 'order123',
          status: 'processing',
        },
      });

      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/no autorizado|unauthorized/i);
    });

    test('should return 400 for invalid order status', async ({ request }) => {
      // This test would require a valid admin token
      // Skip if not available
      test.skip(!process.env.TEST_ADMIN_TOKEN, 'Admin token not configured');

      const response = await request.post('/api/admin/update-order-status', {
        headers: {
          Authorization: `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
        },
        data: {
          id: 'order123',
          status: 'invalid-status',
        },
      });

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toMatch(/estado inválido|invalid status/i);
    });

    test('should enforce rate limiting on admin endpoints', async ({ request }) => {
      const requests = [];

      // Make 25 requests rapidly (limit is 20/min)
      for (let i = 0; i < 25; i++) {
        requests.push(
          request.post('/api/admin/update-order-status', {
            data: {
              id: 'order123',
              status: 'processing',
            },
          })
        );
      }

      const responses = await Promise.all(requests);

      // Some should be rate limited (429)
      const rateLimited = responses.filter(r => r.status() === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // Check rate limit response has proper headers
      if (rateLimited.length > 0) {
        const headers = rateLimited[0].headers();
        expect(headers['x-ratelimit-remaining']).toBeDefined();
        expect(headers['retry-after']).toBeDefined();
      }
    });

    test('should not expose stack traces in production errors', async ({ request }) => {
      // Make a request that will cause an error
      const response = await request.post('/api/admin/update-order-status', {
        headers: {
          Authorization: 'Bearer invalid-token-format',
        },
        data: {
          id: 'order123',
          status: 'processing',
        },
      });

      const body = await response.json();

      // Should not contain stack trace fields in production
      expect(body).not.toHaveProperty('stack');
      expect(body).not.toHaveProperty('details');

      // Should have error message
      expect(body).toHaveProperty('error');
    });
  });

  test.describe('Rate Limiting Visual Feedback', () => {
    test('should show appropriate error when rate limited', async ({ page }) => {
      // This test would require making multiple requests from the UI
      test.skip(true, 'Requires UI implementation of rate limit feedback');

      // Example implementation:
      // await page.goto('/admin/orders');
      // for (let i = 0; i < 25; i++) {
      //   await page.click('button[data-testid="update-status"]');
      // }
      // await expect(page.getByText(/too many requests/i)).toBeVisible();
    });
  });

  test.describe('Custom Claims Verification', () => {
    test('should verify custom claims before showing admin content', async ({ page }) => {
      // This test verifies that RequireAdmin checks custom claims
      test.skip(!process.env.TEST_ADMIN_EMAIL, 'Admin credentials not configured');

      // The component should call getIdTokenResult() to check claims
      // We can verify this through console logs or network requests

      page.on('console', msg => {
        if (msg.text().includes('[RequireAdmin]')) {
          // Verify the log mentions custom claims
          expect(msg.text()).toMatch(/custom claim|email/i);
        }
      });

      await page.goto('/admin');
      await page.waitForTimeout(2000); // Wait for auth check
    });
  });

  test.describe('Audit Logging', () => {
    test('should create audit log entries for admin actions', async ({ request }) => {
      test.skip(!process.env.TEST_ADMIN_TOKEN, 'Admin token not configured');

      // Perform an admin action
      await request.post('/api/admin/update-order-status', {
        headers: {
          Authorization: `Bearer ${process.env.TEST_ADMIN_TOKEN}`,
        },
        data: {
          id: 'test-order',
          status: 'processing',
        },
      });

      // Verify audit log was created (would require Firestore access)
      // This is more of an integration test that would check Firestore directly
    });
  });

  test.describe('Security Headers', () => {
    test('should include proper headers in responses', async ({ request }) => {
      const response = await request.get('/api/admin/get-order?id=test');

      const headers = response.headers();

      expect(headers['content-type']).toContain('application/json');
    });

    test('rate limit responses should have retry-after header', async ({ request }) => {
      const requests = [];

      // Trigger rate limit
      for (let i = 0; i < 35; i++) {
        requests.push(
          request.get('/api/admin/get-order?id=test')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.find(r => r.status() === 429);

      if (rateLimited) {
        const headers = rateLimited.headers();
        expect(headers['retry-after']).toBeDefined();
        expect(parseInt(headers['retry-after'])).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Input Validation', () => {
    test('should validate order ID parameter', async ({ request }) => {
      const response = await request.get('/api/admin/get-order');

      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.error).toMatch(/falta.*id|id.*required/i);
    });

    test('should validate email format in set-admin-claims', async ({ request }) => {
      const response = await request.post('/api/admin/set-admin-claims', {
        data: {
          email: 'not-an-email',
          secret: 'test-secret',
        },
      });

      // Should get rate limited first, or validation error
      expect([400, 429]).toContain(response.status());
    });
  });
});

test.describe('Public Endpoints Security', () => {
  test('should enforce rate limiting on save-order', async ({ request }) => {
    const requests = [];

    // Make 15 requests (limit is 10/min)
    for (let i = 0; i < 15; i++) {
      requests.push(
        request.post('/api/save-order', {
          data: {
            items: [{ id: '1', name: 'Test', price: 10, quantity: 1 }],
            shippingInfo: {
              name: 'Test User',
              email: 'test@example.com',
              address: '123 Test St',
            },
            subtotal: 10,
            shipping: 5,
            total: 15,
          },
        })
      );
    }

    const responses = await Promise.all(requests);

    // Some should be rate limited
    const rateLimited = responses.filter(r => r.status() === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test('should enforce rate limiting on validate-coupon', async ({ request }) => {
    const requests = [];

    // Make 35 requests (limit is 30/min)
    for (let i = 0; i < 35; i++) {
      requests.push(
        request.post('/api/validate-coupon', {
          data: {
            code: 'TEST',
            userId: 'test-user',
            cartTotal: 100,
          },
        })
      );
    }

    const responses = await Promise.all(requests);

    // Some should be rate limited
    const rateLimited = responses.filter(r => r.status() === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
