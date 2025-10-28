// src/lib/errorHandler.ts

/**
 * Helper para manejo de errores en API endpoints
 * Previene exposición de stack traces y datos sensibles en producción
 */

interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

/**
 * Maneja errores de API de forma segura
 * En producción: Solo mensaje genérico
 * En desarrollo: Información detallada para debugging
 */
export function handleApiError(error: any, context: string): ApiErrorResponse {
  // Logging interno completo (siempre)
  console.error(`[${context}] Error:`, error);

  // En producción, solo mensaje genérico sin stack traces
  if (import.meta.env.PROD) {
    return {
      error: 'Error interno del servidor',
      code: context.toUpperCase().replace(/[\s-]/g, '_'),
    };
  }

  // En desarrollo, información detallada para debugging
  return {
    error: error.message || 'Error desconocido',
    details: error.stack,
    code: context.toUpperCase().replace(/[\s-]/g, '_'),
  };
}

/**
 * Crea una respuesta de error HTTP
 */
export function errorResponse(error: any, context: string, status: number = 500): Response {
  const errorData = handleApiError(error, context);

  return new Response(
    JSON.stringify(errorData),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Errores de validación (400 Bad Request)
 */
export function validationErrorResponse(message: string, details?: any): Response {
  return new Response(
    JSON.stringify({
      error: message,
      details: import.meta.env.DEV ? details : undefined,
    }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Errores de autenticación (401 Unauthorized)
 */
export function unauthorizedResponse(message: string = 'No autorizado'): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Errores de autorización (403 Forbidden)
 */
export function forbiddenResponse(message: string = 'Acceso denegado'): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Recurso no encontrado (404 Not Found)
 */
export function notFoundResponse(message: string = 'Recurso no encontrado'): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Respuesta exitosa
 */
export function successResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
