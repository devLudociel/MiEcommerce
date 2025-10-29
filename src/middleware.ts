import type { MiddlewareHandler } from 'astro';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const res = await next();
  try {
    // Security headers (conservadores para no romper dev)
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    res.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
    // HSTS solo en https/prod (no forzamos en dev)
    if (context.url.protocol === 'https:') {
      res.headers.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }

    // Content Security Policy (estricta en producción)
    const isProd = import.meta.env.PROD === true;
    if (isProd) {
      const authDomain = (import.meta as any).env.PUBLIC_FIREBASE_AUTH_DOMAIN as string | undefined;
      const firebaseAuthFrame = authDomain ? `https://${authDomain}` : null;
      const csp = [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        // Stripe
        "script-src 'self' https://js.stripe.com",
        // Frames (Stripe + Firebase Auth + Google accounts)
        ["frame-src 'self' https://js.stripe.com https://accounts.google.com", firebaseAuthFrame]
          .filter(Boolean)
          .join(' '),
        // Conexiones a APIs necesarias (Stripe, Firebase)
        "connect-src 'self' https://api.stripe.com https://r.stripe.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://www.googleapis.com https://apis.google.com https://oauth2.googleapis.com",
        // Recursos estáticos
        "img-src 'self' https: data:",
        // Nota: Tailwind y estilos inline (Astro/React) requieren 'unsafe-inline'. Para endurecer más, usar hashes.
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
      ].join('; ');
      res.headers.set('Content-Security-Policy', csp);
    }
  } catch {}
  return res;
};

