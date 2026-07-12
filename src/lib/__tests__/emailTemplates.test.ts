import { describe, it, expect } from 'vitest';
import { designReminderTemplate } from '../emailTemplates';
import type { OrderData } from '../../types/firebase';

function buildOrder(overrides: Partial<OrderData> = {}): OrderData {
  return {
    id: 'ABCDEFGH123456',
    items: [],
    shippingInfo: {
      firstName: 'Laura',
      lastName: 'Pérez',
      email: 'laura@example.com',
      phone: '600000000',
      address: 'Calle Real 1',
      city: 'Los Llanos',
      state: 'Santa Cruz de Tenerife',
      zipCode: '38760',
      country: 'España',
    },
    paymentInfo: { method: 'card' },
    subtotal: 20,
    shipping: 5,
    total: 25,
    status: 'confirmed',
    paymentStatus: 'paid',
    createdAt: { toDate: () => new Date('2026-07-10T10:00:00Z') } as OrderData['createdAt'],
    ...overrides,
  } as OrderData;
}

describe('designReminderTemplate', () => {
  it('incluye número de pedido en asunto y cuerpo', () => {
    const { subject, html } = designReminderTemplate(buildOrder(), [
      { name: 'Camiseta personalizada', quantity: 1 },
    ]);

    expect(subject).toContain('#ABCDEFGH');
    expect(html).toContain('#ABCDEFGH');
    expect(html).toContain('Camiseta personalizada');
  });

  it('saluda por nombre y muestra cantidad cuando es mayor que 1', () => {
    const { html } = designReminderTemplate(buildOrder(), [{ name: 'Taza mágica', quantity: 3 }]);

    expect(html).toContain('Laura');
    expect(html).toContain('× 3');
  });

  it('escapa HTML en nombres de producto y de cliente', () => {
    const order = buildOrder({
      shippingInfo: {
        ...buildOrder().shippingInfo,
        firstName: '<b>Eva</b>',
      },
    });
    const { html } = designReminderTemplate(order, [
      { name: 'Taza <script>alert(1)</script>', quantity: 1 },
    ]);

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;Eva&lt;/b&gt;');
  });

  it('indica el email de contacto para enviar el diseño', () => {
    const { html } = designReminderTemplate(buildOrder(), [{ name: 'Sudadera', quantity: 1 }]);

    expect(html).toContain('pedidos@imprimearte.es');
  });
});
