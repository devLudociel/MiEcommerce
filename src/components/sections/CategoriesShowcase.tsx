// src/components/sections/CategoriesShowcase.tsx
import { useState, useRef } from 'react';

const categories = [
  { id: 'tarjetas', name: 'Tarjetas de visita', icon: '🪪', href: '/productos?tag=tarjetas' },
  { id: 'publicidad', name: 'Publicidad impresa y artículos de oficina', icon: '📄', href: '/productos?tag=publicidad' },
  { id: 'carteles', name: 'Carteles y pósteres', icon: '🖼️', href: '/productos?tag=carteles' },
  { id: 'etiquetas', name: 'Etiquetas y pegatinas', icon: '🏷️', href: '/productos?tag=etiquetas' },
  { id: 'ropa', name: 'Ropa y bolsas', icon: '👕', href: '/productos?tag=ropa' },
  { id: 'promocionales', name: 'Artículos promocionales', icon: '📓', href: '/productos?tag=promocionales' },
  { id: 'packaging', name: 'Packaging', icon: '🛍️', href: '/productos?tag=packaging' },
  { id: 'regalos', name: 'Regalos con foto', icon: '🖼️', href: '/productos?tag=regalos' },
  { id: 'invitaciones', name: 'Invitaciones, papelería y bodas', icon: '💌', href: '/productos?tag=invitaciones' },
  { id: 'diseno', name: 'Diseño', icon: '✏️', href: '/productos?tag=diseno' },
];

const MOBILE_ITEMS_PER_PAGE = 3;

export default function CategoriesShowcase() {
  const [mobilePage, setMobilePage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalMobilePages = Math.ceil(categories.length / MOBILE_ITEMS_PER_PAGE);

  const mobilePageCategories = categories.slice(
    mobilePage * MOBILE_ITEMS_PER_PAGE,
    mobilePage * MOBILE_ITEMS_PER_PAGE + MOBILE_ITEMS_PER_PAGE
  );

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-8 sm:py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 sm:mb-8">
          Explorar todas las categorías
        </h2>

        {/* Desktop: horizontal scrollable row */}
        <div className="hidden sm:flex items-center gap-2">
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth flex-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((category) => (
              <a
                key={category.id}
                href={category.href}
                className="flex flex-col items-center gap-3 flex-shrink-0 group"
                style={{ minWidth: '100px', maxWidth: '110px' }}
              >
                <div className="w-24 h-24 rounded-full bg-[#f5f0e8] flex items-center justify-center text-4xl group-hover:shadow-md transition-shadow duration-200 overflow-hidden border border-[#ede8de]">
                  {category.icon}
                </div>
                <span className="text-xs text-center text-gray-700 font-medium leading-tight">
                  {category.name}
                </span>
              </a>
            ))}
          </div>

          {/* Scroll right button */}
          <button
            onClick={scrollRight}
            className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors ml-2"
            aria-label="Ver más categorías"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Mobile: 3-item carousel with dots */}
        <div className="sm:hidden">
          <div className="flex justify-around gap-2">
            {mobilePageCategories.map((category) => (
              <a
                key={category.id}
                href={category.href}
                className="flex flex-col items-center gap-2 group flex-1"
              >
                <div className="w-24 h-24 rounded-full bg-[#f5f0e8] flex items-center justify-center text-4xl group-active:shadow-md transition-shadow duration-200 border border-[#ede8de] mx-auto">
                  {category.icon}
                </div>
                <span className="text-xs text-center text-gray-700 font-medium leading-tight px-1">
                  {category.name}
                </span>
              </a>
            ))}
            {/* Fill empty slots if last page has fewer than 3 items */}
            {mobilePageCategories.length < MOBILE_ITEMS_PER_PAGE &&
              Array.from({ length: MOBILE_ITEMS_PER_PAGE - mobilePageCategories.length }).map((_, i) => (
                <div key={`empty-${i}`} className="flex-1" />
              ))}
          </div>

          {/* Pagination dots */}
          <div className="flex justify-center gap-2 mt-5">
            {Array.from({ length: totalMobilePages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setMobilePage(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === mobilePage ? 'w-6 h-2.5 bg-blue-500' : 'w-2.5 h-2.5 bg-gray-300'
                }`}
                aria-label={`Página ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
