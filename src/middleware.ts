import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const res = await next();
  try {
    // Security headers (conservadores para no romper dev)
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    // HSTS solo en https/prod (no forzamos en dev)
    if (context.url.protocol === 'https:') {
      res.headers.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
  } catch {}
  return res;
};

