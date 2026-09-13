/**
 * Cálculos del panel de producción.
 *
 * Funciones puras, sin Firestore ni fechas implícitas: la hora actual siempre
 * se pasa como argumento para que los tests sean deterministas.
 */

import {
  DEFAULT_PRODUCTION_SETTINGS,
  ESTADOS_TERMINADOS,
  type DeliveryMode,
  type ProductionLine,
  type ProductionSettings,
  type ProductionTime,
} from './types';

/** Tope de iteraciones al recorrer días. Una configuración absurda no debe colgar la página. */
const MAX_DIAS = 400;

export const inicioDelDia = (fecha: Date): Date => {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
};

export const sumarDias = (fecha: Date, dias: number): Date => {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
};

/** Clave estable para agrupar por día, en horario local. */
export const claveDia = (fecha: Date): string => {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

export const esLaborable = (fecha: Date, settings: ProductionSettings): boolean =>
  settings.workdays.includes(fecha.getDay());

/**
 * Fecha límite para tener el trabajo terminado.
 *
 * Retrocede los días de transporte del modo de entrega contando solo días
 * laborables, y si el resultado cae en un día no laborable retrocede hasta el
 * anterior laborable. Con `pickup` (cero días) sigue aplicando ese ajuste: si
 * lo prometiste para un domingo, tiene que estar listo el viernes.
 */
export function calcularFechaLimite(
  promisedDate: Date,
  deliveryMode: DeliveryMode,
  settings: ProductionSettings = DEFAULT_PRODUCTION_SETTINGS
): Date {
  let fecha = inicioDelDia(promisedDate);

  // Sin días laborables configurados no hay nada que saltar, y el bucle no
  // terminaría nunca.
  if (settings.workdays.length === 0) return fecha;

  let restantes = settings.transportDays[deliveryMode] ?? 0;
  let vueltas = 0;
  while (restantes > 0 && vueltas < MAX_DIAS) {
    fecha = sumarDias(fecha, -1);
    if (esLaborable(fecha, settings)) restantes -= 1;
    vueltas += 1;
  }

  vueltas = 0;
  while (!esLaborable(fecha, settings) && vueltas < MAX_DIAS) {
    fecha = sumarDias(fecha, -1);
    vueltas += 1;
  }

  return fecha;
}

/**
 * Minutos que cuesta una línea, a partir de su tipo y su cantidad.
 *
 * El montaje entra una sola vez; el resto multiplica por unidades.
 */
export function calcularMinutosLinea(
  tipo: Pick<ProductionTime, 'minutosPersona' | 'minutosMaquina' | 'minutosPreparar'>,
  cantidad: number
): { personMinutes: number; machineMinutes: number } {
  const unidades = Number.isFinite(cantidad) && cantidad > 0 ? Math.floor(cantidad) : 1;
  return {
    personMinutes: Math.round(tipo.minutosPreparar + tipo.minutosPersona * unidades),
    machineMinutes: Math.round(tipo.minutosMaquina * unidades),
  };
}

/** Una línea cuenta para la carga si no está terminada y tiene tiempo estimado. */
export const cuentaParaCarga = (linea: ProductionLine): boolean =>
  !ESTADOS_TERMINADOS.includes(linea.status) &&
  typeof linea.personMinutes === 'number' &&
  linea.personMinutes > 0 &&
  linea.dueDate instanceof Date;

/**
 * Minutos de persona comprometidos por día.
 *
 * Los minutos de máquina quedan fuera a propósito: la impresora trabaja sola y
 * no consume tu jornada. Su riesgo se vigila en `calcularHoraTopeMaquina`.
 */
export function calcularCargaDiaria(lineas: ProductionLine[]): Map<string, number> {
  const carga = new Map<string, number>();
  for (const linea of lineas) {
    if (!cuentaParaCarga(linea)) continue;
    const clave = claveDia(linea.dueDate as Date);
    carga.set(clave, (carga.get(clave) ?? 0) + (linea.personMinutes as number));
  }
  return carga;
}

/**
 * Hora límite para arrancar la máquina y llegar a la fecha.
 *
 * Devuelve `null` cuando la línea no usa máquina. Si la hora que sale ya pasó,
 * se devuelve igualmente: quien llama compara con la hora actual para decidir
 * si avisa de que va justo o de que ya no llega.
 */
export function calcularHoraTopeMaquina(
  machineMinutes: number | undefined,
  dueDate: Date | undefined,
  settings: ProductionSettings = DEFAULT_PRODUCTION_SETTINGS
): Date | null {
  if (!machineMinutes || machineMinutes <= 0 || !(dueDate instanceof Date)) return null;
  const fin = inicioDelDia(dueDate);
  fin.setHours(settings.workdayEndHour, 0, 0, 0);
  return new Date(fin.getTime() - machineMinutes * 60_000);
}

/** Reparte las líneas en las bandejas que pinta el panel. */
export function agruparLineas(
  lineas: ProductionLine[],
  ahora: Date
): {
  atrasadas: ProductionLine[];
  hoy: ProductionLine[];
  proximas: ProductionLine[];
  sinEstimar: ProductionLine[];
  sinFecha: ProductionLine[];
} {
  const claveHoy = claveDia(ahora);
  const atrasadas: ProductionLine[] = [];
  const hoy: ProductionLine[] = [];
  const proximas: ProductionLine[] = [];
  const sinEstimar: ProductionLine[] = [];
  const sinFecha: ProductionLine[] = [];

  for (const linea of lineas) {
    if (ESTADOS_TERMINADOS.includes(linea.status)) continue;

    // Lo que no se puede calcular se muestra como pendiente de datos, nunca se
    // omite: un panel que esconde trabajo sin estimar miente sobre la carga.
    if (!linea.productionTypeId || typeof linea.personMinutes !== 'number') {
      sinEstimar.push(linea);
      continue;
    }
    if (!(linea.dueDate instanceof Date)) {
      sinFecha.push(linea);
      continue;
    }

    const clave = claveDia(linea.dueDate);
    if (clave < claveHoy) atrasadas.push(linea);
    else if (clave === claveHoy) hoy.push(linea);
    else proximas.push(linea);
  }

  const porFecha = (a: ProductionLine, b: ProductionLine) =>
    (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0);

  return {
    atrasadas: atrasadas.sort(porFecha),
    hoy: hoy.sort(porFecha),
    proximas: proximas.sort(porFecha),
    sinEstimar,
    sinFecha,
  };
}

/** "1 h 30 m", "45 m", "0 m". */
export function formatearMinutos(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  if (horas === 0) return `${resto} m`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} m`;
}
