/**
 * Tests para Input Sanitization
 */

import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeString,
  sanitizeEmail,
  sanitizeName,
  sanitizePhone,
  sanitizeAddress,
  sanitizePostalCode,
  validateSafeId,
  validateLength,
  validateRange,
  validateWhitelist,
  sanitizeObject,
} from '../../src/lib/inputSanitization';

describe('inputSanitization', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;';
      expect(escapeHtml(input)).toBe(expected);
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      expect(escapeHtml(`He said "hello"`)).toContain('&quot;');
      expect(escapeHtml(`It's fine`)).toContain('&#x27;');
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should limit length', () => {
      const longString = 'a'.repeat(2000);
      const result = sanitizeString(longString, { maxLength: 100 });
      expect(result.length).toBe(100);
    });

    it('should remove control characters', () => {
      const input = 'hello\x00\x01\x02world';
      const result = sanitizeString(input);
      expect(result).toBe('helloworld');
    });

    it('should remove escape sequences', () => {
      const input = 'hello\\x41world\\u0042test';
      const result = sanitizeString(input);
      expect(result).toBe('helloworldtest');
    });
  });

  describe('sanitizeEmail', () => {
    it('should accept valid emails', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
      expect(sanitizeEmail('user.name+tag@example.co.uk')).toBe('user.name+tag@example.co.uk');
    });

    it('should convert to lowercase', () => {
      expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
    });

    it('should reject invalid emails', () => {
      expect(sanitizeEmail('not-an-email')).toBeNull();
      expect(sanitizeEmail('missing@domain')).toBeNull();
      expect(sanitizeEmail('@example.com')).toBeNull();
      expect(sanitizeEmail('test@')).toBeNull();
    });

    it('should reject emails longer than 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(sanitizeEmail(longEmail)).toBeNull();
    });
  });

  describe('sanitizeName', () => {
    it('should accept valid names', () => {
      expect(sanitizeName('John Doe')).toBe('John Doe');
      expect(sanitizeName("O'Connor")).toBe("O'Connor");
      expect(sanitizeName('María José')).toBe('María José');
    });

    it('should remove special characters', () => {
      expect(sanitizeName('John<script>alert(1)</script>Doe')).toBe('JohnscriptalertDoe');
      expect(sanitizeName('Test@#$%Name')).toBe('TestName');
    });

    it('should collapse multiple spaces', () => {
      expect(sanitizeName('John    Doe')).toBe('John Doe');
    });

    it('should limit length', () => {
      const longName = 'a'.repeat(200);
      const result = sanitizeName(longName, { maxLength: 50 });
      expect(result.length).toBe(50);
    });

    it('should trim whitespace', () => {
      expect(sanitizeName('  John Doe  ')).toBe('John Doe');
    });
  });

  describe('sanitizePhone', () => {
    it('should accept valid phone numbers', () => {
      expect(sanitizePhone('+34 123 456 789')).toBe('+34 123 456 789');
      expect(sanitizePhone('(123) 456-7890')).toBe('(123) 456-7890');
    });

    it('should remove invalid characters', () => {
      expect(sanitizePhone('+34-abc-123')).toBe('+34--123');
    });

    it('should limit length to 20 characters', () => {
      const longPhone = '1'.repeat(30);
      expect(sanitizePhone(longPhone)).toHaveLength(20);
    });
  });

  describe('sanitizeAddress', () => {
    it('should accept valid addresses', () => {
      expect(sanitizeAddress('123 Main St.')).toBe('123 Main St.');
      expect(sanitizeAddress('Calle Mayor, 5')).toBe('Calle Mayor, 5');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeAddress('123 Main<script>alert(1)</script>')).toBe('123 Mainscriptalert1script');
    });

    it('should collapse multiple spaces', () => {
      expect(sanitizeAddress('123   Main   St')).toBe('123 Main St');
    });

    it('should limit length', () => {
      const longAddress = 'a'.repeat(300);
      const result = sanitizeAddress(longAddress, { maxLength: 100 });
      expect(result.length).toBe(100);
    });
  });

  describe('sanitizePostalCode', () => {
    it('should accept numeric postal codes', () => {
      expect(sanitizePostalCode('12345')).toBe('12345');
    });

    it('should accept alphanumeric postal codes (UK, Canada)', () => {
      expect(sanitizePostalCode('SW1A 1AA')).toBe('SW1A 1AA');
      expect(sanitizePostalCode('K1A 0B1')).toBe('K1A 0B1');
    });

    it('should convert to uppercase', () => {
      expect(sanitizePostalCode('sw1a 1aa')).toBe('SW1A 1AA');
    });

    it('should remove invalid characters', () => {
      expect(sanitizePostalCode('12345<script>')).toBe('12345SCRIPT');
    });

    it('should limit length to 10 characters', () => {
      expect(sanitizePostalCode('12345678901')).toHaveLength(10);
    });
  });

  describe('validateSafeId', () => {
    it('should accept valid IDs', () => {
      expect(validateSafeId('abc123')).toBe(true);
      expect(validateSafeId('user-123_456')).toBe(true);
      expect(validateSafeId('ORDER_20240101')).toBe(true);
    });

    it('should reject empty IDs', () => {
      expect(validateSafeId('')).toBe(false);
    });

    it('should reject IDs with special characters', () => {
      expect(validateSafeId('user@123')).toBe(false);
      expect(validateSafeId('id<script>')).toBe(false);
      expect(validateSafeId('test.id')).toBe(false);
    });

    it('should reject IDs longer than maxLength', () => {
      const longId = 'a'.repeat(200);
      expect(validateSafeId(longId, { maxLength: 128 })).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(validateSafeId(null as any)).toBe(false);
      expect(validateSafeId(123 as any)).toBe(false);
      expect(validateSafeId(undefined as any)).toBe(false);
    });
  });

  describe('validateWhitelist', () => {
    it('should accept whitelisted values', () => {
      const allowedStatuses = ['pending', 'processing', 'shipped'] as const;
      expect(validateWhitelist('pending', allowedStatuses)).toBe(true);
      expect(validateWhitelist('shipped', allowedStatuses)).toBe(true);
    });

    it('should reject non-whitelisted values', () => {
      const allowedStatuses = ['pending', 'processing', 'shipped'] as const;
      expect(validateWhitelist('cancelled', allowedStatuses)).toBe(false);
      expect(validateWhitelist('hacked', allowedStatuses)).toBe(false);
    });

    it('should work with numeric values', () => {
      const allowedIds = [1, 2, 3, 4, 5] as const;
      expect(validateWhitelist(3, allowedIds)).toBe(true);
      expect(validateWhitelist(10, allowedIds)).toBe(false);
    });
  });

  describe('validateLength', () => {
    it('should validate minimum length', () => {
      expect(validateLength('hello', { min: 3 })).toBe(true);
      expect(validateLength('hi', { min: 3 })).toBe(false);
    });

    it('should validate maximum length', () => {
      expect(validateLength('hello', { max: 10 })).toBe(true);
      expect(validateLength('hello', { max: 3 })).toBe(false);
    });

    it('should validate range', () => {
      expect(validateLength('hello', { min: 3, max: 10 })).toBe(true);
      expect(validateLength('hi', { min: 3, max: 10 })).toBe(false);
      expect(validateLength('verylongstring', { min: 3, max: 10 })).toBe(false);
    });
  });

  describe('validateRange', () => {
    it('should validate minimum value', () => {
      expect(validateRange(10, { min: 5 })).toBe(true);
      expect(validateRange(3, { min: 5 })).toBe(false);
    });

    it('should validate maximum value', () => {
      expect(validateRange(10, { max: 20 })).toBe(true);
      expect(validateRange(30, { max: 20 })).toBe(false);
    });

    it('should validate range', () => {
      expect(validateRange(10, { min: 5, max: 15 })).toBe(true);
      expect(validateRange(3, { min: 5, max: 15 })).toBe(false);
      expect(validateRange(20, { min: 5, max: 15 })).toBe(false);
    });

    it('should reject non-finite numbers', () => {
      expect(validateRange(Infinity, { min: 0, max: 100 })).toBe(false);
      expect(validateRange(-Infinity, { min: 0, max: 100 })).toBe(false);
      expect(validateRange(NaN, { min: 0, max: 100 })).toBe(false);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all fields according to schema', () => {
      const input = {
        name: '  John Doe  ',
        email: 'TEST@EXAMPLE.COM',
        age: '25',
        active: 'true',
      };

      const schema = {
        name: 'name' as const,
        email: 'email' as const,
        age: 'number' as const,
        active: 'boolean' as const,
      };

      const result = sanitizeObject(input, schema);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('test@example.com');
      expect(result.age).toBe(25);
      expect(result.active).toBe(true);
    });

    it('should skip undefined fields', () => {
      const input = {
        name: 'John Doe',
        email: undefined,
      };

      const schema = {
        name: 'name' as const,
        email: 'email' as const,
      };

      const result = sanitizeObject(input, schema);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBeUndefined();
    });

    it('should skip invalid email addresses', () => {
      const input = {
        email: 'not-an-email',
      };

      const schema = {
        email: 'email' as const,
      };

      const result = sanitizeObject(input, schema);
      expect(result.email).toBeUndefined();
    });

    it('should convert string numbers to numbers', () => {
      const input = {
        price: '99.99',
        quantity: '5',
      };

      const schema = {
        price: 'number' as const,
        quantity: 'number' as const,
      };

      const result = sanitizeObject(input, schema);

      expect(result.price).toBe(99.99);
      expect(result.quantity).toBe(5);
    });

    it('should convert string booleans to booleans', () => {
      const input = {
        active: 'true',
        verified: 'false',
      };

      const schema = {
        active: 'boolean' as const,
        verified: 'boolean' as const,
      };

      const result = sanitizeObject(input, schema);

      expect(result.active).toBe(true);
      expect(result.verified).toBe(false);
    });
  });
});
