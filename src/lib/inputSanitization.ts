/**
 * Input Sanitization & Validation Library
 *
 * Protege contra:
 * - XSS (Cross-Site Scripting)
 * - SQL Injection (aunque usamos Firestore NoSQL)
 * - NoSQL Injection
 * - Path Traversal
 * - Command Injection
 * - HTML/Script Injection
 */

/**
 * Escapa caracteres HTML peligrosos para prevenir XSS
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Sanitiza un string removiendo caracteres peligrosos para scripts
 */
export function sanitizeString(input: string, options: { maxLength?: number } = {}): string {
  const { maxLength = 1000 } = options;

  // Trim y limitar longitud
  let sanitized = input.trim().slice(0, maxLength);

  // Remover caracteres de control (excepto espacios, tabs, newlines)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remover secuencias de escape peligrosas
  sanitized = sanitized.replace(/\\x[0-9a-fA-F]{2}/g, '');
  sanitized = sanitized.replace(/\\u[0-9a-fA-F]{4}/g, '');

  return sanitized;
}

/**
 * Valida y sanitiza un email
 */
export function sanitizeEmail(email: string): string | null {
  // Trim y lowercase
  const cleaned = email.trim().toLowerCase();

  // Regex simple para validar email
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

  if (!emailRegex.test(cleaned)) {
    return null;
  }

  // Verificar longitud razonable
  if (cleaned.length > 254) {
    return null; // RFC 5321
  }

  return cleaned;
}

/**
 * Sanitiza un nombre (nombre de usuario, nombre de producto, etc.)
 * Solo permite letras, números, espacios, guiones y apóstrofes
 */
