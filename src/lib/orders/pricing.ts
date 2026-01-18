import type { BundleDiscount, AppliedBundleDiscount } from '../../types/firebase';
import type { CustomizationField, CustomizationSchema } from '../../types/customization';
import { getAdminDb } from '../firebase-admin';

export interface OrderItemInput {
  productId: string;
  name?: string;
  quantity: number;
  variantId?: number;
  variantName?: string;
  image?: string;
  customization?: Record<string, unknown>;
}

export interface PricedOrderItem extends OrderItemInput {
  name: string;
  price: number;
  lineTotal: number;
}

export interface OrderPricingInput {
  items: OrderItemInput[];
  shippingInfo?: Record<string, unknown> | null;
  couponCode?: string | null;
  couponId?: string | null;
  useWallet?: boolean;
  userId?: string | null;
}

export interface OrderPricingResult {
  items: PricedOrderItem[];
  subtotal: number;
  bundleDiscount: number;
  bundleDiscountDetails: AppliedBundleDiscount[];
  couponDiscount: number;
  couponCode?: string;
  couponId?: string;
  freeShipping: boolean;
  shippingCost: number;
  tax: number;
  taxRate: number;
  taxType: string;
  taxLabel: string;
  walletDiscount: number;
  total: number;
}

interface ProductInfo {
  id: string;
  categoryId?: string;
  tags?: string[];
}

const MONEY_PRECISION = 2;

function roundMoney(value: number): number {
  const numeric = Number.isFinite(value) ? value : 0;
  return Math.round(numeric * 100) / 100;
}

function floorMoney(value: number): number {
  const numeric = Number.isFinite(value) ? value : 0;
  return Math.floor(numeric * 100) / 100;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date };
  if (typeof maybe.toDate === 'function') return maybe.toDate();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getTaxInfo(state?: string): { rate: number; name: string; label: string } {
  if (state === 'Las Palmas' || state === 'Santa Cruz de Tenerife') {
    return { rate: 0, name: 'IGIC', label: 'IGIC (Exento)' };
  }
  if (state === 'Ceuta' || state === 'Melilla') {
    return { rate: 0, name: 'IPSI', label: 'IPSI (Exento)' };
  }
  return { rate: 0.21, name: 'IVA', label: 'IVA (21%)' };
}

interface CustomizationPricing {
  modifier: number;
  unitPriceOverride?: number;
  quantityOverride?: number;
}

function isQuantityField(field: CustomizationField): boolean {
  if (field.isQuantityMultiplier === true) return true;
  const idLower = field.id.toLowerCase();
  const labelLower = field.label.toLowerCase();
  const quantityKeywords = ['quantity', 'cantidad', 'unidades', 'units', 'qty'];
  return quantityKeywords.some(
    (keyword) => idLower.includes(keyword) || labelLower.includes(keyword)
  );
}

function extractQuantityFromValue(value: unknown): number {
  if (value === undefined || value === null) return 1;
  if (typeof value === 'number') return Math.max(1, Math.floor(value));
  if (typeof value === 'string') {
    const match = value.match(/\d+/);
    if (match) return Math.max(1, parseInt(match[0], 10));
  }
  if (Array.isArray(value)) {
    const first = value[0];
    if (typeof first === 'number') return Math.max(1, Math.floor(first));
    if (typeof first === 'string') {
      const match = first.match(/\d+/);
      if (match) return Math.max(1, parseInt(match[0], 10));
    }
  }
  return 1;
}

function isFieldVisible(
  field: CustomizationField,
  valueMap: Map<string, { value?: unknown }>
): boolean {
  if (!field.condition) return true;
  const dependent = valueMap.get(field.condition.dependsOn)?.value;
  if (Array.isArray(field.condition.showWhen)) {
    return field.condition.showWhen.includes(String(dependent));
  }
  return String(dependent) === String(field.condition.showWhen);
}

