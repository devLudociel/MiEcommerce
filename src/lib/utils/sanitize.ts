/**
 * HTML sanitization utilities for preventing XSS attacks
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param unsafe - Untrusted user input
 * @returns Safe HTML-escaped string
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') {
    return String(unsafe);
  }

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize URL to prevent javascript: and data: URIs
 * @param url - URL to validate
 * @returns Safe URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    console.warn('[sanitizeUrl] Blocked dangerous URL:', url);
    return '';
  }

  // Only allow http, https, mailto
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('mailto:') &&
    !trimmed.startsWith('/')
  ) {
    console.warn('[sanitizeUrl] Invalid URL protocol:', url);
    return '';
  }

  return url.trim();
}

/**
 * Strip all HTML tags from string
 * @param html - HTML string
 * @returns Plain text
 */
export function stripHtml(html: string): string {
  if (typeof html !== 'string') {
    return String(html);
  }

  return html.replace(/<[^>]*>/g, '');
}
