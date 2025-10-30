// src/lib/env.ts
import { z } from 'zod';

/**
 * Schema de validación para variables de entorno
 *
 * Este archivo valida todas las variables de entorno necesarias
 * para el funcionamiento correcto de la aplicación.
 *
 * Si alguna variable falta o es inválida, la aplicación fallará
 * al iniciar con un mensaje de error claro.
 */

// Schema para variables de entorno del cliente (PUBLIC_*)
const clientEnvSchema = z.object({
  // Firebase Client SDK
  PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Firebase API Key es requerida'),
  PUBLIC_FIREBASE_AUTH_DOMAIN: z
    .string()
    .min(1, 'Firebase Auth Domain es requerido')
    .includes('.firebaseapp.com', { message: 'Auth Domain debe ser un dominio de Firebase' }),
  PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'Firebase Project ID es requerido'),
  PUBLIC_FIREBASE_STORAGE_BUCKET: z
    .string()
    .min(1, 'Firebase Storage Bucket es requerido')
    .includes('.appspot.com', { message: 'Storage Bucket debe ser un bucket de Firebase' }),
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, 'Firebase Messaging Sender ID es requerido'),
  PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'Firebase App ID es requerido'),
  PUBLIC_FIREBASE_MEASUREMENT_ID: z
    .string()
    .optional()
    .refine((val) => !val || val.startsWith('G-'), {
      message: 'Measurement ID debe empezar con "G-"',
    }),

  // Stripe (public key)
  PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'Stripe Publishable Key es requerida')
    .refine((val) => val.startsWith('pk_test_') || val.startsWith('pk_live_'), {
      message: 'Stripe Publishable Key debe empezar con "pk_test_" o "pk_live_"',
    }),

  // Admin Emails
  PUBLIC_ADMIN_EMAILS: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',').map((e) => e.trim().toLowerCase()) : []))
    .refine((emails) => emails.every((e) => z.string().email().safeParse(e).success), {
      message: 'Todos los admin emails deben ser emails válidos',
    }),

  // Site URL
  PUBLIC_SITE_URL: z
    .string()
    .url('Site URL debe ser una URL válida')
    .optional()
    .default('http://localhost:4321'),
});

// Schema para variables de entorno del servidor (privadas)
const serverEnvSchema = z.object({
  // Firebase Admin SDK (Opción 1: Service Account completo)
  FIREBASE_SERVICE_ACCOUNT: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          const parsed = JSON.parse(val);
          return parsed.type === 'service_account' && parsed.private_key && parsed.client_email;
        } catch {
          return false;
        }
      },
      { message: 'FIREBASE_SERVICE_ACCOUNT debe ser un JSON válido de service account' }
    ),

  // Firebase Admin SDK (Opción 2: Credenciales individuales)
  FIREBASE_CLIENT_EMAIL: z
    .string()
    .email('Firebase Client Email debe ser un email válido')
    .optional()
    .refine((val) => !val || val.includes('.iam.gserviceaccount.com'), {
      message: 'Firebase Client Email debe ser una service account de Firebase',
    }),
  FIREBASE_PRIVATE_KEY: z
    .string()
    .optional()
    .refine((val) => !val || val.includes('BEGIN PRIVATE KEY'), {
      message: 'Firebase Private Key debe ser una clave privada válida',
    }),

  // Stripe Secret Key
  STRIPE_SECRET_KEY: z
    .string()
    .min(1, 'Stripe Secret Key es requerida')
    .refine((val) => val.startsWith('sk_test_') || val.startsWith('sk_live_'), {
      message: 'Stripe Secret Key debe empezar con "sk_test_" o "sk_live_"',
    }),

  // Stripe Webhook Secret
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .optional()
    .refine((val) => !val || val.startsWith('whsec_'), {
      message: 'Stripe Webhook Secret debe empezar con "whsec_"',
    }),

  // Resend (Email)
  RESEND_API_KEY: z
    .string()
    .min(1, 'Resend API Key es requerida')
    .refine((val) => val.startsWith('re_'), {
      message: 'Resend API Key debe empezar con "re_"',
    }),
  RESEND_FROM_EMAIL: z
    .string()
    .email('Resend From Email debe ser un email válido')
    .optional()
    .default('noreply@imprimearte.es'),

  // Admin Setup Secret
  ADMIN_SETUP_SECRET: z.string().min(16, 'Admin Setup Secret debe tener al menos 16 caracteres'),

  // Company Information
  COMPANY_NAME: z.string().min(1, 'Company Name es requerido').optional().default('ImprimeArte'),
  COMPANY_ADDRESS: z.string().min(1, 'Company Address es requerida').optional(),
  COMPANY_CITY: z.string().min(1, 'Company City es requerida').optional(),
  COMPANY_PROVINCE: z.string().optional(),
  COMPANY_ZIP_CODE: z
    .string()
    .regex(/^\d{5}$/, 'Company Zip Code debe ser un código postal español (5 dígitos)')
    .optional(),
  COMPANY_TAX_ID: z.string().min(1, 'Company Tax ID es requerido (CIF/NIF)').optional(),
  COMPANY_EMAIL: z.string().email('Company Email debe ser un email válido').optional(),
  COMPANY_PHONE: z.string().min(1, 'Company Phone es requerido').optional(),
});

