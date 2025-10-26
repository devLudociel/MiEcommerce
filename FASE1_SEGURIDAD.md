# FASE 1: Seguridad Crítica - Completada ✅

## 🎉 Cambios Implementados

### 1. Reglas de Firestore Mejoradas

Las reglas de seguridad de Firestore han sido completamente reescritas con:

- ✅ **Reglas para Wallets**: Los usuarios solo pueden leer su wallet, no modificarlo (solo Admin SDK)
- ✅ **Validaciones en Orders**: Se verifica que el userId coincida con el usuario autenticado
- ✅ **Protección de Transacciones**: wallet_transactions y coupon_usage solo se crean via Admin SDK
- ✅ **Sistema de Admin con Custom Claims**: Soporte para `admin: true` en custom claims
- ✅ **Fallback por Email**: Durante la transición, sigue funcionando la validación por email

### 2. APIs Protegidas

#### **`/api/create-payment-intent`**
Ahora requiere y valida:
- ✅ `orderId` (debe existir en Firestore)
- ✅ El `amount` debe coincidir con el `total` del pedido
- ✅ Previene pagos duplicados
- ✅ Asocia el Payment Intent con metadata del pedido

#### **`/api/admin/set-admin-claims`** (NUEVO)
Endpoint para asignar custom claims de admin a usuarios.

### 3. Variables de Entorno

Información de la empresa movida a `.env`:
```bash
COMPANY_NAME=ImprimeArte
COMPANY_ADDRESS=Calle Principal 123
COMPANY_CITY=Madrid
COMPANY_ZIP_CODE=28001
COMPANY_TAX_ID=B12345678
COMPANY_EMAIL=contacto@imprimearte.es
COMPANY_PHONE=+34 912 345 678
```

### 4. Vulnerabilidades Corregidas

- ✅ Ejecutado `npm audit fix`
- ✅ Actualizadas dependencias de Astro (5.14.3+)
- ✅ Actualizadas dependencias de Vite
- ✅ **0 vulnerabilidades** encontradas

---

## 📋 Pasos Siguientes

### Paso 1: Actualizar tu archivo `.env` local

Copia las nuevas variables de `.env.example` a tu archivo `.env` local:

```bash
# Admin Setup Secret
ADMIN_SETUP_SECRET=tu-secret-super-seguro-aqui-cambiar

# Company Information
COMPANY_NAME=ImprimeArte
COMPANY_ADDRESS=Tu Dirección Real
COMPANY_CITY=Tu Ciudad
COMPANY_ZIP_CODE=Tu Código Postal
COMPANY_TAX_ID=Tu CIF/NIF
COMPANY_EMAIL=tu-email@empresa.com
COMPANY_PHONE=Tu Teléfono
```

### Paso 2: Desplegar las nuevas reglas de Firestore

**IMPORTANTE**: Debes desplegar las nuevas reglas manualmente:

```bash
firebase deploy --only firestore:rules
```

O desde la consola de Firebase:
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database** → **Reglas**
4. Copia el contenido de `firestore.rules`
5. Click en **Publicar**

### Paso 3: Asignar Custom Claims a tu usuario admin

Tienes dos opciones:

#### Opción A: Usando el endpoint API (Recomendado)

```bash
# En tu navegador o usando curl
curl -X POST http://localhost:4321/api/admin/set-admin-claims \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu-email@gmail.com",
    "secret": "tu-secret-del-env"
  }'
```

#### Opción B: Usando Firebase Admin SDK directamente

Crea un script temporal `set-admin.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim(email) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log(`✅ Admin claims set for ${email}`);
  console.log('⚠️ User must sign out and sign in again');
}

setAdminClaim('tu-email@gmail.com');
```

Ejecuta:
```bash
node set-admin.js
```

**IMPORTANTE**: Después de asignar custom claims, debes:
1. Cerrar sesión en la aplicación
2. Volver a iniciar sesión
3. Las custom claims ahora estarán activas

