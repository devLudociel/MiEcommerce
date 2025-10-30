# 🔐 Validación de Variables de Entorno

Este proyecto implementa validación automática de variables de entorno usando Zod para prevenir errores en tiempo de ejecución.

## ✅ Características

- **Validación en tiempo de inicio**: La aplicación no iniciará si faltan variables críticas
- **Tipado fuerte**: TypeScript conoce exactamente qué variables están disponibles
- **Mensajes de error claros**: Te indica exactamente qué variable falta o es inválida
- **Validaciones específicas**: Verifica formatos correctos (emails, URLs, claves de API, etc.)
- **Desarrollo friendly**: Logs útiles en modo desarrollo

## 📖 Uso

### Antes (sin validación)

```typescript
// ❌ No hay validación, puede romper en runtime
const apiKey = import.meta.env.PUBLIC_FIREBASE_API_KEY;
```

### Ahora (con validación)

```typescript
// ✅ Validado y tipado
import { env } from '@/lib/env';

const apiKey = env.PUBLIC_FIREBASE_API_KEY; // TypeScript sabe que existe
```

## 🚀 Configuración

### 1. Copia el archivo de ejemplo

```bash
cp .env.example .env
```

### 2. Llena todas las variables requeridas

El validador te indicará si falta alguna:

```
❌ Error de validación de variables de entorno:
  - STRIPE_SECRET_KEY: Required
  - RESEND_API_KEY: Required
  - ADMIN_SETUP_SECRET: String must contain at least 16 character(s)
```

### 3. Inicia la aplicación

```bash
npm run dev
```

Si todo está correcto, verás:

```
✅ Variables de entorno validadas correctamente
📦 Firebase Project: your-project-id
🔑 Stripe Mode: TEST 🟢
📧 Email From: noreply@imprimearte.es
```

## 🔍 Validaciones Implementadas

### Firebase Client SDK
- ✅ Todas las claves requeridas presentes
- ✅ Auth Domain termina en `.firebaseapp.com`
- ✅ Storage Bucket termina en `.appspot.com`
- ✅ Measurement ID empieza con `G-` (si existe)

### Firebase Admin SDK
- ✅ Al menos una opción configurada:
  - `FIREBASE_SERVICE_ACCOUNT` (JSON completo) **o**
  - `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
- ✅ Service Account email termina en `.iam.gserviceaccount.com`
- ✅ Private Key contiene `BEGIN PRIVATE KEY`

### Stripe
- ✅ Publishable Key empieza con `pk_test_` o `pk_live_`
- ✅ Secret Key empieza con `sk_test_` o `sk_live_`
- ✅ Webhook Secret empieza con `whsec_` (opcional)

### Resend (Email)
- ✅ API Key empieza con `re_`
- ✅ From Email es un email válido

### Admin
- ✅ Admin Setup Secret tiene al menos 16 caracteres
- ✅ Admin Emails son emails válidos (separados por comas)

### Company Information
- ✅ Zip Code tiene 5 dígitos (código postal español)
- ✅ Email es válido
- ✅ Todos los campos están presentes

## 🛡️ Seguridad

### Variables Privadas vs Públicas

**Variables con `PUBLIC_` prefix**:
- ✅ Expuestas al cliente (navegador)
- ⚠️ Visibles en el código del bundle
- Ejemplo: `PUBLIC_FIREBASE_API_KEY`

**Variables sin `PUBLIC_` prefix**:
- 🔒 Solo disponibles en el servidor
- ✅ NUNCA se exponen al cliente
- Ejemplo: `STRIPE_SECRET_KEY`

### Mejores Prácticas

1. **NUNCA commitees el archivo `.env`**
   ```bash
   # Ya está en .gitignore ✅
   .env
   ```

2. **Usa valores diferentes en desarrollo y producción**
   ```bash
   # Desarrollo
   STRIPE_SECRET_KEY=sk_test_...

   # Producción
   STRIPE_SECRET_KEY=sk_live_...
   ```

3. **Rota secrets periódicamente**
   - Admin Setup Secret
   - Stripe Webhook Secret
   - Resend API Key

4. **Verifica el modo de Stripe**
   ```typescript
   import { env } from '@/lib/env';

   const isLiveMode = env.STRIPE_SECRET_KEY.startsWith('sk_live_');
   if (isLiveMode) {
     console.warn('🔴 STRIPE EN MODO LIVE');
   }
   ```

## 🐛 Troubleshooting

### Error: "Variables de entorno inválidas"

**Problema**: Falta o es inválida una variable requerida.

**Solución**:
1. Lee el mensaje de error específico
2. Revisa tu archivo `.env`
3. Compara con `.env.example`
4. Asegúrate de que los formatos sean correctos

### Error: "FIREBASE_SERVICE_ACCOUNT debe ser un JSON válido"

**Problema**: El JSON de la service account está mal formateado.

**Solución**:
```bash
# Opción 1: Minificar el JSON en una línea
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}

# Opción 2: Usar credenciales individuales
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Error: "Stripe Secret Key debe empezar con sk_test_ o sk_live_"

**Problema**: Copiaste la publishable key en lugar de la secret key.

**Solución**:
```bash
# ❌ Incorrecto (publishable key)
STRIPE_SECRET_KEY=pk_test_...

# ✅ Correcto (secret key)
STRIPE_SECRET_KEY=sk_test_...
```

### Error: "Admin Setup Secret debe tener al menos 16 caracteres"

**Problema**: El secret es muy corto.

**Solución**:
```bash
# Generar un secret seguro
openssl rand -hex 32

# O en Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📝 Agregando Nuevas Variables

Si necesitas agregar una nueva variable de entorno:

### 1. Actualiza `src/lib/env.ts`

```typescript
const envSchema = z.object({
  // ... variables existentes

  // Nueva variable
  MY_NEW_API_KEY: z
    .string()
    .min(1, 'My New API Key es requerida')
    .startsWith('api_', { message: 'Debe empezar con "api_"' }),
});
```

### 2. Actualiza `src/env.d.ts`

```typescript
interface ImportMetaEnv {
  // ... variables existentes

  // Nueva variable
  readonly MY_NEW_API_KEY: string;
}
```

### 3. Actualiza `.env.example`

```bash
# My New Service
MY_NEW_API_KEY=api_your_key_here
```

### 4. Usa la variable

```typescript
import { env } from '@/lib/env';

const apiKey = env.MY_NEW_API_KEY; // ✅ Validada y tipada
```

## 🔄 Migración de Código Existente

### Buscar usos directos de import.meta.env

```bash
# Encuentra todos los usos
grep -r "import.meta.env" src/ --include="*.ts" --include="*.tsx"
```

### Reemplazar con el validador

```typescript
// ❌ Antes
const apiKey = import.meta.env.PUBLIC_FIREBASE_API_KEY;

// ✅ Después
import { env } from '@/lib/env';
const apiKey = env.PUBLIC_FIREBASE_API_KEY;
```

## 📚 Referencias

- **Archivo principal**: `src/lib/env.ts`
- **Tipos**: `src/env.d.ts`
- **Ejemplo**: `.env.example`
- **Documentación de Zod**: https://zod.dev

---

**Nota**: Esta validación se ejecuta automáticamente al iniciar la aplicación. No necesitas llamar a ninguna función manualmente.
