import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ['security-tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'tests/e2e/**'],
    globals: true,
    environment: 'node',
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    testTimeout: 15000,
    sequence: {
      shuffle: false,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/pages/api/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: {
    'import.meta.env.PROD': 'false',
    'import.meta.env.DEV': 'true',
    'import.meta.env.STRIPE_SECRET_KEY': '"sk_test_fake_key_for_testing"',
    'import.meta.env.STRIPE_WEBHOOK_SECRET': '"whsec_test_fake_secret"',
    'import.meta.env.ADMIN_EMAILS': '"admin@test.com"',
    'import.meta.env.ADMIN_SETUP_SECRET': '"test-admin-setup-secret-32chars!!"',
    'import.meta.env.INTERNAL_API_SECRET': '"test-internal-api-secret"',
    'import.meta.env.CRON_SECRET': '"test-cron-secret"',
    'import.meta.env.RESEND_API_KEY': '"re_test_fake"',
    'import.meta.env.EMAIL_FROM': '"test@test.com"',
    'import.meta.env.PUBLIC_FIREBASE_PROJECT_ID': '"test-project"',
    'import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET': '"test-project.appspot.com"',
    'import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY': '"pk_test_fake"',
  },
});
