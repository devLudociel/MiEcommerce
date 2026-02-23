// src/components/landing/LandingGallery.tsx
import { useState, useCallback } from 'react';
import type { LandingGalleryItem } from '../../types/landing';

interface LandingGalleryProps {
  items: LandingGalleryItem[];
}

export default function LandingGallery({ items }: LandingGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setSelectedIndex(null), []);

  const navigateLightbox = useCallback(
    (direction: 1 | -1) => {
      setSelectedIndex((prev) => {
        if (prev === null) return null;
        const next = prev + direction;
        if (next < 0) return items.length - 1;
        if (next >= items.length) return 0;
        return next;
      });
    },
    [items.length]
  );

  if (!items || items.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-gray-800 mb-4">
            Nuestros Trabajos
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Algunos ejemplos de lo que podemos hacer por ti
          </p>
          <div className="w-20 h-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mx-auto rounded-full mt-4" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-200 cursor-pointer focus:outline-none focus:ring-4 focus:ring-cyan-300"
              aria-label={`Ver ${item.alt}`}
            >
              <img
                src={item.image}
                alt={item.alt}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              {item.caption && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <span className="text-white font-semibold text-sm">
                    {item.caption}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Lightbox */}
        {selectedIndex !== null && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            aria-label="Galeria de imagenes"
          >
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-2xl"
              aria-label="Cerrar"
            >
              &times;
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox(-1);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-2xl"
              aria-label="Anterior"
            >
              &#8249;
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateLightbox(1);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-2xl"
              aria-label="Siguiente"
            >
              &#8250;
            </button>

            <div
              className="max-w-4xl max-h-[80vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={items[selectedIndex].image}
                alt={items[selectedIndex].alt}
                className="w-full h-full object-contain rounded-lg"
              />
              {items[selectedIndex].caption && (
                <p className="text-center text-white/80 mt-4 text-lg">
                  {items[selectedIndex].caption}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
