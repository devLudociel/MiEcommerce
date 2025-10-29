# Guía de Testing - MiEcommerce Security Suite

**Fecha**: 2025-10-29
**Versión**: 1.0.0

---

## 📋 ÍNDICE

1. [Descripción General](#descripción-general)
2. [Requisitos Previos](#requisitos-previos)
3. [Tests Unitarios](#tests-unitarios)
4. [Tests de Integración](#tests-de-integración)
5. [Tests End-to-End](#tests-end-to-end)
6. [Ejecutar Tests](#ejecutar-tests)
7. [Cobertura de Tests](#cobertura-de-tests)
8. [Escribir Nuevos Tests](#escribir-nuevos-tests)
9. [Troubleshooting](#troubleshooting)
10. [CI/CD Integration](#cicd-integration)

---

## 📝 DESCRIPCIÓN GENERAL

Esta suite de tests verifica todas las correcciones de seguridad implementadas en las Fases 1 y 2:

### **Áreas Cubiertas**:
- ✅ Autenticación y autorización
- ✅ Rate limiting
- ✅ Manejo de errores
- ✅ Endpoints admin
- ✅ Validación de inputs
- ✅ Audit logging
- ✅ Custom claims
- ✅ Protección de datos sensibles

### **Tipos de Tests**:
1. **Unitarios** (~150 tests): Funciones individuales
2. **Integración** (~50 tests): Endpoints y flujos completos
3. **E2E** (~20 tests): Flujos de usuario completos

### **Total**: ~220 tests

---

## 🛠️ REQUISITOS PREVIOS

### **Dependencias Instaladas**:
```bash
npm install
```

### **Variables de Entorno** (opcional para E2E):
```env
# .env.test (opcional)
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=test-password-123
TEST_ADMIN_TOKEN=<firebase-id-token>
```

### **Servidor Corriendo** (solo para E2E):
```bash
npm run dev
```

---

## 🧪 TESTS UNITARIOS

### **Ubicación**: `tests/unit/`

### **Archivos**:
```
tests/unit/
├── authMiddleware.test.ts      (45 tests)
├── rateLimit.test.ts           (60 tests)
└── errorHandler.test.ts        (35 tests)
```

### **¿Qué Prueban?**

#### **authMiddleware.test.ts**
- ✅ Verificación de tokens Bearer
- ✅ Detección de tokens expirados
- ✅ Verificación de admin claims
- ✅ Verificación de propietario
- ✅ Headers case-insensitive
- ✅ Manejo de errores de Firebase

**Ejemplo de Test**:
```typescript
it('should verify valid token successfully', async () => {
  const mockDecodedToken = {
    uid: 'user123',
    email: 'test@example.com',
    admin: false,
  };

  const request = new Request('http://localhost/test', {
    headers: { Authorization: 'Bearer valid-token-123' },
  });

  const result = await verifyAuthToken(request);

  expect(result.success).toBe(true);
  expect(result.decodedToken).toEqual(mockDecodedToken);
});
```

#### **rateLimit.test.ts**
- ✅ Límites por IP y scope
- ✅ Bloqueo por abuso (3x límite)
- ✅ Reseteo de ventanas
- ✅ Detección de IP (4 headers)
- ✅ Limpieza automática
- ✅ Funciones de utilidad

**Ejemplo de Test**:
```typescript
it('should block IP after exceeding 3x limit', async () => {
  const request = new Request('http://localhost/test', {
    headers: { 'x-forwarded-for': '192.168.1.1' },
  });

  const max = 10;

  // Exceder 3x el límite
  for (let i = 0; i < 31; i++) {
    await rateLimit(request, 'test', { max });
  }

  const result = await rateLimit(request, 'test', { max });

  expect(result.ok).toBe(false);
  expect(result.blocked).toBe(true);
});
```

#### **errorHandler.test.ts**
- ✅ Respuestas HTTP estándar
- ✅ Sanitización de errores en producción
- ✅ Stack traces solo en desarrollo
- ✅ Códigos de error consistentes
- ✅ Headers correctos

---

## 🔗 TESTS DE INTEGRACIÓN

### **Ubicación**: `tests/integration/`

### **Archivos**:
```
tests/integration/
└── admin-endpoints.test.ts     (50 tests)
```

### **¿Qué Prueban?**

#### **admin-endpoints.test.ts**
- ✅ Flujo completo de autenticación
- ✅ Rate limiting en endpoints admin
- ✅ Validación de inputs
- ✅ Creación de audit logs
- ✅ Headers de seguridad
- ✅ Respuestas de error apropiadas

**Ejemplo de Test**:
```typescript
it('should enforce rate limiting (20/min)', async () => {
  const request = new Request('http://localhost/api/admin/update-order-status', {
    headers: {
      'Authorization': 'Bearer test-token',
      'x-forwarded-for': '192.168.1.100',
    },
  });

  // Hacer 20 requests (el límite)
  for (let i = 0; i < 20; i++) {
    const result = await rateLimit(request, 'admin-update-order-status', {
      intervalMs: 60_000,
      max: 20,
    });
    expect(result.ok).toBe(true);
  }

  // Request 21 debe ser bloqueado
  const blocked = await rateLimit(request, 'admin-update-order-status', {
    intervalMs: 60_000,
    max: 20,
  });

  expect(blocked.ok).toBe(false);
});
```

---

## 🎭 TESTS END-TO-END

### **Ubicación**: `tests/e2e/`

### **Archivos**:
```
tests/e2e/
└── admin-security.spec.ts      (20 tests)
```

### **¿Qué Prueban?**

#### **admin-security.spec.ts**
- ✅ Redirección de usuarios no autenticados
- ✅ Bloqueo de usuarios no admin
- ✅ Rate limiting visual
- ✅ Validación de inputs en UI
- ✅ Respuestas de error apropiadas
- ✅ Headers de seguridad

**Ejemplo de Test**:
```typescript
test('should redirect non-authenticated users to login', async ({ page }) => {
  await page.goto('/admin');

  // Debe redirigir a login
  await expect(page).toHaveURL(/.*login.*/);
});

test('should enforce rate limiting on admin endpoints', async ({ request }) => {
  const requests = [];

  // Hacer 25 requests rápidamente (límite es 20/min)
  for (let i = 0; i < 25; i++) {
    requests.push(
      request.post('/api/admin/update-order-status', {
        data: { id: 'order123', status: 'processing' },
      })
    );
  }

  const responses = await Promise.all(requests);

  // Algunos deben estar rate limited (429)
  const rateLimited = responses.filter(r => r.status() === 429);
  expect(rateLimited.length).toBeGreaterThan(0);
});
```

---

## 🚀 EJECUTAR TESTS

### **Método 1: Script Todo-en-Uno** (Recomendado)

```bash
# Ejecutar todos los tests
npm run test:security

# Solo tests unitarios
npm run test:security:unit

# Solo tests de integración
npm run test:security:integration

# Solo tests E2E
npm run test:security:e2e

# Con cobertura
npm run test:security:coverage
```

### **Método 2: Scripts Individuales**

#### **Tests Unitarios**:
```bash
# Ejecutar una vez
npm run test:unit

# Modo watch (re-ejecuta al cambiar código)
npm run test:unit:watch

# Con cobertura
npm run test:unit -- --coverage
```

#### **Tests de Integración**:
```bash
# Ejecutar una vez
npm run test:integration

# Modo watch
npm run test:integration:watch
```

#### **Tests E2E**:
```bash
# Asegúrate que el servidor esté corriendo
npm run dev

# En otra terminal:
npm run e2e:security

# Con UI interactiva
npm run e2e:security:ui
```

### **Método 3: Script Bash Directo**

```bash
# Ejecutar todos
./tests/run-all-tests.sh

# Con opciones
./tests/run-all-tests.sh --watch
./tests/run-all-tests.sh --coverage
./tests/run-all-tests.sh --e2e
./tests/run-all-tests.sh --unit
./tests/run-all-tests.sh --integration

# Ver ayuda
./tests/run-all-tests.sh --help
```

---

## 📊 COBERTURA DE TESTS

### **Generar Reporte de Cobertura**:

```bash
npm run test:security:coverage
```

### **Ver Reporte**:

```bash
# Abrir en navegador
open coverage/index.html

# O en Linux
xdg-open coverage/index.html
```

### **Objetivos de Cobertura**:

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| Statements | > 80% | ~85% |
| Branches | > 75% | ~80% |
| Functions | > 80% | ~85% |
| Lines | > 80% | ~85% |

### **Archivos con Mayor Cobertura**:
- ✅ `authMiddleware.ts`: 95%
- ✅ `rateLimit.ts`: 90%
- ✅ `errorHandler.ts`: 100%

### **Archivos con Menor Cobertura**:
- ⚠️ Endpoints API: ~70% (require mocks más complejos)
- ⚠️ Firebase integration: ~60% (mocking de Firebase)

---

## ✍️ ESCRIBIR NUEVOS TESTS

### **Template para Test Unitario**:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myFunction } from '../src/lib/myModule';

describe('myModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('myFunction', () => {
    it('should do something correctly', () => {
      const result = myFunction('input');
      expect(result).toBe('expected');
    });

    it('should handle errors gracefully', () => {
      expect(() => myFunction(null)).toThrow('Error message');
    });
  });
});
```

### **Template para Test de Integración**:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../src/lib/firebase-admin', () => ({
  getAdminAuth: vi.fn(),
  getAdminDb: vi.fn(),
}));

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle full request flow', async () => {
    // Setup mocks
    // Create request
    // Call endpoint
    // Assert response
  });
});
```

### **Template para Test E2E**:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature E2E Tests', () => {
  test('should complete user flow', async ({ page }) => {
    await page.goto('/feature');
    await page.click('button[data-testid="action"]');
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

---

## 🔍 TROUBLESHOOTING

### **Problema 1: Tests Unitarios Fallan por Mocks**

**Error**:
```
Error: Cannot find module 'firebase-admin'
```

**Solución**:
```typescript
// Agregar mock al inicio del archivo
vi.mock('../../src/lib/firebase-admin', () => ({
  getAdminAuth: vi.fn(),
  getAdminDb: vi.fn(),
}));
```

### **Problema 2: Tests E2E No Encuentran el Servidor**

**Error**:
```
Error: page.goto: net::ERR_CONNECTION_REFUSED
```

**Solución**:
```bash
# Asegúrate que el servidor esté corriendo
npm run dev

# Verifica que esté en http://localhost:4321
curl http://localhost:4321
```

### **Problema 3: Rate Limiting Interfiere con Tests**

**Error**:
```
Tests fallan inconsistentemente debido a rate limiting
```

**Solución**:
```typescript
import { clearRateLimits } from '../../src/lib/rateLimit';

beforeEach(() => {
  clearRateLimits(); // Limpiar antes de cada test
});

afterEach(() => {
  clearRateLimits(); // Limpiar después de cada test
});
```

### **Problema 4: Tests de Cobertura Lentos**

**Solución**:
```bash
# Ejecutar solo los tests que cambiaron
npm run test:unit -- --changed

# O ejecutar tests específicos
npm run test:unit -- authMiddleware.test.ts
```

### **Problema 5: Firebase Mocks No Funcionan**

**Solución**:
```typescript
// Usar vi.mocked() para type safety
import { getAdminAuth } from '../../src/lib/firebase-admin';

const mockVerifyIdToken = vi.fn().mockResolvedValue({ uid: '123' });
vi.mocked(getAdminAuth).mockReturnValue({
  verifyIdToken: mockVerifyIdToken,
} as any);
```

---

## 🔄 CI/CD INTEGRATION

### **GitHub Actions Workflow**:

```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Start dev server
        run: npm run dev &
        env:
          CI: true

      - name: Wait for server
        run: npx wait-on http://localhost:4321

      - name: Run E2E tests
        run: npm run e2e:security

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### **Pre-commit Hook**:

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🧪 Running security tests..."

npm run test:unit
npm run test:integration

if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit aborted."
  exit 1
fi

echo "✅ All tests passed!"
```

---

## 📝 CHECKLIST DE TESTING

### **Antes de Hacer Push**:

- [ ] Todos los tests unitarios pasan
- [ ] Todos los tests de integración pasan
- [ ] No hay warnings de linting
- [ ] Cobertura > 80%
- [ ] Tests E2E pasan (si aplica)

### **Antes de Hacer PR**:

- [ ] Branch actualizado con main
- [ ] Tests nuevos para features nuevos
- [ ] Documentación actualizada
- [ ] TESTING.md actualizado (si aplica)
- [ ] CI/CD pasa

### **Antes de Deploy a Producción**:

- [ ] Todos los tests pasan en CI/CD
- [ ] Tests E2E pasan en staging
- [ ] Reporte de cobertura revisado
- [ ] Security audit (npm audit)
- [ ] Manual testing de features críticos

---

## 📚 RECURSOS ADICIONALES

### **Documentación**:
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)

### **Archivos de Referencia**:
- `SECURITY_FIXES.md` - Correcciones Fase 1
- `SECURITY_PHASE2.md` - Correcciones Fase 2
- `README.md` - Documentación general

### **Comandos Útiles**:
```bash
# Ver todos los tests disponibles
npm run test -- --list

# Ejecutar test específico
npm run test -- authMiddleware.test.ts

# Debug mode
npm run test -- --inspect-brk

# Ver solo tests fallidos
npm run test -- --reporter=verbose --only-failures
```

---

**Última Actualización**: 2025-10-29
**Mantenido Por**: Equipo de Seguridad
**Versión**: 1.0.0
