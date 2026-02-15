/**
 * In-memory Firebase mock for security tests
 * Enhanced version of the mock from src/pages/api/__tests__/save-order.test.ts
 *
 * Supports: collections, docs, queries, transactions, subcollections, auth
 */

import { TOKEN_MAP } from './auth-factory';

type DocData = Record<string, any>;
type CollectionData = Record<string, DocData>;
type DbData = Record<string, CollectionData>;

function wrapInc(current: DocData, update: DocData): DocData {
  const result: DocData = { ...current };
  for (const [k, v] of Object.entries(update)) {
    if (v && typeof v === 'object' && '__inc' in v) {
      result[k] = (Number(result[k] || 0) + (v as any).__inc) as any;
    } else if (v && typeof v === 'object' && '__del' in v) {
      // support FieldValue.delete()
      delete result[k];
    } else {
      result[k] = v;
    }
  }
  return result;
}

function buildQuery(
  data: DbData,
  name: string,
  filters: Array<[string, string, any]> = [],
  limitCount?: number,
  orderByField?: string,
  orderByDir?: string
) {
  const query = {
    where: (field: string, op: string, value: any) =>
      buildQuery(data, name, [...filters, [field, op, value]], limitCount, orderByField, orderByDir),
    limit: (count: number) =>
      buildQuery(data, name, filters, count, orderByField, orderByDir),
    orderBy: (field: string, dir: string = 'asc') =>
      buildQuery(data, name, filters, limitCount, field, dir),
    async get() {
      const col = data[name] || {};
      let docs = Object.entries(col).map(([id, doc]) => ({ id, doc }));

      for (const [field, op, value] of filters) {
        // FieldPath.documentId() returns '__name__'; compare against doc id
        const getFieldValue = (item: { id: string; doc: DocData }) =>
          field === '__name__' ? item.id : item.doc?.[field];

        switch (op) {
          case '==':
            docs = docs.filter((item) => getFieldValue(item) === value);
            break;
          case '!=':
            docs = docs.filter((item) => getFieldValue(item) !== value);
            break;
          case '>':
            docs = docs.filter((item) => getFieldValue(item) > value);
            break;
          case '>=':
            docs = docs.filter((item) => getFieldValue(item) >= value);
            break;
          case '<':
            docs = docs.filter((item) => getFieldValue(item) < value);
            break;
          case '<=':
            docs = docs.filter((item) => getFieldValue(item) <= value);
            break;
          case 'in':
            docs = docs.filter((item) => Array.isArray(value) && value.includes(getFieldValue(item)));
            break;
          case 'array-contains':
            docs = docs.filter(
              (item) => Array.isArray(getFieldValue(item)) && (getFieldValue(item) as any[]).includes(value)
            );
            break;
        }
      }

      if (orderByField) {
        docs.sort((a, b) => {
          const av = a.doc?.[orderByField];
          const bv = b.doc?.[orderByField];
          if (av < bv) return orderByDir === 'desc' ? 1 : -1;
          if (av > bv) return orderByDir === 'desc' ? -1 : 1;
          return 0;
        });
      }

      if (typeof limitCount === 'number') {
        docs = docs.slice(0, limitCount);
      }

      const snapDocs = docs.map((item) => ({
        id: item.id,
        exists: true,
        data: () => item.doc,
        ref: { id: item.id },
      }));

      return {
        empty: snapDocs.length === 0,
        size: snapDocs.length,
        docs: snapDocs,
        forEach: (cb: (doc: any) => void) => snapDocs.forEach(cb),
      } as any;
    },
  };
  return query;
}

function createDocRef(data: DbData, collectionName: string, id: string) {
  const ref: any = {
    id,
    path: `${collectionName}/${id}`,
    async get() {
      const col = data[collectionName] || {};
      const exists = !!col[id];
      return {
        exists,
        id,
        data: () => (exists ? col[id] : undefined),
        ref, // circular reference back to the docRef itself
      } as any;
    },
    async set(update: DocData, opts?: { merge?: boolean }) {
      const col = (data[collectionName] = data[collectionName] || {});
      const current = col[id] || {};
      col[id] = opts?.merge ? wrapInc(current, update) : update;
    },
    async update(update: DocData) {
      const col = (data[collectionName] = data[collectionName] || {});
      const current = col[id] || {};
      col[id] = wrapInc(current, update);
    },
    async create(docData: DocData) {
      const col = data[collectionName] || {};
      if (col[id]) {
        const err: any = new Error('ALREADY_EXISTS');
        err.code = '6';
        throw err;
      }
      data[collectionName] = data[collectionName] || {};
      data[collectionName][id] = docData;
    },
    async delete() {
      const col = data[collectionName];
      if (col) {
        delete col[id];
      }
    },
    // Subcollection support
    collection(subName: string) {
      const subCollectionName = `${collectionName}/${id}/${subName}`;
      return createCollectionRef(data, subCollectionName);
    },
  };
  return ref;
}

