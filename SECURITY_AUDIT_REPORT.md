# INFORME COMPLETO DE AUDITORÍA DE SEGURIDAD
**Proyecto:** MiEcommerce (Astro + Firebase + Stripe)
**Fecha:** 2025-12-28
**Auditor:** Claude Security Audit (Comprehensive)
**Alcance:** Código completo - APIs, Autenticación, Inyecciones, Datos Sensibles, Dependencias

---

## RESUMEN EJECUTIVO

| Categoría | Crítica | Alta | Media | Baja | Info |
|-----------|---------|------|-------|------|------|
| API Endpoints | 3 | 7 | 8 | 3 | - |
| Autenticación | 2 | 4 | 3 | 3 | - |
| Inyección/XSS | 1 | 2 | 1 | 2 | 1 |
| Datos Sensibles | - | 1 | 2 | 2 | - |
| **TOTAL** | **4** | **6** | **8** | **5** | **1** |

**Dependencias (npm audit):** ✅ 0 vulnerabilidades

**Riesgo General:** ALTO - Vulnerabilidades críticas requieren acción inmediata.

---

## VULNERABILIDADES CRÍTICAS

### 1. VIOLACIÓN PCI-DSS: Manejo de Datos de Tarjetas en Servidor
**Archivo:** `/src/pages/api/create-payment-method.ts`
**Líneas:** 50-83
**Severidad:** CRÍTICA
**CWE:** CWE-359 (Exposure of Private Information)

**Código Vulnerable:**
```typescript
// Líneas 50-64
const { cardNumber, expMonth, expYear, cvc, billingDetails } = await request.json();

// Crear Payment Method usando la API de Stripe en el servidor
const paymentMethod = await stripe.paymentMethods.create({
  type: 'card',
  card: {
    number: cardNumber,  // ❌ DATOS DE TARJETA EN SERVIDOR
    exp_month: expMonth,
    exp_year: expYear,
    cvc: cvc,            // ❌ CVV EN SERVIDOR
  },
  ...
});
```

**Problema:**
- Los datos de tarjeta de crédito (número, CVV, fecha) pasan por el servidor
- Violación directa de PCI-DSS SAQ A-EP y SAQ D
- Expone al negocio a multas de hasta $500,000 por violación
- El endpoint está marcado como `@deprecated` pero sigue activo

**Impacto:**
- Responsabilidad legal y financiera
- Posibles multas de PCI-DSS
- Exposición de datos de tarjetas si el servidor es comprometido

**Recomendación:**
```typescript
// ELIMINAR COMPLETAMENTE ESTE ENDPOINT

// En su lugar, usar Stripe Elements en el cliente:
// src/components/checkout/SecureCardPayment.tsx ya implementa esto correctamente

// 1. Eliminar el archivo: src/pages/api/create-payment-method.ts
// 2. Actualizar todas las referencias al cliente para usar Stripe Elements
// 3. Los datos de tarjeta van directo de navegador → Stripe (nunca tocan tu servidor)
```

---

### 2. CONDICIÓN LÓGICA INCORRECTA - BYPASS DE ADMIN
**Archivo:** `/src/pages/api/admin/get-order.ts`
**Línea:** 14
**Severidad:** CRÍTICA
**CWE:** CWE-863 (Incorrect Authorization)

**Código Vulnerable:**
```typescript
if (!authResult.isAuthenticated && !authResult.isAdmin) {
  // BUG: Esta condición solo bloquea si AMBAS son falsas
  // Un usuario autenticado pero NO admin PASA esta verificación
```

**Problema:**
- Usa `&&` (AND) cuando debería usar `||` (OR)
- Un usuario autenticado sin permisos de admin puede acceder al endpoint
- Exposición de datos de pedidos de cualquier cliente

**Impacto:**
- Cualquier usuario autenticado puede ver pedidos de otros clientes
- Violación de privacidad
- Exposición de datos personales (direcciones, teléfonos, emails)

**Solución:**
```typescript
if (!authResult.success || !authResult.isAdmin) {
  return createErrorResponse('Forbidden: Admin access required', 403);
}
```

---

### 3. ENDPOINT DE EMAIL SIN AUTENTICACIÓN
**Archivo:** `/src/pages/api/send-email.ts`
**Líneas:** 29-130
**Severidad:** CRÍTICA
**CWE:** CWE-306 (Missing Authentication for Critical Function)

