# MiEcommerce · Plataforma de personalización sobre Astro

MiEcommerce es un ecommerce centrado en la personalización de productos que combina Astro y componentes React con integraciones profundas de Firebase (Firestore, Storage, Auth y Analytics). El proyecto incluye un checkout completo con validaciones de datos en cliente, un monedero (wallet) con cashback, herramientas de administración y un catálogo que habilita experiencias de personalización diferenciadas según el tipo de producto.

## ✨ Características principales

- **Catálogo dinámico** con filtrado, reseñas destacadas y determinación automática del personalizador adecuado (camisetas, resina, marcos, etc.).
- **Flujo de checkout avanzado**: carrito gestionado con Nanostores, validaciones con Zod, autocompletado de direcciones españolas y cálculo de impuestos/envíos.
- **Wallet con cashback** integrado en el checkout y panel de usuario, con endpoints protegidos por Firebase Admin.
- **Panel administrativo** construido en React para visualizar pedidos, ventas y estadísticas en tiempo real desde Firestore.
- **Integraciones operativas**: Stripe para pagos, Resend para notificaciones por correo y generación de PDFs para recibos.

## 🧱 Arquitectura y organización

- **Astro + React**: Astro gestiona el enrutado y el render híbrido; los componentes React se usan en personalizadores, checkout y dashboards interactivos.
- **Estado en cliente**: Nanostores almacena el carrito y preferencias; los hooks personalizados (`useAuth`, `useFormValidation`, etc.) facilitan la comunicación con Firebase.
- **Firebase Admin**: endpoints bajo `src/pages/api` ejecutan operaciones privilegiadas (wallet, pedidos, administración) usando el SDK Admin inicializado desde `src/lib/firebase-admin.ts`.
- **Validaciones y utilidades**: `src/lib` contiene módulos compartidos (logger, notificaciones, validaciones con Zod, utilidades de dirección en España, etc.).
- **Documentación específica**: configuraciones detalladas en `FIREBASE-ADMIN-SETUP.md`, `STRIPE_SETUP.md`, `RESEND_SETUP.md`, `SEO-SETUP.md` y `FASE1_SEGURIDAD.md`.

## 🗂️ Estructura de carpetas destacada

```
/
├── src/
│   ├── components/        # UI React y bloques Astro reutilizables
│   ├── layouts/           # Diseños base para páginas Astro
│   ├── pages/             # Rutas Astro y endpoints API
│   ├── lib/               # Integraciones Firebase, logger, utilidades
│   ├── store/             # Estado global (carrito, wishlist, etc.)
│   └── types/             # Tipados compartidos
├── public/                # Assets estáticos
└── docs/                  # Material de diseño, marketing y procesos
```

## 🚀 Puesta en marcha

1. **Instalar dependencias**
   ```bash
   npm install
   ```
2. **Configurar variables de entorno** (ver sección siguiente).
3. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```
   El sitio quedará disponible en `http://localhost:4321`.
4. **Construir para producción**
   ```bash
   npm run build
   ```
5. **Previsualizar el build**
   ```bash
   npm run preview
   ```

## 🔐 Variables de entorno

Las variables se definen en un archivo `.env` (ver `src/env.d.ts` para la lista tipada). Las claves principales son:

| Grupo                       | Variables                                                                                                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Firebase (cliente)**      | `PUBLIC_FIREBASE_API_KEY`, `PUBLIC_FIREBASE_AUTH_DOMAIN`, `PUBLIC_FIREBASE_PROJECT_ID`, `PUBLIC_FIREBASE_STORAGE_BUCKET`, `PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `PUBLIC_FIREBASE_APP_ID`, `PUBLIC_FIREBASE_MEASUREMENT_ID` |
| **Firebase Admin (server)** | `FIREBASE_SERVICE_ACCOUNT` **o** (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)                                                                                                                   |
| **Pagos**                   | `PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                                                                                                                                               |
| **Emails**                  | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`                                                                                                                                                                                       |
| **Administración**          | `PUBLIC_ADMIN_EMAILS`, `ADMIN_SETUP_SECRET`                                                                                                                                                                                 |
| **Sitio**                   | `PUBLIC_SITE_URL`                                                                                                                                                                                                           |

> Consulta `FIREBASE-ADMIN-SETUP.md`, `STRIPE_SETUP.md`, `RESEND_SETUP.md` y `SEO-SETUP.md` para instrucciones paso a paso de cada integración.

## 🛡️ Seguridad y mejores prácticas

- Los endpoints del monedero (`/api/get-wallet-balance`, `/api/get-wallet-transactions`, `/api/save-order`) validan tokens de Firebase y restringen el acceso al propietario o administradores con _custom claims_.
- Las reglas de Firestore (`firestore.rules`) impiden modificar wallets directamente desde el cliente; solo el SDK Admin puede hacerlo.
- El archivo `FASE1_SEGURIDAD.md` documenta un checklist de pruebas y escenarios de endurecimiento.

## ✅ Scripts útiles

| Comando                | Descripción                                           |
| ---------------------- | ----------------------------------------------------- |
| `npm run lint`         | Ejecuta ESLint sobre archivos JS/TS/ASTRO             |
| `npm run lint:fix`     | Intenta corregir problemas de linting automáticamente |
| `npm run format:check` | Verifica el formato con Prettier                      |
| `npm run format`       | Aplica formato estándar                               |

## 🛣️ Siguientes pasos sugeridos

- Mejorar la inferencia del personalizador almacenando un campo `customizerType` consistente en cada producto.
- Implementar paginación/búsquedas server-side para el dashboard de administración y reducir lecturas masivas de Firestore.
- Documentar flujos operativos (deploy, configuración de logs, validación de datos) en el README o en guías complementarias dentro de `docs/`.

---

Para cualquier duda sobre la arquitectura o despliegues, revisa la carpeta `docs/` y los módulos comentados en `src/lib`. ¡Feliz hacking! 🚀
