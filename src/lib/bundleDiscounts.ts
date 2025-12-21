// src/lib/bundleDiscounts.ts
// Lógica para calcular descuentos por paquete (3x2, 2do al 50%, etc.)

import { db } from './firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { logger } from './logger';
import type { BundleDiscount, AppliedBundleDiscount } from '../types/firebase';
import type { CartItem } from '../store/cartStore';

// ============================================================================
// TIPOS
// ============================================================================

export interface BundleDiscountResult {
  appliedDiscounts: AppliedBundleDiscount[];
  totalDiscount: number;
  originalTotal: number;
  finalTotal: number;
}

interface ProductInfo {
  id: string;
  categoryId?: string;
  tags?: string[];
}

// ============================================================================
// CARGAR DESCUENTOS ACTIVOS
// ============================================================================

let cachedDiscounts: BundleDiscount[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minuto

export async function getActiveBundleDiscounts(): Promise<BundleDiscount[]> {
  const now = Date.now();

  // Usar caché si está fresco
  if (cachedDiscounts && now - cacheTimestamp < CACHE_DURATION) {
    return cachedDiscounts;
  }

  try {
    const currentDate = Timestamp.now();
    const discountsRef = collection(db, 'bundleDiscounts');

    // Obtener todos los descuentos activos
    const snapshot = await getDocs(
      query(discountsRef, where('active', '==', true))
    );

    const discounts = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((d) => {
        // Filtrar por fechas válidas
        const startDate = d.startDate?.toDate?.() || new Date(0);
        const endDate = d.endDate?.toDate?.() || new Date(9999, 11, 31);
        const currentTime = currentDate.toDate();
        return startDate <= currentTime && endDate >= currentTime;
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0)) as BundleDiscount[];

    cachedDiscounts = discounts;
    cacheTimestamp = now;

    logger.debug('[BundleDiscounts] Loaded active discounts', { count: discounts.length });
    return discounts;
  } catch (error) {
    logger.error('[BundleDiscounts] Error loading discounts', error);
    return [];
  }
}

// ============================================================================
// VERIFICAR SI DESCUENTO APLICA A PRODUCTO
// ============================================================================

function discountAppliesToProduct(
  discount: BundleDiscount,
  productInfo: ProductInfo
): boolean {
  switch (discount.applyTo) {
    case 'all':
      return true;

    case 'categories':
      return discount.categoryIds?.includes(productInfo.categoryId || '') || false;

    case 'products':
      return discount.productIds?.includes(productInfo.id) || false;

    case 'tags':
      return (
        productInfo.tags?.some((tag) => discount.tagIds?.includes(tag)) || false
      );

    default:
      return false;
  }
}

// ============================================================================
// CALCULAR DESCUENTOS
// ============================================================================

export async function calculateBundleDiscounts(
  items: CartItem[],
  productInfoMap: Map<string, ProductInfo>
): Promise<BundleDiscountResult> {
  const discounts = await getActiveBundleDiscounts();
  const appliedDiscounts: AppliedBundleDiscount[] = [];
  let totalDiscount = 0;

  // Calcular total original
  const originalTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Crear copia de items para tracking
  const itemsRemaining = new Map<string, number>();
  items.forEach((item) => {
    const key = `${item.id}_${item.variantId || 'default'}`;
    itemsRemaining.set(key, item.quantity);
  });

  // Aplicar cada descuento en orden de prioridad
  for (const discount of discounts) {
    // Encontrar productos elegibles
    const eligibleItems = items.filter((item) => {
      const productInfo = productInfoMap.get(item.id);
      if (!productInfo) return false;
      return discountAppliesToProduct(discount, productInfo);
    });

    if (eligibleItems.length === 0) continue;

    // Calcular descuento según tipo
    const result = applyDiscountType(discount, eligibleItems, itemsRemaining);

    if (result.savedAmount > 0) {
      appliedDiscounts.push({
        bundleId: discount.id || '',
        bundleName: discount.name,
        productIds: result.productIds,
        originalPrice: result.originalPrice,
        discountedPrice: result.discountedPrice,
        savedAmount: result.savedAmount,
      });
      totalDiscount += result.savedAmount;

      // Si no es acumulable, salir después de aplicar
      if (!discount.stackable) break;
    }
  }

  return {
    appliedDiscounts,
    totalDiscount,
    originalTotal,
    finalTotal: originalTotal - totalDiscount,
  };
}

// ============================================================================
// APLICAR TIPO DE DESCUENTO
// ============================================================================

interface DiscountApplication {
  productIds: string[];
  originalPrice: number;
  discountedPrice: number;
  savedAmount: number;
}

function applyDiscountType(
  discount: BundleDiscount,
  eligibleItems: CartItem[],
  itemsRemaining: Map<string, number>
): DiscountApplication {
  const result: DiscountApplication = {
    productIds: [],
    originalPrice: 0,
    discountedPrice: 0,
    savedAmount: 0,
  };

  // Calcular cantidad total de items elegibles
  const totalEligibleQuantity = eligibleItems.reduce((sum, item) => {
    const key = `${item.id}_${item.variantId || 'default'}`;
    return sum + (itemsRemaining.get(key) || 0);
  }, 0);

  if (totalEligibleQuantity < discount.buyQuantity) {
    return result; // No hay suficientes items
  }

  // Ordenar por precio (aplicar descuento al más barato primero para algunos tipos)
  const sortedItems = [...eligibleItems].sort((a, b) => a.price - b.price);

  switch (discount.type) {
    case 'buy_x_get_y_free': {
      // Ej: 3x2 = compra 3, el más barato es gratis
      const buyQty = discount.buyQuantity;
      const freeQty = discount.getQuantity || 1;
      const setsAvailable = Math.floor(totalEligibleQuantity / buyQty);

      if (setsAvailable === 0) return result;

      // El más barato de cada set es gratis
      let freeItemsLeft = setsAvailable * freeQty;
      let saved = 0;

      for (const item of sortedItems) {
        if (freeItemsLeft <= 0) break;
        const key = `${item.id}_${item.variantId || 'default'}`;
        const available = itemsRemaining.get(key) || 0;
        const toMakeFree = Math.min(available, freeItemsLeft);

        if (toMakeFree > 0) {
          saved += item.price * toMakeFree;
          result.productIds.push(item.id);
          freeItemsLeft -= toMakeFree;
        }
      }

      result.savedAmount = saved;
      result.originalPrice = eligibleItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );
      result.discountedPrice = result.originalPrice - saved;
      break;
    }

    case 'buy_x_get_y_percent': {
      // Ej: 2da unidad al 50%
      const buyQty = discount.buyQuantity;
      const discountPct = discount.discountPercent || 0;

      // Cada Xª unidad tiene descuento
      let itemsProcessed = 0;
      let saved = 0;

      for (const item of sortedItems) {
        const key = `${item.id}_${item.variantId || 'default'}`;
        const available = itemsRemaining.get(key) || 0;

        for (let i = 0; i < available; i++) {
          itemsProcessed++;
          // Si es la Xª unidad, aplicar descuento
          if (itemsProcessed % buyQty === 0) {
            saved += item.price * (discountPct / 100);
            result.productIds.push(item.id);
          }
        }
      }

      result.savedAmount = saved;
      result.originalPrice = eligibleItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );
      result.discountedPrice = result.originalPrice - saved;
      break;
    }

    case 'buy_x_fixed_price': {
      // Ej: 3 por €10
      const buyQty = discount.buyQuantity;
      const fixedPrice = discount.fixedPrice || 0;
      const setsAvailable = Math.floor(totalEligibleQuantity / buyQty);

      if (setsAvailable === 0) return result;

      // Calcular precio original de los sets
      let originalSetPrice = 0;
      let itemsForSet = buyQty * setsAvailable;

      // Usar los más caros para maximizar el ahorro mostrado
      const expensiveFirst = [...eligibleItems].sort((a, b) => b.price - a.price);

      for (const item of expensiveFirst) {
        if (itemsForSet <= 0) break;
        const key = `${item.id}_${item.variantId || 'default'}`;
        const available = itemsRemaining.get(key) || 0;
        const toUse = Math.min(available, itemsForSet);

        if (toUse > 0) {
          originalSetPrice += item.price * toUse;
          result.productIds.push(item.id);
          itemsForSet -= toUse;
        }
      }

      const discountedSetPrice = fixedPrice * setsAvailable;
      result.savedAmount = Math.max(0, originalSetPrice - discountedSetPrice);
      result.originalPrice = originalSetPrice;
      result.discountedPrice = discountedSetPrice;
      break;
    }

    case 'quantity_percent': {
      // Ej: 5+ unidades = 10% descuento en todas
      const minQty = discount.buyQuantity;
      const discountPct = discount.discountPercent || 0;

      if (totalEligibleQuantity < minQty) return result;

      const originalPrice = eligibleItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );
      const saved = originalPrice * (discountPct / 100);

      result.productIds = eligibleItems.map((i) => i.id);
      result.savedAmount = saved;
      result.originalPrice = originalPrice;
      result.discountedPrice = originalPrice - saved;
      break;
    }
  }

  return result;
}

