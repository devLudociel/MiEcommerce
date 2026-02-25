// src/components/landing/LandingFooter.tsx
import { useState, useEffect } from 'react';
import type { LandingFooterData } from '../../types/landing';
import {
  getContactInfoWithDefaults,
  getWhatsAppUrl,
  type ContactInfoInput,
} from '../../lib/contactInfo';

interface LandingFooterProps {
  data?: LandingFooterData;
}

export default function LandingFooter({ data }: LandingFooterProps) {
  const [contactInfo, setContactInfo] = useState<ContactInfoInput | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const info = await getContactInfoWithDefaults();
        setContactInfo(info);
      } catch (error) {
        console.error('Error loading contact info:', error);
      }
    }
    load();
  }, []);

  const phone = data?.phoneDisplay || contactInfo?.phoneDisplay || '645 341 452';
  const phoneRaw = data?.phone || contactInfo?.phone || '+34645341452';
  const email = data?.email || contactInfo?.email || 'info@imprimarte.com';
  const whatsapp = data?.whatsapp || contactInfo?.whatsapp || '34645341452';
  const address = data?.address || (contactInfo ? `${contactInfo.city}, ${contactInfo.province}` : 'Santa Cruz de Tenerife');

  const whatsappUrl = getWhatsAppUrl(
    whatsapp,
    contactInfo?.whatsappMessage || 'Hola! Me gustaria recibir informacion.'
  );

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-black text-lg">
              IA
            </div>
            <div>
              <span className="text-lg font-black">ImprimeArte</span>
              <p className="text-xs text-gray-400">Impresion y personalizacion</p>
            </div>
          </div>

          {/* Contacto */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a
              href={`tel:${phoneRaw}`}
              className="flex items-center gap-2 text-gray-300 hover:text-cyan-400 transition-colors"
            >
              <span>📞</span>
              <span>{phone}</span>
            </a>

            <a
              href={`mailto:${email}`}
              className="flex items-center gap-2 text-gray-300 hover:text-cyan-400 transition-colors"
            >
              <span>📧</span>
              <span>{email}</span>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-300 hover:text-green-400 transition-colors"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </a>

            <span className="flex items-center gap-2 text-gray-400">
              <span>📍</span>
              <span>{address}</span>
            </span>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-gray-800 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} ImprimeArte. Todos los derechos reservados.
          <span className="mx-2">|</span>
          <a
            href="/politica-privacidad"
            className="hover:text-cyan-400 transition-colors"
          >
            Privacidad
          </a>
          <span className="mx-2">|</span>
          <a
            href="/terminos-condiciones"
            className="hover:text-cyan-400 transition-colors"
          >
            Terminos
          </a>
          <span className="mx-2">|</span>
          <a href="/politica-cookies" className="hover:text-cyan-400 transition-colors">
            Cookies
          </a>
        </div>
      </div>
    </footer>
  );
}