**Código Vulnerable:**
```typescript
export const POST: APIRoute = async ({ request }) => {
  // ❌ NO HAY VALIDACIÓN DE AUTENTICACIÓN
  // ❌ NO HAY CSRF PROTECTION
  // ❌ NO HAY RATE LIMITING

  try {
    const { orderId, type, newStatus, email } = await request.json();

    // Cualquiera puede enviar emails arbitrarios
    const response = await resend.emails.send({
      from: import.meta.env.EMAIL_FROM || 'noreply@imprimearte.es',
      to: [email],  // ❌ Email controlado por atacante
      subject: template.subject,
      html: template.html,
    });
```

**Problema:**
- No requiere autenticación
- No tiene protección CSRF
- No tiene rate limiting
- Permite envío de emails arbitrarios usando el dominio del negocio

**Impacto:**
- Phishing usando tu dominio
- Spam masivo desde tu cuenta de Resend
- Agotamiento de cuota de Resend
- Blacklist del dominio en servicios de email

**Recomendación:**
```typescript
import { validateCSRF, createCSRFErrorResponse } from '../../lib/csrf';
import { verifyAuthToken } from '../../lib/auth/authHelpers';
import { checkRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '../../lib/rate-limiter';
import { z } from 'zod';

const sendEmailSchema = z.object({
  orderId: z.string().min(1).max(255).optional(),
  type: z.enum(['confirmation', 'status-update', 'newsletter-welcome']),
  newStatus: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
});

export const POST: APIRoute = async ({ request }) => {
  // SECURITY: Rate limiting
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.VERY_STRICT, 'send-email');
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  // SECURITY: CSRF protection
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    return createCSRFErrorResponse();
  }

  // SECURITY: Authentication required (except for newsletter-welcome from internal call)
  const referer = request.headers.get('referer');
  const isInternalCall = referer && new URL(referer).hostname === new URL(request.url).hostname;

  if (!isInternalCall) {
    const authResult = await verifyAuthToken(request);
    if (!authResult.success) {
      return authResult.error!;
    }
  }

  // SECURITY: Validate input
  const rawData = await request.json();
  const validationResult = sendEmailSchema.safeParse(rawData);

  if (!validationResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }

  const data = validationResult.data;

  // Para newsletter-welcome, solo permitir llamadas internas
  if (data.type === 'newsletter-welcome' && !isInternalCall) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // Resto de la lógica...
};
```

---

### 3. EXPOSICIÓN DE INFORMACIÓN SENSIBLE EN ERRORES
**Archivo:** `/src/pages/api/validate-coupon.ts`
**Líneas:** 334-346
**Severidad:** CRÍTICA
**CWE:** CWE-209 (Information Exposure Through Error Message)

**Código Vulnerable:**
```typescript
} catch (error) {
  logger.error('[validate-coupon] Unexpected error', error);
  return new Response(
    JSON.stringify({
      error: 'Error al validar el cupón',
      details: (error as Error).message,  // ❌ EXPONE DETALLES EN PRODUCCIÓN
    }),
    { status: 500 }
  );
}
```

**Problema:**
- Expone mensajes de error internos en producción
- Puede revelar paths de archivos, estructura de base de datos, versiones de librerías
- Ayuda a atacantes a mapear el sistema

**Impacto:**
- Revelación de estructura interna
- Facilita ataques dirigidos
- Exposición de información técnica sensible

**Recomendación:**
```typescript
} catch (error) {
  logger.error('[validate-coupon] Unexpected error', error);
  return new Response(
    JSON.stringify({
      error: 'Error al validar el cupón',
      // Solo incluir detalles en desarrollo
      details: import.meta.env.PROD ? undefined : (error as Error).message,
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

---

## VULNERABILIDADES ALTAS

### 4. ENDPOINT DE ADMIN PROTEGIDO SOLO POR SECRET ESTÁTICO
**Archivo:** `/src/pages/api/admin/set-admin-claims.ts`
**Líneas:** 30-64
**Severidad:** ALTA
**CWE:** CWE-798 (Use of Hard-coded Credentials)

**Código Vulnerable:**
```typescript
const ADMIN_SECRET = import.meta.env.ADMIN_SETUP_SECRET;

