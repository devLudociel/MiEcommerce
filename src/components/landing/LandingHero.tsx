// src/components/landing/LandingHero.tsx
import { useCallback } from 'react';
import type { LandingHeroData } from '../../types/landing';
import { trackCtaClick } from '../../lib/analytics/landingTracking';

interface LandingHeroProps {
  data: LandingHeroData;
  slug: string;
}

export default function LandingHero({ data, slug }: LandingHeroProps) {
  const handleCtaClick = useCallback(
    (ctaType: string) => {
      trackCtaClick(slug, ctaType, 'hero');
    },
    [slug]
  );

  return (
    <section
      className="relative overflow-hidden py-20 md:py-28 lg:py-36"
      style={{
        background: data.backgroundImage
          ? `url(${data.backgroundImage}) center/cover no-repeat`
          : 'linear-gradient(135deg, #00d7fa 0%, #8f00ff 50%, #f000f0 100%)',
      }}
    >
      {/* Overlay para legibilidad */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            {data.title}
          </h1>

          <p className="text-lg md:text-xl text-white/90 mb-10 leading-relaxed max-w-2xl mx-auto">
            {data.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={data.ctaUrl}
              onClick={() => handleCtaClick('primary')}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-xl bg-white text-gray-900 hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              {data.ctaText}
            </a>

            {data.secondaryCtaText && data.secondaryCtaUrl && (
              <a
                href={data.secondaryCtaUrl}
                onClick={() => handleCtaClick('secondary')}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-xl border-2 border-white text-white hover:bg-white/10 transition-all duration-300"
              >
                {data.secondaryCtaText}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Onda decorativa inferior */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          preserveAspectRatio="none"
        >
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}
