// src/components/landing/LandingFeaturedProducts.tsx
import type { LandingProductsSection } from '../../types/landing';
import Icon from '../ui/Icon';

interface LandingFeaturedProductsProps {
  data: LandingProductsSection;
}

export default function LandingFeaturedProducts({ data }: LandingFeaturedProductsProps) {
  if (!data || !data.items || data.items.length === 0) return null;

  return (
    <section id="catalogo" className="py-16 md:py-24 bg-white">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.items.map((item, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition-shadow overflow-hidden"
            >
              <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="text-fuchsia-400">
                    <Icon name="Package" size={36} />
                  </div>
                )}
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold text-fuchsia-500 uppercase tracking-[0.2em] mb-2">
                  {item.category}
                </p>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {item.price}
                </p>
                <a
                  href={item.ctaUrl}
                  className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-semibold rounded-lg border border-fuchsia-200 text-fuchsia-600 hover:bg-fuchsia-50 transition-colors"
                >
                  {item.ctaText}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
