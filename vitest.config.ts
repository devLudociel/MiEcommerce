import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: [
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
      'tests/**/*.test.{ts,tsx}',
      // Nota: no incluir specs E2E de Playwright aquí
    ],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    // Mantener jsdom por defecto para facilitar tests de componentes
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
