/**
 * Security Headers Middleware
 *
 * Aplica headers de seguridad recomendados para proteger contra:
 * - XSS (Cross-Site Scripting)
 * - Clickjacking
 * - MIME sniffing
 * - Information leakage
 * - Man-in-the-middle attacks
 */

export interface SecurityHeadersOptions {
  /**
   * Modo de entorno: 'development' o 'production'
   * En desarrollo, algunos headers son más permisivos
   */
  mode?: 'development' | 'production';

  /**
   * Content Security Policy personalizado
   * Si no se proporciona, se usa una política segura por defecto
   */
  contentSecurityPolicy?: string;

  /**
   * Dominios permitidos para recursos externos (CDNs, etc.)
   */
  trustedDomains?: {
    scripts?: string[];
    styles?: string[];
    images?: string[];
    fonts?: string[];
    connect?: string[]; // APIs externas, Firebase, Stripe, etc.
  };
}

/**
 * Genera headers de seguridad para aplicar a todas las respuestas
 */
export function getSecurityHeaders(options: SecurityHeadersOptions = {}): Record<string, string> {
  const { mode = 'production', contentSecurityPolicy, trustedDomains = {} } = options;

  const isProd = mode === 'production';

  // Construir Content Security Policy
  const csp = contentSecurityPolicy || buildDefaultCSP(trustedDomains, isProd);

  const headers: Record<string, string> = {
    // Content Security Policy - Previene XSS
    'Content-Security-Policy': csp,

    // X-Frame-Options - Previene clickjacking
    // DENY: no permite que la página sea mostrada en iframes
    'X-Frame-Options': 'DENY',

    // X-Content-Type-Options - Previene MIME sniffing
    // nosniff: el navegador debe respetar el Content-Type declarado
    'X-Content-Type-Options': 'nosniff',

    // Referrer-Policy - Controla cuánta información se envía en el Referer header
    // strict-origin-when-cross-origin: envía origin completo en mismo origen,
    // solo origin en cross-origin HTTPS, nada si downgrade a HTTP
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions-Policy - Controla qué features del navegador puede usar la página
    // Deshabilita features peligrosas por defecto
    'Permissions-Policy':
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',

    // X-XSS-Protection - Protección XSS legacy (navegadores antiguos)
    // 1; mode=block: habilita filtro XSS y bloquea la página si detecta ataque
    'X-XSS-Protection': '1; mode=block',

    // Cross-Origin-Opener-Policy - Aislamiento de ventanas
    'Cross-Origin-Opener-Policy': 'same-origin',

    // Cross-Origin-Resource-Policy - Control de recursos cross-origin
    'Cross-Origin-Resource-Policy': 'same-origin',

    // Cross-Origin-Embedder-Policy - Requiere CORS explícito para recursos
    'Cross-Origin-Embedder-Policy': isProd ? 'require-corp' : 'unsafe-none',
  };

  // HSTS (HTTP Strict Transport Security) - Solo en producción
  if (isProd) {
    // max-age=31536000: fuerza HTTPS por 1 año
    // includeSubDomains: aplica a todos los subdominios
    // preload: permite inclusión en HSTS preload list de navegadores
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  return headers;
}

/**
 * Construye una Content Security Policy por defecto
 */
function buildDefaultCSP(
  trustedDomains: SecurityHeadersOptions['trustedDomains'] = {},
  isProd: boolean
): string {
  const { scripts = [], styles = [], images = [], fonts = [], connect = [] } = trustedDomains;

  // Dominios de confianza comunes para e-commerce
  const defaultConnect = [
    'https://*.stripe.com', // Stripe payments
    'https://*.firebaseio.com', // Firebase Realtime DB
    'https://*.googleapis.com', // Firebase, Google APIs
    'https://firestore.googleapis.com', // Firestore
    'https://*.cloudfunctions.net', // Cloud Functions
    ...connect,
  ];

  const defaultScripts = [
    "'self'",
    'https://js.stripe.com', // Stripe.js
    'https://www.gstatic.com', // Firebase
    ...scripts,
  ];

  const defaultStyles = [
    "'self'",
    "'unsafe-inline'", // Necesario para Tailwind y estilos inline (considerar usar nonces en producción)
    'https://fonts.googleapis.com', // Google Fonts
    ...styles,
  ];

  const defaultImages = [
    "'self'",
    'data:', // Data URLs (base64 images)
    'https:', // Permitir todas las imágenes HTTPS (considerar restringir en producción)
    ...images,
  ];

  const defaultFonts = [
    "'self'",
    'https://fonts.gstatic.com', // Google Fonts
    'data:', // Data URLs
    ...fonts,
  ];

  // En desarrollo, permitir eval para HMR
  const scriptSrc = isProd
    ? defaultScripts.join(' ')
    : `${defaultScripts.join(' ')} 'unsafe-eval'`;

  const directives = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src ${defaultStyles.join(' ')}`,
    `img-src ${defaultImages.join(' ')}`,
    `font-src ${defaultFonts.join(' ')}`,
    `connect-src ${defaultConnect.join(' ')}`,
    `object-src 'none'`, // Deshabilita <object>, <embed>, <applet>
    `base-uri 'self'`, // Previene injection de <base> tag
    `form-action 'self'`, // Solo permite forms que envíen a mismo origen
    `frame-ancestors 'none'`, // No permite iframes (redundante con X-Frame-Options)
    `upgrade-insecure-requests`, // Upgrade HTTP a HTTPS automáticamente
  ];

  return directives.join('; ');
}

/**
 * Aplica security headers a una Response existente
 */
export function applySecurityHeaders(
  response: Response,
  options: SecurityHeadersOptions = {}
): Response {
  const headers = getSecurityHeaders(options);
  const newHeaders = new Headers(response.headers);

  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Crea headers para respuestas JSON con security headers incluidos
 */
export function secureJsonHeaders(options: SecurityHeadersOptions = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...getSecurityHeaders(options),
  };
}

/**
 * Verifica si la conexión usa HTTPS
 */
export function isSecureConnection(request: Request): boolean {
  const url = new URL(request.url);

  // Verificar protocolo directo
  if (url.protocol === 'https:') {
    return true;
  }

  // Verificar headers de proxy (Cloudflare, etc.)
  const xForwardedProto = request.headers.get('x-forwarded-proto');
  if (xForwardedProto === 'https') {
    return true;
  }

  const cfVisitor = request.headers.get('cf-visitor');
  if (cfVisitor && cfVisitor.includes('"scheme":"https"')) {
    return true;
  }

  return false;
}

/**
 * Crea una respuesta de redirect a HTTPS
 */
export function redirectToHttps(request: Request): Response {
  const url = new URL(request.url);
  url.protocol = 'https:';

  return new Response(null, {
    status: 301,
    headers: {
      Location: url.toString(),
      ...getSecurityHeaders(),
    },
  });
}