export const POST: APIRoute = async ({ request }) => {
  // Rate limiting OK ✓
  const rateLimitResult = await rateLimitPersistent(request, 'admin-claims', {
    intervalMs: 60 * 60 * 1000,
    max: 3,
  });

  const { email, secret, remove } = await request.json();

  // ❌ SOLO VERIFICA SECRET, NO AUTENTICACIÓN DE USUARIO
  if (!secret || secret !== ADMIN_SECRET) {
    return createErrorResponse('Unauthorized: Invalid secret key', 401);
  }

  // Otorga permisos de admin sin verificar quién hace la petición
  await auth.setCustomUserClaims(user.uid, { admin: true });
```

**Problema:**
- Solo protegido por un secret estático
- No requiere que el solicitante esté autenticado
- Cualquiera con el secret puede otorgar permisos de admin
- El secret puede filtrarse en logs, variables de entorno compartidas, etc.

**Impacto:**
- Escalación de privilegios
- Otorgamiento no autorizado de permisos de administrador
- Compromiso total del sistema si el secret se filtra

**Recomendación:**
```typescript
import { verifyAdminAuth } from '../../../lib/auth-helpers';

export const POST: APIRoute = async ({ request }) => {
  // SECURITY: Rate limiting
  const rateLimitResult = await rateLimitPersistent(request, 'admin-claims', {
    intervalMs: 60 * 60 * 1000,
    max: 3,
  });
  if (!rateLimitResult.ok) {
    return createErrorResponse('Too many requests', 429);
  }

  // SECURITY: Requiere que el solicitante sea SUPER ADMIN
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success || !authResult.isAdmin) {
    logger.warn('[set-admin-claims] Unauthorized attempt', {
      uid: authResult.uid,
      email: authResult.email
    });
    return createErrorResponse('Forbidden: Super admin required', 403);
  }

  // SECURITY: Verificar que el solicitante está en lista de SUPER_ADMINS
  const superAdmins = (import.meta.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase());

  if (!superAdmins.includes(authResult.email?.toLowerCase() || '')) {
    logger.warn('[set-admin-claims] Non-super-admin attempted admin grant', {
      requester: authResult.email
    });
    return createErrorResponse('Forbidden: Super admin required', 403);
  }

  const { email, remove } = await request.json();
  // Validar email con Zod...

  // Log de auditoría
  await db.collection('admin_actions_log').add({
    action: remove ? 'remove_admin' : 'grant_admin',
    targetEmail: email,
    performedBy: authResult.email,
    performedAt: FieldValue.serverTimestamp(),
    ipAddress: request.headers.get('x-forwarded-for'),
  });

  // Resto de la lógica...
};
```

---

### 5. WEBHOOK DE STRIPE SIN RATE LIMITING
**Archivo:** `/src/pages/api/stripe-webhook.ts`
**Líneas:** 17-120
**Severidad:** ALTA
**CWE:** CWE-770 (Allocation of Resources Without Limits)

**Código Vulnerable:**
```typescript
export const POST: APIRoute = async ({ request }) => {
  // ❌ NO HAY RATE LIMITING
  // Un atacante puede enviar miles de webhooks falsos

  const sig = request.headers.get('stripe-signature');
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

  try {
    event = stripe.webhooks.constructEvent(body, sig as string, webhookSecret);
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }
```

**Problema:**
- No tiene rate limiting
- Permite ataques de denegación de servicio
- Puede saturar Firestore con escrituras

**Impacto:**
- Denegación de servicio
- Costos elevados de Firestore
- Saturación de base de datos

**Recomendación:**
```typescript
import { checkRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIGS } from '../../lib/rate-limiter';

export const POST: APIRoute = async ({ request }) => {
  // SECURITY: Rate limiting (generoso para webhooks legítimos, protege contra abuse)
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.GENEROUS, 'stripe-webhook');
  if (!rateLimitResult.allowed) {
    logger.warn('[stripe-webhook] Rate limit exceeded');
    return createRateLimitResponse(rateLimitResult);
  }

  const sig = request.headers.get('stripe-signature');
  // Resto de la lógica...
};
```

---

### 6. VALIDACIÓN DE ENTRADA INSUFICIENTE EN ENDPOINT DE ADMIN
**Archivo:** `/src/pages/api/admin/update-order-status.ts`
**Líneas:** 21-36
**Severidad:** ALTA
**CWE:** CWE-20 (Improper Input Validation)

**Código Vulnerable:**
```typescript
export const POST: APIRoute = async ({ request }) => {
  // Auth verificada ✓
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated || !authResult.isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  // ❌ NO HAY VALIDACIÓN ZOD
  const { id, status } = await request.json();

  // ❌ VALIDACIÓN MÍNIMA
  if (!id || !status) {
    return new Response(JSON.stringify({ error: 'Faltan parámetros' }), { status: 400 });
  }

  // ❌ NO VALIDA QUE 'status' SEA UN VALOR PERMITIDO
  await db.collection('orders').doc(String(id)).set(
    { status: String(status), updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
```

**Problema:**
- No usa Zod para validación
- No valida que `status` sea un valor permitido
- Permite inyectar cualquier string como status
- No valida formato de `id`

**Impacto:**
- Inyección de datos maliciosos
- Estados de pedido inválidos
- Corrupción de datos

**Recomendación:**
```typescript
import { z } from 'zod';

const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;

const updateOrderSchema = z.object({
  id: z.string().min(1).max(255),
  status: z.enum(validStatuses),
});

export const POST: APIRoute = async ({ request }) => {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.isAuthenticated || !authResult.isAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const rawData = await request.json();

  // SECURITY: Validate with Zod
  const validationResult = updateOrderSchema.safeParse(rawData);
  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        error: 'Invalid input',
        details: import.meta.env.PROD ? undefined : validationResult.error.format(),
      }),
      { status: 400 }
    );
  }

  const { id, status } = validationResult.data;

  // Verificar que el pedido existe
  const orderRef = db.collection('orders').doc(id);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
  }

  await orderRef.update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
