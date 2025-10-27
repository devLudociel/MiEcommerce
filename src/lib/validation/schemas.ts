// src/lib/validation/schemas.ts
import { z } from 'zod';

// ==========================================
// SCHEMAS PARA CHECKOUT
// ==========================================

// Validación para información de envío
export const shippingInfoSchema = z.object({
  firstName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre es demasiado largo')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'El nombre solo puede contener letras'),

  lastName: z
    .string()
    .min(2, 'Los apellidos deben tener al menos 2 caracteres')
    .max(100, 'Los apellidos son demasiado largos')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'Los apellidos solo pueden contener letras'),

  email: z
    .string()
    .email('Email inválido')
    .min(5, 'El email es demasiado corto')
    .max(100, 'El email es demasiado largo')
    .toLowerCase()
    .trim(),

  phone: z
    .string()
    .min(9, 'El teléfono debe tener al menos 9 dígitos')
    .max(15, 'El teléfono es demasiado largo')
    .regex(
      /^(\+34|0034|34)?[\s\-]?[6-9]\d{2}[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}$/,
      'Teléfono español inválido (ej: 612 345 678 o +34 612 345 678)'
    ),

  address: z
    .string()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(200, 'La dirección es demasiado larga'),

  city: z
    .string()
    .min(2, 'La ciudad debe tener al menos 2 caracteres')
    .max(100, 'La ciudad es demasiado larga')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'La ciudad solo puede contener letras'),

  state: z
    .string()
    .min(2, 'La provincia debe tener al menos 2 caracteres')
    .max(100, 'La provincia es demasiado larga'),

  zipCode: z
    .string()
    .length(5, 'El código postal español debe tener 5 dígitos')
    .regex(/^\d{5}$/, 'Código postal inválido (debe ser 5 números)'),

  country: z.string().default('España'),

  notes: z.string().max(500, 'Las notas son demasiado largas').optional(),
});

export type ShippingInfo = z.infer<typeof shippingInfoSchema>;

// Validación para información de pago con tarjeta
export const cardPaymentSchema = z.object({
  method: z.literal('card'),

  cardNumber: z
    .string()
    .min(13, 'Número de tarjeta demasiado corto')
    .max(19, 'Número de tarjeta demasiado largo')
    .regex(/^[\d\s]+$/, 'El número de tarjeta solo puede contener números')
    .transform((val) => val.replace(/\s/g, ''))
    .refine((val) => val.length >= 13 && val.length <= 19, {
      message: 'Número de tarjeta inválido',
    })
    .refine(
      (val) => {
        // Algoritmo de Luhn para validar números de tarjeta
        let sum = 0;
        let isEven = false;
        for (let i = val.length - 1; i >= 0; i--) {
          let digit = parseInt(val[i], 10);
          if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
          }
          sum += digit;
          isEven = !isEven;
        }
        return sum % 10 === 0;
      },
      { message: 'Número de tarjeta inválido (falla verificación Luhn)' }
    ),

  cardName: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre es demasiado largo')
    .regex(/^[a-zA-Z\s]+$/, 'El nombre solo puede contener letras')
    .transform((val) => val.toUpperCase()),

  cardExpiry: z
    .string()
    .regex(/^\d{2}\/\d{2}$/, 'Formato inválido (debe ser MM/AA)')
    .refine(
      (val) => {
        const [month, year] = val.split('/').map((v) => parseInt(v, 10));
        if (month < 1 || month > 12) return false;
        const currentYear = new Date().getFullYear() % 100;
        const currentMonth = new Date().getMonth() + 1;
        if (year < currentYear) return false;
        if (year === currentYear && month < currentMonth) return false;
        return true;
      },
      { message: 'La tarjeta ha expirado o la fecha es inválida' }
    ),

  cardCVV: z
    .string()
    .min(3, 'CVV debe tener 3-4 dígitos')
    .max(4, 'CVV debe tener 3-4 dígitos')
    .regex(/^\d{3,4}$/, 'CVV inválido (solo números)'),
});

// Validación para otros métodos de pago
export const otherPaymentSchema = z.object({
  method: z.enum(['paypal', 'transfer', 'cash']),
  cardNumber: z.string().optional(),
  cardName: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCVV: z.string().optional(),
});

// Union de schemas de pago
export const paymentInfoSchema = z.discriminatedUnion('method', [
  cardPaymentSchema,
  otherPaymentSchema,
]);