export function sanitizeName(name: string, options: { maxLength?: number } = {}): string {
  const { maxLength = 100 } = options;

  // Trim y limitar longitud
  let sanitized = name.trim().slice(0, maxLength);

  // Solo permitir caracteres seguros: letras, números, espacios, guiones, apóstrofes, puntos
  // Incluye caracteres Unicode para nombres internacionales
  sanitized = sanitized.replace(/[^\p{L}\p{N}\s\-'.]/gu, '');

  // Colapsar múltiples espacios
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized.trim();
}

/**
 * Sanitiza un número de teléfono
 * Permite +, números, espacios, guiones, paréntesis
 */
export function sanitizePhone(phone: string): string {
  // Remover todo excepto números, +, espacios, guiones, paréntesis
  const sanitized = phone.replace(/[^\d+\s\-()]/g, '');

  // Limitar longitud
  return sanitized.slice(0, 20);
}

/**
 * Sanitiza una dirección
 */
export function sanitizeAddress(address: string, options: { maxLength?: number } = {}): string {
  const { maxLength = 200 } = options;

  let sanitized = address.trim().slice(0, maxLength);

  // Permitir letras, números, espacios, comas, puntos, guiones, #
  sanitized = sanitized.replace(/[^\p{L}\p{N}\s,.#\-/]/gu, '');

  // Colapsar múltiples espacios
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized.trim();
}

/**
 * Sanitiza un código postal
 */
export function sanitizePostalCode(postalCode: string): string {
  // Permitir números, letras (para códigos postales internacionales), espacios, guiones
  const sanitized = postalCode.toUpperCase().replace(/[^A-Z0-9\s\-]/g, '');

  return sanitized.trim().slice(0, 10);
}

/**
 * Previene NoSQL injection en queries de Firestore
 * Firestore es relativamente seguro, pero esta función previene inputs maliciosos
 */
export function sanitizeFirestoreValue(value: any): any {
  if (typeof value === 'string') {
    // Remover caracteres de control
    return sanitizeString(value);
  }

  if (typeof value === 'number') {
    // Verificar que sea un número válido
    if (!Number.isFinite(value)) {
      throw new Error('Invalid number value');
    }
    return value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    // Sanitizar cada elemento del array
    return value.map((item) => sanitizeFirestoreValue(item));
  }

  if (typeof value === 'object') {
    // Sanitizar cada propiedad del objeto
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      // Sanitizar el key también
      const sanitizedKey = sanitizeString(key, { maxLength: 100 });
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeFirestoreValue(val);
      }
    }
    return sanitized;
  }

  // Tipos no soportados
  throw new Error(`Unsupported value type: ${typeof value}`);
}

/**
 * Previene Path Traversal attacks
 * Remueve ../ y caracteres peligrosos de paths
 */
export function sanitizePath(path: string): string {
  // Remover path traversal attempts
  let sanitized = path.replace(/\.\./g, '');

  // Remover caracteres peligrosos
  sanitized = sanitized.replace(/[^a-zA-Z0-9_\-./]/g, '');

  // Remover múltiples slashes
  sanitized = sanitized.replace(/\/+/g, '/');

  // Remover leading slash si existe
  sanitized = sanitized.replace(/^\//, '');

  return sanitized;
}

/**
 * Valida que un string sea un ID seguro (solo alfanumérico y guiones)
 * Útil para validar IDs de Firestore, order IDs, etc.
 */
export function validateSafeId(id: string, options: { maxLength?: number } = {}): boolean {
  const { maxLength = 128 } = options;

  if (!id || typeof id !== 'string') {
    return false;
  }

  if (id.length === 0 || id.length > maxLength) {
    return false;
  }

  // Solo permitir alfanuméricos, guiones, y underscores
  const safeIdRegex = /^[a-zA-Z0-9_-]+$/;
  return safeIdRegex.test(id);
}

/**
 * Sanitiza un objeto completo recursivamente
 * Útil para sanitizar request bodies
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  schema: Record<string, 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'name' | 'address'>
): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const [key, type] of Object.entries(schema)) {
    const value = obj[key];

    if (value === undefined || value === null) {
      continue;
    }

    switch (type) {
      case 'string':
        if (typeof value === 'string') {
          sanitized[key as keyof T] = sanitizeString(value) as any;
        }
        break;

      case 'number':
        if (typeof value === 'number' && Number.isFinite(value)) {
          sanitized[key as keyof T] = value as any;
        } else if (typeof value === 'string') {
          const num = parseFloat(value);
          if (Number.isFinite(num)) {
            sanitized[key as keyof T] = num as any;
          }
        }
        break;

      case 'boolean':
        if (typeof value === 'boolean') {
          sanitized[key as keyof T] = value as any;
        } else if (value === 'true' || value === 'false') {
          sanitized[key as keyof T] = (value === 'true') as any;
        }
        break;

      case 'email':
        if (typeof value === 'string') {
          const email = sanitizeEmail(value);
          if (email) {
            sanitized[key as keyof T] = email as any;
          }
        }
        break;

      case 'phone':
        if (typeof value === 'string') {
          sanitized[key as keyof T] = sanitizePhone(value) as any;
        }
        break;

      case 'name':
        if (typeof value === 'string') {
          sanitized[key as keyof T] = sanitizeName(value) as any;
        }
        break;

      case 'address':
        if (typeof value === 'string') {
          sanitized[key as keyof T] = sanitizeAddress(value) as any;
        }
        break;
    }
  }

  return sanitized;
}

/**
 * Valida que un valor esté dentro de un conjunto permitido (whitelist)
 */
export function validateWhitelist<T extends string | number>(
  value: T,
  allowedValues: readonly T[]
): boolean {
  return allowedValues.includes(value);
}

/**
 * Valida longitud de string
 */
export function validateLength(
  str: string,
  options: { min?: number; max?: number } = {}
): boolean {
  const { min = 0, max = Infinity } = options;
  return str.length >= min && str.length <= max;
}

/**
 * Valida rango numérico
 */
export function validateRange(
  num: number,
  options: { min?: number; max?: number } = {}
): boolean {
  const { min = -Infinity, max = Infinity } = options;
  return Number.isFinite(num) && num >= min && num <= max;
}
