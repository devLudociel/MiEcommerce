import { test, expect } from '@playwright/test';

test.describe('Checkout flow', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    // Pre-cargar carrito en localStorage
    await page.addInitScript((cart) => {
      localStorage.setItem('cart', JSON.stringify(cart));
    }, {
      items: [
        { id: 'p1', name: 'Prod 1', price: 10, quantity: 2, image: 'x.jpg' },
      ],
      total: 20,
    });

    // Interceptar servicios externos para evitar red real
    await page.route('**/api.zippopotam.us/**', (route) => route.fulfill({ status: 200, body: JSON.stringify({ state: 'Madrid', places: [{ 'place name': 'Madrid' }] }) }));
    await page.route('**/api.geoapify.com/**', (route) => route.fulfill({ status: 200, body: JSON.stringify({ features: [] }) }));

    // Abrir checkout directamente
    await page.goto(baseURL + '/checkout');
  });

  test('Paso 1 -> Paso 2 con datos válidos', async ({ page }) => {
    // Completar formulario de envío
    await page.getByPlaceholder('Juan').fill('Juan');
    await page.getByPlaceholder('García').fill('Perez');
    await page.getByPlaceholder('tu@email.com').fill('ok@example.com');
    await page.getByPlaceholder('612 345 678').fill('612345678');
    await page.getByPlaceholder('Calle Principal, 123, Piso 2').fill('Calle 123');
    const madridInputs = page.getByPlaceholder('Madrid');
    await madridInputs.nth(0).fill('Madrid'); // ciudad
    await madridInputs.nth(1).fill('Madrid'); // provincia
    await page.getByPlaceholder('28001').fill('28001');

    await page.getByRole('button', { name: /Continuar al Pago/i }).click();

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
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: false, error: 'No válido' }) });
    });

    // Rellenar mínimos necesarios de paso 1 (para que se renderice el bloque del cupón)
    await page.getByPlaceholder('Juan').fill('Juan');
    await page.getByPlaceholder('García').fill('Perez');
    await page.getByPlaceholder('tu@email.com').fill('ok@example.com');
    await page.getByPlaceholder('612 345 678').fill('612345678');
    await page.getByPlaceholder('Calle Principal, 123, Piso 2').fill('Calle 123');
    const madridInputs = page.getByPlaceholder('Madrid');
    await madridInputs.nth(0).fill('Madrid');
    await madridInputs.nth(1).fill('Madrid');
    await page.getByPlaceholder('28001').fill('28001');

    // Aplicar cupón
    await page.getByPlaceholder('CODIGO-DESCUENTO').fill('PERC10');
    await page.getByRole('button', { name: 'Aplicar' }).click();

    // Ver etiqueta de cupón aplicado y línea de descuento
    await expect(page.getByText(/Cupón aplicado/i)).toBeVisible();
    await expect(page.getByText(/Descuento \(PERC10\)/)).toBeVisible();
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
              id: 'c1', code: 'PERC10', description: '10% Descuento', type: 'percentage', value: 10, discountAmount: 2, freeShipping: false,
            },
          }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: false }) });
    });

    // Completar mínimos del paso 1
    await page.getByPlaceholder('Juan').fill('Juan');
    await page.getByPlaceholder('García').fill('Perez');
    await page.getByPlaceholder('tu@email.com').fill('ok@example.com');
    await page.getByPlaceholder('612 345 678').fill('612345678');
    await page.getByPlaceholder('Calle Principal, 123, Piso 2').fill('Calle 123');
    await page.getByPlaceholder('Madrid').nth(0).fill('Madrid');
    await page.getByPlaceholder('Madrid').nth(1).fill('Madrid');
    await page.getByPlaceholder('28001').fill('28001');

    // Aplicar y luego eliminar
    await page.getByPlaceholder('CODIGO-DESCUENTO').fill('PERC10');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByText(/Cupón aplicado/i)).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText(/Cupón aplicado/i)).toHaveCount(0);
  });

  test('Cambiar método de envío a Express actualiza coste', async ({ page }) => {
    // Completar mínimos del paso 1
    await page.getByPlaceholder('Juan').fill('Juan');
    await page.getByPlaceholder('García').fill('Perez');
    await page.getByPlaceholder('tu@email.com').fill('ok@example.com');
    await page.getByPlaceholder('612 345 678').fill('612345678');
    await page.getByPlaceholder('Calle Principal, 123, Piso 2').fill('Calle 123');
    await page.getByPlaceholder('Madrid').nth(0).fill('Madrid');
    await page.getByPlaceholder('Madrid').nth(1).fill('Madrid');
    await page.getByPlaceholder('28001').fill('28001');

    // Cambiar a Express
    await page.getByText('Express').click();

    // Ahora debería mostrar 4.95 en la fila de Envío
    await expect(page.getByText('€4.95').first()).toBeVisible();
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
              id: 'c2', code: 'FREESHIP', description: 'Envío gratis', type: 'free_shipping', value: 0, discountAmount: 0, freeShipping: true,
            },
          }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: false }) });
    });

    // Completar mínimos del paso 1
    await page.getByPlaceholder('Juan').fill('Juan');
    await page.getByPlaceholder('García').fill('Perez');
    await page.getByPlaceholder('tu@email.com').fill('ok@example.com');
    await page.getByPlaceholder('612 345 678').fill('612345678');
    await page.getByPlaceholder('Calle Principal, 123, Piso 2').fill('Calle 123');
    await page.getByPlaceholder('Madrid').nth(0).fill('Madrid');
    await page.getByPlaceholder('Madrid').nth(1).fill('Madrid');
    await page.getByPlaceholder('28001').fill('28001');

    await page.getByPlaceholder('CODIGO-DESCUENTO').fill('FREESHIP');
    await page.getByRole('button', { name: 'Aplicar' }).click();

    await expect(page.getByText('(Cupón)')).toBeVisible();
  });

  test('Realizar pedido con éxito', async ({ page }) => {
    // Interceptar save-order y send-email
    let saveCalled = false;
    await page.route('**/api/save-order', async (route) => {
      saveCalled = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, orderId: 'o123' }) });
    });
    await page.route('**/api/send-email', async (route) => route.fulfill({ status: 200 }));

    // Paso 1
    await page.getByPlaceholder('Juan').fill('Juan');
    await page.getByPlaceholder('García').fill('Perez');
    await page.getByPlaceholder('tu@email.com').fill('ok@example.com');
    await page.getByPlaceholder('612 345 678').fill('612345678');
    await page.getByPlaceholder('Calle Principal, 123, Piso 2').fill('Calle 123');
    await page.getByPlaceholder('Madrid').nth(0).fill('Madrid');
    await page.getByPlaceholder('Madrid').nth(1).fill('Madrid');
    await page.getByPlaceholder('28001').fill('28001');
    await page.getByRole('button', { name: /Continuar al Pago/i }).click();

    // Paso 2: tarjeta
    await page.getByPlaceholder('1234 5678 9012 3456').fill('4242 4242 4242 4242');
    await page.getByPlaceholder('JUAN GARCIA').fill('JUAN GARCIA');
    await page.getByPlaceholder('MM/AA').fill('12/99');
    await page.getByPlaceholder('123', { exact: true }).fill('123');
    await page.getByRole('button', { name: /Revisar Pedido/i }).click();

    // Paso 3: aceptar términos y Realizar pedido
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /Realizar Pedido/i }).click();

    // Confirmó envío al backend
    await expect.poll(() => saveCalled).toBe(true);

    // Redirige a confirmación o a home si carrito queda vacío antes del redirect con timeout
    await Promise.race([
      page.waitForURL('**/confirmacion?orderId=o123'),
      page.waitForURL('**/'),
    ]);
  });
});
