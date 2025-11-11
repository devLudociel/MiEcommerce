// src/hooks/useFormValidation.ts
import { useState, useCallback } from 'react';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { notify } from '../lib/notifications';
import { formatZodError } from '../lib/validation/schemas';

export interface UseFormValidationOptions {
  /** Si es true, valida en tiempo real al cambiar cada campo */
  validateOnChange?: boolean;
  /** Si es true, valida al perder el foco de un campo */
  validateOnBlur?: boolean;
  /** Si es true, muestra notificaciones toast en errores */
  showToastOnError?: boolean;
  /** Nombre del formulario para logs */
  formName?: string;
}

export interface UseFormValidationReturn<T> {
  /** Errores de validación por campo */
  errors: Record<string, string>;
  /** Si el formulario está siendo validado */
  isValidating: boolean;
  /** Valida todo el formulario */
  validate: (
    data: unknown
  ) => Promise<{ success: boolean; data?: T; errors?: Record<string, string> }>;
  /** Valida un campo individual */
  validateField: (fieldName: string, value: unknown) => Promise<{ valid: boolean; error?: string }>;
  /** Limpia todos los errores */
  clearErrors: () => void;
  /** Limpia el error de un campo específico */
  clearFieldError: (fieldName: string) => void;
  /** Establece un error manualmente en un campo */
  setFieldError: (fieldName: string, error: string) => void;
  /** Establece múltiples errores */
  setErrors: (errors: Record<string, string>) => void;
  /** Handler para onChange con validación */
  handleChange: (fieldName: string, value: unknown) => void;
  /** Handler para onBlur con validación */
  handleBlur: (fieldName: string, value: unknown) => void;
}

/**
 * Hook reutilizable para validación de formularios con Zod
 *
 * @example
 * ```tsx
 * const { errors, validate, validateField, handleChange, handleBlur } = useFormValidation(
 *   shippingInfoSchema,
 *   { validateOnChange: false, validateOnBlur: true }
 * );
 *
 * const onSubmit = async (e) => {
 *   e.preventDefault();
 *   const result = await validate(formData);
 *   if (result.success) {
 *     // Proceder con el submit
 *   }
 * };
 * ```
 */
export function useFormValidation<T>(
  schema: z.ZodSchema<T>,
  options: UseFormValidationOptions = {}
): UseFormValidationReturn<T> {
  const {
    validateOnChange = false,
    validateOnBlur = true,
    showToastOnError = false,
    formName = 'Form',
  } = options;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Valida todo el formulario
   */
  const validate = useCallback(
    async (data: unknown) => {
      setIsValidating(true);
      logger.debug(`[${formName}] Validating form`, { data });

      try {
        const result = schema.parse(data);
        setErrors({});
        logger.info(`[${formName}] Validation successful`);
        return { success: true as const, data: result };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formattedErrors = formatZodError(error);
          setErrors(formattedErrors);

          logger.warn(`[${formName}] Validation failed`, {
            errorCount: error.errors.length,
            errors: formattedErrors,
          });

          if (showToastOnError) {
            const firstError = Object.values(formattedErrors)[0];
            notify.error(firstError || 'Error de validación');
          }

          return { success: false as const, errors: formattedErrors };
        }

        logger.error(`[${formName}] Unexpected validation error`, error);
        const genericError = { _global: 'Error de validación desconocido' };
        setErrors(genericError);

        if (showToastOnError) {
          notify.error('Error de validación inesperado');
        }

        return { success: false as const, errors: genericError };
      } finally {
        setIsValidating(false);
      }
    },
    [schema, formName, showToastOnError]
  );

  /**
   * Valida un campo individual
   */
  const validateField = useCallback(
    async (fieldName: string, value: unknown) => {
      logger.debug(`[${formName}] Validating field`, { fieldName, value });

      // Crear un schema temporal para validar solo este campo
      // ZodObject schemas have a .shape property, but it's not exposed in the base ZodSchema type
      const fieldSchema = (schema as z.ZodObject<z.ZodRawShape>).shape?.[fieldName];

      if (!fieldSchema) {
        logger.warn(`[${formName}] No schema found for field ${fieldName}`);
        return { valid: true };
      }

      try {
        fieldSchema.parse(value);
        // Limpiar error del campo si la validación es exitosa
        setErrors((prev) => {
          const next = { ...prev };
          delete next[fieldName];
          return next;
        });
        return { valid: true };
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessage = error.errors[0]?.message || 'Error de validación';
          setErrors((prev) => ({ ...prev, [fieldName]: errorMessage }));
          logger.debug(`[${formName}] Field validation failed`, { fieldName, error: errorMessage });
          return { valid: false, error: errorMessage };
        }

        return { valid: false, error: 'Error de validación' };
      }
    },
    [schema, formName]
  );

  /**
   * Limpia todos los errores
   */
  const clearErrors = useCallback(() => {
    setErrors({});
    logger.debug(`[${formName}] All errors cleared`);
  }, [formName]);

  /**
   * Limpia el error de un campo específico
   */
  const clearFieldError = useCallback(
    (fieldName: string) => {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
      logger.debug(`[${formName}] Field error cleared`, { fieldName });
    },
    [formName]
  );

  /**
   * Establece un error manualmente
   */
  const setFieldError = useCallback(
    (fieldName: string, error: string) => {
      setErrors((prev) => ({ ...prev, [fieldName]: error }));
      logger.debug(`[${formName}] Field error set manually`, { fieldName, error });
    },
    [formName]
  );

  /**
   * Handler para onChange con validación opcional
   */
  const handleChange = useCallback(
    (fieldName: string, value: unknown) => {
      if (validateOnChange) {
        validateField(fieldName, value);
      } else {
        // Limpiar error si existe
        clearFieldError(fieldName);
      }
    },
    [validateOnChange, validateField, clearFieldError]
  );

  /**
   * Handler para onBlur con validación opcional
   */
  const handleBlur = useCallback(
    (fieldName: string, value: unknown) => {
      if (validateOnBlur) {
        validateField(fieldName, value);
      }
    },
    [validateOnBlur, validateField]
  );

  return {
    errors,
    isValidating,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    setFieldError,
    setErrors,
    handleChange,
    handleBlur,
  };
}

/**
 * Hook simplificado para validación básica de formularios
 * Solo valida al submit, sin validación en tiempo real
 *
 * @example
 * ```tsx
 * const { errors, validate } = useSimpleFormValidation(productSchema);
 * ```
 */
export function useSimpleFormValidation<T>(schema: z.ZodSchema<T>) {
  return useFormValidation(schema, {
    validateOnChange: false,
    validateOnBlur: false,
    showToastOnError: true,
  });
}
