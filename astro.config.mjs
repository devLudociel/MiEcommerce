import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import { visualizer } from 'rollup-plugin-visualizer';

// PERFORMANCE: Enable bundle analyzer when ANALYZE env var is set
// Run: npm run build:analyze
const shouldAnalyze = process.env.ANALYZE === 'true';

export default defineConfig({
  integrations: [tailwind(), react()],
  output: 'server',
  adapter: vercel(),
  experimental: {
    csp: {
      scriptDirective: {
        resources: [
          "'self'",
          'https://*.google.com',
          'https://*.googleapis.com',
          'https://www.googletagmanager.com',
          'https://js.stripe.com',
        ],
        hashes: ['sha256-Jua0BSagD04dr1M2+eje7o39hvQbuJX4g91etdB4q10='],
      },
      styleDirective: {
        resources: ["'self'", "'unsafe-inline'", 'https://*.googleapis.com'],
      },
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.googleusercontent.com https://*.google.com https://*.google-analytics.com https://images.unsplash.com",
        "font-src 'self' data: https://*.googleapis.com https://*.gstatic.com",
        "connect-src 'self' https://firebasestorage.googleapis.com https://*.googleapis.com https://*.google.com https://*.google-analytics.com https://*.googletagmanager.com https://*.stripe.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.zippopotam.us https://api.geoapify.com",
        "frame-src 'self' https://*.firebaseapp.com https://js.stripe.com https://accounts.google.com https://*.google.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'self'",
        'upgrade-insecure-requests',
      ],
    },
  },
  // PERFORMANCE: Image optimization configuration
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  vite: {
    plugins: shouldAnalyze
      ? [
          visualizer({
            filename: './dist/stats.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
            template: 'treemap', // sunburst, treemap, network
          }),
        ]
      : [],
    // FIX: Optimize dependencies to prevent 504 Outdated Optimize Dep errors
    optimizeDeps: {
      include: [
        '@stripe/stripe-js',
        '@stripe/react-stripe-js',
        'react',
        'react-dom',
        '@nanostores/react',
        'nanostores',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
        'lucide-react',
      ],
      exclude: ['astro:content'],
    },
    // Improve HMR stability
    server: {
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: false,
      },
    },
  },
});
