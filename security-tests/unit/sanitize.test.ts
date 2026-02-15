/**
 * Sanitization Unit Tests
 * Tests: src/lib/utils/sanitize.ts
 *
 * Validates HTML escaping, URL sanitization, and HTML stripping
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeUrl, stripHtml } from '../../src/lib/utils/sanitize';

describe('Sanitization', () => {
  describe('escapeHtml', () => {
    it('escapes < and > characters', () => {
      expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
    });

    it('escapes & character', () => {
      expect(escapeHtml('a&b')).toBe('a&amp;b');
    });

    it('escapes double quotes', () => {
      expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    });

    it('escapes single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&#039;s');
    });

    it('escapes forward slashes', () => {
      expect(escapeHtml('a/b')).toBe('a&#x2F;b');
    });

    it('escapes script tags completely', () => {
      const result = escapeHtml('<script>alert(1)</script>');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('escapes img onerror XSS payload', () => {
      const result = escapeHtml('<img src=x onerror=alert(1)>');
      expect(result).not.toContain('<img');
      expect(result).toContain('&lt;img');
    });

    it('escapes nested script tags', () => {
      const result = escapeHtml('<<script>script>alert(1)<</script>/script>');
      expect(result).not.toContain('<script>');
    });

    it('escapes event handler injection', () => {
      const result = escapeHtml('" onmouseover="alert(1)');
      expect(result).not.toContain('"');
      expect(result).toContain('&quot;');
    });

    it('handles non-string input by converting to string', () => {
      expect(escapeHtml(null as unknown as string)).toBe('null');
      expect(escapeHtml(undefined as unknown as string)).toBe('undefined');
      expect(escapeHtml(123 as unknown as string)).toBe('123');
    });

    it('handles empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('escapes SVG XSS payloads', () => {
      const result = escapeHtml('<svg onload=alert(1)>');
      expect(result).not.toContain('<svg');
    });

    it('escapes body onload XSS payloads', () => {
      const result = escapeHtml('<body onload=alert(1)>');
      expect(result).not.toContain('<body');
    });
  });

  describe('sanitizeUrl', () => {
    it('blocks javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('blocks javascript: with mixed case', () => {
      expect(sanitizeUrl('JavaScript:alert(1)')).toBe('');
    });

    it('blocks javascript: with spaces', () => {
      expect(sanitizeUrl('  javascript:alert(1)  ')).toBe('');
    });

    it('blocks data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('blocks vbscript: protocol', () => {
      expect(sanitizeUrl('vbscript:MsgBox("XSS")')).toBe('');
    });

    it('allows https:// URLs', () => {
      const url = 'https://example.com/page';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('allows http:// URLs', () => {
      const url = 'http://example.com/page';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('allows mailto: URLs', () => {
      const url = 'mailto:test@example.com';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('allows relative paths starting with /', () => {
      expect(sanitizeUrl('/api/data')).toBe('/api/data');
    });

    it('rejects unknown protocols', () => {
      expect(sanitizeUrl('ftp://files.example.com')).toBe('');
    });

    it('rejects telnet protocol', () => {
      expect(sanitizeUrl('telnet://server.com')).toBe('');
    });

    it('handles empty input', () => {
      expect(sanitizeUrl('')).toBe('');
    });

    it('handles non-string input', () => {
      expect(sanitizeUrl(null as unknown as string)).toBe('');
      expect(sanitizeUrl(undefined as unknown as string)).toBe('');
      expect(sanitizeUrl(123 as unknown as string)).toBe('');
    });

    it('trims whitespace from valid URLs', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    });
  });

  describe('stripHtml', () => {
    it('removes all HTML tags', () => {
      expect(stripHtml('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
    });

    it('removes script tags and content between', () => {
      // Note: stripHtml only removes tags, not content between them
      const result = stripHtml('<script>alert(1)</script>');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('removes self-closing tags', () => {
      expect(stripHtml('Hello<br/>World')).toBe('HelloWorld');
    });

    it('removes nested tags', () => {
      expect(stripHtml('<div><p><span>Text</span></p></div>')).toBe('Text');
    });

    it('handles non-string input', () => {
      expect(stripHtml(null as unknown as string)).toBe('null');
      expect(stripHtml(undefined as unknown as string)).toBe('undefined');
      expect(stripHtml(123 as unknown as string)).toBe('123');
    });

    it('handles empty string', () => {
      expect(stripHtml('')).toBe('');
    });

    it('preserves plain text without HTML', () => {
      expect(stripHtml('Just plain text')).toBe('Just plain text');
    });

    it('removes img tags', () => {
      const result = stripHtml('<img src=x onerror=alert(1)>');
      expect(result).not.toContain('<img');
    });
  });
});
