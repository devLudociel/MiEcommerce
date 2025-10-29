/**
 * Tests para Security Headers
 */

import { describe, it, expect } from 'vitest';
import {
  getSecurityHeaders,
  applySecurityHeaders,
  isSecureConnection,
  redirectToHttps,
} from '../../src/lib/securityHeaders';

describe('securityHeaders', () => {
  describe('getSecurityHeaders', () => {
    it('should return all required security headers', () => {
      const headers = getSecurityHeaders();

      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers).toHaveProperty('X-Frame-Options');
      expect(headers).toHaveProperty('X-Content-Type-Options');
      expect(headers).toHaveProperty('Referrer-Policy');
      expect(headers).toHaveProperty('Permissions-Policy');
      expect(headers).toHaveProperty('X-XSS-Protection');
      expect(headers).toHaveProperty('Cross-Origin-Opener-Policy');
      expect(headers).toHaveProperty('Cross-Origin-Resource-Policy');
    });

    it('should include HSTS in production mode', () => {
      const headers = getSecurityHeaders({ mode: 'production' });
      expect(headers).toHaveProperty('Strict-Transport-Security');
      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
      expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
      expect(headers['Strict-Transport-Security']).toContain('preload');
    });

    it('should not include HSTS in development mode', () => {
      const headers = getSecurityHeaders({ mode: 'development' });
      expect(headers).not.toHaveProperty('Strict-Transport-Security');
    });

    it('should set X-Frame-Options to DENY', () => {
      const headers = getSecurityHeaders();
      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('should set X-Content-Type-Options to nosniff', () => {
      const headers = getSecurityHeaders();
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should set Referrer-Policy to strict-origin-when-cross-origin', () => {
      const headers = getSecurityHeaders();
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should disable dangerous permissions', () => {
      const headers = getSecurityHeaders();
      const permissionsPolicy = headers['Permissions-Policy'];

      expect(permissionsPolicy).toContain('geolocation=()');
      expect(permissionsPolicy).toContain('microphone=()');
      expect(permissionsPolicy).toContain('camera=()');
      expect(permissionsPolicy).toContain('payment=()');
    });

    it('should set Cross-Origin-Opener-Policy to same-origin', () => {
      const headers = getSecurityHeaders();
      expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    });

    it('should set Cross-Origin-Resource-Policy to same-origin', () => {
      const headers = getSecurityHeaders();
      expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
    });
  });

  describe('Content Security Policy', () => {
    it('should include default-src self', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      expect(csp).toContain("default-src 'self'");
    });

    it('should allow Stripe scripts', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      expect(csp).toContain('https://js.stripe.com');
    });

    it('should allow Firebase domains in connect-src', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      expect(csp).toContain('firebaseio.com');
      expect(csp).toContain('googleapis.com');
      expect(csp).toContain('firestore.googleapis.com');
    });

    it('should allow inline styles (for Tailwind)', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });

    it('should upgrade insecure requests', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      expect(csp).toContain('upgrade-insecure-requests');
    });

    it('should block object elements', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      expect(csp).toContain("object-src 'none'");
    });

    it('should restrict base-uri', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      expect(csp).toContain("base-uri 'self'");
    });

    it('should restrict form-action', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      expect(csp).toContain("form-action 'self'");
    });

    it('should restrict frame-ancestors', () => {
      const headers = getSecurityHeaders();
      const csp = headers['Content-Security-Policy'];
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should allow unsafe-eval in development mode', () => {
      const headers = getSecurityHeaders({ mode: 'development' });
      const csp = headers['Content-Security-Policy'];
      expect(csp).toContain("'unsafe-eval'");
    });

    it('should not allow unsafe-eval in production mode', () => {
      const headers = getSecurityHeaders({ mode: 'production' });
      const csp = headers['Content-Security-Policy'];
      expect(csp).not.toContain("'unsafe-eval'");
    });

    it('should accept custom trusted domains', () => {
      const headers = getSecurityHeaders({
        trustedDomains: {
          scripts: ['https://example.com'],
          connect: ['https://api.example.com'],
        },
      });
      const csp = headers['Content-Security-Policy'];
      expect(csp).toContain('https://example.com');
      expect(csp).toContain('https://api.example.com');
    });

    it('should accept custom CSP', () => {
      const customCSP = "default-src 'self'; script-src 'self' https://cdn.example.com";
      const headers = getSecurityHeaders({ contentSecurityPolicy: customCSP });
      expect(headers['Content-Security-Policy']).toBe(customCSP);
    });
  });

  describe('applySecurityHeaders', () => {
    it('should apply security headers to existing response', () => {
      const originalResponse = new Response('Hello', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });

      const securedResponse = applySecurityHeaders(originalResponse);

      expect(securedResponse.headers.get('Content-Type')).toBe('text/plain');
      expect(securedResponse.headers.get('X-Frame-Options')).toBe('DENY');
      expect(securedResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should preserve response body', async () => {
      const originalResponse = new Response('Test content', { status: 200 });
      const securedResponse = applySecurityHeaders(originalResponse);
      const body = await securedResponse.text();
      expect(body).toBe('Test content');
    });

    it('should preserve response status', () => {
      const originalResponse = new Response('Not Found', { status: 404 });
      const securedResponse = applySecurityHeaders(originalResponse);
      expect(securedResponse.status).toBe(404);
    });

    it('should not override existing security headers', () => {
      const originalResponse = new Response('Hello', {
        status: 200,
        headers: {
          'X-Frame-Options': 'SAMEORIGIN', // Custom value
        },
      });

      const securedResponse = applySecurityHeaders(originalResponse);

      // Should not override the custom value
      expect(securedResponse.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    });
  });

  describe('isSecureConnection', () => {
    it('should return true for HTTPS protocol', () => {
      const request = new Request('https://example.com/api/test');
      expect(isSecureConnection(request)).toBe(true);
    });

    it('should return false for HTTP protocol without proxy headers', () => {
      const request = new Request('http://example.com/api/test');
      expect(isSecureConnection(request)).toBe(false);
    });

    it('should return true if x-forwarded-proto is https', () => {
      const request = new Request('http://example.com/api/test', {
        headers: { 'x-forwarded-proto': 'https' },
      });
      expect(isSecureConnection(request)).toBe(true);
    });

    it('should return true if cf-visitor indicates https (Cloudflare)', () => {
      const request = new Request('http://example.com/api/test', {
        headers: { 'cf-visitor': '{"scheme":"https"}' },
      });
      expect(isSecureConnection(request)).toBe(true);
    });

    it('should return false if cf-visitor indicates http', () => {
      const request = new Request('http://example.com/api/test', {
        headers: { 'cf-visitor': '{"scheme":"http"}' },
      });
      expect(isSecureConnection(request)).toBe(false);
    });
  });

  describe('redirectToHttps', () => {
    it('should create 301 redirect response', () => {
      const request = new Request('http://example.com/api/test');
      const response = redirectToHttps(request);
      expect(response.status).toBe(301);
    });

    it('should redirect to HTTPS URL', () => {
      const request = new Request('http://example.com/api/test');
      const response = redirectToHttps(request);
      expect(response.headers.get('Location')).toBe('https://example.com/api/test');
    });

    it('should preserve path and query string', () => {
      const request = new Request('http://example.com/api/test?foo=bar');
      const response = redirectToHttps(request);
      expect(response.headers.get('Location')).toBe('https://example.com/api/test?foo=bar');
    });

    it('should include security headers in redirect response', () => {
      const request = new Request('http://example.com/api/test');
      const response = redirectToHttps(request);
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });
});
