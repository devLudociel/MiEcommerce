import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import { visualizer } from 'rollup-plugin-visualizer';

// PERFORMANCE: Enable bundle analyzer when ANALYZE env var is set
// Run: npm run build:analyze
const shouldAnalyze = process.env.ANALYZE === 'true';

export default defineConfig({
  integrations: [tailwind(), react()],
  output: 'server',
  adapter: node({ mode: 'standalone' }),
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
      exclude: ['astro:content', 'jsdom'],
    },
    // FIX: Exclude jsdom from SSR bundling to avoid ES module issues
    ssr: {
      noExternal: ['isomorphic-dompurify'],
      external: ['jsdom'],
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
