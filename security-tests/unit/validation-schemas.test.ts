/**
 * Validation Schemas Security Tests
 * Tests: src/lib/validation/schemas.ts
 *
 * Tests schemas with attack payloads to ensure malicious input is rejected
 */

import { describe, it, expect } from 'vitest';
import {
  shippingInfoSchema,
  couponSchema,
  validateCouponCodeSchema,
  productSchema,
  emailSchema,
  phoneSchema,
  zipCodeSchema,
} from '../../src/lib/validation/schemas';

describe('Validation Schemas - Security', () => {
  describe('shippingInfoSchema - XSS prevention', () => {
    const validShipping = {
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan@example.com',
      phone: '612345678',
      address: 'Calle Test 123',
      city: 'Madrid',
      state: 'Madrid',
      zipCode: '28001',
      country: 'España',
    };

    it('rejects firstName with script tag', () => {
      const result = shippingInfoSchema.safeParse({
        ...validShipping,
        firstName: '<script>alert(1)</script>',
      });
      expect(result.success).toBe(false);
    });

    it('rejects firstName with 10,000 characters', () => {
      const result = shippingInfoSchema.safeParse({
        ...validShipping,
        firstName: 'A'.repeat(10000),
      });
      expect(result.success).toBe(false);
    });

    it('rejects lastName with SQL injection', () => {
      const result = shippingInfoSchema.safeParse({
        ...validShipping,
        lastName: "'; DROP TABLE users;--",
      });
      expect(result.success).toBe(false);
    });

    it('rejects email with XSS payload', () => {
      const result = shippingInfoSchema.safeParse({
        ...validShipping,
        email: '<script>alert(1)</script>@evil.com',
      });
      expect(result.success).toBe(false);
    });

    it('rejects phone with non-numeric characters', () => {
      const result = shippingInfoSchema.safeParse({
        ...validShipping,
        phone: "'; DROP TABLE--",
      });
      expect(result.success).toBe(false);
    });

    it('rejects zipCode that is not exactly 5 digits', () => {
      const result = shippingInfoSchema.safeParse({
        ...validShipping,
        zipCode: '12345; DROP TABLE',
      });
      expect(result.success).toBe(false);
    });

    it('rejects city with numbers', () => {
      const result = shippingInfoSchema.safeParse({
        ...validShipping,
        city: 'Madrid123',
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid Spanish shipping data', () => {
      const result = shippingInfoSchema.safeParse(validShipping);
      expect(result.success).toBe(true);
    });

    it('rejects address with 300 characters (max 200)', () => {
      const result = shippingInfoSchema.safeParse({
        ...validShipping,
        address: 'A'.repeat(300),
      });
      expect(result.success).toBe(false);
    });

    it('rejects notes with 600 characters (max 500)', () => {
      const result = shippingInfoSchema.safeParse({
        ...validShipping,
        notes: 'A'.repeat(600),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('couponSchema - fraud prevention', () => {
    it('rejects code with special characters', () => {
      const result = couponSchema.safeParse({
        code: 'HACK<script>',
        description: 'Test coupon',
        type: 'percentage',
        value: 10,
        active: true,
      });
      expect(result.success).toBe(false);
    });

    it('rejects code longer than 20 characters', () => {
      const result = couponSchema.safeParse({
        code: 'A'.repeat(21),
        description: 'Test coupon',
        type: 'percentage',
        value: 10,
        active: true,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative coupon value', () => {
      const result = couponSchema.safeParse({
        code: 'NEGVAL',
        description: 'Negative value test',
        type: 'fixed',
        value: -50,
        active: true,
      });
      expect(result.success).toBe(false);
    });

    it('rejects percentage value over 100', () => {
      const result = couponSchema.safeParse({
        code: 'OVER100',
        description: 'Over 100 percent test',
        type: 'percentage',
        value: 150,
        active: true,
      });
      expect(result.success).toBe(false);
    });

    it('rejects coupon that has reached usage limit', () => {
      const result = couponSchema.safeParse({
        code: 'MAXUSED',
        description: 'Max used test',
        type: 'percentage',
        value: 10,
        active: true,
        usageLimit: 5,
        timesUsed: 5,
      });
      expect(result.success).toBe(false);
    });

    it('rejects free_shipping with non-zero value', () => {
      const result = couponSchema.safeParse({
        code: 'FREESHIP',
        description: 'Free ship test',
        type: 'free_shipping',
        value: 10,
        active: true,
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid coupon', () => {
      const result = couponSchema.safeParse({
        code: 'VALID10',
        description: 'Valid 10% discount',
        type: 'percentage',
        value: 10,
        active: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('validateCouponCodeSchema', () => {
    it('rejects empty code', () => {
      const result = validateCouponCodeSchema.safeParse({
        code: '',
        cartTotal: 50,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative cartTotal', () => {
      const result = validateCouponCodeSchema.safeParse({
        code: 'TEST10',
        cartTotal: -10,
      });
      expect(result.success).toBe(false);
    });

    it('transforms code to uppercase', () => {
      const result = validateCouponCodeSchema.safeParse({
        code: 'test10',
        cartTotal: 50,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('TEST10');
      }
    });
  });

  describe('productSchema - admin input security', () => {
    const validProduct = {
      name: 'Test Product',
      description: 'This is a test product for security validation',
      slug: 'test-product',
      categoryId: 'cat-1',
      subcategoryId: 'subcat-1',
      basePrice: 29.99,
      attributes: [],
    };

    it('rejects slug with path traversal', () => {
      const result = productSchema.safeParse({
        ...validProduct,
        slug: '../../etc/passwd',
      });
      expect(result.success).toBe(false);
    });

    it('rejects slug with special characters', () => {
      const result = productSchema.safeParse({
        ...validProduct,
        slug: 'product<script>',
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative basePrice', () => {
      const result = productSchema.safeParse({
        ...validProduct,
        basePrice: -10,
      });
      expect(result.success).toBe(false);
    });

    it('rejects basePrice of zero', () => {
      const result = productSchema.safeParse({
        ...validProduct,
        basePrice: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects extremely high basePrice (>999999.99)', () => {
      const result = productSchema.safeParse({
        ...validProduct,
        basePrice: 1000000,
      });
      expect(result.success).toBe(false);
    });

    it('rejects name with 250 characters (max 200)', () => {
      const result = productSchema.safeParse({
        ...validProduct,
        name: 'A'.repeat(250),
      });
      expect(result.success).toBe(false);
    });

    it('rejects description with 2500 characters (max 2000)', () => {
      const result = productSchema.safeParse({
        ...validProduct,
        description: 'A'.repeat(2500),
      });
      expect(result.success).toBe(false);
    });

    it('rejects salePrice >= basePrice when onSale', () => {
      const result = productSchema.safeParse({
        ...validProduct,
        onSale: true,
        salePrice: 35.0,
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid product', () => {
      const result = productSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
    });
  });

  describe('Individual field schemas with attack payloads', () => {
    it('emailSchema rejects clearly invalid email', () => {
      const result = emailSchema.safeParse('not-an-email');
      expect(result.success).toBe(false);
    });

    it('emailSchema normalizes to lowercase', () => {
      const result = emailSchema.safeParse('Admin@Example.COM');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('admin@example.com');
      }
    });

    it('phoneSchema rejects alphabetic input', () => {
      const result = phoneSchema.safeParse('DROP TABLE users');
      expect(result.success).toBe(false);
    });

    it('zipCodeSchema rejects non-5-digit input', () => {
      const result = zipCodeSchema.safeParse('12345; DROP TABLE');
      expect(result.success).toBe(false);
    });

    it('zipCodeSchema rejects letters', () => {
      const result = zipCodeSchema.safeParse('ABCDE');
      expect(result.success).toBe(false);
    });
  });

  describe('Proto pollution and type confusion', () => {
    it('shippingInfoSchema safely handles __proto__ key', () => {
      const malicious = {
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com',
        phone: '612345678',
        address: 'Calle Test 123',
        city: 'Madrid',
        state: 'Madrid',
        zipCode: '28001',
        country: 'España',
        __proto__: { isAdmin: true },
      };
      const result = shippingInfoSchema.safeParse(malicious);
      // Should either succeed (ignoring __proto__) or fail safely
      if (result.success) {
        expect((result.data as any).isAdmin).toBeUndefined();
      }
    });

    it('shippingInfoSchema handles constructor pollution attempt', () => {
      const malicious = {
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com',
        phone: '612345678',
        address: 'Calle Test 123',
        city: 'Madrid',
        state: 'Madrid',
        zipCode: '28001',
        country: 'España',
        constructor: { prototype: { isAdmin: true } },
      };
      const result = shippingInfoSchema.safeParse(malicious);
      if (result.success) {
        expect((result.data as any).isAdmin).toBeUndefined();
      }
    });
  });
});
