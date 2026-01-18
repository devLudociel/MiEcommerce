# 🔧 Guía de Configuración de Variables de Entorno

## 📋 Checklist Rápido

Antes de ejecutar en producción, asegúrate de tener configuradas:

- [ ] ✅ Firebase Client SDK (8 variables `PUBLIC_FIREBASE_*`)
- [ ] ✅ Firebase Admin SDK (Service Account o credenciales individuales)
- [ ] ✅ Stripe Keys (3 variables: publishable, secret, webhook)
- [ ] ✅ Resend API (para emails)
- [ ] ✅ Admin Setup Secret (para seguridad)
- [ ] ✅ Company Information (para facturas)

---

## 🚀 Configuración Paso a Paso

### 1. **Crear archivo .env**

```bash
# En la raíz del proyecto
cp .env.example .env
```

---

### 2. **Firebase Client SDK** ✅ (Ya configurado)

Estas variables ya las tienes en tu proyecto. Se obtienen de:
https://console.firebase.google.com/project/[tu-proyecto]/settings/general

```bash
PUBLIC_FIREBASE_API_KEY=AIza...
PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto
PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123
```

---

### 3. **Firebase Admin SDK** 🔴 CRÍTICO

#### **Opción A: Service Account (RECOMENDADO)**

1. Ve a: https://console.firebase.google.com/project/[tu-proyecto]/settings/serviceaccounts/adminsdk
2. Click "Generar nueva clave privada"
3. Se descargará un archivo JSON
4. Copia TODO el contenido del JSON (en una sola línea):

```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"tu-proyecto",...}
```

#### **Opción B: Credenciales Individuales (ALTERNATIVA)**

Del mismo JSON, extrae:

```bash
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE\n-----END PRIVATE KEY-----\n"
```

⚠️ **Importante:** La `PRIVATE_KEY` debe tener los `\n` literales (no saltos de línea reales).

---

### 4. **Stripe Keys** 🔴 CRÍTICO

#### **Desarrollo (Test Mode):**

1. Ve a: https://dashboard.stripe.com/test/apikeys
2. Copia las claves:

```bash
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...
STRIPE_SECRET_KEY=sk_test_51ABC...
```

#### **Webhook Secret (Desarrollo):**

```bash
# Terminal 1: Inicia el servidor Astro
npm run dev

# Terminal 2: Stripe CLI
stripe listen --forward-to localhost:4321/api/stripe-webhook
```

Copia el webhook secret que aparece (empieza con `whsec_`):

```bash
STRIPE_WEBHOOK_SECRET=whsec_abc123...
```

#### **Producción:**

1. Ve a: https://dashboard.stripe.com/webhooks
2. Click "Agregar endpoint"
3. URL: `https://tudominio.com/api/stripe-webhook`
4. Eventos a escuchar:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copia el "Signing secret"

```bash
STRIPE_WEBHOOK_SECRET=whsec_prod_abc123...
```

---

### 5. **Resend (Emails)** 🟠 ALTO

1. Crea cuenta en: https://resend.com
2. Ve a: https://resend.com/api-keys
3. Crea una API key

```bash
RESEND_API_KEY=re_abc123...
EMAIL_FROM=noreply@tudominio.com
```

⚠️ **Importante:** Para usar un dominio personalizado, debes verificarlo en Resend.

---

### 6. **Admin Setup Secret** 🔴 CRÍTICO

Genera un secret fuerte:

```bash
# macOS/Linux
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Copia el resultado:

```bash
ADMIN_SETUP_SECRET=tu_secret_aleatorio_de_32_caracteres_minimo
```

⚠️ **MUY IMPORTANTE:**
- NUNCA uses valores de ejemplo en producción
- NUNCA compartas este secret
- Este secret protege el endpoint `/api/admin/set-admin-claims`

---

### 7. **Admin Emails** ✅ (Ya configurado)

Lista de emails que tendrán permisos de admin (separados por coma):

```bash
PUBLIC_ADMIN_EMAILS=admin1@tudominio.com,admin2@tudominio.com
```

---

### 8. **Company Information** ✅ (Ya configurado)

Información para facturas y emails:

```bash
COMPANY_NAME=ImprimeArte
COMPANY_ADDRESS=Calle Mayantigo 4
COMPANY_CITY=Los Llanos de Aridane
COMPANY_PROVINCE=Santa Cruz de Tenerife
COMPANY_ZIP_CODE=38760
COMPANY_TAX_ID=Z0186054N
COMPANY_EMAIL=info@imprimearte.es
COMPANY_PHONE=+34 643037152
```

---

## 🔒 Seguridad

### **Archivo .env**

```bash
# ❌ NUNCA hagas esto:
git add .env

