import { describe, it, expect } from 'vitest';
import {
  agruparLineas,
  calcularCargaDiaria,
  calcularFechaLimite,
  calcularHoraTopeMaquina,
  calcularMinutosLinea,
  claveDia,
  formatearMinutos,
} from './calculations';
import {
  DEFAULT_PRODUCTION_SETTINGS,
  type ProductionLine,
  type ProductionSettings,
} from './types';

// 2026-09-13 es sábado; 14 lunes, 18 viernes, 19 sábado, 20 domingo.
const dia = (iso: string) => new Date(`${iso}T12:00:00`);

const linea = (extra: Partial<ProductionLine> = {}): ProductionLine => ({
  orderId: 'o1',
  orderNumber: 'wa_1',
  itemIndex: 0,
  clientName: 'Cliente',
  productName: 'Producto',
  quantity: 1,
  productionTypeId: 't1',
  personMinutes: 60,
  machineMinutes: 0,
  dueDate: dia('2026-09-14'),
  status: 'pending',
  ...extra,
});

describe('calcularFechaLimite', () => {
  it('recoge en taller un día laborable: la fecha no se mueve', () => {
    expect(claveDia(calcularFechaLimite(dia('2026-09-16'), 'pickup'))).toBe('2026-09-16');
  });

  it('recoge en taller en domingo: retrocede al viernes anterior', () => {
    expect(claveDia(calcularFechaLimite(dia('2026-09-20'), 'pickup'))).toBe('2026-09-18');
  });

  it('envío en La Palma descuenta un día laborable', () => {
    expect(claveDia(calcularFechaLimite(dia('2026-09-16'), 'local'))).toBe('2026-09-15');
  });

  it('envío a otra isla descuenta dos días laborables', () => {
    expect(claveDia(calcularFechaLimite(dia('2026-09-16'), 'island'))).toBe('2026-09-14');
  });

  it('salta el fin de semana al descontar transporte', () => {
    // Martes 15 menos dos laborables = viernes 11, no domingo 13.
    expect(claveDia(calcularFechaLimite(dia('2026-09-15'), 'island'))).toBe('2026-09-11');
  });

  it('sin días laborables configurados devuelve la fecha tal cual y no se cuelga', () => {
    const settings: ProductionSettings = { ...DEFAULT_PRODUCTION_SETTINGS, workdays: [] };
    expect(claveDia(calcularFechaLimite(dia('2026-09-20'), 'island', settings))).toBe('2026-09-20');
  });
});

describe('calcularMinutosLinea', () => {
  const camiseta = { minutosPersona: 8, minutosMaquina: 0, minutosPreparar: 10 };

  it('cobra el montaje una sola vez, no por unidad', () => {
    expect(calcularMinutosLinea(camiseta, 10).personMinutes).toBe(90);
    expect(calcularMinutosLinea(camiseta, 1).personMinutes).toBe(18);
  });

  it('separa el tiempo de máquina del tiempo de persona', () => {
    const figura = { minutosPersona: 10, minutosMaquina: 360, minutosPreparar: 0 };
    expect(calcularMinutosLinea(figura, 1)).toEqual({ personMinutes: 10, machineMinutes: 360 });
  });

  it('trata una cantidad inválida como una unidad', () => {
    expect(calcularMinutosLinea(camiseta, 0).personMinutes).toBe(18);
    expect(calcularMinutosLinea(camiseta, Number.NaN).personMinutes).toBe(18);
  });
});

describe('calcularCargaDiaria', () => {
  it('suma varias líneas del mismo día', () => {
    const carga = calcularCargaDiaria([
      linea({ personMinutes: 90 }),
      linea({ personMinutes: 25 }),
    ]);
    expect(carga.get('2026-09-14')).toBe(115);
  });

  it('ignora las líneas terminadas', () => {
    const carga = calcularCargaDiaria([
      linea({ personMinutes: 90 }),
      linea({ personMinutes: 500, status: 'ready' }),
      linea({ personMinutes: 500, status: 'shipped' }),
    ]);
    expect(carga.get('2026-09-14')).toBe(90);
  });

  it('ignora las líneas sin estimar y sin fecha', () => {
    const carga = calcularCargaDiaria([
      linea({ personMinutes: 90 }),
      linea({ personMinutes: undefined }),
      linea({ dueDate: undefined }),
    ]);
    expect(carga.get('2026-09-14')).toBe(90);
  });

  it('no cuenta los minutos de máquina como carga de la persona', () => {
    const carga = calcularCargaDiaria([linea({ personMinutes: 10, machineMinutes: 360 })]);
    expect(carga.get('2026-09-14')).toBe(10);
  });
});