function getCustomizationPricing(
  schema: CustomizationSchema | null,
  customization: Record<string, unknown> | undefined
): CustomizationPricing {
  if (!schema || !customization) {
    return { modifier: 0 };
  }

  const rawValues = customization.values;
  if (!rawValues) {
    return { modifier: 0 };
  }

  const valuesArray = Array.isArray(rawValues)
    ? rawValues
    : typeof rawValues === 'object'
      ? Object.values(rawValues as Record<string, unknown>)
      : [];

  const valueMap = new Map<string, { value?: unknown }>();
  valuesArray.forEach((entry) => {
    const record = entry as { fieldId?: string; value?: unknown };
    if (record?.fieldId) {
      valueMap.set(record.fieldId, { value: record.value });
    }
  });

  let modifierTotal = 0;
  let unitPriceOverride: number | undefined;
  let quantityOverride: number | undefined;

  for (const field of schema.fields || []) {
    const valueEntry = valueMap.get(field.id);
    const hasValue = valueEntry && valueEntry.value !== undefined && valueEntry.value !== null;
    const visible = isFieldVisible(field, valueMap);

    if (field.required && visible && !hasValue) {
      throw new Error(`Missing required customization field: ${field.id}`);
    }

    if (!hasValue) {
      continue;
    }

    if (isQuantityField(field)) {
      quantityOverride = extractQuantityFromValue(valueEntry?.value);
    }

    switch (field.fieldType) {
      case 'dropdown': {
        const config = field.config as { options?: Array<Record<string, unknown>> };
        const option = config.options?.find(
          (opt) => String(opt.value) === String(valueEntry?.value)
        );
        if (!option) {
          throw new Error(`Invalid dropdown option for field: ${field.id}`);
        }
        const priceModifier = Number(option.priceModifier ?? 0);
        if (Number.isFinite(priceModifier)) {
          modifierTotal += priceModifier;
        }
        const override = Number(option.unitPriceOverride ?? 0);
        if (Number.isFinite(override) && override > 0) {
          unitPriceOverride = override;
        }
        break;
      }
      case 'radio_group': {
        const config = field.config as { options?: Array<Record<string, unknown>> };
        const option = config.options?.find(
          (opt) => String(opt.value) === String(valueEntry?.value)
        );
        if (!option) {
          throw new Error(`Invalid radio option for field: ${field.id}`);
        }
        const priceModifier = Number(option.priceModifier ?? field.priceModifier ?? 0);
        if (Number.isFinite(priceModifier)) {
          modifierTotal += priceModifier;
        }
        break;
      }
      case 'card_selector': {
        const config = field.config as { options?: Array<Record<string, unknown>> };
        const option = config.options?.find(
          (opt) => String(opt.value) === String(valueEntry?.value)
        );
        if (!option) {
          throw new Error(`Invalid card option for field: ${field.id}`);
        }
        const priceModifier = Number(option.priceModifier ?? field.priceModifier ?? 0);
        if (Number.isFinite(priceModifier)) {
          modifierTotal += priceModifier;
        }
        break;
      }
      case 'checkbox': {
        const checked = valueEntry?.value === true;
        if (checked) {
          const priceModifier = Number(field.priceModifier ?? 0);
          if (Number.isFinite(priceModifier)) {
            modifierTotal += priceModifier;
          }
        }
        break;
      }
      case 'text_input':
      case 'number_input':
      case 'dimensions_input': {
        const priceModifier = Number(field.priceModifier ?? 0);
        if (Number.isFinite(priceModifier)) {
          modifierTotal += priceModifier;
        }
        break;
      }
      case 'color_selector': {
        const config = field.config as {
          availableColors?: Array<Record<string, unknown>>;
          multipleSelection?: boolean;
        };
        const selectedValues = Array.isArray(valueEntry?.value)
          ? valueEntry?.value
          : [valueEntry?.value];
        for (const selected of selectedValues) {
          const color = config.availableColors?.find(
            (opt) => String(opt.id) === String(selected)
          );
          if (color && color.priceModifier !== undefined) {
            const priceModifier = Number(color.priceModifier ?? 0);
            if (Number.isFinite(priceModifier)) {
              modifierTotal += priceModifier;
            }
          }
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    modifier: roundMoney(modifierTotal),
    unitPriceOverride: unitPriceOverride && Number.isFinite(unitPriceOverride) ? unitPriceOverride : undefined,
    quantityOverride: quantityOverride && Number.isFinite(quantityOverride) ? quantityOverride : undefined,
  };
}

function resolveUnitPrice(productData: Record<string, unknown>, variantId?: number): number {
  const variants = productData.variants as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(variants) && variants.length > 0) {
    if (variantId === undefined || variantId === null) {
      throw new Error('Variant required for this product.');
    }
    const variant = variants.find((v) => Number(v.id) === Number(variantId));
    if (!variant) {
      throw new Error(`Variant not found: ${variantId}`);
    }
    const price = Number(variant.price);
    if (!Number.isFinite(price)) {
      throw new Error(`Invalid variant price: ${variantId}`);
    }
    return price;
  }

  const basePrice = Number(productData.basePrice ?? productData.price ?? 0);
  const onSale = Boolean(productData.onSale);
  const salePriceRaw = Number(productData.salePrice ?? 0);
  if (onSale && Number.isFinite(salePriceRaw) && salePriceRaw > 0 && salePriceRaw < basePrice) {
    return salePriceRaw;
  }
  return basePrice;
}

function discountAppliesToProduct(discount: BundleDiscount, productInfo: ProductInfo): boolean {
  switch (discount.applyTo) {
    case 'all':
      return true;
    case 'categories':
      return discount.categoryIds?.includes(productInfo.categoryId || '') || false;
    case 'products':
      return discount.productIds?.includes(productInfo.id) || false;
    case 'tags':
      return productInfo.tags?.some((tag) => discount.tagIds?.includes(tag)) || false;
    default:
      return false;
  }
}

interface DiscountApplication {
  productIds: string[];
  originalPrice: number;
  discountedPrice: number;
  savedAmount: number;
}

function applyDiscountType(
  discount: BundleDiscount,
  items: Array<{ id: string; price: number; quantity: number; variantId?: number }>,
  itemsRemaining: Map<string, number>
): DiscountApplication {
  const result: DiscountApplication = {
    productIds: [],
    originalPrice: 0,
    discountedPrice: 0,
    savedAmount: 0,
  };

  const totalEligibleQuantity = items.reduce((sum, item) => {
    const key = `${item.id}_${item.variantId || 'default'}`;
    return sum + (itemsRemaining.get(key) || 0);
  }, 0);

  if (totalEligibleQuantity < discount.buyQuantity) {
    return result;
  }

  const sortedItems = [...items].sort((a, b) => a.price - b.price);

  switch (discount.type) {
    case 'buy_x_get_y_free': {
      const buyQty = discount.buyQuantity;
      const freeQty = discount.getQuantity || 1;
      const setsAvailable = Math.floor(totalEligibleQuantity / buyQty);
      if (setsAvailable === 0) return result;

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

      result.savedAmount = roundMoney(saved);
      result.originalPrice = roundMoney(
        items.reduce((sum, i) => sum + i.price * i.quantity, 0)
      );
      result.discountedPrice = roundMoney(result.originalPrice - result.savedAmount);
      break;
    }

    case 'buy_x_get_y_percent': {
      const buyQty = discount.buyQuantity;
      const discountPct = discount.discountPercent || 0;
      let itemsProcessed = 0;
      let saved = 0;

      for (const item of sortedItems) {
        const key = `${item.id}_${item.variantId || 'default'}`;
        const available = itemsRemaining.get(key) || 0;
        for (let i = 0; i < available; i++) {
          itemsProcessed++;
          if (itemsProcessed % buyQty === 0) {
            saved += item.price * (discountPct / 100);
            result.productIds.push(item.id);
          }
        }
      }

      result.savedAmount = roundMoney(saved);
      result.originalPrice = roundMoney(
        items.reduce((sum, i) => sum + i.price * i.quantity, 0)
      );
      result.discountedPrice = roundMoney(result.originalPrice - result.savedAmount);
      break;
    }

    case 'buy_x_fixed_price': {
      const buyQty = discount.buyQuantity;
      const fixedPrice = discount.fixedPrice || 0;
      const setsAvailable = Math.floor(totalEligibleQuantity / buyQty);
      if (setsAvailable === 0) return result;

      let originalSetPrice = 0;
      let itemsForSet = buyQty * setsAvailable;
      const expensiveFirst = [...items].sort((a, b) => b.price - a.price);

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
      result.savedAmount = roundMoney(Math.max(0, originalSetPrice - discountedSetPrice));
      result.originalPrice = roundMoney(originalSetPrice);
      result.discountedPrice = roundMoney(discountedSetPrice);
      break;
    }

    case 'quantity_percent': {
      const minQty = discount.buyQuantity;
      const discountPct = discount.discountPercent || 0;
      if (totalEligibleQuantity < minQty) return result;
      const originalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const saved = originalPrice * (discountPct / 100);
      result.productIds = items.map((i) => i.id);
      result.savedAmount = roundMoney(saved);
      result.originalPrice = roundMoney(originalPrice);
      result.discountedPrice = roundMoney(originalPrice - saved);
      break;
    }
  }

  return result;
}

function calculateBundleDiscounts(
  items: Array<{ id: string; price: number; quantity: number; variantId?: number }>,
  productInfoMap: Map<string, ProductInfo>,
  discounts: BundleDiscount[]
): { totalDiscount: number; appliedDiscounts: AppliedBundleDiscount[] } {
  const appliedDiscounts: AppliedBundleDiscount[] = [];
  let totalDiscount = 0;

  const itemsRemaining = new Map<string, number>();
  items.forEach((item) => {
    const key = `${item.id}_${item.variantId || 'default'}`;
    itemsRemaining.set(key, item.quantity);
  });

  for (const discount of discounts) {
    const eligibleItems = items.filter((item) => {
      const productInfo = productInfoMap.get(item.id);
      if (!productInfo) return false;
      return discountAppliesToProduct(discount, productInfo);
    });

    if (eligibleItems.length === 0) continue;

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
      if (!discount.stackable) break;
    }
  }

  return { totalDiscount: roundMoney(totalDiscount), appliedDiscounts };
}

async function getActiveBundleDiscounts(db: ReturnType<typeof getAdminDb>): Promise<BundleDiscount[]> {
  const snapshot = await db.collection('bundleDiscounts').where('active', '==', true).get();
  const now = new Date();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as BundleDiscount))
    .filter((discount) => {
      const startDate = toDate(discount.startDate) || new Date(0);
      const endDate = toDate(discount.endDate) || new Date(9999, 11, 31);
      return startDate <= now && endDate >= now;
    })
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

