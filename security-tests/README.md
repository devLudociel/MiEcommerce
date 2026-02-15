# Security Test Suite — MiEcommerce

Automated security testing suite for the MiEcommerce application (Astro + Firebase + Stripe).
Replaces manual Burp Suite testing with deterministic, CI/CD-integrated tests.

## Quick Start

```bash
# Run all security tests
npm run test:security

# Run with verbose output
npm run test:security:full

# Run in watch mode
npm run test:security:watch

# Run static analysis
npm run sast
npm run sca
```

## Architecture

Tests import Astro API endpoint handlers directly and call them with constructed `Request` objects.
Firebase Admin is mocked with an in-memory store. This approach is:

- **Fast**: ~2s for 350+ tests
- **Deterministic**: No network, no external services
- **CI-ready**: Runs in any Node.js environment

### Test Layers

| Layer | Directory | Description |
|-------|-----------|-------------|
| Unit | `unit/` | Security primitives (CSRF, rate limiter, sanitize, auth, Zod schemas) |
| Integration | `integration/` | Full endpoint tests with mocked Firebase/Stripe |
| Input Validation | `input-validation/` | XSS, SQLi, NoSQL injection, prototype pollution payloads |
| Error Leakage | `error-leakage/` | Verify 500 responses don't expose internals |
| Regression | `regression/` | Tests for vulnerabilities from SECURITY_AUDIT_REPORT.md |

## Test Coverage Matrix

### Endpoints Tested

| Endpoint | Auth | IDOR | CSRF | Rate Limit | Input Val | Status |
|----------|------|------|------|------------|-----------|--------|
| POST /api/save-order | Y | Y | Y | Y | Y | 23 tests |
| GET /api/get-order | Y | Y | - | Y | - | 16 tests |
| POST /api/create-payment-intent | Y | Y | Y | Y | Y | 18 tests |
| POST /api/stripe-webhook | Sig | - | - | - | Y | 11 tests |
| POST /api/validate-coupon | - | - | Y | Y | Y | 12 tests |
| GET /api/get-wallet-balance | Y | Y | - | - | - | 8 tests |
| GET /api/get-wallet-transactions | Y | Y | - | - | - | 6 tests |
| POST /api/addresses | Y | Y | - | - | Y | 10 tests |
| POST /api/designs/save | Y | Y | Y | - | Y | 8 tests |
| POST /api/digital/download-file | Y | Y | - | - | Traversal | 7 tests |
| POST /api/storage/get-signed-url | Y | - | - | Y | Traversal | 8 tests |
| POST /api/send-email | Y | - | Y | Y | Y | 7 tests |
| POST /api/share/create | - | - | - | Y | Y | 5 tests |
| GET/POST /api/cron/cleanup | Secret | - | - | - | - | 4 tests |
| 9 admin endpoints | Y | - | Y | Y | - | 27 tests |

### Security Categories

| Category | Tests | Description |
|----------|-------|-------------|
| Authentication (401) | ~30 | Missing/invalid/expired tokens |
| Authorization (403) | ~25 | IDOR/BOLA, admin-only access, resource ownership |
| CSRF Protection | ~15 | Origin validation, missing headers |
| Rate Limiting | ~10 | Per-tier limits (VERY_STRICT to GENEROUS) |
| Input Validation | ~50 | XSS, SQLi, NoSQL injection, proto pollution, unicode |
| Price Integrity | ~5 | Server-side price calculation, amount mismatch |
| Error Leakage | ~6 | No stack traces, no secrets in responses |
| Regression | ~7 | Fixes from SECURITY_AUDIT_REPORT.md verified |

## Helpers

| File | Purpose |
|------|---------|
| `helpers/mock-firebase.ts` | In-memory Firestore + Auth mock |
| `helpers/mock-stripe.ts` | Stripe mock with webhook signature generation |
| `helpers/request-builder.ts` | Fluent Request builder with auth/CSRF |
| `helpers/auth-factory.ts` | Predefined tokens and user profiles |
| `helpers/seed-data.ts` | Data factories for products, orders, wallets, etc. |
| `helpers/rate-limit-reset.ts` | Clear rate limits between tests |
| `helpers/constants.ts` | API URLs, attack payloads |

## Configuration

- `vitest.security.config.ts` — Dedicated Vitest config (environment: node)
- Environment variables defined in `define` block (test-safe values)
- Uses `import.meta.env.DEV = true` in test mode

## CI/CD

`.github/workflows/security.yml` runs:

1. **npm-audit** — Dependency vulnerability scan
2. **semgrep** — SAST with OWASP, TypeScript, Node.js rules
3. **custom-sast** — Custom checks (eval, secrets, missing auth)
4. **security-tests** — This test suite
5. **zap-baseline** — OWASP ZAP dynamic scan (if configured)

## Findings

See `FINDINGS.md` for security issues discovered during test development.
