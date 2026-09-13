/**
 * Tipos del panel de producción.
 *
 * Un "trabajo" no es una entidad propia: es una línea de un pedido. Ver
 * docs/superpowers/specs/2026-09-13-dashboard-produccion-design.md
 */

/** Modo de entrega. Determina cuántos días de transporte hay que descontar. */
export type DeliveryMode = 'pickup' | 'local' | 'island';

export const DELIVERY_MODES: DeliveryMode[] = ['pickup', 'local', 'island'];

export const DELIVERY_MODE_LABELS: Record<DeliveryMode, string> = {
  pickup: 'Recoge en el taller',
  local: 'Envío en La Palma',
  island: 'Envío a otra isla',
};

/** Estado de producción de una línea. Ya existía en el modelo de pedidos. */
export type ProductionStatus = 'pending' | 'in_production' | 'ready' | 'shipped';

/** Una línea terminada ya no consume tiempo del día. */
export const ESTADOS_TERMINADOS: ProductionStatus[] = ['ready', 'shipped'];

/**
 * Tipo de trabajo con sus tiempos. Colección `production_times`.
 *
 * `minutosPreparar` se paga una vez por línea de pedido, no por unidad: diez
 * camisetas no cuestan diez montajes.
 */
export interface ProductionTime {
  id: string;
  nombre: string;
  /** Minutos de trabajo humano por unidad. */
  minutosPersona: number;
  /** Minutos de máquina desatendida por unidad. No bloquean a la persona. */
  minutosMaquina: number;
  /** Montaje, una sola vez por línea. */
  minutosPreparar: number;
  activo: boolean;
}

export interface ProductionSettings {
  /** Jornada en minutos. */
  workdayMinutes: number;
  /** Días laborables, 0 = domingo. */
  workdays: number[];
  /** Hora a la que termina la jornada, para calcular cuándo arrancar una máquina. */
  workdayEndHour: number;
  transportDays: Record<DeliveryMode, number>;
}

export const DEFAULT_PRODUCTION_SETTINGS: ProductionSettings = {
  workdayMinutes: 420,
  workdays: [1, 2, 3, 4, 5],
  workdayEndHour: 18,
  transportDays: { pickup: 0, local: 1, island: 2 },
};

/**
 * Una línea de pedido vista desde producción. Se construye a partir del pedido
 * y su índice; el índice hace falta para poder actualizar el estado.
 */
export interface ProductionLine {
  orderId: string;
  orderNumber: string;
  itemIndex: number;
  clientName: string;
  productName: string;
  quantity: number;
  productionTypeId?: string;
  personMinutes?: number;
  machineMinutes?: number;
  /** Fecha límite de producción. Ausente si el pedido no tiene fecha prometida. */
  dueDate?: Date;
  status: ProductionStatus;
  source?: string;
}
