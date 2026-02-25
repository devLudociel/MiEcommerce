// src/components/landing/LandingServices.tsx
import type { LandingServicesSection } from '../../types/landing';
import Icon from '../ui/Icon';

interface LandingServicesProps {
  data: LandingServicesSection;
}

export default function LandingServices({ data }: LandingServicesProps) {
  if (!data || !data.items || data.items.length === 0) return null;

  return (
    <section id="servicios" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            {data.eyebrow && (
              <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-500 font-semibold mb-3">
                {data.eyebrow}
              </p>
            )}
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">
              {data.title}
            </h2>
          </div>
          {data.ctaText && data.ctaUrl && (
            <a
              href={data.ctaUrl}
              className="inline-flex items-center gap-2 text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700"
            >
              {data.ctaText}
              <span aria-hidden="true">→</span>
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.items.map((item, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center mb-4">
                <Icon name={item.icon} size={24} strokeWidth={2.2} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {item.description}
              </p>
              {item.linkText && item.linkUrl && (
                <a
                  href={item.linkUrl}
                  className="text-sm font-semibold text-fuchsia-600 hover:text-fuchsia-700"
                >
                  {item.linkText}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
