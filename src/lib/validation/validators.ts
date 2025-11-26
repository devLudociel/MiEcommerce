/**
 * Common validation utilities
 * Centralizes validation logic to avoid duplication
 */

/**
 * Validates Spanish postal code (5 digits)
 * @param zipCode - The postal code to validate
 * @returns True if valid Spanish postal code
 *
 * @example
 * validateSpanishZipCode('28001') // true
 * validateSpanishZipCode('2800') // false
 * validateSpanishZipCode('28A01') // false
 */
export function validateSpanishZipCode(zipCode: string): boolean {
  return /^\d{5}$/.test(zipCode);
}

/**
 * Validates email address
 * @param email - The email to validate
 * @returns True if valid email format
 *
 * @example
 * validateEmail('user@example.com') // true
 * validateEmail('invalid.email') // false
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates Spanish phone number
 * Accepts formats: 612345678, +34612345678, 912345678
 * @param phone - The phone number to validate
 * @returns True if valid Spanish phone number
 *
 * @example
 * validateSpanishPhone('612345678') // true
 * validateSpanishPhone('+34612345678') // true
 * validateSpanishPhone('123') // false
 */
export function validateSpanishPhone(phone: string): boolean {
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '');

  // Spanish mobile: 6XX XXX XXX or 7XX XXX XXX
  // Spanish landline: 9XX XXX XXX
  // With country code: +34 XXX XXX XXX
  const regex = /^(\+34)?[679]\d{8}$/;

  return regex.test(cleaned);
}

/**
 * Validates Spanish DNI/NIE
 * @param document - The DNI/NIE to validate
 * @returns True if valid DNI/NIE
 *
 * @example
 * validateSpanishID('12345678Z') // true
 * validateSpanishID('X1234567L') // true (NIE)
 */
export function validateSpanishID(document: string): boolean {
  const cleaned = document.toUpperCase().replace(/[\s-]/g, '');

  // DNI: 8 digits + letter
  const dniRegex = /^\d{8}[A-Z]$/;
  // NIE: X/Y/Z + 7 digits + letter
  const nieRegex = /^[XYZ]\d{7}[A-Z]$/;

  if (!dniRegex.test(cleaned) && !nieRegex.test(cleaned)) {
    return false;
  }

  // Validate check letter
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  let number: number;

  if (/^[XYZ]/.test(cleaned)) {
    // NIE
    number = parseInt(cleaned.substring(1, 8));
    if (cleaned[0] === 'X') number = 0;
    else if (cleaned[0] === 'Y') number = 1;
    else if (cleaned[0] === 'Z') number = 2;
  } else {
    // DNI
    number = parseInt(cleaned.substring(0, 8));
  }

  const expectedLetter = letters[number % 23];
  return cleaned[cleaned.length - 1] === expectedLetter;
}

/**
 * Validates credit card number using Luhn algorithm
 * @param cardNumber - The card number to validate
 * @returns True if valid card number
 *
 * @example
 * validateCardNumber('4532015112830366') // true
 * validateCardNumber('1234567890123456') // false
 */
export function validateCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, '');

  if (!/^\d+$/.test(cleaned)) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validates URL format
 * @param url - The URL to validate
 * @returns True if valid URL
 *
 * @example
 * validateURL('https://example.com') // true
 * validateURL('not-a-url') // false
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates password strength
 * Requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number
 * @param password - The password to validate
 * @returns Object with valid flag and message
 *
 * @example
 * validatePassword('Abc12345') // { valid: true, message: '' }
 * validatePassword('weak') // { valid: false, message: '...' }
 */
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una mayúscula' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una minúscula' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos un número' };
  }

  return { valid: true, message: '' };
}

/**
 * Sanitizes string to prevent XSS
 * @param input - The string to sanitize
 * @returns Sanitized string
 *
 * @example
 * sanitizeInput('<script>alert("xss")</script>') // '&lt;script&gt;alert("xss")&lt;/script&gt;'
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates file extension
 * @param filename - The filename to check
 * @param allowedExtensions - Array of allowed extensions (without dot)
 * @returns True if extension is allowed
 *
 * @example
 * validateFileExtension('image.jpg', ['jpg', 'png']) // true
 * validateFileExtension('file.exe', ['jpg', 'png']) // false
 */
export function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedExtensions.includes(extension) : false;
}

/**
 * Validates file size
 * @param sizeInBytes - File size in bytes
 * @param maxSizeMB - Maximum allowed size in MB
 * @returns Object with valid flag and message
 *
 * @example
 * validateFileSize(1048576, 5) // { valid: true, message: '' }
 * validateFileSize(10485760, 5) // { valid: false, message: '...' }
 */
export function validateFileSize(
  sizeInBytes: number,
  maxSizeMB: number
): { valid: boolean; message: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (sizeInBytes > maxSizeBytes) {
    return {
      valid: false,
      message: `El archivo no debe superar ${maxSizeMB}MB (actual: ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB)`,
    };
  }

  return { valid: true, message: '' };
}

/**
 * Validates image dimensions
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param maxWidth - Maximum allowed width
 * @param maxHeight - Maximum allowed height
 * @returns Object with valid flag and message
 */
export function validateImageDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { valid: boolean; message: string } {
  if (width > maxWidth || height > maxHeight) {
    return {
      valid: false,
      message: `La imagen no debe superar ${maxWidth}x${maxHeight}px (actual: ${width}x${height}px)`,
    };
  }

  return { valid: true, message: '' };
}
