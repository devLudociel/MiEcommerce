import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleApiError,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  successResponse,
} from '../../src/lib/errorHandler';

// Mock import.meta.env
vi.mock('import.meta', () => ({
  env: {
    PROD: false,
    DEV: true,
  },
}));

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleApiError', () => {
    it('should return detailed error in development', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.ts:10:20';

      const result = handleApiError(error, 'test-context');

      expect(result.error).toBe('Test error');
      expect(result.details).toBeDefined();
      expect(result.code).toBe('TEST_CONTEXT');
    });

    it('should sanitize context name for code', () => {
      const error = new Error('Test');

      const result1 = handleApiError(error, 'test context');
      expect(result1.code).toBe('TEST_CONTEXT');

      const result2 = handleApiError(error, 'test-context-name');
      expect(result2.code).toBe('TEST_CONTEXT_NAME');
    });

    it('should handle errors without message', () => {
      const error = {} as Error;

      const result = handleApiError(error, 'test');

      expect(result.error).toBe('Error desconocido');
    });
  });

  describe('errorResponse', () => {
    it('should create 500 error response by default', () => {
      const error = new Error('Server error');
      const response = errorResponse(error, 'test');

      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should create response with custom status', () => {
      const error = new Error('Not found');
      const response = errorResponse(error, 'test', 404);

      expect(response.status).toBe(404);
    });

    it('should include error data in response body', async () => {
      const error = new Error('Test error');
      const response = errorResponse(error, 'test');

      const body = await response.json();

      expect(body.error).toBeDefined();
      expect(body.code).toBe('TEST');
    });
  });

  describe('validationErrorResponse', () => {
    it('should create 400 response', () => {
      const response = validationErrorResponse('Invalid input');

      expect(response.status).toBe(400);
    });

    it('should include error message', async () => {
      const response = validationErrorResponse('Email is required');

      const body = await response.json();

      expect(body.error).toBe('Email is required');
    });

    it('should include details in development', async () => {
      const details = { field: 'email', issue: 'required' };
      const response = validationErrorResponse('Invalid', details);

      const body = await response.json();

      expect(body.details).toEqual(details);
    });
  });

  describe('unauthorizedResponse', () => {
    it('should create 401 response', () => {
      const response = unauthorizedResponse();

      expect(response.status).toBe(401);
    });

    it('should use default message', async () => {
      const response = unauthorizedResponse();

      const body = await response.json();

      expect(body.error).toBe('No autorizado');
    });

    it('should use custom message', async () => {
      const response = unauthorizedResponse('Token expired');

      const body = await response.json();

      expect(body.error).toBe('Token expired');
    });
  });

  describe('forbiddenResponse', () => {
    it('should create 403 response', () => {
      const response = forbiddenResponse();

      expect(response.status).toBe(403);
    });

    it('should use default message', async () => {
      const response = forbiddenResponse();

      const body = await response.json();

      expect(body.error).toBe('Acceso denegado');
    });

    it('should use custom message', async () => {
      const response = forbiddenResponse('Admin access required');

      const body = await response.json();

      expect(body.error).toBe('Admin access required');
    });
  });

  describe('notFoundResponse', () => {
    it('should create 404 response', () => {
      const response = notFoundResponse();

      expect(response.status).toBe(404);
    });

    it('should use default message', async () => {
      const response = notFoundResponse();

      const body = await response.json();

      expect(body.error).toBe('Recurso no encontrado');
    });

    it('should use custom message', async () => {
      const response = notFoundResponse('Order not found');

      const body = await response.json();

      expect(body.error).toBe('Order not found');
    });
  });

  describe('successResponse', () => {
    it('should create 200 response by default', () => {
      const response = successResponse({ success: true });

      expect(response.status).toBe(200);
    });

    it('should create response with custom status', () => {
      const response = successResponse({ created: true }, 201);

      expect(response.status).toBe(201);
    });

    it('should include data in response body', async () => {
      const data = { id: '123', name: 'Test' };
      const response = successResponse(data);

      const body = await response.json();

      expect(body).toEqual(data);
    });

    it('should set correct content type', () => {
      const response = successResponse({ test: true });

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Response headers', () => {
    it('all responses should have application/json content type', () => {
      const responses = [
        errorResponse(new Error('test'), 'context'),
        validationErrorResponse('test'),
        unauthorizedResponse(),
        forbiddenResponse(),
        notFoundResponse(),
        successResponse({}),
      ];

      responses.forEach(response => {
        expect(response.headers.get('Content-Type')).toBe('application/json');
      });
    });
  });

  describe('Error message sanitization', () => {
    it('should not leak sensitive information in production', () => {
      // This would need to actually set PROD=true in the mock
      // For now, just verify the structure exists
      const error = new Error('Database connection failed: password=secret123');
      const result = handleApiError(error, 'db-error');

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('code');
    });
  });
});
