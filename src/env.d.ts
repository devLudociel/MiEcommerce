/// <reference types="astro/client" />

interface ImportMetaEnv {
  // Firebase
  readonly PUBLIC_FIREBASE_API_KEY: string;
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  readonly PUBLIC_FIREBASE_PROJECT_ID: string;
  readonly PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  readonly PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly PUBLIC_FIREBASE_APP_ID: string;
  readonly PUBLIC_FIREBASE_MEASUREMENT_ID?: string;

  // Firebase Admin (Server-side)
  readonly FIREBASE_SERVICE_ACCOUNT?: string;
  readonly FIREBASE_PROJECT_ID: string;
  readonly FIREBASE_CLIENT_EMAIL: string;
  readonly FIREBASE_PRIVATE_KEY: string;

  // Stripe
  readonly PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET?: string;

  // Resend (Email)
  readonly RESEND_API_KEY: string;
  readonly RESEND_FROM_EMAIL: string;

  // Admin
  readonly PUBLIC_ADMIN_EMAILS: string;
  readonly ADMIN_EMAILS?: string;
  readonly ADMIN_SETUP_SECRET: string;

  // Site
  readonly PUBLIC_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
