# 🔥 Configuración de Firebase para el Dashboard

## ⚠️ ERROR ACTUAL: "Missing or insufficient permissions"

El Dashboard Admin necesita permisos para leer datos de Firestore. Sigue estos pasos:

---

## 📋 PASO 1: Actualizar Reglas de Firestore

### **Opción A: Desde Firebase Console (Recomendado)**

1. Ve a **Firebase Console**: https://console.firebase.google.com/
2. Selecciona tu proyecto
3. En el menú lateral, ve a **Firestore Database**
4. Haz clic en la pestaña **"Reglas"** (Rules)
5. Copia y pega el contenido del archivo `firestore.rules` de este proyecto
6. Haz clic en **"Publicar"** (Publish)

### **Opción B: Desde Firebase CLI**

```bash
# Instalar Firebase CLI si no la tienes
npm install -g firebase-tools

# Login
firebase login

# Desplegar solo las reglas
firebase deploy --only firestore:rules
```

---

## 🔑 REGLAS IMPORTANTES PARA EL DASHBOARD

El archivo `firestore.rules` incluye:

✅ **Admins pueden leer TODO** (email: ludociel.dev@gmail.com)
✅ **Productos**: Lectura pública, escritura solo admin
   - Soporta ambas colecciones: `products` (inglés) y `productos` (español)
✅ **Pedidos**: Lectura para dueño o admin
✅ **Cupones**: Lectura pública, escritura solo admin
✅ **Transacciones Wallet**: Solo dueño o admin
✅ **Reseñas**: Lectura pública, escritura autenticados

---

## 🎯 VERIFICAR QUE FUNCIONÓ

1. Ve a Firebase Console → Firestore Database → Reglas
2. Verifica que veas la función `isAdmin()`:
   ```javascript
   function isAdmin() {
     return request.auth != null &&
            request.auth.token.email == 'ludociel.dev@gmail.com';
   }
   ```

3. Recarga tu navegador en http://localhost:4321/admin
4. El Dashboard debería cargar sin errores

---

## ⚙️ CONFIGURAR TU EMAIL DE ADMIN

**IMPORTANTE:** Debes usar el MISMO email en dos lugares:

### 1. En el archivo `.env` (ya configurado):
```env
PUBLIC_ADMIN_EMAILS=ludociel.dev@gmail.com
```

### 2. En `firestore.rules` antes de subirlo a Firebase:

1. Abre el archivo `firestore.rules`
2. Busca la línea 8 que dice:
   ```javascript
   function isAdmin() {
     return request.auth != null && request.auth.token.email == 'ludociel.dev@gmail.com';
   }
   ```
3. Si tu email es diferente, cámbialo por el que tienes en `.env`
4. Guarda el archivo
5. Copia TODO el contenido a Firebase Console y publica

**Si quieres múltiples admins:**
- En `.env`: Separa los emails por comas
  ```
  PUBLIC_ADMIN_EMAILS=admin1@gmail.com,admin2@gmail.com
  ```
- En `firestore.rules`: Agrega más condiciones
  ```javascript
  function isAdmin() {
    return request.auth != null &&
           (request.auth.token.email == 'admin1@gmail.com' ||
            request.auth.token.email == 'admin2@gmail.com');
  }
  ```

---

## 🔒 SEGURIDAD

Estas reglas:
- ✅ Protegen datos sensibles
- ✅ Solo admins pueden ver estadísticas globales
- ✅ Usuarios solo ven sus propios datos
- ✅ Previenen acceso no autorizado

---

## 🐛 SI SIGUE SIN FUNCIONAR

1. **Verifica que estás logueado como admin:**
   - Email debe ser exactamente: `ludociel.dev@gmail.com`

2. **Limpia la caché del navegador:**
   ```
   Ctrl + Shift + R (Windows/Linux)
   Cmd + Shift + R (Mac)
   ```

3. **Verifica en la consola del navegador:**
   - Abre DevTools (F12)
   - Busca errores en rojo

4. **Verifica las reglas en Firebase Console:**
   - Debe decir "Publicado" con fecha reciente

---

## 📞 Ayuda

Si después de seguir estos pasos sigue sin funcionar, avísame con:
- El error exacto que ves en la consola
- Captura de las reglas en Firebase Console
