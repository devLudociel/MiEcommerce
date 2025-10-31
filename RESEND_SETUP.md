# Configuración de Resend para Emails Automáticos

## 📧 Pasos para configurar Resend

### 1. Crear cuenta en Resend

1. Ve a [https://resend.com/signup](https://resend.com/signup)
2. Regístrate con tu email
3. Verifica tu cuenta

### 2. Obtener API Key

1. Una vez dentro, ve a [https://resend.com/api-keys](https://resend.com/api-keys)
2. Haz clic en **"Create API Key"**
3. Dale un nombre (ej: "ImprimeArte Production")
4. Copia la clave (comienza con `re_...`)

### 3. Configurar dominio (Opcional pero recomendado)

**Para emails profesionales (ej: `pedidos@imprimearte.es`):**

1. Ve a [https://resend.com/domains](https://resend.com/domains)
2. Haz clic en **"Add Domain"**
3. Ingresa tu dominio: `imprimearte.es`
4. Sigue las instrucciones para agregar los registros DNS:
   - Copia los registros **SPF**, **DKIM** y **DMARC**
   - Agrégalos en tu proveedor de DNS (ej: Cloudflare, GoDaddy)
5. Espera a que se verifique (puede tardar unos minutos)

**Si NO configuras dominio:**

- Los emails se enviarán desde `onboarding@resend.dev`
- Funcionan perfectamente para pruebas
- Para producción es mejor usar tu dominio

### 4. Configurar variables de entorno

Abre el archivo `.env` y reemplaza:

```env
# Resend (Emails)
RESEND_API_KEY=re_TU_CLAVE_API_AQUI
EMAIL_FROM=pedidos@tudominio.com
```

**Opciones para EMAIL_FROM:**

- Si configuraste dominio: `pedidos@imprimearte.es` o `noreply@imprimearte.es`
- Si NO configuraste dominio: `onboarding@resend.dev`

### 5. Reiniciar el servidor

```bash
npm run dev
```

## 📩 Emails que se envían automáticamente

### 1. Confirmación de Pedido

**Cuándo:** Inmediatamente después de realizar un pedido
**A quién:** Cliente que hizo el pedido
**Contenido:**

- Número de pedido
- Productos comprados
- Dirección de envío
- Total pagado
- Fecha estimada de entrega

### 2. Actualización de Estado

**Cuándo:** Cuando el admin cambia el estado del pedido
**A quién:** Cliente
**Contenido:** Depende del estado:

- **Pagado**: Confirmación de pago recibido
- **En Producción**: Pedido en proceso de fabricación
- **Enviado**: Pedido en camino
- **Entregado**: Pedido recibido
- **Cancelado**: Pedido cancelado

## 🧪 Probar el sistema de emails

### Prueba 1: Email de Confirmación

1. Haz un pedido de prueba en tu tienda
2. Usa **tu email real** en el checkout
3. Completa el pedido
4. **Revisa tu bandeja de entrada** (y spam por si acaso)
5. Deberías recibir el email de confirmación

### Prueba 2: Email de Cambio de Estado

1. Ve a `/admin/orders`
2. Selecciona un pedido
3. Cambia el estado usando el dropdown
4. El cliente recibirá un email con la actualización

## 📊 Límites del plan gratuito

**Resend Free:**

- ✅ 100 emails/día
- ✅ 3,000 emails/mes
- ✅ Dominios ilimitados
- ✅ API keys ilimitadas

**Para más emails:**

- Plan Pro: $20/mes → 50,000 emails/mes
- [Ver planes](https://resend.com/pricing)

## 🔍 Ver emails enviados

1. Ve a [https://resend.com/emails](https://resend.com/emails)
2. Verás todos los emails enviados con:
   - Estado (entregado, rebotado, etc.)
   - Destinatario
   - Asunto
   - Fecha y hora

## ⚠️ Solución de problemas

### Los emails no llegan

**1. Verifica la API key:**

```bash
# En tu terminal
cat .env | grep RESEND
```

Debe mostrar tu clave que empieza con `re_`

**2. Revisa la carpeta de spam**
Los primeros emails pueden ir a spam

**3. Verifica en Resend Dashboard:**

- Ve a [https://resend.com/emails](https://resend.com/emails)
- Busca el email
- Si está "delivered", el problema está en el servidor de email del destinatario

**4. Revisa los logs del servidor:**
En la terminal donde corre `npm run dev`, busca:

- `✅ Email enviado correctamente`
- `❌ Error enviando email`

### Email dice "from onboarding@resend.dev"

Esto es normal si **NO** configuraste un dominio. Para usar tu dominio:

1. Configura tu dominio en Resend (paso 3)
2. Actualiza `EMAIL_FROM` en `.env`

### Error "API key not found"

1. Verifica que la clave en `.env` sea correcta
2. Asegúrate de reiniciar el servidor después de cambiar `.env`

## 🎨 Personalizar plantillas

Las plantillas de email están en:

```
src/lib/emailTemplates.ts
```

Puedes modificar:

- Colores
- Textos
- Estructura HTML
- Logos (agrega tu logo como imagen)

## 🔐 Seguridad

- ✅ La API key **NUNCA** se expone al cliente
- ✅ Solo se usa en el servidor (endpoints `/api/`)
- ✅ Está en `.gitignore` (no se sube a Git)
- ⚠️ **NUNCA** compartas tu API key

## 📞 Soporte

- Documentación: [https://resend.com/docs](https://resend.com/docs)
- Soporte: [https://resend.com/support](https://resend.com/support)
- Discord: [https://resend.com/discord](https://resend.com/discord)
