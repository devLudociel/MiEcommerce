// src/types/landing.ts
// Tipos para el sistema de landing pages

export interface LandingHeroData {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  /** URL de imagen de fondo (opcional, usa gradiente CMYK por defecto) */
  backgroundImage?: string;
  /** Segundo CTA opcional */
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  /** Variante visual del hero */
  variant?: 'centered' | 'split';
  /** Texto superior (eyebrow) */
  eyebrow?: string;
  /** Texto de ubicacion / etiqueta */
  location?: string;
  /** Palabra a resaltar dentro del titulo */
  titleAccent?: string;
  /** Badge corto en la zona visual */
  badgeText?: string;
  /** Tarjetas visuales en el hero */
  cards?: LandingHeroCard[];
  /** Estadisticas debajo del hero */
  stats?: LandingStat[];
  /** Aviso corto bajo el hero */
  notice?: string;
}

export interface LandingHeroCard {
  icon: string;
  label: string;
}

export interface LandingStat {
  value: string;
  label: string;
}

export interface LandingBenefit {
  icon: string;
  title: string;
  description: string;
}

export interface LandingGalleryItem {
  image: string;
  alt: string;
  caption?: string;
}

export interface LandingTestimonial {
  name: string;
  role?: string;
  text: string;
  avatar?: string;
  rating?: number;
}

export type LandingCtaType = 'whatsapp' | 'form' | 'link';

export interface LandingCtaData {
  type: LandingCtaType;
  title: string;
  subtitle?: string;
  buttonText: string;
  /** URL para type='link', numero para type='whatsapp' */
  target: string;
  /** Mensaje predefinido para WhatsApp */
  whatsappMessage?: string;
  /** Variante de estilo del boton */
  variant?: 'brand' | 'whatsapp';
}

export interface LandingFooterData {
  phone?: string;
  phoneDisplay?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  showSocialLinks?: boolean;
}

export interface LandingHeaderNavItem {
  label: string;
  href: string;
}

export interface LandingHeaderData {
  navItems?: LandingHeaderNavItem[];
  ctaText?: string;
  ctaUrl?: string;
}

export interface LandingServiceItem {
  icon: string;
  title: string;
  description: string;
  linkText?: string;
  linkUrl?: string;
}

export interface LandingServicesSection {
  eyebrow?: string;
  title: string;
  ctaText?: string;
  ctaUrl?: string;
  items: LandingServiceItem[];
}

export interface LandingProcessStep {
  step: string;
  title: string;
  description: string;
}

export interface LandingProcessSection {
  eyebrow?: string;
  title: string;
  steps: LandingProcessStep[];
}

export interface LandingProductItem {
  image?: string;
  title: string;
  category: string;
  price: string;
  ctaText: string;
  ctaUrl: string;
}

export interface LandingProductsSection {
  eyebrow?: string;
  title: string;
  ctaText?: string;
  ctaUrl?: string;
  items: LandingProductItem[];
}

export interface LandingPageData {
  /** Slug unico para la URL: /lp/{slug} */
  slug: string;
  /** Titulo para SEO y meta tags */
  title: string;
  /** Descripcion para SEO */
  description: string;
  /** Imagen OG para redes sociales */
  ogImage?: string;
  /** Si la landing esta activa */
  active: boolean;

  // Secciones
  hero: LandingHeroData;
  benefits?: LandingBenefit[];

  /** Galeria de trabajos (opcional) */
  gallery?: LandingGalleryItem[];

  /** Testimonios (opcional) */
  testimonials?: LandingTestimonial[];

  /** CTA final */
  cta: LandingCtaData;

  /** Footer minimo - usa datos de contactInfo por defecto */
  footer?: LandingFooterData;

  /** Header opcional con navegacion */
  header?: LandingHeaderData;

  /** Secciones nuevas (opcionales) */
  services?: LandingServicesSection;
  process?: LandingProcessSection;
  featuredProducts?: LandingProductsSection;

  // Tracking
  /** ID de campana para analytics */
  campaignId?: string;
  /** Pixel de Facebook especifico (override del global) */
  facebookPixelId?: string;
}