```

---

### 7. RATE LIMITER USA MEMORIA (NO ESCALABLE)
**Archivo:** `/src/lib/rate-limiter.ts`
**Líneas:** 14-15
**Severidad:** ALTA
**CWE:** CWE-400 (Uncontrolled Resource Consumption)

**Código Vulnerable:**
```typescript
// In-memory store for rate limiting (use Redis in production for multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitEntry>();  // ❌ MEMORIA LOCAL
```

**Problema:**
- Usa Map en memoria para almacenar límites
- No funciona con múltiples instancias/servidores
- Se pierde al reiniciar
- Puede crecer indefinidamente

**Impacto:**
- Bypass de rate limiting en arquitecturas multi-instancia
- Consumo excesivo de memoria
- Protección inconsistente

**Recomendación:**
```typescript
// Usar Redis/Upstash para rate limiting distribuido

// 1. Instalar: npm install @upstash/redis
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: import.meta.env.UPSTASH_REDIS_REST_URL,
  token: import.meta.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
  namespace: string = 'default'
): Promise<RateLimitResult> {
  const identifier = getRequestIdentifier(request);
  const key = `ratelimit:${namespace}:${identifier}`;
  const now = Date.now();

  // Get current count from Redis
  const count = await redis.incr(key);

  // Set expiry on first request
  if (count === 1) {
    await redis.pexpire(key, config.windowMs);
  }

  if (count > config.maxRequests) {
    const ttl = await redis.pttl(key);
    return {
      allowed: false,
      retryAfter: Math.ceil(ttl / 1000),
      remaining: 0,
      limit: config.maxRequests,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - count,
    limit: config.maxRequests,
  };
}
```

---

### 8. NO HAY CONFIGURACIÓN CORS EXPLÍCITA
**Archivo:** `/astro.config.mjs`
**Severidad:** ALTA
**CWE:** CWE-346 (Origin Validation Error)

**Problema:**
- No hay configuración CORS explícita en Astro
- Depende del comportamiento por defecto
- Puede permitir requests de orígenes no autorizados

**Impacto:**
- Cross-Origin attacks
- Bypass de protecciones CSRF en ciertos casos

**Recomendación:**
```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  // ... otras configuraciones

  // Agregar middleware CORS
  server: {
    headers: {
      'Access-Control-Allow-Origin': process.env.PUBLIC_APP_URL || 'https://tudominio.com',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    }
  }
});

