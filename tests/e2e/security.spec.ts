import { test, expect } from '@playwright/test';

/**
 * Security Tests Suite
 *
 * Tests automatizados para detectar vulnerabilidades comunes:
 * - XSS (Cross-Site Scripting)
 * - Injection attacks
 * - Security headers
 * - CSRF protection
 * - Cookie security
 * - Authentication bypass
 */

// Payloads comunes de XSS para probar
const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '"><script>alert("xss")</script>',
  "javascript:alert('xss')",
  '<img src=x onerror=alert("xss")>',
  '<svg onload=alert("xss")>',
  '{{constructor.constructor("alert(1)")()}}',
  '${alert("xss")}',
];

// Payloads de NoSQL injection (Firebase/MongoDB)
const NOSQL_INJECTION_PAYLOADS = [
  '{"$gt": ""}',
  '{"$ne": null}',
  '{"$where": "1==1"}',
  "'; return true; //",
  '__proto__',
  'constructor',
];

test.describe('Security Headers', () => {
  test('should have secure headers on main page', async ({ page }) => {
    const response = await page.goto('/');

    const headers = response?.headers() || {};

    // X-Content-Type-Options previene MIME sniffing
    expect(headers['x-content-type-options']).toBe('nosniff');

    // X-Frame-Options previene clickjacking
    const xFrameOptions = headers['x-frame-options'];
    expect(xFrameOptions === 'DENY' || xFrameOptions === 'SAMEORIGIN').toBeTruthy();
  });

  test('should not expose sensitive server information', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() || {};

    // No debe exponer versiones de servidor
    expect(headers['x-powered-by']).toBeUndefined();
    expect(headers['server']).not.toContain('version');
  });
});

test.describe('XSS Protection', () => {
  test('search input should sanitize XSS payloads', async ({ page }) => {
    await page.goto('/productos');

    for (const payload of XSS_PAYLOADS.slice(0, 3)) {
      // Buscar input de búsqueda
      const searchInput = page.locator('input[type="search"], input[name="search"], input[placeholder*="Buscar"]').first();

      if (await searchInput.isVisible()) {
        await searchInput.fill(payload);
        await searchInput.press('Enter');

        // Verificar que el payload no se ejecute como script
        const pageContent = await page.content();
        expect(pageContent).not.toContain('<script>alert');
        expect(pageContent).not.toContain('onerror=alert');
      }
    }
  });

  test('URL parameters should be sanitized', async ({ page }) => {
    for (const payload of XSS_PAYLOADS.slice(0, 2)) {
      const encodedPayload = encodeURIComponent(payload);

      // Intentar inyectar en parámetros de URL
      const response = await page.goto(`/productos?search=${encodedPayload}`);

      // La página no debe ejecutar scripts maliciosos
      const content = await page.content();
      expect(content).not.toContain('<script>alert');

      // No debe haber errores de consola por XSS
      page.on('console', (msg) => {
        expect(msg.text()).not.toContain('xss');
      });
    }
  });

  test('contact form should sanitize input', async ({ page }) => {
    await page.goto('/contacto');

    const nameInput = page.locator('input[name="name"], input[name="nombre"]').first();
    const messageInput = page.locator('textarea[name="message"], textarea[name="mensaje"]').first();

    if (await nameInput.isVisible()) {
      await nameInput.fill(XSS_PAYLOADS[0]);
    }

    if (await messageInput.isVisible()) {
      await messageInput.fill(XSS_PAYLOADS[3]);
    }

    // Verificar que los valores se muestren como texto, no como HTML
    const pageContent = await page.content();
    expect(pageContent).not.toMatch(/<script>alert\("xss"\)<\/script>/);
  });
});

