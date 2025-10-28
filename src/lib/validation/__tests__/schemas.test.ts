import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  zipCodeSchema,
  shippingInfoSchema,
  validateSchema,
  validateField,
} from '../../validation/schemas';

describe('validation schemas', () => {
  it('emailSchema valida emails correctos e incorrectos', () => {
    expect(() => emailSchema.parse('User@Example.COM')).not.toThrow();
    expect(() => emailSchema.parse('bad-email')).toThrow();
  });

  it('zipCodeSchema acepta 5 dígitos y rechaza otros formatos', () => {
    expect(() => zipCodeSchema.parse('28001')).not.toThrow();
    expect(() => zipCodeSchema.parse('2800')).toThrow();
    expect(() => zipCodeSchema.parse('abcde')).toThrow();
  });

  it('validateSchema retorna success con datos válidos', () => {
    const okData = {
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'juan@example.com',
      phone: '612345678',
      address: 'Calle 123',
      city: 'Madrid',
      state: 'Madrid',
      zipCode: '28001',
      country: 'España',
    };
    const res = validateSchema(shippingInfoSchema, okData);
    if (!res.success) {
      // Ayuda de depuración si falla en CI/local
      // eslint-disable-next-line no-console
      console.log('shippingInfoSchema errors:', res.errors);
    }
    expect(res.success).toBe(true);
    expect(res.data).toBeTruthy();
  });

  it('validateSchema acumula errores con datos inválidos', () => {
    const badData = {
      firstName: 'J',
      lastName: 'P',
      email: 'foo',
      phone: '123',
      address: 'xx',
      city: '1',
      state: 'M',
      zipCode: 'abc',
    } as any;
    const res = validateSchema(shippingInfoSchema, badData);
    expect(res.success).toBe(false);
    expect(res.errors).toBeTruthy();
  });

  it('validateField indica válido/invalid con mensaje', () => {
    const ok = validateField(emailSchema, 'ok@example.com');
    expect(ok.valid).toBe(true);
    const bad = validateField(emailSchema, 'nope');
    expect(bad.valid).toBe(false);
    expect(typeof bad.error).toBe('string');
  });
});
