# 🔥 Configurar Firebase Storage - Guía Paso a Paso

## ⚠️ Problema Actual

Estás recibiendo este error:
```
Firebase Storage: User does not have permission to access 'product-previews/xxx.png'. (storage/unauthorized)
```

Esto significa que necesitas actualizar las **reglas de seguridad de Firebase Storage**.

---

## 📋 Paso 1: Ir a Firebase Console

1. Ve a: https://console.firebase.google.com/
2. Selecciona tu proyecto: **ecommerce-ia-2ecf4**
3. En el menú lateral, click en **"Storage"**
4. Click en la pestaña **"Rules"** (Reglas)

---

## 📝 Paso 2: Actualizar las Reglas

Verás un editor con las reglas actuales. **Reemplaza TODO el contenido** con las reglas del archivo `storage.rules`.

### Copia y pega este contenido:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() &&
             (request.auth.token.admin == true);
    }

    function isValidSize() {
      return request.resource.size < 100 * 1024 * 1024;
    }

    function isImage() {
      return request.resource.contentType.matches('image/.*');
    }

    function isAllowedFileType() {
      return request.resource.contentType.matches('image/.*') ||
             request.resource.contentType.matches('application/pdf') ||
             request.resource.contentType.matches('application/zip') ||
             request.resource.contentType.matches('application/x-zip-compressed') ||
             request.resource.contentType.matches('image/svg\\+xml');
    }

    // DIGITAL PRODUCTS
    match /digital-products/{fileName} {
      allow create, update: if isAuthenticated() && isValidSize() && isAllowedFileType();
      allow read: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // PRODUCT PREVIEWS
    match /product-previews/{fileName} {
      allow create, update: if isAuthenticated() && isValidSize() && isImage();
      allow read: if true;
      allow delete: if isAdmin();
    }

    // CLIPARTS
    match /cliparts/{fileName} {
      allow create, update: if isAuthenticated() && isValidSize() && isImage();
      allow read: if true;
      allow delete: if isAdmin();
    }

    // USER UPLOADS
    match /uploads/{userId}/{fileName} {
      allow create, update: if isAuthenticated() &&
                              request.auth.uid == userId &&
                              isValidSize() &&
                              isImage();
      allow read: if true;
      allow delete: if isAuthenticated() && request.auth.uid == userId;
    }

    // CUSTOMIZATION IMAGES
    match /customization/{fileName} {
      allow create, update: if isAuthenticated() && isValidSize() && isImage();
      allow read: if true;
      allow delete: if isAuthenticated();
    }

    // PROFILE IMAGES
    match /profiles/{userId}/{fileName} {
      allow create, update: if isAuthenticated() &&
                              request.auth.uid == userId &&
                              isValidSize() &&
                              isImage();
      allow read: if true;
      allow delete: if isAuthenticated() && request.auth.uid == userId;
    }

    // DENY ALL OTHER PATHS
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 💾 Paso 3: Publicar las Reglas

1. Click en el botón **"Publish"** (Publicar) arriba a la derecha
2. Confirma que quieres publicar los cambios
3. Espera a que se apliquen (tarda unos segundos)

---

## ✅ Paso 4: Verificar

1. Recarga tu aplicación (Ctrl+R o Cmd+R)
2. Ve a: `http://localhost:4321/admin/digital-products`
3. Intenta subir una imagen de preview
4. **Debería funcionar sin errores** ✨

---

## 🔐 ¿Qué Permiten Estas Reglas?

### Para Admins (usuarios autenticados):
- ✅ Subir imágenes de preview de productos
- ✅ Subir archivos digitales (ZIP, PNG, PDF, SVG)
- ✅ Subir cliparts
- ✅ Eliminar archivos

### Para Clientes (usuarios autenticados):
- ✅ Ver/descargar productos digitales que compraron
- ✅ Subir imágenes de personalización
- ✅ Ver imágenes públicas (previews, cliparts)

### Para Visitantes (no autenticados):
- ✅ Ver imágenes públicas (previews de productos, cliparts)
- ❌ No pueden subir ni descargar archivos digitales

---

## 🛡️ Características de Seguridad

1. **Límite de tamaño:** Máximo 100 MB por archivo
2. **Tipos de archivo permitidos:**
   - Imágenes: PNG, JPG, JPEG, SVG
   - Documentos: PDF
   - Comprimidos: ZIP
3. **Autenticación requerida:** Para subir archivos
4. **Separación de carpetas:** Cada tipo de archivo en su propia carpeta
5. **Permisos por carpeta:** Diferentes niveles de acceso según la carpeta

---

## ❓ Solución de Problemas

### Error: "User does not have permission"
**Causa:** Las reglas no están aplicadas correctamente

**Solución:**
1. Verifica que hayas publicado las reglas en Firebase Console
2. Recarga la aplicación completamente (Ctrl+Shift+R)
3. Cierra sesión y vuelve a iniciar sesión
4. Verifica que estés usando una cuenta autenticada

### Error: "File too large"
**Causa:** El archivo excede 100 MB

**Solución:**
- Comprime el archivo
- Divide en múltiples archivos más pequeños
- Si necesitas archivos más grandes, aumenta el límite en las reglas:
  ```javascript
  function isValidSize() {
    return request.resource.size < 200 * 1024 * 1024; // 200 MB
  }
  ```

### Error: "Invalid file type"
**Causa:** El tipo de archivo no está permitido

**Solución:**
- Asegúrate de subir solo: PNG, JPG, PDF, ZIP, SVG
- Si necesitas otros tipos, agrégalos a `isAllowedFileType()`

---

## 📱 Firebase CLI (Opcional)

Si prefieres usar la terminal:

```bash
# Instalar Firebase CLI (si no lo tienes)
npm install -g firebase-tools

# Login
firebase login

# Inicializar proyecto (si no lo has hecho)
firebase init storage

# Desplegar reglas
firebase deploy --only storage
```

---

## 🎯 Próximos Pasos

1. ✅ Actualiza las reglas en Firebase Console
2. ✅ Recarga la aplicación
3. ✅ Prueba subir una imagen de preview
4. ✅ Prueba subir un archivo digital
5. ✅ Verifica que todo funcione correctamente

---

## 💡 Notas Importantes

- Las reglas se aplican **inmediatamente** después de publicarlas
- **No afectan** a los archivos ya subidos
- Puedes ver los logs de acceso en Firebase Console → Storage → Usage
- Las reglas son **reversibles**: puedes cambiarlas en cualquier momento

---

¡Listo! Después de aplicar estas reglas, deberías poder subir archivos sin problemas. 🎉
