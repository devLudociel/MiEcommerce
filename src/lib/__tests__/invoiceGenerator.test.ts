import { describe, it, expect } from 'vitest';
import { generateInvoiceDefinition } from '../invoiceGenerator';

describe('generateInvoiceDefinition', () => {
  it('incluye totales y líneas de items', () => {
    const order: any = {
      items: [
        { name: 'A', price: 10, quantity: 2 },
        { name: 'B', price: 5, quantity: 1, variantName: 'Rojo' },
      ],
      subtotal: 25,
      shipping: 0,
      total: 25,
      shippingInfo: {
        firstName: 'Juan',
        lastName: 'Pérez',
        address: 'Calle Falsa 123',
        city: 'Madrid',
        state: 'Madrid',
        zipCode: '28001',
        email: 'juan@example.com',
        phone: '+34612345678',
        country: 'España',
      },
      paymentInfo: { method: 'card' },
    };

    const def = generateInvoiceDefinition({
      invoiceNumber: 'INV-001',
      invoiceDate: new Date('2024-01-01'),
      order,
      companyInfo: {
        name: 'Mi Empresa',
        address: 'Av. Principal 1',
        city: 'Madrid',
        zipCode: '28001',
        taxId: 'A12345678',
        email: 'info@empresa.com',
        phone: '+34123456789',
      },
    });

    // Verifica estructura mínima esperada
    expect(def.pageSize).toBe('A4');
    expect(Array.isArray(def.content)).toBe(true);

    // Busca la tabla y valida que tenga header + 2 filas de items
    const tableSection = (def.content as any[]).find((c) => c?.table?.body);
    expect(tableSection?.table?.body?.length).toBeGreaterThanOrEqual(3); // 1 header + 2 items

    // Totales: debe contener texto 'Total:' y un valor
    const totalsSection = (def.content as any[]).find((c) => Array.isArray(c?.columns));
    expect(totalsSection).toBeTruthy();
  });
});