# ✅ Verifica que esté en .gitignore:
cat .gitignore | grep .env
```

### **Variables en Producción**

Para deployment (Vercel, Netlify, etc.):

1. No subas el archivo `.env`
2. Configura las variables en el panel de tu hosting:
   - Vercel: Settings → Environment Variables
   - Netlify: Site settings → Environment variables
   - Railway: Variables → Add variable

---

## 🧪 Verificar Configuración

### **Script de verificación:**

```bash
npm run verify-env
```

O manualmente:

```bash
node -e "
const required = [
  'PUBLIC_FIREBASE_API_KEY',
  'STRIPE_SECRET_KEY',
  'ADMIN_SETUP_SECRET'
];

const missing = required.filter(key => !process.env[key]);

if (missing.length) {
  console.error('❌ Faltan variables:', missing.join(', '));
  process.exit(1);
} else {
  console.log('✅ Todas las variables críticas están configuradas');
}
"
```

---

## 📝 Template .env completo

```bash
# ============================================
# FIREBASE CLIENT SDK
# ============================================
PUBLIC_FIREBASE_API_KEY=
PUBLIC_FIREBASE_AUTH_DOMAIN=
PUBLIC_FIREBASE_PROJECT_ID=
PUBLIC_FIREBASE_STORAGE_BUCKET=
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
PUBLIC_FIREBASE_APP_ID=
PUBLIC_FIREBASE_MEASUREMENT_ID=

# ============================================
# FIREBASE ADMIN SDK (elegir opción A o B)
# ============================================
# Opción A: Service Account (recomendado)
FIREBASE_SERVICE_ACCOUNT=

# Opción B: Credenciales individuales
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# ============================================
# STRIPE
# ============================================
PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ============================================
# RESEND (EMAILS)
# ============================================
RESEND_API_KEY=
EMAIL_FROM=

# ============================================
# ADMIN
# ============================================
PUBLIC_ADMIN_EMAILS=
ADMIN_SETUP_SECRET=

# ============================================
# COMPANY INFO
# ============================================
COMPANY_NAME=
COMPANY_ADDRESS=
COMPANY_CITY=
COMPANY_PROVINCE=
COMPANY_ZIP_CODE=
COMPANY_TAX_ID=
COMPANY_EMAIL=
COMPANY_PHONE=
```

---

## 🆘 Troubleshooting

### **Error: "Firebase Admin SDK not initialized"**
- ✅ Verifica que `FIREBASE_SERVICE_ACCOUNT` o `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` estén configurados
- ✅ Si usas `FIREBASE_PRIVATE_KEY`, asegúrate de que tenga `\n` literales

### **Error: "Invalid Stripe API Key"**
- ✅ Verifica que uses la clave correcta (test en dev, live en prod)
- ✅ No confundas `STRIPE_SECRET_KEY` (empieza con `sk_`) con `PUBLIC_STRIPE_PUBLISHABLE_KEY` (empieza con `pk_`)

### **Error: "Webhook signature verification failed"**
- ✅ Verifica que `STRIPE_WEBHOOK_SECRET` esté configurado
- ✅ En desarrollo, asegúrate de que `stripe listen` esté corriendo
- ✅ En producción, verifica que el webhook esté configurado en Stripe Dashboard

### **Error: "ADMIN_SETUP_SECRET is not set"**
- ✅ Genera un secret: `openssl rand -base64 32`
- ✅ Agrégalo a `.env`: `ADMIN_SETUP_SECRET=tu_secret`

---

## 📚 Referencias

- [Firebase Console](https://console.firebase.google.com)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Resend Dashboard](https://resend.com/dashboard)
- [Astro Environment Variables](https://docs.astro.build/en/guides/environment-variables/)

---

## ✅ Checklist Final

Antes de hacer deploy a producción:

- [ ] Todas las variables están configuradas en el hosting
- [ ] `ADMIN_SETUP_SECRET` es un secret fuerte (32+ caracteres)
- [ ] Stripe está en modo LIVE (no test)
- [ ] Webhook de Stripe apunta a tu dominio de producción
- [ ] Firebase Admin SDK tiene los permisos correctos
- [ ] Resend tiene el dominio verificado
- [ ] `.env` NO está en git (verifica `.gitignore`)

🎉 ¡Listo para producción!