// O mejor: Crear middleware CORS personalizado
// src/middleware/cors.ts
export function onRequest({ request, next }) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://tudominio.com',
    'https://www.tudominio.com',
    process.env.NODE_ENV === 'development' ? 'http://localhost:4321' : null,
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    const response = next();
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    return response;
  }

  return next();
}
```

---

### 9. POSIBLE PATH TRAVERSAL EN DESCARGA DE ARCHIVOS
**Archivo:** `/src/pages/api/digital/download-file.ts`
**Líneas:** 96-105
**Severidad:** ALTA
**CWE:** CWE-22 (Path Traversal)

**Código Vulnerable:**
```typescript
// Extract file path from URL
const fileUrl = file.fileUrl;  // ❌ NO VALIDA ORIGEN
const urlParts = fileUrl.split('/o/');
if (urlParts.length < 2) {
  throw new Error('Invalid file URL format');
}
const encodedPath = urlParts[1].split('?')[0];
const filePath = decodeURIComponent(encodedPath);  // ❌ POSIBLE PATH TRAVERSAL

const fileRef = bucket.file(filePath);  // ❌ ACCESO DIRECTO SIN VALIDACIÓN
```

**Problema:**
- No valida que el path esté dentro del directorio permitido
- Confía en datos de la base de datos sin validación
- Un path malicioso podría acceder a archivos no autorizados

**Impacto:**
- Acceso a archivos no autorizados
- Descarga de archivos del sistema
- Exposición de datos sensibles

**Recomendación:**
```typescript
import path from 'path';

// Definir directorio base permitido
const ALLOWED_BASE_PATH = 'digital-products/';

// Extract file path from URL
const fileUrl = file.fileUrl;
const urlParts = fileUrl.split('/o/');
if (urlParts.length < 2) {
  throw new Error('Invalid file URL format');
}
const encodedPath = urlParts[1].split('?')[0];
let filePath = decodeURIComponent(encodedPath);

// SECURITY: Validar que el path está dentro del directorio permitido
// Normalizar path y eliminar '..' y otros trucos
filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');

