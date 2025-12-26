// PERFORMANCE: Static hero carousel slides moved out of HeroCarousel component
// Prevents recreation of this array on every render

export interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  ctaPrimary: string;
  ctaSecondary: string;
  backgroundImage: string;
  accentColor: 'cyan' | 'magenta' | 'yellow' | 'rainbow';
}

export const heroSlides: HeroSlide[] = [
  {
    id: 1,
    title: 'Tecnología del Futuro',
    subtitle: 'Nueva Colección 2025',
    description: 'Descubre los productos más innovadores con diseño futurista y calidad premium',
    ctaPrimary: 'Explorar Ahora',
    ctaSecondary: 'Ver Catálogo',
    backgroundImage:
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
    accentColor: 'cyan',
  },
  {
    id: 2,
    title: 'Estilo Único',
    subtitle: 'Edición Limitada',
    description: 'Productos exclusivos que combinan elegancia, funcionalidad y diseño vanguardista',
    ctaPrimary: 'Comprar Ya',
    ctaSecondary: 'Más Info',
    backgroundImage:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop',
    accentColor: 'magenta',
  },
  {
    id: 3,
    title: 'Ofertas Increíbles',
    subtitle: 'Hasta 70% de Descuento',
    description: 'No te pierdas nuestras ofertas especiales en los mejores productos seleccionados',
    ctaPrimary: 'Ver Ofertas',
    ctaSecondary: 'Suscribirse',
    backgroundImage:
      'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1920&h=1080&fit=crop',
    accentColor: 'yellow',
  },
  {
    id: 4,
    title: 'Experiencia Premium',
    subtitle: 'Calidad Garantizada',
    description:
      'Productos premium con la mejor calidad, diseño excepcional y servicio al cliente 24/7',
    ctaPrimary: 'Descubrir',
    ctaSecondary: 'Contactar',
    backgroundImage:
      'https://images.unsplash.com/photo-1560472355-536de3962603?w=1920&h=1080&fit=crop',
    accentColor: 'rainbow',
  },
];
