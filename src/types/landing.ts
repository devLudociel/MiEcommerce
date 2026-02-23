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
}

export interface LandingFooterData {
  phone?: string;
  phoneDisplay?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  showSocialLinks?: boolean;
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
  benefits: LandingBenefit[];

  /** Galeria de trabajos (opcional) */
  gallery?: LandingGalleryItem[];

  /** Testimonios (opcional) */
  testimonials?: LandingTestimonial[];

  /** CTA final */
  cta: LandingCtaData;

  /** Footer minimo - usa datos de contactInfo por defecto */
  footer?: LandingFooterData;

  // Tracking
  /** ID de campana para analytics */
  campaignId?: string;
  /** Pixel de Facebook especifico (override del global) */
  facebookPixelId?: string;
}