async function getCustomizationSchema(
  db: ReturnType<typeof getAdminDb>,
  productData: Record<string, unknown>
): Promise<CustomizationSchema | null> {
  const schemaId = normalizeString(
    productData.customizationSchemaId || productData.categoryId || productData.category
  );
  if (!schemaId) return null;
  const schemaSnap = await db.collection('customization_schemas').doc(schemaId).get();
  if (!schemaSnap.exists) return null;
  const schemaData = schemaSnap.data() as { schema?: CustomizationSchema } | undefined;
  return schemaData?.schema || null;
}

function hasCustomizationValues(customization: Record<string, unknown> | undefined): boolean {
  const rawValues = customization?.values;
  if (!rawValues) return false;
  if (Array.isArray(rawValues)) return rawValues.length > 0;
  if (typeof rawValues === 'object') return Object.keys(rawValues).length > 0;
  return false;
}

async function getCouponDiscount(
  db: ReturnType<typeof getAdminDb>,
  couponCode: string | null,
  couponId: string | null,
  userId: string | null,
  cartSubtotal: number
): Promise<{ discount: number; couponCode?: string; couponId?: string; freeShipping: boolean }> {
  const normalizedCode = couponCode ? couponCode.trim().toUpperCase() : '';
  let couponDoc: { id: string; data: Record<string, unknown> } | null = null;

  if (couponId) {
    const snap = await db.collection('coupons').doc(couponId).get();
    if (snap.exists) {
      couponDoc = { id: snap.id, data: (snap.data() || {}) as Record<string, unknown> };
    }
  }

  if (!couponDoc && normalizedCode) {
    const querySnap = await db
      .collection('coupons')
      .where('code', '==', normalizedCode)
      .where('active', '==', true)
      .get();
    if (!querySnap.empty) {
      const snap = querySnap.docs[0];
      couponDoc = { id: snap.id, data: (snap.data() || {}) as Record<string, unknown> };
    }
  }

  if (!couponDoc) {
    return { discount: 0, freeShipping: false };
  }

  const couponData = couponDoc.data;
  const isActive = Boolean(couponData.active);
  if (!isActive) {
    return { discount: 0, freeShipping: false };
  }

  const startDate = toDate(couponData.startDate);
  const endDate = toDate(couponData.endDate);
  const now = new Date();
  if (startDate && now < startDate) {
    return { discount: 0, freeShipping: false };
  }
  if (endDate && now > endDate) {
    return { discount: 0, freeShipping: false };
  }

  const minPurchase = Number(couponData.minPurchase ?? 0);
  if (minPurchase > 0 && cartSubtotal < minPurchase) {
    return { discount: 0, freeShipping: false };
  }

  const maxUses = Number(couponData.maxUses ?? 0);
  const currentUses = Number(couponData.currentUses ?? 0);
  if (maxUses > 0 && currentUses >= maxUses) {
    return { discount: 0, freeShipping: false };
  }

  const userSpecific = Array.isArray(couponData.userSpecific) ? couponData.userSpecific : [];
  const normalizedUserId = userId && userId !== 'guest' ? userId : null;
  if (userSpecific.length > 0) {
    if (!normalizedUserId) {
      return { discount: 0, freeShipping: false };
    }
    const userSnap = await db.collection('users').doc(normalizedUserId).get();
    const userEmail = normalizeString(userSnap.data()?.email).toLowerCase();
    const allowed = userSpecific.map((v) => String(v).toLowerCase());
    if (!userEmail || !allowed.includes(userEmail)) {
      return { discount: 0, freeShipping: false };
    }
  }

  const maxUsesPerUser = Number(couponData.maxUsesPerUser ?? 0);
  if (maxUsesPerUser > 0 && normalizedUserId) {
    const usageSnap = await db
      .collection('coupon_usage')
      .where('couponId', '==', couponDoc.id)
      .where('userId', '==', normalizedUserId)
      .get();
    if (usageSnap.size >= maxUsesPerUser) {
      return { discount: 0, freeShipping: false };
    }
  }

  const type = String(couponData.type || '');
  const value = Number(couponData.value ?? 0);
  let discount = 0;
  let freeShipping = false;

  if (type === 'percentage') {
    discount = (cartSubtotal * value) / 100;
    const maxDiscount = Number(couponData.maxDiscount ?? 0);
    if (maxDiscount > 0 && discount > maxDiscount) {
      discount = maxDiscount;
    }
  } else if (type === 'fixed') {
    discount = Math.min(value, cartSubtotal);
  } else if (type === 'free_shipping') {
    freeShipping = true;
    discount = 0;
  } else {
    discount = 0;
  }

  return {
    discount: roundMoney(discount),
    couponCode: normalizeString(couponData.code || normalizedCode) || undefined,
    couponId: couponDoc.id,
    freeShipping,
  };
}

