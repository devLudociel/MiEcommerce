# 🔧 Fix: Error al subir imágenes en el Customizer

## Problema Identificado

```
Firebase Storage: User does not have permission to access
'personalizaciones/d144EjNchGeaPt7g2e3TbAjlD5H2/7/1763063507516_funkohistoria (1).png'
(storage/unauthorized)
```

**Causa:** La ruta `personalizaciones/{userId}/{productType}/{fileName}` no estaba cubierta por ninguna regla en `storage.rules`, por lo que caía en la regla por defecto que **deniega todo**.

## Solución Aplicada

✅ Agregada nueva regla en `storage.rules` (líneas 122-138):

```javascript
// ==========================================================================
// PERSONALIZACIONES: User customization images organized by user and product type
// ==========================================================================
match /personalizaciones/{userId}/{productType}/{fileName} {
  // Users can upload to their own folder
  allow create, update: if isAuthenticated() &&
                          request.auth.uid == userId &&
                          isValidSize() &&
                          isImage();

  // Anyone can read (for order fulfillment and previews)
  allow read: if true;

  // Only file owner or admin can delete
  allow delete: if isAuthenticated() &&
                  (request.auth.uid == userId || isAdmin());
}
```

### Validaciones de la Regla

- ✅ **isAuthenticated()** - Usuario debe estar autenticado
- ✅ **request.auth.uid == userId** - Solo puede subir a su propia carpeta
- ✅ **isValidSize()** - Máximo 100MB
- ✅ **isImage()** - Solo archivos de imagen
- ✅ **read: true** - Cualquiera puede leer (para previews y fulfillment)
- ✅ **delete: owner o admin** - Solo el dueño o admin pueden eliminar

## 🚀 Pasos para Deployar

### Opción 1: Desplegar desde tu máquina local

```bash
# 1. Asegurarte de tener Firebase CLI instalado
npm install -g firebase-tools

# 2. Login (si no estás ya logueado)
firebase login

# 3. Deployar SOLO las reglas de Storage
firebase deploy --only storage

# Output esperado:
# ✔  Deploy complete!
```

### Opción 2: Desplegar desde Firebase Console (Manual)

1. Ir a **Firebase Console**: https://console.firebase.google.com/
2. Seleccionar tu proyecto: **ecommerce-ia-2ecf4**
3. Ir a **Storage** (menú lateral izquierdo)
4. Click en pestaña **Rules**
5. Copiar todo el contenido de `/home/user/MiEcommerce/storage.rules`
6. Pegar en el editor
7. Click en **Publish**

### Opción 3: Desde GitHub Actions / CI/CD

Si tienes GitHub Actions configurado, el push ya debería disparar el deploy automáticamente.

## ✅ Verificar que funciona

Después de deployar:

1. Ir al customizer: http://localhost:4321/personalizar/figura-personalizada-resina
2. Intentar subir una imagen
3. Debería funcionar sin error 403

## 📋 Commit Realizado

```
git commit: b8b74f1
Message: fix: Agregar regla de Storage para path personalizaciones
Branch: claude/code-review-session-017kkbwPHD2oEfn5DBc5oPFU
```

## 🔍 Debugging

Si sigue sin funcionar después de deployar:

### 1. Verificar que el usuario está autenticado

```javascript
// En la consola del navegador
firebase.auth().currentUser
// Debería mostrar el objeto del usuario, no null
```

### 2. Ver las reglas activas en Firebase Console

Firebase Console > Storage > Rules

Debería ver la nueva regla para `personalizaciones/`

### 3. Ver logs en tiempo real

Firebase Console > Storage > Usage > Request logs

Aquí puedes ver exactamente qué regla está evaluando y por qué falla.

### 4. Verificar el path exacto

El código en `firebase.ts:167` construye el path así:

```typescript
`personalizaciones/${userId}/${productType}/${fileName}`
```

Ejemplo real:
```
personalizaciones/d144EjNchGeaPt7g2e3TbAjlD5H2/7/1763063507516_funkohistoria.png
```

Este path DEBE coincidir exactamente con el pattern de la regla.

## 📝 Notas Adicionales

- Las reglas de Storage se despliegan **instantáneamente** (no requiere rebuild de la app)
- Las reglas se aplican **del más específico al más general**
- Si ninguna regla coincide, se usa la regla por defecto (`match /{allPaths=**}`)
- La regla por defecto en este proyecto **deniega todo** por seguridad

## 🆘 Si sigue fallando

1. Verificar que el deploy se completó exitosamente
2. Verificar que el usuario está logueado (no es `guest`)
3. Verificar que el userId en el path coincide con `auth.currentUser.uid`
4. Intentar limpiar cache del navegador
5. Verificar en Firebase Console > Storage que la carpeta `personalizaciones/` existe

---

**Estado:** ✅ Regla agregada y commiteada
**Siguiente paso:** 🚀 Deploy a Firebase
