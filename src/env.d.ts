/// <reference types="astro/client" />

/**
 * Tipado de variables de entorno
 *
 * IMPORTANTE: Este archivo solo define los tipos.
 * La validación en runtime se hace en src/lib/env.ts
 *
 * Para usar variables de entorno validadas:
 * import { env } from '@/lib/env';
 */

interface ImportMetaEnv {
  // Firebase Client SDK
  readonly PUBLIC_FIREBASE_API_KEY: string;
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  readonly PUBLIC_FIREBASE_PROJECT_ID: string;
  readonly PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  readonly PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly PUBLIC_FIREBASE_APP_ID: string;
  readonly PUBLIC_FIREBASE_MEASUREMENT_ID?: string;

  // Firebase Admin SDK (Server-side)
  readonly FIREBASE_SERVICE_ACCOUNT?: string;
  readonly FIREBASE_CLIENT_EMAIL?: string;
  readonly FIREBASE_PRIVATE_KEY?: string;

  // Stripe
  readonly PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET?: string;

  // Resend (Email)
  readonly RESEND_API_KEY: string;
  readonly RESEND_FROM_EMAIL?: string;
  readonly EMAIL_FROM?: string; // Alternative email from address

  // Admin
  readonly PUBLIC_ADMIN_EMAILS?: string;
  readonly ADMIN_SETUP_SECRET: string;

  // Site
  readonly PUBLIC_SITE_URL?: string;

  // Company Information
  readonly COMPANY_NAME?: string;
  readonly COMPANY_ADDRESS?: string;
  readonly COMPANY_CITY?: string;
  readonly COMPANY_PROVINCE?: string;
  readonly COMPANY_ZIP_CODE?: string;
  readonly COMPANY_TAX_ID?: string;
  readonly COMPANY_EMAIL?: string;
  readonly COMPANY_PHONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