export type PaymentInfo = z.infer<typeof paymentInfoSchema>;

// ==========================================
// SCHEMAS PARA ADMIN PRODUCTOS
// ==========================================

// Validación para slug (URL-friendly)
const slugSchema = z
  .string()
  .min(3, 'El slug debe tener al menos 3 caracteres')
  .max(100, 'El slug es demasiado largo')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido (solo letras minúsculas, números y guiones)')
  .refine((val) => !val.startsWith('-') && !val.endsWith('-'), {
    message: 'El slug no puede empezar ni terminar con guión',
  });

// Validación para precios
const priceSchema = z
  .number({
    required_error: 'El precio es obligatorio',
    invalid_type_error: 'El precio debe ser un número',
  })
  .min(0.01, 'El precio debe ser mayor que 0')
  .max(999999.99, 'El precio es demasiado alto')
  .multipleOf(0.01, 'El precio debe tener máximo 2 decimales');

// Validación para atributos de producto
const productAttributeValueSchema = z.object({
  attributeId: z.string().min(1, 'ID de atributo requerido'),
  value: z.string().min(1, 'Valor de atributo requerido'),
});

// Schema principal de producto
export const productSchema = z
  .object({
    name: z
      .string()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(200, 'El nombre es demasiado largo')
      .trim(),

    description: z
      .string()
      .min(10, 'La descripción debe tener al menos 10 caracteres')
      .max(2000, 'La descripción es demasiado larga')
      .trim(),

    slug: slugSchema,

    categoryId: z.string().min(1, 'Debes seleccionar una categoría'),

    subcategoryId: z.string().min(1, 'Debes seleccionar una subcategoría'),

    basePrice: priceSchema,

    salePrice: priceSchema.optional(),

    onSale: z.boolean().default(false),

    featured: z.boolean().default(false),

    active: z.boolean().default(true),

    attributes: z.array(productAttributeValueSchema).min(0),

    tags: z
      .array(z.string().trim().min(1))
      .default([])
      .transform((tags) => tags.filter(Boolean)),

    images: z.array(z.string().url('URL de imagen inválida')).default([]),

    customizerType: z
      .enum(['shirt', 'frame', 'resin', 'default'])
      .default('default')
      .optional(),
  })
  .refine(
    (data) => {
      // Si está en oferta, debe tener precio de oferta
      if (data.onSale && !data.salePrice) {
        return false;
      }
      return true;
    },
    {
      message: 'Si el producto está en oferta, debe tener un precio de oferta',
      path: ['salePrice'],
    }
  )
  .refine(
    (data) => {
      // El precio de oferta debe ser menor que el precio base
      if (data.onSale && data.salePrice && data.salePrice >= data.basePrice) {
        return false;
      }
      return true;
    },
    {
      message: 'El precio de oferta debe ser menor que el precio base',
      path: ['salePrice'],
    }
  );

export type ProductFormData = z.infer<typeof productSchema>;

// ==========================================
// VALIDACIONES INDIVIDUALES (para campos específicos)
// ==========================================

// Para validar un email individual
export const emailSchema = z.string().email('Email inválido').toLowerCase().trim();

// Para validar un teléfono individual
export const phoneSchema = z
  .string()
  .regex(
    /^(\+34|0034|34)?[\s\-]?[6-9]\d{2}[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}$/,
    'Teléfono español inválido'
  );

// Para validar un código postal español
export const zipCodeSchema = z.string().regex(/^\d{5}$/, 'Código postal inválido');

// Para validar URLs
export const urlSchema = z.string().url('URL inválida');

// ==========================================
// UTILIDADES
// ==========================================

/**
 * Formatea errores de Zod para mostrarlos de forma amigable
 */
export function formatZodError(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formatted[path] = err.message;
  });

  return formatted;
}

/**
 * Valida un schema de forma segura y retorna el resultado
 */
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown) {
  try {
    const result = schema.parse(data);
    return { success: true as const, data: result, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        data: null,
        errors: formatZodError(error),
      };
    }
    return {
      success: false as const,
      data: null,
      errors: { _global: 'Error de validación desconocido' },
    };
  }
}

/**
 * Valida un campo individual de forma segura
 */
export function validateField<T>(schema: z.ZodSchema<T>, value: unknown) {
  try {
    schema.parse(value);
    return { valid: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message || 'Error de validación' };
    }
    return { valid: false, error: 'Error de validación desconocido' };
  }
}
