// src/components/landing/LandingCTA.tsx
import { useState, useCallback } from 'react';
import type { LandingCtaData } from '../../types/landing';
import { trackCtaClick, trackLandingFormSubmit } from '../../lib/analytics/landingTracking';
import { getWhatsAppUrl } from '../../lib/contactInfo';

interface LandingCTAProps {
  data: LandingCtaData;
  slug: string;
}

function WhatsAppCTA({ data, slug }: LandingCTAProps) {
  const handleClick = useCallback(() => {
    trackCtaClick(slug, 'whatsapp', 'cta_final');
  }, [slug]);

  const whatsappUrl = getWhatsAppUrl(
    data.target,
    data.whatsappMessage || 'Hola! Me gustaria recibir informacion.'
  );

  const variant = data.variant ?? 'whatsapp';
  const buttonClass =
    variant === 'brand'
      ? 'bg-fuchsia-600 text-white hover:bg-fuchsia-700'
      : 'bg-green-500 text-white hover:bg-green-600';

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`inline-flex items-center gap-3 px-10 py-5 text-lg font-bold rounded-full ${buttonClass} transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105`}
    >
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      {data.buttonText}
    </a>
  );
}

function LinkCTA({ data, slug }: LandingCTAProps) {
  const handleClick = useCallback(() => {
    trackCtaClick(slug, 'link', 'cta_final');
  }, [slug]);

  const isBrand = data.variant === 'brand';
  const buttonClass = isBrand
    ? 'bg-fuchsia-600 text-white hover:bg-fuchsia-700'
    : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-600 hover:to-purple-700';

  return (
    <a
      href={data.target}
      onClick={handleClick}
      className={`inline-flex items-center gap-3 px-10 py-5 text-lg font-bold rounded-full ${buttonClass} transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105`}
    >
      {data.buttonText}
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </a>
  );
}

function FormCTA({ data, slug }: LandingCTAProps) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      trackLandingFormSubmit(slug, { name: formData.name, email: formData.email });

      // Simular envio - integrar con API real segun necesidad
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsSubmitted(true);
      setIsSubmitting(false);
    },
    [slug, formData]
  );

  if (isSubmitted) {
    return (
      <div className="text-center p-8 bg-green-50 rounded-2xl border border-green-200 max-w-md mx-auto">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-green-800 mb-2">Mensaje enviado</h3>
        <p className="text-green-600">Te contactaremos en breve. Gracias por tu interes.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
      <input
        type="text"
        placeholder="Tu nombre"
        required
        value={formData.name}
        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
        className="w-full px-5 py-3 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all text-gray-800"
      />
      <input
        type="email"
        placeholder="Tu email"
        required
        value={formData.email}
        onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
        className="w-full px-5 py-3 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all text-gray-800"
      />
      <input
        type="tel"
        placeholder="Tu telefono (opcional)"
        value={formData.phone}
        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
        className="w-full px-5 py-3 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all text-gray-800"
      />
      <textarea
        placeholder="Tu mensaje"
        rows={3}
        value={formData.message}
        onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
        className="w-full px-5 py-3 rounded-xl border-2 border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all text-gray-800 resize-none"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full px-8 py-4 text-lg font-bold rounded-full ${
          data.variant === 'brand'
            ? 'bg-fuchsia-600 text-white hover:bg-fuchsia-700'
            : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-600 hover:to-purple-700'
        } transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isSubmitting ? 'Enviando...' : data.buttonText}
      </button>
    </form>
  );
}

export default function LandingCTA({ data, slug }: LandingCTAProps) {
  return (
    <section id="contacto" className="py-20 md:py-28 bg-gradient-to-b from-white via-fuchsia-50/40 to-white">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-fuchsia-500 font-semibold mb-3">
            Llamada a la accion
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-800 mb-4">
            {data.title}
          </h2>

          {data.subtitle && (
            <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
              {data.subtitle}
            </p>
          )}

          {data.type === 'whatsapp' && <WhatsAppCTA data={data} slug={slug} />}
          {data.type === 'link' && <LinkCTA data={data} slug={slug} />}
          {data.type === 'form' && <FormCTA data={data} slug={slug} />}
        </div>
      </div>
    </section>
  );
}
