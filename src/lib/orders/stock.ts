import type { Firestore, DocumentReference } from 'firebase-admin/firestore';

export type StockValidationCode = 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK';

export interface StockValidationDetails {
  productId: string;
  productName?: string;
  variantId?: number;
  variantName?: string;
  available: number;
  requested: number;
}

export type StockValidationResult =
  | { ok: true }
  | { ok: false; code: StockValidationCode; message: string; details: StockValidationDetails };

interface StockValidationItem {
  productId: string;
  quantity: number;
  name?: string;
  variantId?: number;
  variantName?: string;
}

export interface StockReservationItem {
  productId: string;
  quantity: number;
  productName?: string;
  variantId?: number;
  variantName?: string;
}

export type StockReservationResult =
  | { ok: true; reservedItems: StockReservationItem[] }
  | { ok: false; code: StockValidationCode; message: string; details: StockValidationDetails };

const normalizeId = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeQuantity = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 1;
  return Math.floor(numeric);
};

const normalizeVariantId = (value: unknown): number | undefined => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return numeric;
};

type GroupedStockEntry = {
  productId: string;
  productName?: string;
  variantId?: number;
  variantName?: string;
  requested: number;
};

const groupStockItems = (
  items: Array<StockValidationItem | StockReservationItem>
): Map<string, GroupedStockEntry> => {
  const grouped = new Map<string, GroupedStockEntry>();

  for (const item of items) {
    const productId = normalizeId(item.productId);
    if (!productId) continue;
    const variantId = normalizeVariantId(item.variantId);
    const key = `${productId}::${variantId ?? 'default'}`;
    const entry = grouped.get(key);
    const requested = normalizeQuantity(item.quantity);

    if (entry) {
      entry.requested += requested;
      continue;
    }

    const itemName = 'name' in item ? item.name : item.productName;

    grouped.set(key, {
      productId,
      productName: itemName,
      variantId,
      variantName: item.variantName,
      requested,
    });
  }

  return grouped;
};

const resolveStockState = (
  data: Record<string, unknown>,
  entry: GroupedStockEntry
): {
  available: number;
  hasStockValue: boolean;
  variantIndex: number | null;
  resolvedVariantName?: string;
  variants: Array<Record<string, unknown>>;
} => {
  let available = 0;
  let hasStockValue = false;
  let resolvedVariantName: string | undefined;
  const variants = Array.isArray(data.variants) ? (data.variants as Record<string, unknown>[]) : [];
  let variantIndex: number | null = null;

  if (entry.variantId !== undefined) {
    variantIndex = variants.findIndex((v) => Number(v?.id) === Number(entry.variantId));
    if (variantIndex >= 0) {
      const variant = variants[variantIndex];
      available = Number(variant?.stock ?? 0);
      hasStockValue = variant?.stock !== undefined && variant?.stock !== null;
      resolvedVariantName = typeof variant?.name === 'string' ? String(variant.name) : undefined;
    } else if (variants.length > 0) {
      available = 0;
      hasStockValue = true;
    } else {
      available = Number(data.stock ?? 0);
      hasStockValue = data.stock !== undefined && data.stock !== null;
    }
  } else {
    available = Number(data.stock ?? 0);
    hasStockValue = data.stock !== undefined && data.stock !== null;
  }

  if (!Number.isFinite(available)) {
    available = 0;
  }

  return {
    available,
    hasStockValue,
    variantIndex,
    resolvedVariantName,
    variants,
  };
};