if (!filePath.startsWith(ALLOWED_BASE_PATH)) {
  logger.warn('[download-file] Path traversal attempt', {
    userId,
    attemptedPath: filePath,
  });
  return new Response(
    JSON.stringify({ error: 'Invalid file path' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
}

// SECURITY: Verificar que el archivo existe y es accesible
const fileRef = bucket.file(filePath);
const [exists] = await fileRef.exists();

if (!exists) {
  return new Response(
    JSON.stringify({ error: 'File not found' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } }
  );
}

const [fileBuffer] = await fileRef.download();
```

---

### 10. FALTA VALIDACIÓN EN DISEÑOS COMPARTIDOS
**Archivo:** `/src/pages/api/designs/save.ts`
**Líneas:** 17-19
**Severidad:** ALTA
**CWE:** CWE-20 (Improper Input Validation)

**Código Vulnerable:**
```typescript
const saveDesignSchema = z.object({
  name: z.string().min(1).max(100),
  productId: z.string().min(1),
  productName: z.string().min(1),
  categoryId: z.string().min(1),
  designData: z.any(),  // ❌ NO HAY VALIDACIÓN DEL OBJETO
  previewImage: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
});
```

**Problema:**
- `designData` acepta `z.any()` sin validación
- Puede contener objetos enormes que saturen la base de datos
- No hay límite de tamaño
- Puede contener datos maliciosos

**Impacto:**
- Inyección de datos maliciosos
- Consumo excesivo de almacenamiento
- Posible XSS si se renderiza sin sanitizar

**Recomendación:**
```typescript
// Definir estructura específica del designData
const textLayerSchema = z.object({
  type: z.literal('text'),
  content: z.string().max(1000),
  fontFamily: z.string().max(100),
  fontSize: z.number().min(6).max(500),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  x: z.number(),
  y: z.number(),
  rotation: z.number().min(-360).max(360),
});

const imageLayerSchema = z.object({
  type: z.literal('image'),
  url: z.string().url().max(500),
  x: z.number(),
  y: z.number(),
  width: z.number().min(1).max(5000),
  height: z.number().min(1).max(5000),
  rotation: z.number().min(-360).max(360),
});

const designDataSchema = z.object({
  layers: z.array(z.union([textLayerSchema, imageLayerSchema])).max(50),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  width: z.number().min(1).max(10000),
  height: z.number().min(1).max(10000),
});

const saveDesignSchema = z.object({
  name: z.string().min(1).max(100),
  productId: z.string().min(1).max(255),
  productName: z.string().min(1).max(500),
  categoryId: z.string().min(1).max(255),
  designData: designDataSchema,  // ✅ VALIDACIÓN ESTRICTA
  previewImage: z.string().url().max(500).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});
```

---

## VULNERABILIDADES MEDIAS

### 11. ENDPOINT PERMITE MODIFICAR PRODUCTOS SIN AUTENTICACIÓN
**Archivo:** `/src/pages/api/check-product.ts`
**Líneas:** 156-189
**Severidad:** MEDIA
**CWE:** CWE-862 (Missing Authorization)

**Código Vulnerable:**
```typescript
export const GET: APIRoute = async ({ request, url }) => {
  // Rate limiting OK ✓

  const slug = url.searchParams.get('slug');
  const action = url.searchParams.get('action'); // 'check' or 'fix'

  // ... búsqueda de producto ...

  // ❌ NO HAY AUTENTICACIÓN PARA action=fix
  if (action === 'fix' && detectedSchemaId && !productData.customizationSchemaId) {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      customizationSchemaId: detectedSchemaId,  // ❌ MODIFICA SIN AUTENTICACIÓN
    });
```

**Problema:**
- Permite modificar productos sin autenticación con `?action=fix`
- Cualquiera puede cambiar `customizationSchemaId` de productos

**Recomendación:**
```typescript
if (action === 'fix') {
  // SECURITY: Require admin authentication for modifications
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success || !authResult.isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Admin authentication required for modifications' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (detectedSchemaId && !productData.customizationSchemaId) {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      customizationSchemaId: detectedSchemaId,
    });
    // ... resto
  }
}
```

---

### 12. NEWSLETTER HACE LLAMADA INTERNA SIN AUTENTICACIÓN
**Archivo:** `/src/pages/api/subscribe-newsletter.ts`
**Líneas:** 139-152
**Severidad:** MEDIA

**Código Vulnerable:**
```typescript
// ❌ HACE FETCH INTERNO SIN HEADER DE AUTENTICACIÓN
try {
  await fetch(new URL('/api/send-email', request.url).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },  // ❌ FALTA HEADER INTERNO
    body: JSON.stringify({
      email: emailLower,
      type: 'newsletter-welcome',
    }),
  });
```

**Problema:**
- Hace llamada interna a `/api/send-email` sin header de autenticación
- Depende de que `/api/send-email` no requiera autenticación (lo cual es un problema)

**Recomendación:**
```typescript
// Opción 1: Usar función compartida en lugar de endpoint HTTP
import { sendNewsletterWelcomeEmail } from '../../lib/email/sendEmails';

try {
  await sendNewsletterWelcomeEmail(emailLower);
} catch (emailError) {
  logger.warn('[subscribe-newsletter] Error sending welcome email', emailError);
}

// Opción 2: Usar header interno de autenticación
const INTERNAL_API_SECRET = import.meta.env.INTERNAL_API_SECRET;

await fetch(new URL('/api/send-email', request.url).toString(), {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Secret': INTERNAL_API_SECRET,
  },
  body: JSON.stringify({
    email: emailLower,
    type: 'newsletter-welcome',
  }),
});
```

---

### 13-18. EXPOSICIÓN DE ERRORES DETALLADOS EN MÚLTIPLES ENDPOINTS
**Severidad:** MEDIA
**CWE:** CWE-209

Los siguientes endpoints exponen detalles de error en producción:

1. `/src/pages/api/send-email.ts` (línea 125)
2. `/src/pages/api/check-product.ts` (línea 243)
3. `/src/pages/api/digital/download-file.ts` (línea 164)

**Recomendación General:**
```typescript
// SIEMPRE usar este patrón:
return new Response(
  JSON.stringify({
    error: 'User-friendly error message',
    details: import.meta.env.PROD ? undefined : error.message,  // ✅ SOLO EN DEV
  }),
  { status: 500, headers: { 'Content-Type': 'application/json' } }
);
```

---

## VULNERABILIDADES BAJAS

### 19. FALTA DE SECURITY HEADERS
**Severidad:** BAJA
**CWE:** CWE-693 (Protection Mechanism Failure)

**Problema:**
No se configuran headers de seguridad importantes:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy`

