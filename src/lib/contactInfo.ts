// src/lib/contactInfo.ts
// Sistema de gestión de información de contacto centralizada

import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, Timestamp, type Unsubscribe } from 'firebase/firestore';

// ============================================================================
// TYPES
// ============================================================================

export interface SocialLink {
  id: string;
  platform: string;
  icon: string;
  url: string;
  active: boolean;
  order: number;
}

export interface ScheduleItem {
  id: string;
  day: string;
  hours: string;
  order: number;
}

export interface ContactInfo {
  // Basic contact
  phone: string;
  phoneDisplay: string; // Formatted display version
  email: string;
  whatsapp: string;
  whatsappMessage: string; // Default message for WhatsApp

  // Address
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  googleMapsEmbed: string; // Google Maps embed URL

  // Company
  companyName: string;
  companySlogan: string;
  companyDescription: string;

  // Social Media
  socialLinks: SocialLink[];

  // Schedule
  schedule: ScheduleItem[];

  // Metadata
  updatedAt: Timestamp;
}

export type ContactInfoInput = Omit<ContactInfo, 'updatedAt'>;

// ============================================================================
// DOCUMENT PATH
// ============================================================================

const DOCUMENT_PATH = 'settings/contact_info';

// ============================================================================
// DEFAULT DATA
// ============================================================================

export const DEFAULT_CONTACT_INFO: ContactInfoInput = {
  phone: '+34645341452',
  phoneDisplay: '645 341 452',
  email: 'info@imprimarte.com',
  whatsapp: '34645341452',
  whatsappMessage:
    '¡Hola ImprimeArte! 👋 Tengo una consulta sobre sus servicios de impresión y personalización. ¿Podrían ayudarme?',

  address: '',
  city: 'Santa Cruz de Tenerife',
  province: 'Canarias',
  postalCode: '',
  country: 'España',
  googleMapsEmbed:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d111551.9926778267!2d-16.402524!3d28.463888!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xc41ccfda44fc0fd%3A0x10340f3be4bc8c0!2sSanta%20Cruz%20de%20Tenerife!5e0!3m2!1ses!2ses',

  companyName: 'ImprimeArte',
  companySlogan: 'Impresión y personalización',
  companyDescription:
    'Especialistas en impresión y personalización. Damos vida a tus ideas con la más alta calidad y tecnología.',

  socialLinks: [
    {
      id: '1',
      platform: 'Instagram',
      icon: '📷',
      url: 'https://instagram.com/imprimarte',
      active: true,
      order: 0,
    },
    {
      id: '2',
      platform: 'Facebook',
      icon: '👍',
      url: 'https://facebook.com/imprimarte',
      active: true,
      order: 1,
    },
    {
      id: '3',
      platform: 'TikTok',
      icon: '🎵',
      url: 'https://tiktok.com/@imprimarte',
      active: true,
      order: 2,
    },
    { id: '4', platform: 'WhatsApp', icon: '💬', url: '', active: true, order: 3 }, // URL generated from whatsapp field
    {
      id: '5',
      platform: 'YouTube',
      icon: '📺',
      url: 'https://youtube.com/@imprimarte',
      active: true,
      order: 4,
    },
    {
      id: '6',
      platform: 'Pinterest',
      icon: '📌',
      url: 'https://pinterest.com/imprimarte',
      active: true,
      order: 5,
    },
    {
      id: '7',
      platform: 'Twitter',
      icon: '🐦',
      url: 'https://twitter.com/imprimarte',
      active: false,
      order: 6,
    },
    {
      id: '8',
      platform: 'LinkedIn',
      icon: '💼',
      url: 'https://linkedin.com/company/imprimarte',
      active: false,
      order: 7,
    },
  ],

  schedule: [
    { id: '1', day: 'Lunes - Viernes', hours: '9:00 - 20:00', order: 0 },
    { id: '2', day: 'Sábados', hours: '10:00 - 14:00', order: 1 },
    { id: '3', day: 'Domingos', hours: 'Cerrado', order: 2 },
  ],
};

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Obtener información de contacto
 */
