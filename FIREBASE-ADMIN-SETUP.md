# 🔧 Configuración de Firebase Admin SDK

## ¿Por qué Firebase Admin SDK?

Firebase Admin SDK se usa en los **endpoints del servidor** (API routes) para realizar operaciones con privilegios completos que **bypasean las reglas de seguridad** de Firestore.

**Casos de uso**:

- Guardar pedidos desde el servidor (`/api/save-order`)
- Procesar transacciones de wallet
- Enviar emails automáticos
- Operaciones administrativas

---

## 🚨 Problema que Resuelve

**Antes**: El endpoint `/api/save-order` usaba el cliente de Firebase normal, que requiere autenticación de usuario. Esto causaba:

```
Error: 7 PERMISSION_DENIED: Missing or insufficient permissions
```

**Ahora**: Con Firebase Admin SDK, el servidor tiene privilegios completos y puede escribir en Firestore sin restricciones.

---

## 📋 Pasos de Configuración

### 1️⃣ Ir a Firebase Console

Ve a: https://console.firebase.google.com/

### 2️⃣ Selecciona tu Proyecto

Haz clic en tu proyecto de ImprimeArte/MiEcommerce

### 3️⃣ Ve a Project Settings

1. Haz clic en el **ícono de engranaje ⚙️** en el menú lateral izquierdo
2. Selecciona **"Project Settings"** (Configuración del proyecto)

### 4️⃣ Ve a Service Accounts

1. En la parte superior, verás varias pestañas: **General**, **Service accounts**, **Cloud Messaging**, etc.
2. Haz clic en **"Service accounts"** (Cuentas de servicio)

### 5️⃣ Generar Nueva Clave Privada

1. Verás una sección que dice **"Firebase Admin SDK"**
2. Asegúrate de que esté seleccionado el lenguaje **"Node.js"**
3. Haz clic en el botón **"Generate new private key"** (Generar nueva clave privada)
4. Aparecerá un diálogo de confirmación
5. Haz clic en **"Generate key"** (Generar clave)
6. Se descargará un archivo JSON con un nombre como: `tu-proyecto-firebase-adminsdk-xxxxx.json`

---

## 🔑 Configurar las Credenciales

Tienes **dos opciones** para configurar las credenciales:

### ✅ Opción 1: Service Account Completo (RECOMENDADO)

**Ventajas**: Más fácil de configurar, todo en una variable

1. Abre el archivo JSON descargado en un editor de texto
2. Copia **TODO** el contenido (es un JSON grande)
3. En tu archivo `.env`, añade:

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"tu-proyecto-id","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/..."}
```

**IMPORTANTE**:

- Debe ser **TODO EN UNA LÍNEA**
- **SIN saltos de línea** en el JSON
- Las `\n` dentro del `private_key` deben mantenerse como `\n` (no convertirlas a saltos de línea reales)

---

### 🔄 Opción 2: Credenciales Individuales (ALTERNATIVA)

Si prefieres separar las credenciales:

1. Abre el archivo JSON descargado
2. Extrae estos valores:
   - `client_email`
   - `private_key`

3. En tu archivo `.env`, añade:

```env
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...\n-----END PRIVATE KEY-----\n"
```

**IMPORTANTE**:

- El `private_key` debe estar **entre comillas dobles**
- Mantén las `\n` literalmente (no las conviertas a saltos de línea)
- Debe tener el formato exacto con `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`

---

## 🧪 Verificar que Funciona

1. Reinicia tu servidor de desarrollo:

```bash
npm run dev
```

2. Ve a tu sitio y agrega un producto al carrito

3. Procede al checkout y completa un pedido de prueba

4. Si todo está bien configurado, verás en la consola del servidor:

```
✅ Firebase Admin inicializado con Service Account
🔵 API save-order: Intentando guardar en Firestore con Admin SDK...
✅ API save-order: Pedido guardado con ID: xxxxx
```

5. **NO** deberías ver el error:

```
❌ 7 PERMISSION_DENIED: Missing or insufficient permissions
```

---

## 🔒 Seguridad

### ⚠️ MUY IMPORTANTE

**NUNCA** subas las credenciales de Firebase Admin SDK a GitHub o repositorios públicos:

1. ✅ El archivo `.env` ya está en `.gitignore` (no se sube)
2. ✅ El archivo JSON descargado NO debe estar en tu repositorio
3. ✅ Guarda el archivo JSON en un lugar seguro (como un gestor de contraseñas)

### 🛡️ Rotación de Claves

Si accidentalmente expones tu clave privada:

1. Ve a Firebase Console → Project Settings → Service Accounts
2. Haz clic en **"Manage service account permissions"**
3. Deshabilita la clave comprometida
4. Genera una nueva clave privada
5. Actualiza tu `.env` con las nuevas credenciales

---

## 🐛 Solución de Problemas

### Error: "Firebase Admin no pudo inicializarse"

**Causa**: Falta configurar las credenciales en `.env`

**Solución**:

1. Verifica que hayas añadido `FIREBASE_SERVICE_ACCOUNT` o `FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY` en tu `.env`
2. Reinicia el servidor después de modificar `.env`

---

### Error: "invalid_grant: Invalid JWT Signature"

**Causa**: El `private_key` no está correctamente formateado

**Solución**:

1. Asegúrate de que las `\n` estén literalmente como `\n` (no como saltos de línea reales)
2. El formato debe ser: `"-----BEGIN PRIVATE KEY-----\nXXXXX\n-----END PRIVATE KEY-----\n"`
3. Todo debe estar entre comillas dobles

---

### Error: "Project ID not found"

**Causa**: Falta `PUBLIC_FIREBASE_PROJECT_ID` en `.env`

**Solución**:
Verifica que tu `.env` tenga:

```env
PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
```

---

## 📚 Diferencia entre Client SDK y Admin SDK

| Aspecto                 | Client SDK                | Admin SDK                                       |
| ----------------------- | ------------------------- | ----------------------------------------------- |
| **Dónde se usa**        | Navegador (cliente)       | Servidor (API routes)                           |
| **Autenticación**       | Requiere login de usuario | Privilegios completos                           |
| **Reglas de seguridad** | SÍ aplican                | NO aplican (bypasea)                            |
| **Archivo config**      | `src/lib/firebase.ts`     | `src/lib/firebase-admin.ts`                     |
| **Variables .env**      | `PUBLIC_FIREBASE_*`       | `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` |

---

## ✅ Checklist Final

- [ ] He descargado el archivo JSON de Service Account desde Firebase Console
- [ ] He copiado las credenciales a mi archivo `.env`
- [ ] He reiniciado el servidor (`npm run dev`)
- [ ] He probado crear un pedido y funciona sin errores de permisos
- [ ] He guardado el archivo JSON en un lugar seguro (no en el repositorio)
- [ ] El archivo JSON está añadido a `.gitignore` (si lo tienes en el proyecto)

---

## 🎉 ¡Listo!

Una vez configurado Firebase Admin SDK, tu servidor podrá:

- ✅ Guardar pedidos en Firestore
- ✅ Procesar transacciones de wallet
- ✅ Usar cupones
- ✅ Agregar cashback
- ✅ Todas las operaciones administrativas

Sin restricciones de las reglas de seguridad de Firestore.
