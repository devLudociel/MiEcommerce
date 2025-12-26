import { test, expect, type Page } from '@playwright/test';

const fillShippingForm = async (page: Page) => {
  await page.getByPlaceholder('Tu nombre').fill('Juan');
  await page.getByPlaceholder('Tus apellidos').fill('Perez');
  await page.getByPlaceholder('tu@email.com').fill('ok@example.com');
  await page.getByPlaceholder('+34 600 000 000').fill('612345678');
  await page.getByPlaceholder('Calle, número, piso...').fill('Calle 123');
  await page.getByPlaceholder('28001').fill('35001');
  await page.getByPlaceholder('Madrid').fill('Las Palmas');
  await page.getByRole('combobox', { name: /Provincia/i }).selectOption('Las Palmas');
  await expect(page.getByText('Envío Estándar')).toBeVisible();
};

test.describe('Checkout flow', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    // Pre-cargar carrito en localStorage
    await page.addInitScript(
      (cart) => {
        localStorage.setItem('cart', JSON.stringify(cart));
        localStorage.setItem('cart:guest', JSON.stringify(cart));
      },
      {
        items: [{ id: 'p1', name: 'Prod 1', price: 10, quantity: 2, image: 'x.jpg' }],
        total: 20,
      }
    );

    // Interceptar servicios externos para evitar red real
    await page.route('**/api.zippopotam.us/**', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ state: 'Madrid', places: [{ 'place name': 'Madrid' }] }),
      })
    );
    await page.route('**/api.geoapify.com/**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ features: [] }) })
    );

    // Abrir checkout directamente
    await page.goto(baseURL + '/checkout');
  });

  test('Paso 1 -> Paso 2 con datos válidos', async ({ page }) => {
    await fillShippingForm(page);
    await expect(page.getByText(/Método de Pago|Metodo de Pago/i)).toBeVisible();
  });

  test('Aplicar cupón y ver descuento', async ({ page }) => {
    // Preparar interceptación del endpoint de cupón
    await page.route('**/api/validate-coupon', async (route) => {
      const req = route.request();
      const body = JSON.parse(req.postData() || '{}');
      if (body.code === 'PERC10') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: true,
            coupon: {
              id: 'c1',
              code: 'PERC10',
              description: '10% Descuento',
              type: 'percentage',
              value: 10,
              discountAmount: 2,
              freeShipping: false,
            },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: false, error: 'No válido' }),
      });
    });

    // Rellenar mínimos necesarios de paso 1 (para que se renderice el bloque del cupón)
    await fillShippingForm(page);

    // Aplicar cupón
    await page.getByPlaceholder('Código de cupón').fill('PERC10');
    await page.getByRole('button', { name: 'Aplicar' }).click();

    // Ver etiqueta de cupón aplicado y línea de descuento
    await expect(page.getByText(/Cupón: PERC10/i)).toBeVisible();
    await expect(page.getByText(/Descuento cupón/i)).toBeVisible();
  });

  test('Eliminar cupón aplicado', async ({ page }) => {
    await page.route('**/api/validate-coupon', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      if (body.code === 'PERC10') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: true,
            coupon: {
              id: 'c1',
              code: 'PERC10',
              description: '10% Descuento',
              type: 'percentage',
              value: 10,
              discountAmount: 2,
              freeShipping: false,
            },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: false }),
      });
    });

    // Completar mínimos del paso 1
    await fillShippingForm(page);

    // Aplicar y luego eliminar
    await page.getByPlaceholder('Código de cupón').fill('PERC10');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByText(/Cupón: PERC10/i)).toBeVisible();
    await page.getByRole('button', { name: '✕' }).click();
    await expect(page.getByText(/Cupón: PERC10/i)).toHaveCount(0);
  });

  test('Cambiar método de envío a Express actualiza coste', async ({ page }) => {
    // Completar mínimos del paso 1
    await fillShippingForm(page);

    // Cambiar a Express
    await page.getByText('Envío Express').click();

    // Ahora debería mostrar 4.95 en la fila de Envío
    await expect(page.getByText('9.99 €').first()).toBeVisible();
  });

  test('Cupón de envío gratis muestra GRATIS (Cupón)', async ({ page }) => {
    await page.route('**/api/validate-coupon', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      if (body.code === 'FREESHIP') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            valid: true,
            coupon: {
              id: 'c2',
              code: 'FREESHIP',
              description: 'Envío gratis',
              type: 'free_shipping',
              value: 0,
              discountAmount: 0,
              freeShipping: true,
            },
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: false }),
      });
    });

    // Completar mínimos del paso 1
    await fillShippingForm(page);

    await page.getByPlaceholder('Código de cupón').fill('FREESHIP');
    await page.getByRole('button', { name: 'Aplicar' }).click();

    await expect(page.getByText('GRATIS')).toBeVisible();
  });

  test('Realizar pedido con éxito', async ({ page }) => {
    // Interceptar save-order y send-email
    let saveCalled = false;
    await page.route('**/api/save-order', async (route) => {
      saveCalled = true;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, orderId: 'o123' }),
      });
    });
    await page.route('**/api/send-email', async (route) => route.fulfill({ status: 200 }));

    // Paso 1
    await fillShippingForm(page);

    // Seleccionar transferencia para evitar Stripe Elements en e2e
    await page.getByRole('radio', { name: /Transferencia Bancaria/i }).click();

    // Aceptar términos y Realizar pedido
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /Realizar Pedido/i }).click();

    // Confirmó envío al backend
    await expect.poll(() => saveCalled).toBe(true);

    // Redirige a confirmación o a home si carrito queda vacío antes del redirect con timeout
    await Promise.race([page.waitForURL('**/confirmacion?orderId=o123'), page.waitForURL('**/')]);
  });
});