### Paso 4: Verificar que todo funciona

1. **Verifica las reglas de Firestore**:
   - Intenta crear un pedido como usuario normal → Debe funcionar
   - Intenta modificar un wallet directamente → Debe ser denegado

2. **Verifica el acceso admin**:
   - Inicia sesión con tu cuenta admin
   - Ve a `/admin` → Debe funcionar
   - Intenta acceder con una cuenta no-admin → Debe redirigir

3. **Verifica create-payment-intent**:
   - Intenta crear un payment intent sin orderId → Debe fallar (400)
   - Intenta crear uno con un orderId inválido → Debe fallar (404)
   - Crea uno con un orderId válido → Debe funcionar

---

## 🔒 Consideraciones de Seguridad

### Para Producción

1. **Cambia `ADMIN_SETUP_SECRET`** a un valor aleatorio y seguro:
   ```bash
   # Genera uno con:
   openssl rand -hex 32
   ```

2. **Elimina o protege el endpoint** `/api/admin/set-admin-claims`:
   - Opción 1: Elimínalo después de configurar tus admins
   - Opción 2: Agrega autenticación adicional (IP whitelist, etc)

3. **Revisa los emails admin** en `firestore.rules`:
   - Línea 20: Actualiza la lista de emails admin autorizados

4. **Habilita la verificación de email**:
   - En Firebase Console → Authentication → Settings
   - Activa "Email verification required"

### Monitoreo

Después del deploy, monitorea:
- Logs de Firebase para intentos de acceso denegados
- Logs de `create-payment-intent` para intentos de manipulación
- Logs de Admin para uso del endpoint de custom claims

---

## 🐛 Troubleshooting

### "Permission denied" al crear pedidos

**Causa**: Las nuevas reglas son más estrictas.

**Solución**:
1. Verifica que el usuario esté autenticado
2. Verifica que `userId` sea 'guest' o coincida con `auth.uid`
3. Verifica que `customerEmail` coincida con `auth.token.email` (para usuarios autenticados)

### "No puedo acceder al panel admin"

**Causa**: Custom claims no configuradas o usuario no cerró sesión.

**Solución**:
1. Ejecuta el endpoint de set-admin-claims
2. **Cierra sesión completamente**
3. Vuelve a iniciar sesión
4. Verifica en la consola del navegador: `firebase.auth().currentUser.getIdTokenResult().then(t => console.log(t.claims))`

### "Payment Intent falla con monto incorrecto"

**Causa**: El monto enviado no coincide con el del pedido en Firestore.

**Solución**:
1. Verifica que primero se guarde el pedido con `save-order`
2. Usa el `orderId` retornado para crear el payment intent
3. El API ahora valida automáticamente el monto

---

## 📊 Próximos Pasos (Fases 2-5)

La Fase 1 está completa. Las siguientes fases incluyen:

- **Fase 2**: Estabilidad y UX (loading states, error handling, SEO)
- **Fase 3**: Performance (lazy loading, code splitting, caching)
- **Fase 4**: Features Nuevas (inventario, analytics, notificaciones)
- **Fase 5**: Testing y Monitoreo (tests E2E, Sentry, CI/CD)

---

## ✅ Checklist de Verificación

- [ ] Actualizado archivo `.env` local
- [ ] Desplegadas reglas de Firestore
- [ ] Asignadas custom claims a usuarios admin
- [ ] Cerrado sesión y vuelto a iniciar como admin
- [ ] Verificado acceso al panel `/admin`
- [ ] Probado crear un pedido
- [ ] Verificado que variables de empresa aparecen en facturas
- [ ] Ejecutado `npm install` (por las actualizaciones de seguridad)
- [ ] Cambiado `ADMIN_SETUP_SECRET` a un valor seguro

---

¿Preguntas o problemas? Revisa la documentación o contacta al equipo de desarrollo.