// Schema completo combinado
const envSchema = clientEnvSchema.merge(serverEnvSchema).refine(
  (data) => {
    // Validar que al menos una opción de Firebase Admin esté configurada
    const hasServiceAccount = !!data.FIREBASE_SERVICE_ACCOUNT;
    const hasIndividualCreds = !!data.FIREBASE_CLIENT_EMAIL && !!data.FIREBASE_PRIVATE_KEY;
    return hasServiceAccount || hasIndividualCreds;
  },
  {
    message:
      'Debes configurar FIREBASE_SERVICE_ACCOUNT o (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY + PUBLIC_FIREBASE_PROJECT_ID)',
    path: ['FIREBASE_SERVICE_ACCOUNT'],
  }
);

/**
 * Variables de entorno validadas y tipadas
 *
 * Usa este export para acceder a las variables de entorno de forma segura.
 *
 * @example
 * import { env } from '@/lib/env';
 * const apiKey = env.PUBLIC_FIREBASE_API_KEY;
 */
export let env: z.infer<typeof envSchema>;

/**
 * Valida las variables de entorno
 *
 * Esta función se llama automáticamente al importar este módulo.
 * Si falla la validación, la aplicación no iniciará.
 */
export function validateEnv() {
  try {
    // En modo desarrollo, permitir algunas variables opcionales
    const isDev = import.meta.env.DEV;

    const result = envSchema.safeParse(import.meta.env);

    if (!result.success) {
      console.error('❌ Error de validación de variables de entorno:');
      console.error(result.error.flatten().fieldErrors);

      // Mostrar un mensaje de error más amigable
      const errors = result.error.flatten().fieldErrors;
      const errorMessages = Object.entries(errors)
        .map(([key, messages]) => `  - ${key}: ${messages?.join(', ')}`)
        .join('\n');

      throw new Error(
        `\n\n🚨 VARIABLES DE ENTORNO INVÁLIDAS:\n\n${errorMessages}\n\n` +
          `📝 Revisa tu archivo .env y asegúrate de que todas las variables requeridas estén configuradas.\n` +
          `📚 Consulta .env.example para ver un ejemplo de configuración.\n`
      );
    }

    env = result.data;

    // Log de confirmación en desarrollo
    if (isDev) {
      console.log('✅ Variables de entorno validadas correctamente');
      console.log('📦 Firebase Project:', env.PUBLIC_FIREBASE_PROJECT_ID);
      console.log(
        '🔑 Stripe Mode:',
        env.PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_') ? 'LIVE 🔴' : 'TEST 🟢'
      );
      console.log('📧 Email From:', env.RESEND_FROM_EMAIL);
    }

    return env;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

// Validar automáticamente al importar
validateEnv();

// Tipos exportados
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type Env = z.infer<typeof envSchema>;
