#!/usr/bin/env node

/**
 * Script de verificación de variables de entorno
 * Ejecutar: node scripts/verify-env.js
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Cargar .env
config();

// Colores para la terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

// Definir variables requeridas
const variables = {
  critical: [
    {
      name: 'ADMIN_SETUP_SECRET',
      description: 'Secret para proteger endpoint de admin',
      validation: (val) => val && val.length >= 32,
      errorMsg: 'Debe tener al menos 32 caracteres',
      howToFix: 'Genera uno con: openssl rand -base64 32',
    },
    {
      name: 'STRIPE_SECRET_KEY',
      description: 'Clave secreta de Stripe',
      validation: (val) => val && (val.startsWith('sk_test_') || val.startsWith('sk_live_')),
      errorMsg: 'Debe empezar con sk_test_ o sk_live_',
      howToFix: 'Obtén en: https://dashboard.stripe.com/test/apikeys',
    },
    {
      name: 'PUBLIC_STRIPE_PUBLISHABLE_KEY',
      description: 'Clave pública de Stripe',
      validation: (val) => val && (val.startsWith('pk_test_') || val.startsWith('pk_live_')),
      errorMsg: 'Debe empezar con pk_test_ o pk_live_',
      howToFix: 'Obtén en: https://dashboard.stripe.com/test/apikeys',
    },
  ],
  high: [
    {
      name: 'STRIPE_WEBHOOK_SECRET',
      description: 'Secret para validar webhooks de Stripe',
      validation: (val) => val && val.startsWith('whsec_'),
      errorMsg: 'Debe empezar con whsec_',
      howToFix: 'Desarrollo: stripe listen --forward-to localhost:4321/api/stripe-webhook',
    },
    {
      name: 'FIREBASE_SERVICE_ACCOUNT',
      description: 'Service Account de Firebase (JSON)',
      validation: (val) => {
        if (!val) return false;
        try {
          const parsed = JSON.parse(val);
          return parsed.type === 'service_account' && parsed.private_key && parsed.client_email;
        } catch {
          return false;
        }
      },
      errorMsg: 'Debe ser un JSON válido con type, private_key y client_email',
      howToFix: 'Obtén en: Firebase Console → Project Settings → Service Accounts',
      optional: true,
      alternative: ['FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'],
    },
    {
      name: 'FIREBASE_CLIENT_EMAIL',
      description: 'Email del service account de Firebase',
      validation: (val) => val && val.includes('@') && val.includes('.iam.gserviceaccount.com'),
      errorMsg: 'Debe ser un email válido de service account',
      optional: true,
      requires: ['FIREBASE_PRIVATE_KEY'],
    },
    {
      name: 'FIREBASE_PRIVATE_KEY',
      description: 'Private key de Firebase',
      validation: (val) => val && val.includes('BEGIN PRIVATE KEY'),
      errorMsg: 'Debe contener una clave privada válida',
      optional: true,
      requires: ['FIREBASE_CLIENT_EMAIL'],
    },
  ],
  medium: [
    {
      name: 'RESEND_API_KEY',
      description: 'API Key de Resend para enviar emails',
      validation: (val) => val && val.startsWith('re_'),
      errorMsg: 'Debe empezar con re_',
      howToFix: 'Obtén en: https://resend.com/api-keys',
    },
    {
      name: 'EMAIL_FROM',
      description: 'Email remitente',
      validation: (val) => val && val.includes('@'),
      errorMsg: 'Debe ser un email válido',
    },
    {
      name: 'PUBLIC_ADMIN_EMAILS',
      description: 'Lista de emails de administradores',
      validation: (val) => val && val.includes('@'),
      errorMsg: 'Debe contener al menos un email',
    },
  ],
  company: [
    'COMPANY_NAME',
    'COMPANY_ADDRESS',
    'COMPANY_CITY',
    'COMPANY_ZIP_CODE',
    'COMPANY_TAX_ID',
    'COMPANY_EMAIL',
    'COMPANY_PHONE',
  ].map((name) => ({
    name,
    description: `Información de la empresa: ${name.replace('COMPANY_', '').toLowerCase()}`,
    validation: (val) => !!val,
    errorMsg: 'No debe estar vacío',
  })),
};

// Función principal
function verifyEnvironment() {
  log(colors.blue, '\n🔍 Verificando configuración de variables de entorno...\n');

  let hasErrors = false;
  let hasWarnings = false;
  const results = {
    critical: { passed: 0, failed: 0, missing: [] },
    high: { passed: 0, failed: 0, missing: [] },
    medium: { passed: 0, failed: 0, missing: [] },
    company: { passed: 0, failed: 0, missing: [] },
  };

  // Verificar cada categoría
  for (const [category, vars] of Object.entries(variables)) {
    log(colors.magenta, `\n📦 ${category.toUpperCase()}:`);

    for (const varConfig of vars) {
      const value = process.env[varConfig.name];
      const exists = value !== undefined && value !== '';

      // Verificar si es opcional y tiene alternativas
      if (varConfig.optional && varConfig.alternative) {
        const hasAlternative = varConfig.alternative.every((alt) => process.env[alt]);
        if (hasAlternative) {
          log(colors.yellow, `  ⚠️  ${varConfig.name} - No configurado (usando alternativa)`);
          continue;
        }
      }

      // Verificar si requiere otras variables
      if (exists && varConfig.requires) {
        const missingRequired = varConfig.requires.filter((req) => !process.env[req]);
        if (missingRequired.length > 0) {
          log(colors.red, `  ❌ ${varConfig.name} - Requiere: ${missingRequired.join(', ')}`);
          results[category].failed++;
          hasErrors = true;
          continue;
        }
      }

      if (!exists) {
        if (varConfig.optional) {
          log(colors.yellow, `  ⚠️  ${varConfig.name} - Opcional, no configurado`);
          hasWarnings = true;
        } else {
          log(colors.red, `  ❌ ${varConfig.name} - NO CONFIGURADO`);
          if (varConfig.howToFix) {
            log(colors.red, `      💡 ${varConfig.howToFix}`);
          }
          results[category].failed++;
          results[category].missing.push(varConfig.name);
          hasErrors = true;
        }
      } else if (varConfig.validation && !varConfig.validation(value)) {
        log(colors.red, `  ❌ ${varConfig.name} - INVÁLIDO: ${varConfig.errorMsg}`);
        if (varConfig.howToFix) {
          log(colors.red, `      💡 ${varConfig.howToFix}`);
        }
        results[category].failed++;
        hasErrors = true;
      } else {
        log(colors.green, `  ✅ ${varConfig.name} - OK`);
        results[category].passed++;
      }
    }
  }

  // Resumen
  log(colors.blue, '\n📊 RESUMEN:\n');

  for (const [category, result] of Object.entries(results)) {
    const total = result.passed + result.failed;
    const percentage = total > 0 ? Math.round((result.passed / total) * 100) : 0;
    const color = result.failed === 0 ? colors.green : colors.red;

    log(
      color,
      `  ${category.toUpperCase()}: ${result.passed}/${total} configuradas (${percentage}%)`
    );

    if (result.missing.length > 0) {
      log(colors.red, `    Faltan: ${result.missing.join(', ')}`);
    }
  }

  // Warnings especiales
  log(colors.blue, '\n⚠️  WARNINGS:\n');

  // Verificar modo Stripe
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && stripeKey.startsWith('sk_test_')) {
    log(colors.yellow, '  🔧 Stripe en modo TEST - OK para desarrollo');
  } else if (stripeKey && stripeKey.startsWith('sk_live_')) {
    log(colors.yellow, '  🚨 Stripe en modo LIVE - ¡Verifica que sea intencional!');
  }

  // Verificar que .env no esté en git
  try {
    const gitignore = readFileSync(resolve(process.cwd(), '.gitignore'), 'utf-8');
    if (!gitignore.includes('.env')) {
      log(colors.red, '  ❌ .env NO está en .gitignore - ¡RIESGO DE SEGURIDAD!');
      hasErrors = true;
    } else {
      log(colors.green, '  ✅ .env está en .gitignore');
    }
  } catch {
    log(colors.yellow, '  ⚠️  No se pudo verificar .gitignore');
  }

  // Resultado final
  log(colors.blue, '\n' + '='.repeat(50) + '\n');

  if (hasErrors) {
    log(colors.red, '❌ FALLÓ LA VERIFICACIÓN - Revisa los errores arriba\n');
    process.exit(1);
  } else if (hasWarnings) {
    log(colors.yellow, '⚠️  VERIFICACIÓN PASADA CON WARNINGS - Revisa las advertencias\n');
    process.exit(0);
  } else {
    log(
      colors.green,
      '✅ VERIFICACIÓN EXITOSA - Todas las variables críticas están configuradas\n'
    );
    process.exit(0);
  }
}

// Ejecutar
verifyEnvironment();