function createCollectionRef(data: DbData, name: string) {
  let idSeq = 1;
  return {
    id: name.split('/').pop() || name,
    path: name,
    add: async (doc: DocData) => {
      const id = `${name.replace(/\//g, '_')}_${idSeq++}`;
      data[name] = data[name] || {};
      data[name][id] = doc;
      return { id } as any;
    },
    where: (field: string, op: string, value: any) =>
      buildQuery(data, name, [[field, op, value]]),
    orderBy: (field: string, dir: string = 'asc') =>
      buildQuery(data, name, [], undefined, field, dir),
    limit: (count: number) => buildQuery(data, name, [], count),
    doc: (id?: string) => createDocRef(data, name, id || `auto_${name.replace(/\//g, '_')}_${idSeq++}`),
    async get() {
      const col = data[name] || {};
      const snapDocs = Object.entries(col).map(([id, doc]) => ({
        id,
        exists: true,
        data: () => doc,
        ref: { id },
      }));
      return {
        empty: snapDocs.length === 0,
        size: snapDocs.length,
        docs: snapDocs,
        forEach: (cb: (doc: any) => void) => snapDocs.forEach(cb),
      } as any;
    },
  } as any;
}

export function createMockDb() {
  const data: DbData = {
    orders: {},
    orders_by_checkout: {},
    products: {},
    wallets: {},
    wallet_transactions: {},
    coupons: {},
    coupon_usage: {},
    bundleDiscounts: {},
    users: {},
    shipping_methods: {},
    shipping_zones: {},
    stock_notifications: {},
    stock_reservations: {},
    stripe_events: {},
    rate_limits: {},
    reviews: {},
    categories: {},
    settings: {},
    designs: {},
    digital_products: {},
    digital_access: {},
    share_links: {},
    support_messages: {},
    newsletter_subscribers: {},
  };

  const db = {
    data,
    async runTransaction(fn: (tx: any) => Promise<any>) {
      const tx = {
        get: async (ref: any) => ref.get(),
        update: async (ref: any, update: DocData) => ref.update(update),
        set: async (ref: any, update: DocData, opts?: any) => ref.set(update, opts),
        create: async (ref: any, update: DocData) => {
          const snap = await ref.get();
          if (snap.exists) {
            throw new Error('ALREADY_EXISTS');
          }
          return ref.set(update);
        },
        delete: async (ref: any) => ref.delete(),
      };
      return fn(tx);
    },
    collection(name: string) {
      return createCollectionRef(data, name);
    },
    doc(path: string) {
      const parts = path.split('/');
      if (parts.length >= 2) {
        const collectionName = parts.slice(0, -1).join('/');
        const docId = parts[parts.length - 1];
        return createDocRef(data, collectionName, docId);
      }
      throw new Error(`Invalid doc path: ${path}`);
    },
    /** Clear all data - use in beforeEach */
    __clear() {
      for (const key of Object.keys(data)) {
        data[key] = {};
      }
    },
  };

  return db;
}

export function createMockAuth() {
  return {
    verifyIdToken: async (token: string) => {
      const user = TOKEN_MAP[token];
      if (!user) {
        throw new Error('Firebase ID token has been revoked or is invalid');
      }
      return {
        uid: user.uid,
        email: user.email,
        admin: user.admin,
      };
    },
    setCustomUserClaims: async (_uid: string, _claims: Record<string, any>) => {
      // no-op in mock
    },
    getUser: async (uid: string) => {
      const user = Object.values(TOKEN_MAP).find((u) => u.uid === uid);
      if (!user) {
        throw new Error('User not found');
      }
      return {
        uid: user.uid,
        email: user.email,
        customClaims: user.admin ? { admin: true } : {},
      };
    },
  };
}

/**
 * Create the complete mock Firebase setup
 */
export function createMockFirebase() {
  const db = createMockDb();
  const auth = createMockAuth();
  return { db, auth, __mockDb: db };
}