async function getShippingCost(
  db: ReturnType<typeof getAdminDb>,
  shippingInfo: Record<string, unknown> | null,
  cartSubtotal: number,
  freeShipping: boolean
): Promise<number> {
  if (!shippingInfo) return 0;
  if (freeShipping) return 0;
  const methodId = normalizeString(shippingInfo.shippingMethodId);
  if (!methodId) {
    throw new Error('Shipping method is required.');
  }

  const postalCode = normalizeString(shippingInfo.zipCode);
  const province = normalizeString(shippingInfo.state);

  const zonesSnap = await db.collection('shipping_zones').where('active', '==', true).get();
  const zones = zonesSnap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));

  const isPostalCodeInRange = (code: string, ranges: string[]): boolean => {
    const numeric = parseInt(code, 10);
    if (Number.isNaN(numeric)) return false;
    for (const range of ranges) {
      if (range.includes('-')) {
        const [start, end] = range.split('-').map((s) => parseInt(s.trim(), 10));
        if (numeric >= start && numeric <= end) return true;
      } else if (range.includes(',')) {
        const codes = range.split(',').map((s) => parseInt(s.trim(), 10));
        if (codes.includes(numeric)) return true;
      } else if (parseInt(range.trim(), 10) === numeric) {
        return true;
      }
    }
    return false;
  };

  const normalizedProvince = province.toLowerCase();
  const matchingZone = zones.find((zone) => {
    const postalCodes = Array.isArray(zone.postalCodes) ? zone.postalCodes : [];
    if (postalCode && postalCodes.length > 0 && isPostalCodeInRange(postalCode, postalCodes)) {
      return true;
    }
    const provinces = Array.isArray(zone.provinces) ? zone.provinces : [];
    if (normalizedProvince && provinces.length > 0) {
      return provinces.some((p) => String(p).toLowerCase().trim() === normalizedProvince);
    }
    return false;
  });

  if (!matchingZone) {
    throw new Error('No shipping zone matches the provided address.');
  }

  const methodSnap = await db.collection('shipping_methods').doc(methodId).get();
  if (!methodSnap.exists) {
    throw new Error('Shipping method not found.');
  }

  const method = methodSnap.data() as Record<string, unknown>;
  if (!method?.active) {
    throw new Error('Shipping method is inactive.');
  }

  const methodZoneId = normalizeString(method.zoneId);
  if (methodZoneId && methodZoneId !== String(matchingZone.id)) {
    throw new Error('Shipping method does not match the selected zone.');
  }

  const threshold = Number(method.freeShippingThreshold ?? 0);
  if (threshold > 0 && cartSubtotal >= threshold) {
    return 0;
  }

  const basePrice = Number(method.basePrice ?? 0);
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new Error('Invalid shipping price.');
  }
  return roundMoney(basePrice);
}

