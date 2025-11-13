# 🔥 Cómo Desplegar las Reglas de Firebase Storage

Has encontrado un error `403 (storage/unauthorized)` porque Firebase Storage no tiene las reglas de seguridad configuradas.

Ya he creado el archivo `storage.rules` con las reglas necesarias. Ahora necesitas desplegarlas.

## ⚡ Opción 1: Desplegar con Firebase CLI (Recomendado)

### Paso 1: Login en Firebase CLI

```bash
firebase login
```

Esto abrirá tu navegador para que inicies sesión con tu cuenta de Google/Firebase.

### Paso 2: Seleccionar tu proyecto (si es necesario)

```bash
firebase use --add
```

Selecciona tu proyecto de Firebase de la lista.

### Paso 3: Desplegar las reglas de Storage

```bash
firebase deploy --only storage
```

✅ ¡Listo! Las reglas se desplegarán en unos segundos.

---

## 🌐 Opción 2: Desplegar desde la Consola de Firebase (Manual)

Si prefieres hacerlo manualmente desde la web:

### Paso 1: Ir a Firebase Console
1. Ve a https://console.firebase.google.com/
2. Selecciona tu proyecto

### Paso 2: Ir a Storage
1. En el menú lateral, haz clic en **"Storage"**
2. Si no has activado Storage aún, actívalo
3. Haz clic en la pestaña **"Rules"** (Reglas)

### Paso 3: Copiar y Pegar las Reglas
Copia todo el contenido del archivo `storage.rules` y pégalo en el editor de reglas de la consola.

Las reglas son:

```
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isImage() {
      return request.resource.contentType.matches('image/.*');
    }

    function isValidSize() {
      return request.resource.size < 5 * 1024 * 1024;
    }

    match /product-previews/{userId}/{fileName} {
      allow write: if isAuthenticated()
                   && request.auth.uid == userId
                   && isImage()
                   && isValidSize();
      allow read: if true;
    }

    match /personalizaciones/{userId}/{productType}/{fileName} {
      allow write: if isAuthenticated()
                   && request.auth.uid == userId
                   && isImage()
                   && isValidSize();
      allow read: if true;
    }

    match /products/{productId}/{fileName} {
      allow write: if isAuthenticated()
                   && isImage()
                   && isValidSize();
      allow read: if true;
    }

    match /users/{userId}/profile/{fileName} {
      allow write: if isAuthenticated()
                   && request.auth.uid == userId
                   && isImage()
                   && isValidSize();
      allow read: if true;
    }

    match /brand-kit/{userId}/{allPaths=**} {
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Paso 4: Publicar
Haz clic en **"Publish"** (Publicar)

✅ ¡Listo!

---

## 🔐 ¿Qué hacen estas reglas?

Las reglas de seguridad permiten:

✅ **Usuarios autenticados** pueden subir imágenes a sus propias carpetas
✅ **Solo imágenes** (JPG, PNG, WEBP)
✅ **Máximo 5MB** por archivo
✅ **Lectura pública** para mostrar las imágenes en el frontend

### Carpetas protegidas:
- `product-previews/{userId}/` - Imágenes de preview de productos (admin)
- `personalizaciones/{userId}/` - Imágenes subidas por clientes
- `products/{productId}/` - Imágenes de productos
- `users/{userId}/profile/` - Fotos de perfil
- `brand-kit/{userId}/` - Archivos de brand kit

---

## 🧪 Verificar que funciona

Después de desplegar las reglas:

1. Recarga la página de tu aplicación
2. Ve al Panel Admin → Customización
3. Intenta subir una imagen de preview para un color
4. ✅ Debería funcionar sin el error 403

---

## ❓ Problemas Comunes

### "No authorized accounts, run firebase login"
- Ejecuta: `firebase login` para iniciar sesión

### "Error: No project active"
- Ejecuta: `firebase use --add` y selecciona tu proyecto

### "Permission denied"
- Asegúrate de que tu cuenta de Google tiene permisos de Editor o Owner en el proyecto de Firebase

---

## 📞 Necesitas ayuda?

Si tienes problemas desplegando las reglas, avísame y te ayudo!
