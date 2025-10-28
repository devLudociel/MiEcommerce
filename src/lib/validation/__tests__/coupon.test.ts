import { describe, it, expect } from 'vitest';
import { couponSchema } from '../schemas';

describe('couponSchema', () => {
  const base = {
    code: 'PROMO',
    description: 'descrip',
    active: true,
    type: 'percentage' as const,
    value: 10,
    startDate: new Date(Date.now() - 1000),
    orderLimit: 0,
    usageLimit: 10,
    timesUsed: 0,
    currentUses: 0,
    minPurchase: 0,
  };

  it('acepta porcentaje entre 1 y 100', () => {
    expect(() => couponSchema.parse({ ...base, value: 1 })).not.toThrow();
    expect(() => couponSchema.parse({ ...base, value: 100 })).not.toThrow();
    expect(() => couponSchema.parse({ ...base, value: 0 })).toThrow();
    expect(() => couponSchema.parse({ ...base, value: 101 })).toThrow();
  });

  it('para free_shipping el valor debe ser 0', () => {
    expect(() => couponSchema.parse({ ...base, type: 'free_shipping', value: 0 })).not.toThrow();
    expect(() => couponSchema.parse({ ...base, type: 'free_shipping', value: 1 })).toThrow();
  });

  it('bloquea cuando timesUsed >= usageLimit', () => {
    expect(() => couponSchema.parse({ ...base, usageLimit: 1, timesUsed: 1 })).toThrow();
  });
});
