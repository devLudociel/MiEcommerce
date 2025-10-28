import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, lookupZipES } from '../address';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ejecuta solo una vez tras la espera', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced('a');
    debounced('b');
    debounced('c');

    // Aún no debe ejecutarse
    expect(fn).not.toHaveBeenCalled();

    // Avanzar el tiempo
    vi.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });
});

describe('lookupZipES', () => {
  it('devuelve null si el zip no es de 5 dígitos', async () => {
    expect(await lookupZipES('')).toBeNull();
    expect(await lookupZipES('1234')).toBeNull();
    expect(await lookupZipES('123456')).toBeNull();
  });

  it('resuelve provincia y ciudades cuando la API responde ok', async () => {
    const mockJson = {
      state: 'Madrid',
      places: [
        { 'place name': 'Madrid' },
        { place: 'Madrid' },
        { 'place name': 'Alcobendas' },
        { 'place name': 'Madrid' }, // duplicado para validar Set
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => mockJson,
    } as any);

    const res = await lookupZipES('28001');
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(res).not.toBeNull();
    expect(res?.province).toBe('Madrid');
    expect(res?.cities.sort()).toEqual(['Alcobendas', 'Madrid']);

    fetchSpy.mockRestore();
  });

  it('devuelve null si la API responde con error', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as any);

    const res = await lookupZipES('28001');
    expect(res).toBeNull();
    fetchSpy.mockRestore();
  });
});

