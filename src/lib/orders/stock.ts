import type { Firestore } from 'firebase-admin/firestore';

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

export async function validateStockAvailability(params: {
  db: Firestore;
  items: StockValidationItem[];
}): Promise<StockValidationResult> {
  const items = Array.isArray(params.items) ? params.items : [];
  if (items.length === 0) {
    return { ok: true };
  }

  const grouped = new Map<
    string,
    {
      productId: string;
      productName?: string;
      variantId?: number;
      variantName?: string;
      requested: number;
    }
  >();

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

    grouped.set(key, {
      productId,
      productName: item.name,
      variantId,
      variantName: item.variantName,
      requested,
    });
  }

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

    const trackInventory = Boolean(data.trackInventory);
    if (!trackInventory) continue;

    const allowBackorder = Boolean(data.allowBackorder);
    if (allowBackorder) continue;

    let available = 0;
    let resolvedVariantName: string | undefined;
    const variants = Array.isArray(data.variants) ? (data.variants as Record<string, unknown>[]) : [];

    if (entry.variantId !== undefined) {
      const variant = variants.find(
        (v) => Number(v?.id) === Number(entry.variantId)
      ) as Record<string, unknown> | undefined;

      if (variant) {
        available = Number(variant.stock ?? 0);
        resolvedVariantName = typeof variant.name === 'string' ? variant.name : undefined;
      } else if (variants.length > 0) {
        available = 0;
      } else {
        available = Number(data.stock ?? 0);
      }
    } else {
      available = Number(data.stock ?? 0);
    }

    if (!Number.isFinite(available)) {
      available = 0;
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