export async function validateStockAvailability(params: {
  db: Firestore;
  items: StockValidationItem[];
}): Promise<StockValidationResult> {
  const items = Array.isArray(params.items) ? params.items : [];
  if (items.length === 0) {
    return { ok: true };
  }

  const grouped = groupStockItems(items);

  if (grouped.size === 0) {
    return { ok: true };
  }

  const productIds = [...new Set(Array.from(grouped.values(), (entry) => entry.productId))];
  const productSnaps = await Promise.all(
    productIds.map((id) => params.db.collection('products').doc(id).get())
  );

  const productMap = new Map<string, Record<string, unknown>>();
  productSnaps.forEach((snap, idx) => {
    if (snap.exists) {
      productMap.set(productIds[idx], (snap.data() || {}) as Record<string, unknown>);
    }
  });

  for (const entry of grouped.values()) {
    const data = productMap.get(entry.productId);
    if (!data) {
      return {
        ok: false,
        code: 'OUT_OF_STOCK',
        message: 'Producto no disponible',
        details: {
          productId: entry.productId,
          productName: entry.productName,
          variantId: entry.variantId,
          variantName: entry.variantName,
          available: 0,
          requested: entry.requested,
        },
      };
    }

    const allowBackorder = Boolean(data.allowBackorder);
    if (allowBackorder) continue;

    const { available, hasStockValue, resolvedVariantName } = resolveStockState(data, entry);

    const trackInventory = Boolean(data.trackInventory);
    if (!trackInventory && !hasStockValue) {
      continue;
    }

    const productName =
      entry.productName || (typeof data.name === 'string' ? data.name : undefined);
    const variantName = entry.variantName || resolvedVariantName;

    if (available <= 0) {
      return {
        ok: false,
        code: 'OUT_OF_STOCK',
        message: productName
          ? `Producto sin stock: ${productName}`
          : 'Producto sin stock',
        details: {
          productId: entry.productId,
          productName,
          variantId: entry.variantId,
          variantName,
          available,
          requested: entry.requested,
        },
      };
    }

    if (entry.requested > available) {
      return {
        ok: false,
        code: 'INSUFFICIENT_STOCK',
        message: productName
          ? `Solo hay ${available} unidades disponibles de ${productName}`
          : `Solo hay ${available} unidades disponibles`,
        details: {
          productId: entry.productId,
          productName,
          variantId: entry.variantId,
          variantName,
          available,
          requested: entry.requested,
        },
      };
    }
  }

  return { ok: true };
}

