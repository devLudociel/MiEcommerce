// src/components/sections/CategoriesShowcase.tsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { categories as navbarCategories } from '../../data/categories';

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
}

const MOBILE_ITEMS_PER_PAGE = 3;
const MAIN_CATEGORIES: Category[] = navbarCategories.map(({ id, name, slug }) => ({
  id,
  name,
  slug,
}));
const MAIN_CATEGORY_SLUGS = new Set(MAIN_CATEGORIES.map((category) => category.slug));

export default function CategoriesShowcase() {
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [mobilePage, setMobilePage] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(
    () =>
      MAIN_CATEGORIES.map((category) => ({
        ...category,
        image: categoryImages[category.slug],
      })),
    [categoryImages]
  );

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const imagesBySlug = snapshot.docs.reduce<Record<string, string>>((acc, doc) => {
        const data = doc.data() as Category;
        if (MAIN_CATEGORY_SLUGS.has(data.slug) && data.image) {
          acc[data.slug] = data.image;
        }
        return acc;
      }, {});
      setCategoryImages(imagesBySlug);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const node = scrollRef.current;

    if (!node) return;

    const updateScrollState = () => {
      const maxScrollLeft = node.scrollWidth - node.clientWidth;
      setCanScrollLeft(node.scrollLeft > 8);
      setCanScrollRight(node.scrollLeft < maxScrollLeft - 8);
    };

    updateScrollState();
    node.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      node.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [categories.length]);

  useEffect(() => {
    const lastPage = Math.max(0, Math.ceil(categories.length / MOBILE_ITEMS_PER_PAGE) - 1);
    setMobilePage((currentPage) => Math.min(currentPage, lastPage));
  }, [categories.length]);

  const totalMobilePages = Math.ceil(categories.length / MOBILE_ITEMS_PER_PAGE);
  const mobilePageCategories = categories.slice(
    mobilePage * MOBILE_ITEMS_PER_PAGE,
    mobilePage * MOBILE_ITEMS_PER_PAGE + MOBILE_ITEMS_PER_PAGE
  );

  const scrollByDesktopPage = (direction: 'left' | 'right') => {
    const node = scrollRef.current;
    if (!node) return;

    const amount = Math.max(node.clientWidth * 0.72, 260);
    node.scrollBy({
      left: direction === 'right' ? amount : -amount,
      behavior: 'smooth',
    });
  };

  const goToMobilePage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 0), totalMobilePages - 1);
    setMobilePage(nextPage);
  };

  return (
    <section className="py-8 sm:py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 sm:mb-8">
          Explorar todas las categorías
        </h2>

        {/* Desktop: horizontal scrollable row */}
        <div className="relative hidden sm:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white via-white/90 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white via-white/90 to-transparent" />

          <button
            type="button"
            onClick={() => scrollByDesktopPage('left')}
            disabled={!canScrollLeft}
            className="absolute left-0 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-2xl border border-cyan-100 bg-white/95 text-cyan-700 shadow-[0_16px_40px_-24px_rgba(0,172,232,0.75)] transition-all duration-200 hover:-translate-y-[52%] hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 disabled:shadow-none"
            aria-label="Ver categorías anteriores"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 6l-6 6 6 6" />
            </svg>
          </button>

          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scroll-smooth px-14 pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((category) => (
              <a
                key={category.id}
                href={`/productos?tag=${category.slug}`}
                className="flex flex-col items-center gap-3 flex-shrink-0 group"
                style={{ minWidth: '112px', maxWidth: '128px' }}
              >
                <div className="w-24 h-24 rounded-full bg-[#f5f0e8] border border-[#ede8de] flex items-center justify-center overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-gray-400">
                      {category.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-sm text-center text-gray-800 font-semibold leading-tight">
                  {category.name}
                </span>
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollByDesktopPage('right')}
            disabled={!canScrollRight}
            className="absolute right-0 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-2xl border border-cyan-100 bg-white/95 text-cyan-700 shadow-[0_16px_40px_-24px_rgba(0,172,232,0.75)] transition-all duration-200 hover:-translate-y-[52%] hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 disabled:shadow-none"
            aria-label="Ver más categorías"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        {/* Mobile: 3-item carousel with dots */}
        <div className="overflow-hidden sm:hidden">
          <div className="relative px-6 xs:px-10">
            {totalMobilePages > 1 && (
              <button
                type="button"
                onClick={() => goToMobilePage(mobilePage - 1)}
                disabled={mobilePage === 0}
                className="absolute left-0 top-6 z-10 flex h-8 w-8 xs:h-10 xs:w-10 items-center justify-center rounded-xl border border-cyan-100 bg-white/95 text-cyan-700 shadow-[0_14px_30px_-24px_rgba(0,172,232,0.8)] transition-all duration-200 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 disabled:shadow-none"
                aria-label="Categorías anteriores"
              >
                <svg className="h-3.5 w-3.5 xs:h-4.5 xs:w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            )}

            <div className="grid grid-cols-3 gap-x-3 gap-y-2 xs:gap-x-4 xs:gap-y-3">
              {mobilePageCategories.map((category) => (
                <a
                  key={category.id}
                  href={`/productos?tag=${category.slug}`}
                  className="flex min-w-0 flex-col items-center gap-2 group"
                >
                  <div className="w-16 h-16 xs:w-20 xs:h-20 rounded-full bg-[#f5f0e8] border border-[#ede8de] flex items-center justify-center overflow-hidden mx-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all duration-200 group-active:scale-[0.98]">
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-gray-400">
                        {category.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="max-w-full text-[10px] xs:text-xs text-center text-gray-800 font-semibold leading-tight px-1 break-words">
                    {category.name}
                  </span>
                </a>
              ))}
              {mobilePageCategories.length < MOBILE_ITEMS_PER_PAGE &&
                Array.from({ length: MOBILE_ITEMS_PER_PAGE - mobilePageCategories.length }).map(
                  (_, i) => <div key={`empty-${i}`} />
                )}
            </div>

            {totalMobilePages > 1 && (
              <button
                type="button"
                onClick={() => goToMobilePage(mobilePage + 1)}
                disabled={mobilePage === totalMobilePages - 1}
                className="absolute right-0 top-6 z-10 flex h-8 w-8 xs:h-10 xs:w-10 items-center justify-center rounded-xl border border-cyan-100 bg-white/95 text-cyan-700 shadow-[0_14px_30px_-24px_rgba(0,172,232,0.8)] transition-all duration-200 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 disabled:shadow-none"
                aria-label="Ver más categorías"
              >
                <svg className="h-3.5 w-3.5 xs:h-4.5 xs:w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 6l6 6-6 6" />
                </svg>
              </button>
            )}
          </div>

          {/* Pagination dots */}
          {totalMobilePages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              {Array.from({ length: totalMobilePages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToMobilePage(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === mobilePage
                      ? 'h-2 w-5 bg-cyan-500 shadow-[0_6px_16px_-10px_rgba(0,172,232,0.9)]'
                      : 'h-2 w-2 bg-gray-300 hover:bg-cyan-200'
                  }`}
                  aria-label={`Página ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