async function getWalletDiscount(
  db: ReturnType<typeof getAdminDb>,
  userId: string | null,
  useWallet: boolean,
  totalBeforeWallet: number
): Promise<number> {
  if (!useWallet) return 0;
  if (!userId || userId === 'guest') return 0;
  const walletSnap = await db.collection('wallets').doc(userId).get();
  if (!walletSnap.exists) return 0;
  const balance = Number(walletSnap.data()?.balance ?? 0);
  return floorMoney(Math.min(balance, totalBeforeWallet));
}

export async function calculateOrderPricing(
  input: OrderPricingInput
): Promise<OrderPricingResult> {
  const db = getAdminDb();
  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length === 0) {
    throw new Error('Order must include at least one item.');
  }

  const productIds = [...new Set(items.map((item) => normalizeString(item.productId)).filter(Boolean))];
  const productSnaps = await Promise.all(
    productIds.map((id) => db.collection('products').doc(id).get())
  );

  const productMap = new Map<string, Record<string, unknown>>();
  const productInfoMap = new Map<string, ProductInfo>();

  productSnaps.forEach((snap, idx) => {
    const id = productIds[idx];
    if (!snap.exists) {
      throw new Error(`Product not found: ${id}`);
    }
    const data = (snap.data() || {}) as Record<string, unknown>;
    if (data.active === false) {
      throw new Error(`Product inactive: ${id}`);
    }
    productMap.set(id, data);
    productInfoMap.set(id, {
      id,
      categoryId: normalizeString(data.categoryId || data.category),
      tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    });
  });

  const schemaMap = new Map<string, CustomizationSchema | null>();
  for (const item of items) {
    const productId = normalizeString(item.productId);
    if (!productId || schemaMap.has(productId)) continue;
    if (!hasCustomizationValues(item.customization as Record<string, unknown> | undefined)) {
      continue;
    }
    const data = productMap.get(productId) || {};
    const schema = await getCustomizationSchema(db, data);
    schemaMap.set(productId, schema);
  }

  const pricedItems: PricedOrderItem[] = items.map((item) => {
    const productId = normalizeString(item.productId);
    const data = productMap.get(productId) || {};
    const baseUnitPrice = resolveUnitPrice(data, item.variantId);
    const customization = item.customization as Record<string, unknown> | undefined;
    const needsSchema = hasCustomizationValues(customization);
    const schema = needsSchema ? schemaMap.get(productId) ?? null : null;
    if (needsSchema && !schema) {
      throw new Error(`Customization schema not found for product: ${productId}`);
    }
    const customizationPricing = getCustomizationPricing(schema, customization);
    const overrideBase = customizationPricing.unitPriceOverride;
    const effectiveBase = overrideBase && overrideBase > 0 ? overrideBase : baseUnitPrice;
    const unitPrice = roundMoney(effectiveBase + customizationPricing.modifier);
    const quantityRaw = Number(item.quantity);
    const sanitizedQuantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.floor(quantityRaw) : 1;
    const quantity =
      customizationPricing.quantityOverride && customizationPricing.quantityOverride > 0
        ? Math.floor(customizationPricing.quantityOverride)
        : sanitizedQuantity;
    const lineTotal = roundMoney(unitPrice * quantity);
    return {
      ...item,
      productId,
      name: normalizeString(data.name) || normalizeString(item.name) || productId,
      price: unitPrice,
      quantity,
      lineTotal,
    };
  });

  const subtotal = roundMoney(pricedItems.reduce((sum, item) => sum + item.lineTotal, 0));

  const discounts = await getActiveBundleDiscounts(db);
  const bundleResult = calculateBundleDiscounts(
    pricedItems.map((item) => ({
      id: item.productId,
      price: item.price,
      quantity: item.quantity,
      variantId: item.variantId,
    })),
    productInfoMap,
    discounts
  );

  const bundleDiscount = roundMoney(bundleResult.totalDiscount);
  const subtotalAfterBundle = Math.max(0, roundMoney(subtotal - bundleDiscount));

  const couponResult = await getCouponDiscount(
    db,
    input.couponCode || null,
    input.couponId || null,
    input.userId || null,
    subtotal
  );

  const couponDiscount = roundMoney(couponResult.discount);
  const subtotalAfterDiscount = Math.max(0, roundMoney(subtotalAfterBundle - couponDiscount));

  const taxInfo = getTaxInfo(normalizeString(input.shippingInfo?.state));
  const tax = roundMoney(subtotalAfterDiscount * taxInfo.rate);

  const shippingCost = await getShippingCost(
    db,
    input.shippingInfo || null,
    subtotal,
    couponResult.freeShipping
  );

  const totalBeforeWallet = roundMoney(subtotalAfterDiscount + shippingCost + tax);
  const walletDiscount = await getWalletDiscount(
    db,
    input.userId || null,
    Boolean(input.useWallet),
    totalBeforeWallet
  );

  const total = roundMoney(Math.max(0, totalBeforeWallet - walletDiscount));

  return {
    items: pricedItems,
    subtotal,
    bundleDiscount,
    bundleDiscountDetails: bundleResult.appliedDiscounts,
    couponDiscount,
    couponCode: couponResult.couponCode,
    couponId: couponResult.couponId,
    freeShipping: couponResult.freeShipping,
    shippingCost,
    tax,
    taxRate: taxInfo.rate,
    taxType: taxInfo.name,
    taxLabel: taxInfo.label,
    walletDiscount,
    total,
  };
}