describe('calcularHoraTopeMaquina', () => {
  it('devuelve null cuando la línea no usa máquina', () => {
    expect(calcularHoraTopeMaquina(0, dia('2026-09-14'))).toBeNull();
    expect(calcularHoraTopeMaquina(undefined, dia('2026-09-14'))).toBeNull();
  });

  it('devuelve null cuando no hay fecha límite', () => {
    expect(calcularHoraTopeMaquina(360, undefined)).toBeNull();
  });

  it('resta el tiempo de máquina al final de la jornada', () => {
    const tope = calcularHoraTopeMaquina(360, dia('2026-09-14'));
    expect(tope?.getHours()).toBe(12);
    expect(claveDia(tope as Date)).toBe('2026-09-14');
  });

  it('devuelve la hora aunque ya haya pasado, para que quien llama avise', () => {
    const tope = calcularHoraTopeMaquina(1200, dia('2026-09-14'));
    expect(tope).toBeInstanceOf(Date);
    expect((tope as Date).getTime()).toBeLessThan(dia('2026-09-14').getTime());
  });
});

describe('agruparLineas', () => {
  const ahora = dia('2026-09-14');

  it('separa atrasado, hoy y próximos', () => {
    const grupos = agruparLineas(
      [
        linea({ dueDate: dia('2026-09-11') }),
        linea({ dueDate: dia('2026-09-14') }),
        linea({ dueDate: dia('2026-09-18') }),
      ],
      ahora
    );
    expect(grupos.atrasadas).toHaveLength(1);
    expect(grupos.hoy).toHaveLength(1);
    expect(grupos.proximas).toHaveLength(1);
  });

  it('manda a sin estimar lo que no tiene tipo asignado', () => {
    const grupos = agruparLineas([linea({ productionTypeId: undefined })], ahora);
    expect(grupos.sinEstimar).toHaveLength(1);
    expect(grupos.hoy).toHaveLength(0);
  });

  it('manda a sin fecha lo que no tiene fecha límite', () => {
    const grupos = agruparLineas([linea({ dueDate: undefined })], ahora);
    expect(grupos.sinFecha).toHaveLength(1);
  });

  it('sin estimar tiene prioridad sobre sin fecha', () => {
    const grupos = agruparLineas(
      [linea({ productionTypeId: undefined, dueDate: undefined })],
      ahora
    );
    expect(grupos.sinEstimar).toHaveLength(1);
    expect(grupos.sinFecha).toHaveLength(0);
  });

  it('deja fuera lo terminado', () => {
    const grupos = agruparLineas([linea({ status: 'ready' }), linea({ status: 'shipped' })], ahora);
    expect(grupos.hoy).toHaveLength(0);
    expect(grupos.sinEstimar).toHaveLength(0);
  });

  it('ordena cada grupo por fecha', () => {
    const grupos = agruparLineas(
      [
        linea({ dueDate: dia('2026-09-25'), productName: 'tarde' }),
        linea({ dueDate: dia('2026-09-18'), productName: 'pronto' }),
      ],
      ahora
    );
    expect(grupos.proximas.map((l) => l.productName)).toEqual(['pronto', 'tarde']);
  });
});

describe('formatearMinutos', () => {
  it('formatea horas y minutos', () => {
    expect(formatearMinutos(90)).toBe('1 h 30 m');
    expect(formatearMinutos(45)).toBe('45 m');
    expect(formatearMinutos(120)).toBe('2 h');
    expect(formatearMinutos(0)).toBe('0 m');
  });

  it('no deja escapar negativos ni decimales', () => {
    expect(formatearMinutos(-10)).toBe('0 m');
    expect(formatearMinutos(90.4)).toBe('1 h 30 m');
  });
});