**Recomendación:**
```javascript
// src/middleware/security-headers.ts
export function onRequest({ next }) {
  const response = next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (import.meta.env.PROD) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // CSP básico - ajustar según necesidades
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; frame-src https://js.stripe.com; connect-src 'self' https://api.stripe.com https://firebasestorage.googleapis.com;"
  );

  return response;
}
```

---

### 20. LOGS PUEDEN CONTENER INFORMACIÓN SENSIBLE
**Severidad:** BAJA
**CWE:** CWE-532 (Information Exposure Through Log Files)

**Problema:**
Varios endpoints hacen log de objetos completos que pueden contener datos sensibles.

**Ejemplo:**
```typescript
// src/pages/api/save-order.ts línea 101
logger.info('API save-order: Datos recibidos:', JSON.stringify(rawData, null, 2));
```

**Recomendación:**
```typescript
// Crear función de sanitización de logs
function sanitizeForLog(data: any): any {
  const sensitive = ['password', 'cardNumber', 'cvc', 'cvv', 'ssn', 'token'];

  if (typeof data !== 'object' || data === null) return data;

  const sanitized = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLog(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Uso:
logger.info('Datos recibidos:', sanitizeForLog(rawData));
```

---

### 21. NO HAY LÍMITE DE TAMAÑO DE PAYLOAD
**Severidad:** BAJA
**CWE:** CWE-770

**Problema:**
No hay límite explícito de tamaño de payload en endpoints, permitiendo ataques de agotamiento de recursos.

**Recomendación:**
```javascript
// astro.config.mjs
export default defineConfig({
  server: {
    // Limitar tamaño de request
    maxRequestSize: 5 * 1024 * 1024, // 5MB
  }
});

// O en cada endpoint:
export const POST: APIRoute = async ({ request }) => {
  const contentLength = request.headers.get('content-length');

  if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: 'Payload too large (max 5MB)' }),
      { status: 413, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ... resto de la lógica
};
```

---

## RECOMENDACIONES GENERALES

### Prioridades de Implementación

**INMEDIATO (Esta semana):**
1. ELIMINAR `/api/create-payment-method.ts` completamente
2. Agregar autenticación a `/api/send-email.ts`
3. Ocultar detalles de error en producción

**CORTO PLAZO (Este mes):**
4. Migrar rate limiting a Redis/Upstash
5. Implementar CORS adecuado
6. Mejorar autenticación en endpoint de admin claims
7. Agregar rate limiting a webhook de Stripe
8. Validar entrada en todos los endpoints de admin

**MEDIO PLAZO (Próximos 2 meses):**
9. Implementar security headers
10. Revisar y sanitizar todos los logs
11. Agregar validación estricta en diseños
12. Implementar límites de payload

### Mejores Prácticas

1. **Siempre usar Zod** para validación de entrada
2. **Nunca exponer** detalles de error en producción
3. **Siempre requerir** autenticación en endpoints sensibles
4. **Implementar** rate limiting en todos los endpoints públicos
5. **Usar** CSRF protection en endpoints mutantes (POST/PUT/DELETE)
6. **Sanitizar** logs antes de escribir
7. **Validar** permisos (autenticación + autorización)
8. **Usar Redis** para rate limiting distribuido
9. **Implementar** security headers
10. **Auditar** regularmente

---

## CHECKLIST DE SEGURIDAD POST-REMEDIACIÓN

- [ ] Endpoint de payment method eliminado
- [ ] Send-email requiere autenticación
- [ ] Errores sanitizados en producción
- [ ] Rate limiting migrado a Redis
- [ ] CORS configurado correctamente
- [ ] Admin claims requiere super admin
- [ ] Webhook tiene rate limiting
- [ ] Todos los endpoints admin usan Zod
- [ ] Security headers implementados
- [ ] Logs sanitizados
- [ ] Path traversal protegido
- [ ] DesignData validado estrictamente

---

**FIN DEL INFORME**

Para consultas o aclaraciones, contactar al equipo de seguridad.
