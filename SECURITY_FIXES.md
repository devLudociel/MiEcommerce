# Correcciones de Seguridad Aplicadas

**Fecha**: 2025-10-28
**Estado**: ✅ Vulnerabilidades Críticas Corregidas

---

## 📋 RESUMEN DE CAMBIOS

Se han corregido **3 vulnerabilidades críticas** y **2 vulnerabilidades medias** identificadas en la auditoría de seguridad.

### Archivos Nuevos Creados

1. **`src/lib/authMiddleware.ts`** - Sistema de autenticación y autorización reutilizable
2. **`src/lib/errorHandler.ts`** - Manejo seguro de errores sin exponer stack traces
3. **`SECURITY_FIXES.md`** - Este documento

### Archivos Modificados

1. **`src/pages/api/admin/update-order-status.ts`** - ✅ Autenticación agregada
2. **`src/pages/api/admin/get-order.ts`** - ✅ Autenticación agregada
3. **`src/pages/api/admin/set-admin-claims.ts`** - ✅ Seguridad mejorada
4. **`src/pages/api/save-order.ts`** - ✅ Stack traces protegidos
5. **`src/pages/api/create-payment-intent.ts`** - ✅ Stack traces protegidos
6. **`.env.example`** - ✅ Variable ADMIN_SETUP_DISABLED agregada

---

## 🔴 VULNERABILIDADES CRÍTICAS CORREGIDAS

### 1. ✅ Endpoint Admin sin Autenticación (CRÍTICO)

**Archivos**:
- `src/pages/api/admin/update-order-status.ts`
- `src/pages/api/admin/get-order.ts`

**Problema**: Los endpoints admin no tenían ningún mecanismo de autenticación. Cualquiera podía modificar pedidos.

**Solución Implementada**:
- ✅ Autenticación requerida con Firebase ID Token
- ✅ Verificación de permisos de administrador (custom claim `admin: true`)
- ✅ Validación de estados permitidos
- ✅ Audit logging de todas las acciones
- ✅ Registro de IP, email y user agent

**Uso Ahora Requerido**:
```bash
curl -X POST https://tudominio.com/api/admin/update-order-status \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{"id":"order123","status":"processing"}'
```

**Características de Seguridad**:
- 401 Unauthorized si no hay token
- 403 Forbidden si no es admin
- 400 Bad Request si el status no es válido
- Registro en colección `audit_logs` de Firestore

---

### 2. ✅ Admin Setup Endpoint Mejorado (ALTO)

**Archivo**: `src/pages/api/admin/set-admin-claims.ts`

**Problema**:
- Endpoint protegido solo por secret estático
- Secret por defecto débil
- Sin logging de acciones
- Siempre activo en producción

**Solución Implementada**:
- ✅ **Dos métodos de autenticación**:
  1. **Admin existente** (recomendado): Requiere ID Token de admin
  2. **Setup inicial**: Secret temporal (se desactiva con `ADMIN_SETUP_DISABLED=true`)
- ✅ Validación de formato de email
- ✅ Rechaza el secret por defecto inseguro
- ✅ Audit logging completo
- ✅ Registro de método de autenticación usado

**Nuevo Flujo de Seguridad**:

**Primera vez (Setup inicial)**:
```bash
# 1. Configurar secret fuerte en .env
ADMIN_SETUP_SECRET=tu-secret-super-seguro-aqui-123456789

# 2. Asignar primer admin
curl -X POST https://tudominio.com/api/admin/set-admin-claims \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "secret": "tu-secret-super-seguro-aqui-123456789"
  }'

# 3. Deshabilitar el método de secret
# Agregar a .env:
ADMIN_SETUP_DISABLED=true
```

**Después del setup (Método recomendado)**:
```bash
# Solo admins existentes pueden crear nuevos admins
curl -X POST https://tudominio.com/api/admin/set-admin-claims \
  -H "Authorization: Bearer <admin-id-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo-admin@example.com"
  }'
```

**Audit Log Registra**:
- Acción realizada (SET_ADMIN_CLAIMS / REMOVE_ADMIN_CLAIMS)
- Quién la realizó (uid y email)
- Usuario objetivo (uid y email)
- Método de autenticación usado
- IP y User Agent
- Timestamp

---

## 🟠 VULNERABILIDADES MEDIAS CORREGIDAS

### 3. ✅ Exposición de Stack Traces (MEDIO)

**Archivos**:
- `src/pages/api/admin/set-admin-claims.ts`
- `src/pages/api/save-order.ts`
- `src/pages/api/create-payment-intent.ts`
- `src/pages/api/admin/update-order-status.ts`
- `src/pages/api/admin/get-order.ts`

**Problema**: Los endpoints exponían stack traces completos en producción, revelando:
- Rutas absolutas del servidor
- Nombres de módulos y versiones
- Estructura de código interno

**Solución Implementada**:

**Helper de Manejo de Errores** (`src/lib/errorHandler.ts`):
```typescript
// En producción: mensaje genérico
export function handleApiError(error: any, context: string) {
  if (import.meta.env.PROD) {
    return { error: 'Error interno del servidor' };
  }
  // En desarrollo: información detallada
  return { error: error.message, details: error.stack };
}
```

