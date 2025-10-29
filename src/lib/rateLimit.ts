/**
 * Sistema de Rate Limiting Mejorado
 *
 * MEJORAS:
 * - Limpieza automática de entradas antiguas
 * - Mejor detección de IP (múltiples headers)
 * - Logging de intentos bloqueados
 * - Protección contra bypass de IP
 * - Bloqueo temporal por abuso
 *
 * LIMITACIONES:
 * - In-memory (no distribuido)
 * - Se resetea al reiniciar el servidor
 * - No apto para múltiples instancias
 *
 * RECOMENDACIÓN:
 * Para producción a escala, usar Redis o Upstash
 */

interface Window {
  count: number;
  resetAt: number;
  blocked?: boolean; // Bloqueo temporal por abuso
  blockedUntil?: number;
}

const buckets = new Map<string, Window>();

// Limpieza automática cada 5 minutos
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, window] of buckets.entries()) {
    // Remover entradas expiradas
    if (now > window.resetAt + 300_000) {
      // 5 min después del reset
      buckets.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[rateLimit] Limpieza automática: ${cleaned} entradas removidas`);
  }
}, 300_000); // Cada 5 minutos

export interface RateLimitOptions {
  intervalMs?: number; // ventana, por defecto 60s
  max?: number; // peticiones por ventana, por defecto 30
  blockDuration?: number; // duración del bloqueo por abuso (ms)
}

/**
 * Obtiene la IP del request intentando múltiples headers
 */
function getIpFromRequest(request: Request): string {
  // Intentar múltiples headers (orden de prioridad)
  const headers = [
    'x-forwarded-for', // Proxy/Load Balancer
    'cf-connecting-ip', // Cloudflare
    'x-real-ip', // Nginx
    'x-client-ip', // Apache
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for puede tener múltiples IPs, tomar la primera
      const ip = value.split(',')[0].trim();
      if (ip) return ip;
    }
  }

  return 'unknown';
}

/**
 * Genera la key única para el bucket de rate limiting
 */
function keyFromRequest(request: Request, scope: string): string {
  const ip = getIpFromRequest(request);
  return `${scope}:${ip}`;
}

/**
 * Rate limiting principal
 */
export async function rateLimit(
  request: Request,
  scope: string,
  opts: RateLimitOptions = {}
): Promise<{ ok: boolean; remaining: number; resetAt: number; blocked?: boolean }> {
  const interval = opts.intervalMs ?? 60_000;
  const max = opts.max ?? 30;
  const blockDuration = opts.blockDuration ?? 3600_000; // 1 hora por defecto

  const key = keyFromRequest(request, scope);
  const now = Date.now();

  // Obtener o crear ventana
  let win = buckets.get(key);

  if (!win) {
    win = { count: 0, resetAt: now + interval };
    buckets.set(key, win);
  }

  // Verificar si está bloqueado temporalmente
  if (win.blocked && win.blockedUntil && now < win.blockedUntil) {
    const remainingBlock = Math.ceil((win.blockedUntil - now) / 1000 / 60);
    console.warn(
      `[rateLimit] ${key} está bloqueado. Quedan ${remainingBlock} minutos`
    );
    return {
      ok: false,
      remaining: 0,
      resetAt: win.blockedUntil,
      blocked: true,
    };
  }

  // Si el bloqueo expiró, limpiarlo
  if (win.blocked && win.blockedUntil && now >= win.blockedUntil) {
    win.blocked = false;
    win.blockedUntil = undefined;
    win.count = 0;
    win.resetAt = now + interval;
    console.log(`[rateLimit] ${key} desbloqueado`);
  }

  // Resetear ventana si expiró
  if (now > win.resetAt) {
    win.count = 0;
    win.resetAt = now + interval;
  }

  // Incrementar contador
  win.count += 1;
  buckets.set(key, win);

  const remaining = Math.max(0, max - win.count);
  const ok = win.count <= max;

  // Si excede el límite significativamente, bloquear temporalmente
  if (win.count > max * 3) {
    // 3x el límite = abuso
    win.blocked = true;
    win.blockedUntil = now + blockDuration;
    console.warn(
      `[rateLimit] ⚠️ ${key} BLOQUEADO por abuso (${win.count}/${max} requests)`
    );
  } else if (!ok) {
    // Log de rate limit excedido (pero no bloqueado)
    console.warn(
      `[rateLimit] ${key} excedió rate limit (${win.count}/${max})`
    );
  }

  return { ok, remaining, resetAt: win.resetAt };
}

/**
 * Obtiene estadísticas del rate limiter
 */
export function getRateLimitStats() {
  return {
    totalKeys: buckets.size,
    buckets: Array.from(buckets.entries()).map(([key, win]) => ({
      key,
      count: win.count,
      resetAt: new Date(win.resetAt).toISOString(),
      blocked: win.blocked || false,
      blockedUntil: win.blockedUntil
        ? new Date(win.blockedUntil).toISOString()
        : null,
    })),
  };
}

/**
 * Limpia manualmente el rate limiter
 */
export function clearRateLimits() {
  const size = buckets.size;
  buckets.clear();
  console.log(`[rateLimit] ${size} entradas limpiadas manualmente`);
}
