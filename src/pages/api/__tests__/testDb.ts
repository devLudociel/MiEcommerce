export function createDb() {
  let idSeq = 1;

  const data: Record<string, Record<string, any>> = {
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
  };

  // FieldValue.increment support (shallow)
  function applyUpdate(current: any, update: any) {
    const result: any = { ...(current || {}) };
    for (const [k, v] of Object.entries(update || {})) {
      if (v && typeof v === 'object' && '__inc' in (v as any)) {
        result[k] = Number(result[k] || 0) + Number((v as any).__inc || 0);
      } else {
        result[k] = v;
      }
    }
    return result;
  }

  const buildDocRef = (colName: string, id: string) => ({
    id,
    async get() {
      const col = data[colName] || {};
      const exists = Object.prototype.hasOwnProperty.call(col, id);
      return {
        exists,
        id,
        data: () => (exists ? col[id] : undefined),
        ref: buildDocRef(colName, id),
      } as any;
    },
    async set(update: any, opts?: any) {
      const col = (data[colName] = data[colName] || {});
      if (opts?.merge) {
        col[id] = applyUpdate(col[id], update);
      } else {
        col[id] = update;
      }
    },
    async update(update: any) {
      const col = (data[colName] = data[colName] || {});
      if (!Object.prototype.hasOwnProperty.call(col, id)) {
        throw new Error('NOT_FOUND');
      }
      col[id] = applyUpdate(col[id], update);
    },
  });

  const buildQuery = (
    name: string,
    filters: Array<[string, string, any]> = [],
    limitCount?: number
  ) => ({
    where: (field: string, op: string, value: any) =>
      buildQuery(name, [...filters, [field, op, value]], limitCount),
    limit: (count: number) => buildQuery(name, filters, count),
    async get() {
      const col = data[name] || {};
      let docs = Object.entries(col).map(([id, doc]) => ({ id, doc }));

      for (const [field, op, value] of filters) {
        if (op !== '==') continue;
        if (field === '__name__') {
          docs = docs.filter((d) => d.id === value);
        } else {
          docs = docs.filter((d) => d.doc?.[field] === value);
        }
      }

      if (typeof limitCount === 'number') docs = docs.slice(0, limitCount);

      const snapDocs = docs.map((d) => ({
        id: d.id,
        data: () => d.doc,
        ref: buildDocRef(name, d.id),
        exists: true,
      }));

      return {
        empty: snapDocs.length === 0,
        size: snapDocs.length,
        docs: snapDocs,
        forEach: (cb: (doc: any) => void) => snapDocs.forEach(cb),
      } as any;
    },
  });

  return {
    data,
    async runTransaction(fn: (tx: any) => Promise<any>) {
      const tx = {
        get: async (ref: any) => ref.get(),
        update: async (ref: any, update: any) => ref.update(update),
        set: async (ref: any, update: any, opts?: any) => ref.set(update, opts),
        create: async (ref: any, update: any) => {
          const snap = await ref.get();
          if (snap.exists) throw new Error('ALREADY_EXISTS');
          return ref.set(update);
        },
      };
      return fn(tx);
    },
    collection(name: string) {
      return {
        add: async (doc: any) => {
          const id = `${name}_${idSeq++}`;
          data[name] = data[name] || {};
          data[name][id] = doc;
          return { id } as any;
        },
        doc: (id: string) => buildDocRef(name, id),
        where: (field: string, op: string, value: any) =>
          buildQuery(name, [[field, op, value]]),
      } as any;
    },
  };
}
