// src/lib/shipping.ts
// Sistema de cálculo de envíos por zonas

import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// ============================================================================
// TYPES
// ============================================================================

export interface ShippingZone {
  id: string;
  name: string;
  description?: string;
  // Códigos postales: puede ser rango "35000-35999" o lista "35001,35002,35003"
  postalCodes: string[];
  // Provincias permitidas (opcional, alternativa a códigos postales)
  provinces?: string[];
  active: boolean;
  priority: number; // Mayor prioridad = se evalúa primero
}

export interface ShippingMethod {
  id: string;
  zoneId: string;
  name: string;
  description?: string;
  // Precio base
  basePrice: number;
  // Precio por kg adicional (opcional)
  pricePerKg?: number;
  // Peso máximo permitido (kg)
  maxWeight?: number;
  // Tiempo estimado de entrega
  estimatedDays: string; // ej: "2-3", "5-7"
  // Pedido mínimo para envío gratis
  freeShippingThreshold?: number;
  active: boolean;
  priority: number;
}

export interface ShippingQuote {
  methodId: string;
  methodName: string;
  description?: string;
  price: number;
  originalPrice: number;
  isFree: boolean;
  estimatedDays: string;
  zoneId: string;
  zoneName: string;
}

export interface ShippingAddress {
  postalCode: string;
  province?: string;
  city?: string;
  country?: string;
}

const shouldUseDefaultShipping = import.meta.env.DEV || import.meta.env.VITEST;

// ============================================================================
// CANARY ISLANDS POSTAL CODE RANGES
// ============================================================================

// Las Palmas: 35000-35999
// Santa Cruz de Tenerife: 38000-38999
export const CANARY_ISLANDS_POSTAL_RANGES = [
  { start: 35000, end: 35999, province: 'Las Palmas' },
  { start: 38000, end: 38999, province: 'Santa Cruz de Tenerife' },
];

export const CANARY_ISLANDS_PROVINCES = ['Las Palmas', 'Santa Cruz de Tenerife'];

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Verifica si un código postal está en Canarias
 */
export function isCanaryIslandsPostalCode(postalCode: string): boolean {
  const code = parseInt(postalCode, 10);
  if (isNaN(code)) return false;

  return CANARY_ISLANDS_POSTAL_RANGES.some((range) => code >= range.start && code <= range.end);
}

/**
 * Obtiene la provincia de Canarias por código postal
 */
export function getCanaryIslandProvince(postalCode: string): string | null {
  const code = parseInt(postalCode, 10);
  if (isNaN(code)) return null;

  const range = CANARY_ISLANDS_POSTAL_RANGES.find((r) => code >= r.start && code <= r.end);

  return range?.province || null;
}

/**
 * Verifica si un código postal está en un rango
 * Soporta: "35000-35999" o "35001,35002,35003"
 */
export function isPostalCodeInRange(postalCode: string, ranges: string[]): boolean {
  const code = parseInt(postalCode, 10);
  if (isNaN(code)) return false;

  for (const range of ranges) {
    // Rango: "35000-35999"
    if (range.includes('-')) {
      const [start, end] = range.split('-').map((s) => parseInt(s.trim(), 10));
      if (code >= start && code <= end) return true;
    }
    // Lista: "35001,35002"
    else if (range.includes(',')) {
      const codes = range.split(',').map((s) => parseInt(s.trim(), 10));
      if (codes.includes(code)) return true;
    }
    // Código único
    else {
      if (parseInt(range.trim(), 10) === code) return true;
    }
  }

  return false;
}

// ============================================================================
// SHIPPING CALCULATOR
// ============================================================================

/**
 * Obtiene las zonas de envío activas
 * Nota: Ordenamos en JS para evitar índices compuestos en Firestore
 */
export async function getShippingZones(): Promise<ShippingZone[]> {
  try {
    const q = query(collection(db, 'shipping_zones'), where('active', '==', true));
    const snapshot = await getDocs(q);
    const zones = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ShippingZone[];

    // Ordenar por prioridad (mayor primero) en JS
    const orderedZones = zones.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    if (orderedZones.length === 0 && shouldUseDefaultShipping) {
      return [{ id: 'default-zone', ...DEFAULT_CANARY_ZONE }];
    }
    return orderedZones;
  } catch (error) {
    console.error('[Shipping] Error loading zones:', error);
    if (shouldUseDefaultShipping) {
      return [{ id: 'default-zone', ...DEFAULT_CANARY_ZONE }];
    }
    return [];
  }
}

/**
 * Obtiene los métodos de envío para una zona
 * Nota: Ordenamos en JS para evitar índices compuestos en Firestore
 */
