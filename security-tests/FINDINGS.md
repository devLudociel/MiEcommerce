# Security Findings — MiEcommerce

Findings discovered during the development of the automated security test suite.
All items reference the relevant test file for reproducibility.

## Severity Legend

- **CRITICAL**: Immediate action required — data breach, privilege escalation
- **HIGH**: Should fix before next release — significant security gap
- **MEDIUM**: Fix within sprint — defense-in-depth improvement
- **LOW/INFO**: Improvement opportunity — hardening

---

## Findings

### FINDING-001: get-signed-url returns 500 instead of 401 for invalid tokens

**Severity**: MEDIUM
**Endpoint**: `POST /api/storage/get-signed-url`
**Test**: `security-tests/integration/storage/get-signed-url.security.test.ts` (AUTH-2)

**Description**: When an invalid Bearer token is provided, the `verifyIdToken()` call throws an error that falls to the generic `catch` block, returning a 500 response instead of a proper 401.

**Impact**: Information leakage (500 vs 401 reveals different error paths), incorrect HTTP semantics, confusing client-side error handling.

**Recommendation**: Add a specific try/catch around `verifyIdToken()`:
```typescript
try {
  decodedToken = await getAdminAuth().verifyIdToken(token);
} catch (authError) {
  return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 });
}
```

---

### FINDING-002: Prototype pollution in save-order causes 500

**Severity**: LOW
**Endpoint**: `POST /api/save-order`
**Test**: `security-tests/input-validation/payloads.test.ts` (Prototype pollution)

**Description**: Sending `__proto__` in the request body causes the handler to crash with a 500 error. While this does NOT lead to privilege escalation (the prototype chain is not affected because `JSON.parse` doesn't create `__proto__` properties), the crash is ungraceful.

**Impact**: Potential DoS vector if repeatedly triggered. No privilege escalation risk.

**Recommendation**: Consider adding object-level sanitization or catching the specific error pattern.

---

### FINDING-003: designs/save accepts missing designData

**Severity**: LOW
**Endpoint**: `POST /api/designs/save`
**Test**: `security-tests/integration/designs/designs.security.test.ts` (INPUT-1)

**Description**: The Zod schema uses `designData: z.any()` which accepts `undefined`. A request without `designData` will pass validation and save a design with `undefined` designData to Firestore.

**Impact**: Data integrity — designs saved without actual design data.

**Recommendation**: Change schema to require designData:
```typescript
designData: z.record(z.any()).or(z.array(z.any())),
```

---

### FINDING-004: share/create error response exposes raw error.message

**Severity**: MEDIUM
**Endpoint**: `POST /api/share/create`
**File**: `src/pages/api/share/create.ts:147-152`

**Description**: The catch block exposes `error.message` directly in the response without checking `import.meta.env.DEV`:
```typescript
error: error instanceof Error ? error.message : 'Error creating share link',
```

**Impact**: Internal error messages could reveal database structure, file paths, or library names.

**Recommendation**: Use the conditional pattern:
```typescript
error: 'Error creating share link',
details: import.meta.env.DEV ? (error instanceof Error ? error.message : undefined) : undefined,
```

---

### FINDING-005: Rate limiter uses in-memory store

**Severity**: HIGH (architecture)
**File**: `src/lib/rate-limiter.ts`
**Test**: `security-tests/unit/rate-limiter.test.ts`

**Description**: The rate limiter uses a `Map<string, RateLimitEntry>` in memory. This is effective for single-instance deployments but would not work in multi-instance/serverless environments where each instance has its own memory.

**Impact**: Rate limiting can be bypassed if traffic is distributed across multiple instances.

**Recommendation**: Migrate to Redis/Upstash for distributed rate limiting. The current in-memory implementation is acceptable for single-instance Astro deployments but should be upgraded before scaling.

---

## Previously Fixed (Verified by Regression Tests)

The following vulnerabilities from `SECURITY_AUDIT_REPORT.md` have been verified as fixed:

| ID | Description | Fix Verified |
|----|-------------|-------------|
| CRIT-003 | send-email no authentication | Admin auth + CSRF + rate limiting added |
| MED-006 | Error details exposed in production | Conditional `import.meta.env.DEV` pattern applied |
| CRIT-003b | newsletter-welcome open to public | X-Internal-Secret required |
| Various | CSRF missing on POST endpoints | validateCSRF() added to all state-changing POSTs |
| Various | Rate limiting missing | Rate limits applied to all public endpoints |

---

## Test Statistics

- **Total tests**: 358
- **Test files**: 23
- **Categories**: Unit (5), Integration (15), Input Validation (1), Error Leakage (1), Regression (1)
- **Execution time**: ~2s
