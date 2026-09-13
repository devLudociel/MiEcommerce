/**
 * Acceso a datos del panel de producción.
 *
 * Lee con el SDK de cliente, como el resto del admin: las reglas de Firestore ya
 * limitan estas colecciones al administrador. Las escrituras que tocan pedidos
 * van por endpoints con verificación de admin, no desde aquí.
 */

import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import { calcularFechaLimite } from './calculations';
import {
  DEFAULT_PRODUCTION_SETTINGS,
  type DeliveryMode,
  type ProductionLine,
  type ProductionSettings,
  type ProductionStatus,
  type ProductionTime,
} from './types';

/** Un pedido en estos estados ya no produce trabajo. */
const ESTADOS_FUERA = ['cancelled', 'delivered'];

/**
 * Cuántos pedidos recientes se miran. La producción viva es reciente; traer el
 * histórico entero solo para descartarlo sería lento y caro.
 */
const PEDIDOS_A_REVISAR = 300;

const aFecha = (valor: unknown): Date | undefined => {
  if (!valor) return undefined;
  if (valor instanceof Date) return valor;
  const posible = valor as { toDate?: () => Date };
  if (typeof posible.toDate === 'function') return posible.toDate();
  return undefined;
};

const aNumero = (valor: unknown): number | undefined => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : undefined;
};

// ─── Tipos de trabajo ───────────────────────────────────────────────────────

export async function cargarTiposProduccion(): Promise<ProductionTime[]> {
  const snapshot = await getDocs(query(collection(db, 'production_times'), orderBy('nombre')));
  return snapshot.docs.map((documento) => {
    const datos = documento.data();
    return {
      id: documento.id,
      nombre: String(datos.nombre ?? ''),
      minutosPersona: aNumero(datos.minutosPersona) ?? 0,
      minutosMaquina: aNumero(datos.minutosMaquina) ?? 0,
      minutosPreparar: aNumero(datos.minutosPreparar) ?? 0,
      activo: datos.activo !== false,
    };
  });
}

export async function guardarTipoProduccion(tipo: Omit<ProductionTime, 'id'> & { id?: string }) {
  const referencia = tipo.id
    ? doc(db, 'production_times', tipo.id)
    : doc(collection(db, 'production_times'));
  await setDoc(
    referencia,
    {
      nombre: tipo.nombre.trim(),
      minutosPersona: Math.max(0, Math.round(tipo.minutosPersona)),
      minutosMaquina: Math.max(0, Math.round(tipo.minutosMaquina)),
      minutosPreparar: Math.max(0, Math.round(tipo.minutosPreparar)),
      activo: tipo.activo !== false,
    },
    { merge: true }
  );
  return referencia.id;
}

export async function borrarTipoProduccion(id: string) {
  await deleteDoc(doc(db, 'production_times', id));
}

// ─── Ajustes ────────────────────────────────────────────────────────────────

export async function cargarAjustesProduccion(): Promise<ProductionSettings> {
  const documento = await getDoc(doc(db, 'system', 'productionSettings'));
  if (!documento.exists()) return DEFAULT_PRODUCTION_SETTINGS;
  const datos = documento.data() as DocumentData;
  const transporte = (datos.transportDays ?? {}) as Partial<Record<DeliveryMode, number>>;
  return {
    workdayMinutes: aNumero(datos.workdayMinutes) ?? DEFAULT_PRODUCTION_SETTINGS.workdayMinutes,
    workdays: Array.isArray(datos.workdays)
      ? datos.workdays.map(Number).filter((dia) => dia >= 0 && dia <= 6)
      : DEFAULT_PRODUCTION_SETTINGS.workdays,
    workdayEndHour: aNumero(datos.workdayEndHour) ?? DEFAULT_PRODUCTION_SETTINGS.workdayEndHour,
    transportDays: {
      pickup: aNumero(transporte.pickup) ?? DEFAULT_PRODUCTION_SETTINGS.transportDays.pickup,
      local: aNumero(transporte.local) ?? DEFAULT_PRODUCTION_SETTINGS.transportDays.local,
      island: aNumero(transporte.island) ?? DEFAULT_PRODUCTION_SETTINGS.transportDays.island,
    },
  };
}

export async function guardarAjustesProduccion(settings: ProductionSettings) {
  await setDoc(doc(db, 'system', 'productionSettings'), settings, { merge: true });
}

// ─── Líneas de producción ───────────────────────────────────────────────────

/**
 * Aplana los pedidos vivos en líneas de producción.
 *
 * La fecha límite de cada línea sale de la del pedido si está guardada; si no,
 * se calcula a partir de la fecha prometida y el modo de entrega. Guardarla es
 * opcional: el cálculo es determinista y barato.
 */
export async function cargarLineasProduccion(
  settings: ProductionSettings
): Promise<ProductionLine[]> {
  const snapshot = await getDocs(
    query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(PEDIDOS_A_REVISAR))
  );

  const lineas: ProductionLine[] = [];

  for (const documento of snapshot.docs) {
    const pedido = documento.data();
    if (ESTADOS_FUERA.includes(String(pedido.status ?? ''))) continue;

    const items = Array.isArray(pedido.items) ? pedido.items : [];
    const promisedDate = aFecha(pedido.promisedDate);
    const deliveryMode = (pedido.deliveryMode as DeliveryMode) ?? 'pickup';
    const clientName =
      String(pedido.customerName ?? '') ||
      [pedido.shippingInfo?.firstName, pedido.shippingInfo?.lastName].filter(Boolean).join(' ') ||
      'Sin nombre';

    items.forEach((item: DocumentData, itemIndex: number) => {
      const dueDateGuardada = aFecha(item.productionDueDate);
      const dueDate =
        dueDateGuardada ??
        (promisedDate ? calcularFechaLimite(promisedDate, deliveryMode, settings) : undefined);

      lineas.push({
        orderId: documento.id,
        orderNumber: String(pedido.orderId ?? documento.id),
        itemIndex,
        clientName,
        productName: String(item.name ?? 'Sin nombre'),
        quantity: aNumero(item.quantity) ?? 1,
        productionTypeId: item.productionTypeId ? String(item.productionTypeId) : undefined,
        personMinutes: aNumero(item.personMinutes),
        machineMinutes: aNumero(item.machineMinutes),
        dueDate,
        status: (item.productionStatus as ProductionStatus) ?? 'pending',
        source: pedido.source ? String(pedido.source) : undefined,
      });
    });
  }

  return lineas;
}

export const aTimestamp = (fecha: Date) => Timestamp.fromDate(fecha);

/** Pedidos sin fecha prometida, para poder ponérsela desde el panel. */
export async function contarPedidosSinFecha(): Promise<number> {
  const snapshot = await getDocs(
    query(
      collection(db, 'orders'),
      where('status', 'in', ['pending', 'paid', 'processing']),
      limit(PEDIDOS_A_REVISAR)
    )
  );
  return snapshot.docs.filter((documento) => !documento.data().promisedDate).length;
}