export async function reserveStockForOrder(params: {
  db: Firestore;
  items: StockValidationItem[];
}): Promise<StockReservationResult> {
  const items = Array.isArray(params.items) ? params.items : [];
  if (items.length === 0) {
    return { ok: true, reservedItems: [] };
  }

  const grouped = groupStockItems(items);
  if (grouped.size === 0) {
    return { ok: true, reservedItems: [] };
  }

  const productIds = [...new Set(Array.from(grouped.values(), (entry) => entry.productId))];
  const reservedItems: StockReservationItem[] = [];

  try {
    await params.db.runTransaction(async (tx) => {
      const refs = productIds.map((id) => params.db.collection('products').doc(id));
      const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
      const productMap = new Map<string, { ref: DocumentReference; data: Record<string, unknown> }>();

      snaps.forEach((snap, idx) => {
        if (snap.exists) {
          productMap.set(productIds[idx], {
            ref: refs[idx],
            data: { ...(snap.data() || {}) },
          });
        }
      });

      for (const entry of grouped.values()) {
        const record = productMap.get(entry.productId);
        if (!record) {
          const details: StockValidationDetails = {
            productId: entry.productId,
            productName: entry.productName,
            variantId: entry.variantId,
            variantName: entry.variantName,
            available: 0,
            requested: entry.requested,
          };
          const error = new Error('OUT_OF_STOCK');
          (error as any).details = details;
          throw error;
        }

        const data = record.data;
        const allowBackorder = Boolean(data.allowBackorder);
        if (allowBackorder) {
          continue;
        }

        const {
          available,
          hasStockValue,
          variantIndex,
          resolvedVariantName,
          variants,
        } = resolveStockState(data, entry);

        const trackInventory = Boolean(data.trackInventory);
        if (!trackInventory && !hasStockValue) {
          continue;
        }

        const productName =
          entry.productName || (typeof data.name === 'string' ? data.name : undefined);
        const variantName = entry.variantName || resolvedVariantName;

        if (available <= 0) {
          const details: StockValidationDetails = {
            productId: entry.productId,
            productName,
            variantId: entry.variantId,
            variantName,
            available,
            requested: entry.requested,
          };
          const error = new Error('OUT_OF_STOCK');
          (error as any).details = details;
          throw error;
        }

        if (entry.requested > available) {
          const details: StockValidationDetails = {
            productId: entry.productId,
            productName,
            variantId: entry.variantId,
            variantName,
            available,
            requested: entry.requested,
          };
          const error = new Error('INSUFFICIENT_STOCK');
          (error as any).details = details;
          throw error;
        }

        if (entry.variantId !== undefined && variantIndex !== null && variantIndex >= 0) {
          const newVariants = [...variants];
          const variant = newVariants[variantIndex] || {};
          newVariants[variantIndex] = {
            ...variant,
            stock: Math.max(0, Number(variant.stock ?? 0) - entry.requested),
          };
          record.data = { ...record.data, variants: newVariants };
          tx.update(record.ref, { variants: newVariants });
        } else {
          const currentStock = Number(data.stock ?? 0);
          const newStock = Math.max(0, currentStock - entry.requested);
          record.data = { ...record.data, stock: newStock };
          tx.update(record.ref, { stock: newStock });
        }

        reservedItems.push({
          productId: entry.productId,
          productName,
          variantId: entry.variantId,
          variantName,
          quantity: entry.requested,
        });
      }
    });
  } catch (error) {
    const code =
      error instanceof Error && (error.message === 'OUT_OF_STOCK' || error.message === 'INSUFFICIENT_STOCK')
        ? (error.message as StockValidationCode)
        : null;
    const details =
      error && typeof error === 'object' && 'details' in error ? (error as any).details : null;

    if (code && details) {
      const message =
        code === 'OUT_OF_STOCK'
          ? details.productName
            ? `Producto sin stock: ${details.productName}`
            : 'Producto sin stock'
          : details.productName
            ? `Solo hay ${details.available} unidades disponibles de ${details.productName}`
            : `Solo hay ${details.available} unidades disponibles`;
      return { ok: false, code, message, details };
    }

    throw error;
  }

  return { ok: true, reservedItems };
}

export async function releaseReservedStock(params: {
  db: Firestore;
  items: StockReservationItem[];
}): Promise<void> {
  const items = Array.isArray(params.items) ? params.items : [];
  if (items.length === 0) return;

  const grouped = groupStockItems(items);
  if (grouped.size === 0) return;

  const productIds = [...new Set(Array.from(grouped.values(), (entry) => entry.productId))];

  await params.db.runTransaction(async (tx) => {
    const refs = productIds.map((id) => params.db.collection('products').doc(id));
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    const productMap = new Map<string, { ref: DocumentReference; data: Record<string, unknown> }>();

    snaps.forEach((snap, idx) => {
      if (snap.exists) {
        productMap.set(productIds[idx], {
          ref: refs[idx],
          data: { ...(snap.data() || {}) },
        });
      }
    });

    for (const entry of grouped.values()) {
      const record = productMap.get(entry.productId);
      if (!record) {
        continue;
      }

      const data = record.data;
      const { variantIndex, variants } = resolveStockState(data, entry);

      if (entry.variantId !== undefined && variantIndex !== null && variantIndex >= 0) {
        const newVariants = [...variants];
        const variant = newVariants[variantIndex] || {};
        const currentStock = Number(variant.stock ?? 0);
        newVariants[variantIndex] = {
          ...variant,
          stock: Math.max(0, currentStock + entry.requested),
        };
        record.data = { ...record.data, variants: newVariants };
        tx.update(record.ref, { variants: newVariants });
      } else {
        const currentStock = Number(data.stock ?? 0);
        const newStock = Math.max(0, currentStock + entry.requested);
        record.data = { ...record.data, stock: newStock };
        tx.update(record.ref, { stock: newStock });
      }
    }
  });
}
