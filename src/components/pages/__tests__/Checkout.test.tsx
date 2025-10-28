import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mocks de dependencias con efectos colaterales
vi.mock('../../../lib/notifications', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));
vi.mock('../../../lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mockear dirección (evitar fetch/red)
vi.mock('../../../utils/address', async (orig) => {
  const mod = (await orig()) as any;
  return {
    ...mod,
    lookupZipES: vi.fn(async () => ({ province: 'Madrid', cities: ['Madrid'] })),
    autocompleteStreetES: vi.fn(async () => []),
  };
});

// Mock de useAuth para simular usuario no autenticado (wallet oculto)
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null }),
}));

// Mock de cartStore para evitar redirección y proporcionar items
vi.mock('../../../store/cartStore', async () => {
  const items = [
    { id: 'p1', name: 'Prod 1', price: 10, quantity: 1, image: 'x.jpg' },
  ];
  const state = { items, total: 10 };
  const listeners = new Set<(v: any) => void>();
  const cartStore = {
    get: () => state,
    listen: (cb: (v: any) => void) => {
      listeners.add(cb);
      // immediate call like nanostores does
      cb(state);
      return () => listeners.delete(cb);
    },
  } as any;
  return { cartStore, clearCart: vi.fn() };
});

import Checkout from '../Checkout';

describe.skip('Checkout (UI)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('muestra errores al intentar pasar sin datos', async () => {
    render(<Checkout />);

    const nextBtn = await screen.findByRole('button', { name: /Continuar al Pago/i });
    await userEvent.click(nextBtn);

    // Debe permanecer en el paso 1: el título de pago no está
    expect(screen.queryByText(/Método de Pago|Metodo de Pago/i)).toBeNull();
  });

  it('permite avanzar a paso 2 con datos válidos mínimos', async () => {
    render(<Checkout />);

    // Completar campos requeridos de envío (placeholders exactos en el componente)
    await userEvent.type(screen.getByPlaceholderText('Juan'), ' Juan');
    await userEvent.type(screen.getByPlaceholderText('García'), '');
    await userEvent.type(screen.getByPlaceholderText('tu@email.com'), 'ok@example.com');
    await userEvent.type(screen.getByPlaceholderText('612 345 678'), '612345678');
    await userEvent.type(screen.getByPlaceholderText('Calle Principal, 123, Piso 2'), ' Calle 123');
    await userEvent.type(screen.getAllByPlaceholderText('Madrid')[0], ' Madrid');
    await userEvent.type(screen.getAllByPlaceholderText('Madrid')[1], ' Madrid');
    await userEvent.type(screen.getByPlaceholderText('28001'), '28001');

    const nextBtn = await screen.findByRole('button', { name: /Continuar al Pago/i });
    await userEvent.click(nextBtn);

    // Paso 2 debería estar visible
    expect(await screen.findByText(/Método de Pago|Metodo de Pago/i)).toBeTruthy();
  });
});