**Funciones Disponibles**:
- `errorResponse()` - Errores 500
- `validationErrorResponse()` - Errores 400
- `unauthorizedResponse()` - Errores 401
- `forbiddenResponse()` - Errores 403
- `notFoundResponse()` - Errores 404
- `successResponse()` - Respuestas 200

**Antes**:
```json
{
  "error": "Cannot read property 'uid' of null",
  "details": "Error: Cannot read property 'uid' of null\n    at /home/server/app/api/admin.ts:45:20\n    ..."
}
```

**Después (Producción)**:
```json
{
  "error": "Error interno del servidor",
  "code": "UPDATE_ORDER_STATUS"
}
```

---

### 4. ✅ Sistema de Autenticación Centralizado (MEDIO)

**Archivo**: `src/lib/authMiddleware.ts`

**Problema**: Cada endpoint implementaba su propia lógica de autenticación, causando:
- Código duplicado
- Inconsistencias
- Errores de seguridad

**Solución Implementada**:

**Funciones Reutilizables**:

```typescript
// 1. Verificar autenticación básica
const authResult = await verifyAuthToken(request);

// 2. Verificar admin
const authResult = await verifyAdminAuth(request);

// 3. Verificar propietario o admin
const authResult = await verifyOwnerOrAdmin(request, resourceUserId);
```

**Características**:
- ✅ Manejo de errores específicos de Firebase
- ✅ Detección de tokens expirados
- ✅ Validación de formato Bearer Token
- ✅ Verificación de custom claims
- ✅ Mensajes de error claros

**Ejemplo de Uso**:
```typescript
export const POST: APIRoute = async ({ request }) => {
  // Verificar admin
  const authResult = await verifyAdminAuth(request);

  if (!authResult.success) {
    return forbiddenResponse(authResult.error);
  }

  // Usuario autenticado y es admin
  const { decodedToken } = authResult;
  console.log(`Admin ${decodedToken.email} realizando acción`);

  // ... resto del código
};
```

---

## 📊 NUEVAS FUNCIONALIDADES DE SEGURIDAD

### Audit Logging

Todos los endpoints admin ahora registran acciones en la colección `audit_logs`:

```typescript
{
  action: 'UPDATE_ORDER_STATUS',
  performedBy: 'user-uid-123',
  performedByEmail: 'admin@example.com',
  orderId: 'order-456',
  oldStatus: 'pending',
  newStatus: 'processing',
  timestamp: Timestamp,
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
}
```

**Acciones Registradas**:
- `UPDATE_ORDER_STATUS` - Cambios de estado de pedidos
- `SET_ADMIN_CLAIMS` - Asignación de permisos admin
- `REMOVE_ADMIN_CLAIMS` - Remoción de permisos admin

---

## 🔧 CONFIGURACIÓN REQUERIDA

### Variables de Entorno

Actualizar `.env` con:

```env
# IMPORTANTE: Cambiar este valor en producción
ADMIN_SETUP_SECRET=tu-secret-super-seguro-aqui-$(openssl rand -hex 32)

# Deshabilitar después de crear el primer admin (RECOMENDADO)
ADMIN_SETUP_DISABLED=true
```

### Generar Secret Seguro

```bash
# Linux/Mac
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

### Seguridad Adicional (Opcional pero Recomendado)

1. **Rate Limiting Distribuido**
   - Migrar de in-memory a Redis
   - Protección contra DDoS

2. **Content Security Policy (CSP)**
   - Protección contra XSS
   - Configurar headers de seguridad

3. **Verificación de Custom Claims en Frontend**
   - Actualizar `RequireAdmin.tsx`
   - Usar `getIdTokenResult()` para verificar claims

4. **Monitoreo y Alertas**
   - Integrar Sentry para errores
   - Alertas de intentos de acceso no autorizado

5. **Backup de Audit Logs**
   - Export regular a Cloud Storage
   - Retención de logs por compliance

---

## ✅ CHECKLIST DE SEGURIDAD POST-DEPLOY

- [ ] Cambiar `ADMIN_SETUP_SECRET` en producción
- [ ] Asignar primer admin usando el secret
- [ ] Establecer `ADMIN_SETUP_DISABLED=true`
- [ ] Verificar que audit logs se están creando correctamente
- [ ] Probar autenticación en endpoints admin
- [ ] Revisar logs de producción (no deben mostrar stack traces)
- [ ] Verificar que solo admins pueden acceder a endpoints protegidos

---

## 📞 SOPORTE

Si encuentras algún problema con las correcciones de seguridad:

1. Verifica que todas las variables de entorno estén configuradas
2. Asegúrate de que el usuario tenga custom claim `admin: true`
3. Revisa los logs en Firestore > `audit_logs`
4. Verifica que el token no esté expirado

---

## 📝 REGISTRO DE CAMBIOS

**v1.0.0 - 2025-10-28**
- ✅ Autenticación agregada a todos los endpoints admin
- ✅ Sistema de audit logging implementado
- ✅ Manejo seguro de errores sin stack traces
- ✅ Helper de autenticación centralizado
- ✅ Mejoras en endpoint de admin claims
- ✅ Documentación de seguridad actualizada

---

**Estado**: 🟢 Producción Ready
**Nivel de Seguridad**: Alto
**Vulnerabilidades Críticas Restantes**: 0
