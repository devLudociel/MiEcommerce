type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

export interface RateLimitOptions {
  intervalMs?: number; // ventana, por defecto 60s
  max?: number; // peticiones por ventana, por defecto 30
}

function keyFromRequest(request: Request, scope: string) {
  const ip =
    request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'local';
  return `${scope}:${ip}`;
}

export async function rateLimit(request: Request, scope: string, opts: RateLimitOptions = {}) {
  const interval = opts.intervalMs ?? 60_000;
  const max = opts.max ?? 30;

  const key = keyFromRequest(request, scope);
  const now = Date.now();
  const win = buckets.get(key) || { count: 0, resetAt: now + interval };

  if (now > win.resetAt) {
    win.count = 0;
    win.resetAt = now + interval;
  }

  win.count += 1;
  buckets.set(key, win);

  const remaining = Math.max(0, max - win.count);
  const ok = win.count <= max;
  return { ok, remaining, resetAt: win.resetAt };
}
