// src/components/landing/LandingHero.tsx
import { useCallback } from 'react';
import type { LandingHeroData } from '../../types/landing';
import { trackCtaClick } from '../../lib/analytics/landingTracking';
import Icon from '../ui/Icon';

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

  if (data.variant === 'split') {
    const accent = data.titleAccent;
    const titleParts = accent && data.title.includes(accent)
      ? data.title.split(accent)
      : null;

    return (
      <section className="relative overflow-hidden py-16 md:py-24 bg-gradient-to-br from-white via-sky-50 to-sky-100">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-fuchsia-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-100/60 rounded-full blur-3xl" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
            <div>
              {data.eyebrow && (
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400 font-semibold mb-4">
                  {data.eyebrow}
                </p>
              )}

              {data.location && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-fuchsia-200 text-xs text-fuchsia-700 bg-fuchsia-50 mb-5">
                  <Icon name="MapPin" size={14} />
                  {data.location}
                </span>
              )}

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-6">
                {titleParts ? (
                  <>
                    {titleParts[0]}
                    <span className="text-fuchsia-600">{accent}</span>
                    {titleParts.slice(1).join(accent)}
                  </>
                ) : (
                  data.title
                )}
              </h1>

              <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-xl mb-8">
                {data.subtitle}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <a
                  href={data.ctaUrl}
                  onClick={() => handleCtaClick('primary')}
                  className="inline-flex items-center justify-center px-7 py-3 text-sm md:text-base font-semibold rounded-full bg-fuchsia-600 text-white hover:bg-fuchsia-700 transition-colors"
                >
                  {data.ctaText}
                </a>

                {data.secondaryCtaText && data.secondaryCtaUrl && (
                  <a
                    href={data.secondaryCtaUrl}
                    onClick={() => handleCtaClick('secondary')}
                    className="inline-flex items-center justify-center px-7 py-3 text-sm md:text-base font-semibold rounded-full border border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50 transition-colors"
                  >
                    {data.secondaryCtaText}
                  </a>
                )}
              </div>

              {data.stats && data.stats.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 border-t border-gray-200 pt-6 text-sm">
                  {data.stats.map((stat, index) => (
                    <div key={index}>
                      <p className="text-lg font-black text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {data.cards && data.cards.length > 0 && (
              <div className="relative">
                {data.badgeText && (
                  <span className="absolute -top-4 left-6 px-3 py-1 text-xs font-semibold text-white bg-fuchsia-600 rounded-full shadow-md">
                    {data.badgeText}
                  </span>
                )}
                <div className="grid grid-cols-2 gap-4 bg-white/70 backdrop-blur rounded-3xl p-6 border border-gray-100 shadow-lg">
                  {data.cards.map((card, index) => (
                    <div
                      key={index}
                      className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 h-32"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center">
                        <Icon name={card.icon} size={24} />
                      </div>
                      <p className="text-sm font-semibold text-gray-700">{card.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {data.notice && (
            <div className="mt-10 px-4 py-3 text-xs md:text-sm text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-100 rounded-lg text-center">
              {data.notice}
            </div>
          )}
        </div>
      </section>
    );
  }

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