// ============================================================================
// HELPER PARA OBTENER INFO DE PRODUCTOS
// ============================================================================

export async function getProductInfoForCart(
  items: CartItem[]
): Promise<Map<string, ProductInfo>> {
  const productInfoMap = new Map<string, ProductInfo>();

  try {
    const productIds = [...new Set(items.map((i) => i.id))];

    // Fetch actual product data from Firestore
    const { doc, getDoc } = await import('firebase/firestore');

    const fetchPromises = productIds.map(async (productId) => {
      try {
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const data = productSnap.data();
          return {
            id: productId,
            categoryId: data.categoryId || data.category || undefined,
            tags: data.tags || [],
          };
        }
        return { id: productId, categoryId: undefined, tags: [] };
      } catch (err) {
        logger.warn('[BundleDiscounts] Error fetching product', { productId, error: err });
        return { id: productId, categoryId: undefined, tags: [] };
      }
    });

    const results = await Promise.all(fetchPromises);

    for (const info of results) {
      productInfoMap.set(info.id, info);
    }

    logger.debug('[BundleDiscounts] Product info loaded', {
      count: productInfoMap.size,
      products: Array.from(productInfoMap.entries()).map(([id, info]) => ({
        id,
        categoryId: info.categoryId
      }))
    });
  } catch (error) {
    logger.error('[BundleDiscounts] Error getting product info', error);
  }

  return productInfoMap;
}

