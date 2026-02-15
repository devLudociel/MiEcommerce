/**
 * Seed data factories for security tests
 * Creates realistic test data in the mock Firestore
 */

import { USERS } from './auth-factory';

type MockDb = {
  data: Record<string, Record<string, any>>;
  collection: (name: string) => any;
};

/** Ensure a collection exists in the mock data store */
function ensureCollection(db: MockDb, name: string) {
  if (!db.data[name]) db.data[name] = {};
}

/**
 * Seed a product
 */
export function seedProduct(
  db: MockDb,
  id: string = 'product-1',
  overrides: Record<string, any> = {}
) {
  ensureCollection(db, 'products');
  db.data.products[id] = {
    name: 'Test Product',
    basePrice: 29.99,
    salePrice: null,
    onSale: false,
    active: true,
    slug: 'test-product',
    categoryId: 'cat-1',
    subcategoryId: 'subcat-1',
    tags: ['test'],
    images: ['https://example.com/img.jpg'],
    stock: 100,
    trackInventory: false,
    allowBackorder: false,
    ...overrides,
  };
  return id;
}

/**
 * Seed an order
 */
export function seedOrder(
  db: MockDb,
  id: string = 'order-1',
  overrides: Record<string, any> = {}
) {
  ensureCollection(db, 'orders');
  db.data.orders[id] = {
    userId: USERS.USER.uid,
    email: USERS.USER.email,
    status: 'pending',
    paymentStatus: 'pending',
    items: [
      {
        productId: 'product-1',
        name: 'Test Product',
        quantity: 1,
        unitPrice: 29.99,
        totalPrice: 29.99,
      },
    ],
    subtotal: 29.99,
    shippingCost: 5.0,
    total: 34.99,
    totalCents: 3499,
    paymentCurrency: 'eur',
    shippingInfo: {
      fullName: 'Test User',
      email: 'user@test.com',
      phone: '612345678',
      address: 'Calle Test 123',
      city: 'Madrid',
      state: 'Madrid',
      zipCode: '28001',
      country: 'España',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  return id;
}

/**
 * Seed a guest order (no userId)
 */
export function seedGuestOrder(
  db: MockDb,
  id: string = 'guest-order-1',
  accessTokenHash: string = 'hashed-token-abc',
  overrides: Record<string, any> = {}
) {
  ensureCollection(db, 'orders');
  db.data.orders[id] = {
    userId: null,
    email: 'guest@test.com',
    status: 'pending',
    paymentStatus: 'pending',
    orderAccessTokenHash: accessTokenHash,
    items: [
      {
        productId: 'product-1',
        name: 'Test Product',
        quantity: 1,
        unitPrice: 29.99,
        totalPrice: 29.99,
      },
    ],
    subtotal: 29.99,
    shippingCost: 5.0,
    total: 34.99,
    totalCents: 3499,
    paymentCurrency: 'eur',
    shippingInfo: {
      fullName: 'Guest User',
      email: 'guest@test.com',
      phone: '612345678',
      address: 'Calle Guest 456',
      city: 'Barcelona',
      state: 'Barcelona',
      zipCode: '08001',
      country: 'España',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  return id;
}

/**
 * Seed a wallet
 */
export function seedWallet(
  db: MockDb,
  userId: string = USERS.USER.uid,
  balance: number = 50.0,
  overrides: Record<string, any> = {}
) {
  ensureCollection(db, 'wallets');
  db.data.wallets[userId] = {
    userId,
    balance,
    reservedBalance: 0,
    totalEarned: balance,
    totalSpent: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  return userId;
}

/**
 * Seed a coupon
 */
export function seedCoupon(
  db: MockDb,
  id: string = 'coupon-1',
  overrides: Record<string, any> = {}
) {
  ensureCollection(db, 'coupons');
  db.data.coupons[id] = {
    code: 'TESTCOUPON',
    type: 'percentage',
    value: 10,
    active: true,
    startDate: new Date(Date.now() - 86400000), // yesterday
    endDate: new Date(Date.now() + 86400000 * 30), // 30 days from now
    maxUses: 100,
    timesUsed: 0,
    maxUsesPerUser: 1,
    minPurchase: 0,
    maxDiscount: null,
    userSpecific: [],
    createdAt: new Date(),
    ...overrides,
  };
  return id;
}

/**
 * Seed an expired coupon
 */
export function seedExpiredCoupon(db: MockDb, id: string = 'expired-coupon') {
  return seedCoupon(db, id, {
    code: 'EXPIRED',
    endDate: new Date(Date.now() - 86400000), // yesterday
  });
}

/**
 * Seed a coupon that has reached max uses
 */
export function seedMaxUsedCoupon(db: MockDb, id: string = 'maxused-coupon') {
  return seedCoupon(db, id, {
    code: 'MAXUSED',
    maxUses: 5,
    timesUsed: 5,
  });
}

/**
 * Seed an address for a user (subcollection)
 */
export function seedAddress(
  db: MockDb,
  userId: string = USERS.USER.uid,
  id: string = 'addr-1',
  overrides: Record<string, any> = {}
) {
  const subCol = `users/${userId}/addresses`;
  db.data[subCol] = db.data[subCol] || {};
  db.data[subCol][id] = {
    label: 'Home',
    fullName: 'Test User',
    address: 'Calle Test 123',
    city: 'Madrid',
    state: 'Madrid',
    zipCode: '28001',
    country: 'España',
    phone: '612345678',
    isDefault: true,
    createdAt: new Date(),
    ...overrides,
  };
  return id;
}

/**
 * Seed a design
 */
export function seedDesign(
  db: MockDb,
  id: string = 'design-1',
  userId: string = USERS.USER.uid,
  overrides: Record<string, any> = {}
) {
  ensureCollection(db, 'designs');
  db.data.designs[id] = {
    userId,
    name: 'My Design',
    productType: 'shirt',
    canvasData: JSON.stringify({ objects: [] }),
    thumbnail: 'https://example.com/thumb.jpg',
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  return id;
}

/**
 * Seed digital product access
 */
export function seedDigitalAccess(
  db: MockDb,
  id: string = 'access-1',
  userId: string = USERS.USER.uid,
  overrides: Record<string, any> = {}
) {
  ensureCollection(db, 'digital_access');
  db.data.digital_access[id] = {
    userId,
    orderId: 'order-1',
    productId: 'digital-product-1',
    filePath: 'digital_products/files/test-file.pdf',
    fileName: 'test-file.pdf',
    fileSize: 1024000,
    downloadCount: 0,
    grantedAt: new Date(),
    ...overrides,
  };
  return id;
}

/**
 * Seed shipping configuration
 */
export function seedShippingConfig(db: MockDb) {
  ensureCollection(db, 'shipping_zones');
  ensureCollection(db, 'shipping_methods');
  db.data.shipping_zones['zone-1'] = {
    active: true,
    priority: 1,
    provinces: ['Madrid', 'Las Palmas'],
    postalCodes: [],
  };
  db.data.shipping_methods['method-1'] = {
    active: true,
    zoneId: 'zone-1',
    name: 'Standard',
    basePrice: 5.0,
    freeFrom: 50.0,
  };
}

/**
 * Seed stock reservation
 */
export function seedStockReservation(
  db: MockDb,
  orderId: string = 'order-1',
  overrides: Record<string, any> = {}
) {
  ensureCollection(db, 'stock_reservations');
  db.data.stock_reservations[orderId] = {
    orderId,
    items: [{ productId: 'product-1', quantity: 1 }],
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min from now
    status: 'active',
    createdAt: new Date(),
    ...overrides,
  };
  return orderId;
}

/**
 * Seed a complete checkout scenario (product + order + shipping)
 */
export function seedCheckoutScenario(db: MockDb) {
  seedProduct(db);
  seedShippingConfig(db);
  seedOrder(db);
  seedStockReservation(db);
  return {
    productId: 'product-1',
    orderId: 'order-1',
    shippingMethodId: 'method-1',
  };
}
