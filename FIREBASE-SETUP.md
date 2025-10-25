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

## ⚙️ CAMBIAR EL EMAIL DE ADMIN

Si quieres usar otro email como admin:

1. Abre `firestore.rules`
2. Cambia esta línea:
   ```javascript
   request.auth.token.email == 'ludociel.dev@gmail.com'
   ```
   Por tu email:
   ```javascript
   request.auth.token.email == 'tu@email.com'
   ```
3. Vuelve a publicar las reglas

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