// ============================================================================
// INVALIDAR CACHÉ
// ============================================================================

export function invalidateBundleDiscountsCache(): void {
  cachedDiscounts = null;
  cacheTimestamp = 0;
}

// ============================================================================
// REACT HOOK PARA CALCULAR DESCUENTOS DE BUNDLE
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

interface UseBundleDiscountsOptions {
  enabled?: boolean;
}

export function useBundleDiscounts(
  items: CartItem[],
  options: UseBundleDiscountsOptions = {}
) {
  const { enabled = true } = options;
  const [result, setResult] = useState<BundleDiscountResult>({
    appliedDiscounts: [],
    totalDiscount: 0,
    originalTotal: 0,
    finalTotal: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const calculateDiscounts = useCallback(async () => {
    if (!enabled || items.length === 0) {
      setResult({
        appliedDiscounts: [],
        totalDiscount: 0,
        originalTotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        finalTotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get product info (categoryId, tags) for each item
      const productInfoMap = await getProductInfoForCart(items);

      // Calculate bundle discounts
      const discountResult = await calculateBundleDiscounts(items, productInfoMap);

      logger.debug('[useBundleDiscounts] Calculation complete', {
        itemCount: items.length,
        appliedDiscounts: discountResult.appliedDiscounts.length,
        totalDiscount: discountResult.totalDiscount,
      });

      setResult(discountResult);
    } catch (err) {
      logger.error('[useBundleDiscounts] Error calculating discounts', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Fallback to no discounts
      setResult({
        appliedDiscounts: [],
        totalDiscount: 0,
        originalTotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        finalTotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      });
    } finally {
      setLoading(false);
    }
  }, [items, enabled]);

  useEffect(() => {
    calculateDiscounts();
  }, [calculateDiscounts]);

  return {
    ...result,
    loading,
    error,
    refresh: calculateDiscounts,
  };
}