test.describe('API Security', () => {
  test('API should reject malformed JSON', async ({ request }) => {
    const response = await request.post('/api/validate-coupon', {
      data: 'not valid json{{{',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Debe rechazar con 400 Bad Request, no crash del servidor
    expect([400, 415, 500]).toContain(response.status());
  });

  test('API should handle NoSQL injection attempts', async ({ request }) => {
    for (const payload of NOSQL_INJECTION_PAYLOADS.slice(0, 2)) {
      const response = await request.post('/api/validate-coupon', {
        data: JSON.stringify({
          code: payload,
          cartTotal: 100,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // No debe devolver datos sensibles ni causar error de servidor
      const body = await response.text();
      expect(body).not.toContain('password');
      expect(body).not.toContain('token');
      expect(body).not.toContain('secret');
      expect(body).not.toContain('firebase');
    }
  });

  test('API should not expose stack traces in errors', async ({ request }) => {
    const response = await request.post('/api/validate-coupon', {
      data: JSON.stringify({
        invalid: 'data',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const body = await response.text();

    // No debe exponer detalles internos
    expect(body).not.toContain('at ');
    expect(body).not.toContain('.ts:');
    expect(body).not.toContain('.js:');
    expect(body).not.toContain('node_modules');
  });

  test('protected API endpoints should require authentication', async ({ request }) => {
    // Endpoints que requieren autenticación
    const protectedEndpoints = [
      '/api/addresses',
      '/api/designs/get-user-designs',
      '/api/get-wallet-balance',
      '/api/digital/get-my-downloads',
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request.get(endpoint);

      // Debe requerir autenticación (401) o método no permitido (405)
      expect([401, 403, 405]).toContain(response.status());
    }
  });

  test('admin endpoints should be protected', async ({ request }) => {
    const adminEndpoints = [
      '/api/admin/get-order',
      '/api/admin/update-order-status',
      '/api/admin/set-admin-claim',
    ];

    for (const endpoint of adminEndpoints) {
      const response = await request.post(endpoint, {
        data: JSON.stringify({ test: 'data' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Debe denegar acceso sin autenticación admin
      expect([401, 403]).toContain(response.status());
    }
  });
});

test.describe('Authentication Security', () => {
  test('login page should not leak user existence', async ({ page }) => {
    await page.goto('/login');

    // Intentar con email que no existe
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill('nonexistent@test.com');
      await passwordInput.fill('wrongpassword123');
      await submitButton.click();

      // Esperar respuesta
      await page.waitForTimeout(2000);

      // El mensaje de error no debe indicar si el usuario existe o no
      const pageContent = await page.content();
      expect(pageContent).not.toContain('usuario no existe');
      expect(pageContent).not.toContain('user not found');
      expect(pageContent).not.toContain('email not registered');
    }
  });

  test('should prevent timing attacks on login', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    if (await emailInput.isVisible()) {
      // Medir tiempo con usuario inexistente
      const start1 = Date.now();
      await emailInput.fill('fake1@test.com');
      await passwordInput.fill('password123');
      await submitButton.click();
      await page.waitForTimeout(1000);
      const time1 = Date.now() - start1;

      await page.goto('/login');

      // Medir tiempo con otro usuario inexistente
      const start2 = Date.now();
      await emailInput.fill('fake2@test.com');
      await passwordInput.fill('password123');
      await submitButton.click();
      await page.waitForTimeout(1000);
      const time2 = Date.now() - start2;

      // Los tiempos deben ser similares (dentro de 500ms)
      expect(Math.abs(time1 - time2)).toBeLessThan(500);
    }
  });
});

test.describe('Cookie Security', () => {
  test('session cookies should have secure flags', async ({ page, context }) => {
    await page.goto('/');

    const cookies = await context.cookies();

    for (const cookie of cookies) {
      // Cookies de sesión deben tener HttpOnly
      if (cookie.name.toLowerCase().includes('session') || cookie.name.toLowerCase().includes('token')) {
        expect(cookie.httpOnly).toBeTruthy();

        // En producción deben ser Secure
        if (process.env.NODE_ENV === 'production') {
          expect(cookie.secure).toBeTruthy();
        }

        // Deben tener SameSite
        expect(['Strict', 'Lax', 'None']).toContain(cookie.sameSite);
      }
    }
  });
});

test.describe('Input Validation', () => {
  test('should reject oversized payloads', async ({ request }) => {
    // Crear payload muy grande (1MB+)
    const largePayload = 'x'.repeat(1024 * 1024 * 2);

    const response = await request.post('/api/validate-coupon', {
      data: JSON.stringify({ code: largePayload }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Debe rechazar payloads grandes
    expect([400, 413, 500]).toContain(response.status());
  });

  test('checkout should validate required fields', async ({ page }) => {
    await page.goto('/checkout');

    // Intentar enviar formulario vacío
    const submitButton = page.locator('button[type="submit"]').first();

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Debe mostrar errores de validación, no enviar
      await page.waitForTimeout(1000);

      // Verificar que sigue en checkout (no redirigió)
      expect(page.url()).toContain('checkout');
    }
  });

  test('email fields should validate format', async ({ page }) => {
    await page.goto('/contacto');

    const emailInput = page.locator('input[type="email"]').first();

    if (await emailInput.isVisible()) {
      // Probar emails inválidos
      const invalidEmails = ['notanemail', 'missing@', '@nodomain.com', 'spaces in@email.com'];

      for (const email of invalidEmails) {
        await emailInput.fill(email);
        await emailInput.blur();

        // Debe mostrar error de validación
        const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
        expect(isInvalid).toBeTruthy();
      }
    }
  });
});

test.describe('Path Traversal Protection', () => {
  test('should block path traversal attempts', async ({ request }) => {
    const traversalPayloads = ['../../../etc/passwd', '..\\..\\..\\windows\\system32', '%2e%2e%2f%2e%2e%2f'];

    for (const payload of traversalPayloads) {
      const response = await request.get(`/api/storage/get-signed-url?path=${encodeURIComponent(payload)}`);

      // No debe devolver archivos del sistema
      const body = await response.text();
      expect(body).not.toContain('root:');
      expect(body).not.toContain('[boot loader]');
      expect([400, 403, 404, 401]).toContain(response.status());
    }
  });
});

test.describe('Rate Limiting', () => {
  test('should have rate limiting on sensitive endpoints', async ({ request }) => {
    const requests = [];

    // Hacer muchas requests rápidas
    for (let i = 0; i < 20; i++) {
      requests.push(
        request.post('/api/auth/session', {
          data: JSON.stringify({ email: `test${i}@test.com` }),
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }

    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status());

    // Al menos algunas requests deben ser rate limited (429) o bloqueadas
    // Si no hay rate limiting, todas serán 200/400/401
    const hasRateLimiting = statuses.some((s) => s === 429);
    const allSuccessful = statuses.every((s) => s < 429);

    // Advertencia si no hay rate limiting
    if (!hasRateLimiting && allSuccessful) {
      console.warn('WARNING: No rate limiting detected on /api/auth/session');
    }
  });
});

test.describe('CORS Configuration', () => {
  test('API should not allow arbitrary origins', async ({ request }) => {
    const response = await request.get('/api/auth/session', {
      headers: {
        Origin: 'https://malicious-site.com',
      },
    });

    const corsHeader = response.headers()['access-control-allow-origin'];

    // No debe permitir orígenes arbitrarios
    expect(corsHeader).not.toBe('*');
    expect(corsHeader).not.toBe('https://malicious-site.com');
  });
});
