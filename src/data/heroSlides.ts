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
    title: 'Personalización en La Palma',
    subtitle: 'Estampado · Bordado · Impresión 3D',
    description:
      'Camisetas, tazas, llaveros, madera grabada y más. Diseño propio o tu idea hecha realidad en Los Llanos de Aridane.',
    ctaPrimary: 'Ver productos',
    ctaSecondary: 'Cómo personalizar',
    backgroundImage:
      'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop',
    accentColor: 'cyan',
  },
  {
    id: 2,
    title: 'Camisetas Personalizadas DTF',
    subtitle: 'Estampado textil profesional',
    description:
      'Estampa tu diseño en camisetas, sudaderas y polos con tecnología DTF. Calidad alta, colores vivos, lavados resistentes.',
    ctaPrimary: 'Pedir camiseta',
    ctaSecondary: 'Ver catálogo',
    backgroundImage:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop',
    accentColor: 'magenta',
  },
  {
    id: 3,
    title: 'Regalos únicos personalizados',
    subtitle: 'Tazas, llaveros y madera grabada',
    description:
      'Sublimación, corte láser y grabado para sorprender en bodas, cumpleaños y eventos. Envío a toda Canarias.',
    ctaPrimary: 'Ver ofertas',
    ctaSecondary: 'Inspírate',
    backgroundImage:
      'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1920&h=1080&fit=crop',
    accentColor: 'yellow',
  },
  {
    id: 4,
    title: 'Impresión 3D personalizada',
    subtitle: 'Resina y filamento · Calidad Premium',
    description:
      'Figuras, prototipos y piezas técnicas en 3D con acabado profesional. +1.200 pedidos y 4,9★ en Google.',
    ctaPrimary: 'Cotizar 3D',
    ctaSecondary: 'Contactar',
    backgroundImage:
      'https://images.unsplash.com/photo-1560472355-536de3962603?w=1920&h=1080&fit=crop',
    accentColor: 'rainbow',
  },
];
