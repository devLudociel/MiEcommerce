/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
    // Breakpoints personalizados incluyendo xs para móviles pequeños
    screens: {
      'xs': '375px',   // Móviles pequeños (iPhone SE, etc.)
      'sm': '640px',   // Móviles grandes / tablets pequeñas
      'md': '768px',   // Tablets
      'lg': '1024px',  // Desktop pequeño
      'xl': '1280px',  // Desktop
      '2xl': '1536px', // Desktop grande
    },
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        accent: {
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      // Espaciado adicional para mobile-first
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        'safe': 'env(safe-area-inset-bottom)',
      },
      // Tamaños mínimos táctiles (44px recomendado por Apple/Google)
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      // Font sizes adicionales para mejor escalado móvil
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        '2.5xl': ['1.75rem', { lineHeight: '2.15rem' }], // Entre 2xl y 3xl
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        // Ocultar scrollbar pero mantener funcionalidad
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        },
        // Utilidades táctiles para móviles
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.tap-highlight-none': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        // Safe area padding para notch/home indicator
        '.pb-safe': {
          'padding-bottom': 'env(safe-area-inset-bottom)',
        },
        '.pt-safe': {
          'padding-top': 'env(safe-area-inset-top)',
        },
        // Line clamp utilities
        '.line-clamp-1': {
          'display': '-webkit-box',
          '-webkit-line-clamp': '1',
          '-webkit-box-orient': 'vertical',
          'overflow': 'hidden',
        },
        '.line-clamp-2': {
          'display': '-webkit-box',
          '-webkit-line-clamp': '2',
          '-webkit-box-orient': 'vertical',
          'overflow': 'hidden',
        },
        '.line-clamp-3': {
          'display': '-webkit-box',
          '-webkit-line-clamp': '3',
          '-webkit-box-orient': 'vertical',
          'overflow': 'hidden',
        },
        // Texto sin selección para elementos interactivos
        '.select-none-touch': {
          '-webkit-user-select': 'none',
          '-moz-user-select': 'none',
          'user-select': 'none',
          '-webkit-touch-callout': 'none',
        },
      })
    }
  ],
}