export async function getContactInfo(): Promise<ContactInfo | null> {
  try {
    const docRef = doc(db, DOCUMENT_PATH);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as ContactInfo;
    }

    return null;
  } catch (error) {
    console.error('Error fetching contact info:', error);
    return null;
  }
}

/**
 * Obtener información de contacto con fallback a valores por defecto
 */
export async function getContactInfoWithDefaults(): Promise<ContactInfoInput> {
  const info = await getContactInfo();
  if (info) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updatedAt, ...rest } = info;
    return rest;
  }
  return DEFAULT_CONTACT_INFO;
}

/**
 * Suscripción en tiempo real a la información de contacto
 */
export function subscribeToContactInfo(callback: (info: ContactInfo | null) => void): Unsubscribe {
  const docRef = doc(db, DOCUMENT_PATH);

  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as ContactInfo);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error in contact info subscription:', error);
      callback(null);
    }
  );
}

/**
 * Guardar/actualizar información de contacto
 */
export async function saveContactInfo(info: ContactInfoInput): Promise<void> {
  try {
    const docRef = doc(db, DOCUMENT_PATH);
    await setDoc(docRef, {
      ...info,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error saving contact info:', error);
    throw error;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generar URL de WhatsApp con mensaje
 */
export function getWhatsAppUrl(whatsapp: string, message: string): string {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${whatsapp}?text=${encodedMessage}`;
}

/**
 * Generar URL de teléfono
 */
export function getPhoneUrl(phone: string): string {
  return `tel:${phone.replace(/\s/g, '')}`;
}

/**
 * Generar URL de email
 */
export function getEmailUrl(email: string, subject?: string): string {
  if (subject) {
    return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
  }
  return `mailto:${email}`;
}

/**
 * Obtener enlace social con URL dinámica para WhatsApp
 */
export function getSocialLinkUrl(link: SocialLink, contactInfo: ContactInfoInput): string {
  if (link.platform === 'WhatsApp') {
    return getWhatsAppUrl(contactInfo.whatsapp, contactInfo.whatsappMessage);
  }
  return link.url;
}

/**
 * Obtener dirección completa formateada
 */
export function getFullAddress(info: ContactInfoInput): string {
  const parts = [info.address, info.city, info.province, info.postalCode, info.country].filter(
    Boolean
  );
  return parts.join(', ');
}

/**
 * Obtener dirección corta (ciudad, provincia)
 */
export function getShortAddress(info: ContactInfoInput): string {
  const parts = [info.city, info.province].filter(Boolean);
  return parts.join(', ');
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validar número de teléfono
 */
export function isValidPhone(phone: string): boolean {
  // Accept formats: +34645341452, 645341452, +34 645 341 452
  const cleaned = phone.replace(/\s/g, '');
  return /^\+?\d{9,15}$/.test(cleaned);
}

/**
 * Validar email
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validar URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// PLATFORM OPTIONS
// ============================================================================

export const SOCIAL_PLATFORMS = [
  { value: 'Instagram', label: 'Instagram', icon: '📷', color: '#E1306C' },
  { value: 'Facebook', label: 'Facebook', icon: '👍', color: '#1877F2' },
  { value: 'TikTok', label: 'TikTok', icon: '🎵', color: '#000000' },
  { value: 'WhatsApp', label: 'WhatsApp', icon: '💬', color: '#25D366' },
  { value: 'YouTube', label: 'YouTube', icon: '📺', color: '#FF0000' },
  { value: 'Pinterest', label: 'Pinterest', icon: '📌', color: '#BD081C' },
  { value: 'Twitter', label: 'Twitter/X', icon: '🐦', color: '#1DA1F2' },
  { value: 'LinkedIn', label: 'LinkedIn', icon: '💼', color: '#0A66C2' },
  { value: 'Telegram', label: 'Telegram', icon: '✈️', color: '#0088CC' },
  { value: 'Discord', label: 'Discord', icon: '🎮', color: '#5865F2' },
];

export function getPlatformInfo(platform: string) {
  return (
    SOCIAL_PLATFORMS.find((p) => p.value === platform) || {
      value: platform,
      label: platform,
      icon: '🔗',
      color: '#666666',
    }
  );
}