export async function getShippingMethods(zoneId: string): Promise<ShippingMethod[]> {
  try {
    // Query simple por zoneId, luego filtramos active en JS
    const q = query(collection(db, 'shipping_methods'), where('zoneId', '==', zoneId));
    const snapshot = await getDocs(q);
    const methods = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ShippingMethod[];

    // Filtrar activos y ordenar por prioridad en JS
    const activeMethods = methods
      .filter((m) => m.active)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    if (activeMethods.length === 0 && shouldUseDefaultShipping) {
      return DEFAULT_SHIPPING_METHODS.map((method, idx) => ({
        id: `default-method-${idx + 1}`,
        zoneId,
        ...method,
      }));
    }
    return activeMethods;
  } catch (error) {
    console.error('[Shipping] Error loading methods:', error);
    if (shouldUseDefaultShipping) {
      return DEFAULT_SHIPPING_METHODS.map((method, idx) => ({
        id: `default-method-${idx + 1}`,
        zoneId,
        ...method,
      }));
    }
    return [];
  }
}

/**
 * Encuentra la zona de envío para una dirección
 */
export async function findShippingZone(address: ShippingAddress): Promise<ShippingZone | null> {
  const zones = await getShippingZones();

  for (const zone of zones) {
    // Verificar por código postal
    if (zone.postalCodes?.length > 0) {
      if (isPostalCodeInRange(address.postalCode, zone.postalCodes)) {
        return zone;
      }
    }

    // Verificar por provincia
    if (zone.provinces?.length > 0 && address.province) {
      const normalizedProvince = address.province.toLowerCase().trim();
      if (zone.provinces.some((p) => p.toLowerCase().trim() === normalizedProvince)) {
        return zone;
      }
    }
  }

  return null;
}

/**
 * Calcula las opciones de envío disponibles
 */
export async function calculateShipping(
  address: ShippingAddress,
  cartTotal: number,
  cartWeight?: number
): Promise<ShippingQuote[]> {
  // Verificar que sea de Canarias
  if (!isCanaryIslandsPostalCode(address.postalCode)) {
    console.log('[Shipping] Postal code not in Canary Islands:', address.postalCode);
    return [];
  }

  // Buscar zona
  const zone = await findShippingZone(address);
  if (!zone) {
    console.log('[Shipping] No zone found for:', address);
    return [];
  }

  // Obtener métodos de la zona
  const methods = await getShippingMethods(zone.id);
  if (methods.length === 0) {
    console.log('[Shipping] No methods found for zone:', zone.id);
    return [];
  }

  // Calcular precios
  const quotes: ShippingQuote[] = [];

  for (const method of methods) {
    // Verificar peso máximo
    if (method.maxWeight && cartWeight && cartWeight > method.maxWeight) {
      continue; // Este método no soporta el peso
    }

    let price = method.basePrice;

    // Añadir precio por peso adicional
    if (method.pricePerKg && cartWeight && cartWeight > 1) {
      price += (cartWeight - 1) * method.pricePerKg;
    }

    // Verificar envío gratis
    const isFree = method.freeShippingThreshold ? cartTotal >= method.freeShippingThreshold : false;

    quotes.push({
      methodId: method.id,
      methodName: method.name,
      description: method.description,
      price: isFree ? 0 : price,
      originalPrice: price,
      isFree,
      estimatedDays: method.estimatedDays,
      zoneId: zone.id,
      zoneName: zone.name,
    });
  }

  return quotes;
}

/**
 * Obtiene el método de envío más barato disponible
 */
export async function getCheapestShipping(
  address: ShippingAddress,
  cartTotal: number,
  cartWeight?: number
): Promise<ShippingQuote | null> {
  const quotes = await calculateShipping(address, cartTotal, cartWeight);

  if (quotes.length === 0) return null;

  // Ordenar por precio y devolver el más barato
  quotes.sort((a, b) => a.price - b.price);
  return quotes[0];
}

// ============================================================================
// DEFAULT DATA (para inicializar si no hay datos)
// ============================================================================

export const DEFAULT_CANARY_ZONE: Omit<ShippingZone, 'id'> = {
  name: 'Islas Canarias',
  description: 'Envíos a Las Palmas y Santa Cruz de Tenerife',
  postalCodes: ['35000-35999', '38000-38999'],
  provinces: ['Las Palmas', 'Santa Cruz de Tenerife'],
  active: true,
  priority: 100,
};

export const DEFAULT_SHIPPING_METHODS: Omit<ShippingMethod, 'id' | 'zoneId'>[] = [
  {
    name: 'Envío Estándar',
    description: 'Entrega en 3-5 días laborables',
    basePrice: 4.99,
    pricePerKg: 1.5,
    maxWeight: 30,
    estimatedDays: '3-5',
    freeShippingThreshold: 50,
    active: true,
    priority: 10,
  },
  {
    name: 'Envío Express',
    description: 'Entrega en 1-2 días laborables',
    basePrice: 9.99,
    pricePerKg: 2.0,
    maxWeight: 20,
    estimatedDays: '1-2',
    freeShippingThreshold: 100,
    active: true,
    priority: 20,
  },
  {
    name: 'Recogida en Tienda',
    description: 'Recoge tu pedido en nuestra tienda sin coste',
    basePrice: 0,
    estimatedDays: '1-2',
    active: true,
    priority: 5,
  },
];
