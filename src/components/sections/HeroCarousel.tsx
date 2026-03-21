import { useState, useEffect, memo, useCallback } from 'react';
import { heroSlides, type HeroSlide } from '../../data/heroSlides';
import { getActiveBanners, type HeroBanner } from '../../lib/heroBanners';

// Interface for unified slide data (works with both static and dynamic banners)
interface SlideData {
  id: string | number;
  title: string;
  subtitle: string;
  description: string;
  ctaPrimary: string;
  ctaPrimaryUrl: string;
  ctaSecondary: string;
  ctaSecondaryUrl: string;
  backgroundImage: string;
  accentColor: string;
}

// Convert Firebase banner to slide data
function bannerToSlide(banner: HeroBanner): SlideData {
  return {
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    description: banner.description,
    ctaPrimary: banner.ctaPrimaryText,
    ctaPrimaryUrl: banner.ctaPrimaryUrl,
    ctaSecondary: banner.ctaSecondaryText,
    ctaSecondaryUrl: banner.ctaSecondaryUrl,
    backgroundImage: banner.backgroundImage,
    accentColor: banner.accentColor,
  };
}

// Convert static slide to unified format
function staticToSlide(slide: HeroSlide): SlideData {
  return {
    id: slide.id,
    title: slide.title,
    subtitle: slide.subtitle,
    description: slide.description,
    ctaPrimary: slide.ctaPrimary,
    ctaPrimaryUrl: '/productos',
    ctaSecondary: slide.ctaSecondary,
    ctaSecondaryUrl: '/productos',
    backgroundImage: slide.backgroundImage,
    accentColor: slide.accentColor,
  };
}

// PERFORMANCE: Memoize component to prevent unnecessary re-renders
const HeroCarousel = memo(() => {
  const [slides, setSlides] = useState<SlideData[]>(() => heroSlides.map(staticToSlide));
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Load banners from Firebase
  useEffect(() => {
    let mounted = true;

    async function loadBanners() {
      try {
        const banners = await getActiveBanners();
        if (mounted && banners.length > 0) {
          setSlides(banners.map(bannerToSlide));
        }
      } catch (error) {
        console.error('Error loading banners, using defaults:', error);
        // Keep using static slides on error
      } finally {
        // No-op: keep component rendering with available slides
      }
    }

    loadBanners();

    return () => {
      mounted = false;
    };
  }, []);

  // PERFORMANCE: Wrap event handlers in useCallback
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying || slides.length === 0) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, currentSlide, nextSlide, slides.length]);

  // PERFORMANCE: Wrap toggle handler in useCallback
  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlaying((prev) => !prev);
  }, []);

  const pauseAutoPlay = useCallback(() => {
    setIsAutoPlaying(false);
  }, []);

  const resumeAutoPlay = useCallback(() => {
    setIsAutoPlaying(true);
  }, []);

  const getAccentGlowStyle = useCallback((color: string) => {
    const accentColors = {
      cyan: 'rgba(0, 172, 232, 0.18)',
      magenta: 'rgba(240, 0, 240, 0.16)',
      yellow: 'rgba(255, 240, 0, 0.14)',
      rainbow: 'rgba(99, 102, 241, 0.16)',
    };
    const accent = accentColors[color as keyof typeof accentColors] || accentColors.cyan;

    return {
      background: `radial-gradient(circle at 20% 32%, ${accent} 0%, rgba(15, 23, 42, 0) 48%)`,
    };
  }, []);

  // Handle CTA click with URL navigation
  const handleCtaClick = useCallback((url: string) => {
    if (url) {
      window.location.href = url;
    }
  }, []);

  if (slides.length === 0) {
    return null;
  }

  return (
    <section className="w-full px-3 sm:px-4 md:px-6 lg:px-8 mt-2 sm:mt-3 md:mt-4 mb-4 sm:mb-6">
      <div className="max-w-7xl mx-auto">
        <div className="relative overflow-hidden h-[200px] sm:h-[260px] md:h-[320px] lg:h-[380px] rounded-xl sm:rounded-2xl">
          {/* Slides Container */}
          <div className="relative h-full">
            {slides.map((slide, index) => {
              const isActive = index === currentSlide;
              const accentGlowStyle = getAccentGlowStyle(slide.accentColor);

              return (
                <div
                  key={slide.id}
                  className="absolute inset-0 transition-opacity duration-1000"
                  style={{
                    opacity: isActive ? 1 : 0,
                    zIndex: isActive ? 20 : 10,
                    pointerEvents: isActive ? 'auto' : 'none',
                  }}
                >
                  {/* Background Image */}
                  <div className="absolute inset-0 bg-slate-950" />
                  <div
                    className="absolute inset-0 bg-center bg-no-repeat"
                    style={{
                      backgroundImage: `url(${slide.backgroundImage})`,
                      backgroundSize: 'contain',
                      transform: isActive ? 'scale(1)' : 'scale(1.03)',
                      transition: 'transform 1000ms ease-out',
                    }}
                  />

                  <div
                    className="absolute inset-0 opacity-70 transition-opacity duration-1000"
                    style={accentGlowStyle}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-slate-950/8" />

                  {/* CTA Only */}
                  <div className="absolute inset-x-0 bottom-10 sm:bottom-14 md:bottom-16 z-10 px-4 sm:px-6">
                    <div className="mx-auto flex max-w-7xl justify-center sm:justify-start">
                      <div
                        className="flex flex-row flex-wrap items-center justify-center gap-2 rounded-2xl bg-slate-950/40 px-3 py-2 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.95)] transition-all duration-1000 sm:justify-start sm:gap-3 sm:px-4 sm:py-3"
                        style={{
                          opacity: isActive ? 1 : 0,
                          transform: isActive ? 'translateY(0)' : 'translateY(1.5rem)',
                          transitionDelay: '350ms',
                        }}
                      >
                        {slide.ctaPrimary && (
                          <button
                            onClick={() => handleCtaClick(slide.ctaPrimaryUrl)}
                            className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-slate-950 shadow-[0_20px_35px_-18px_rgba(255,255,255,0.7)] transition-all hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-[0_28px_45px_-20px_rgba(255,255,255,0.8)] active:scale-95 sm:px-4 sm:py-2.5 sm:text-sm md:px-5 touch-manipulation"
                          >
                            {slide.ctaPrimary}
                          </button>
                        )}
                        {slide.ctaSecondary && (
                          <button
                            onClick={() => handleCtaClick(slide.ctaSecondaryUrl)}
                            className="rounded-xl bg-cyan-500 px-3 py-2 text-[11px] font-bold text-white shadow-[0_20px_35px_-18px_rgba(6,182,212,0.8)] transition-all hover:-translate-y-0.5 hover:bg-cyan-400 hover:shadow-[0_28px_45px_-20px_rgba(34,211,238,0.9)] active:scale-95 sm:px-4 sm:py-2.5 sm:text-sm md:px-5 touch-manipulation"
                          >
                            {slide.ctaSecondary}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Controls - Responsive */}
          <div className="absolute bottom-2 sm:bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 z-30">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              {/* Dots - Tamaño responsive */}
              <div className="flex items-center gap-1 sm:gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`carousel-dot w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 touch-manipulation ${
                      index === currentSlide
                        ? 'bg-white scale-125'
                        : 'bg-white/50 hover:bg-white/80'
                    }`}
                    type="button"
                    aria-label={`Ir a la diapositiva ${index + 1}`}
                    aria-current={index === currentSlide ? 'true' : undefined}
                    aria-pressed={index === currentSlide}
                  />
                ))}
              </div>

              {/* Play/Pause - Solo desktop */}
              <button
                onClick={toggleAutoPlay}
                className="hidden sm:flex ml-2 sm:ml-4 p-1.5 sm:p-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 text-white hover:bg-white/30 transition-all touch-manipulation"
                type="button"
                aria-label={isAutoPlaying ? 'Pausar carrusel' : 'Reproducir carrusel'}
                aria-pressed={!isAutoPlaying}
              >
                {isAutoPlaying ? (
                  <svg
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
                  </svg>
                ) : (
                  <svg
                    className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Arrow Navigation - Ocultar en móvil, visible en tablet+ */}
          <button
            onClick={nextSlide}
            onMouseEnter={pauseAutoPlay}
            onMouseLeave={resumeAutoPlay}
            className="hidden sm:block absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 z-30 p-2 sm:p-2.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 text-white hover:bg-white/30 transition-all hover:scale-110 active:scale-95 touch-manipulation"
            type="button"
            aria-label="Siguiente diapositiva"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={prevSlide}
            onMouseEnter={pauseAutoPlay}
            onMouseLeave={resumeAutoPlay}
            className="hidden sm:block absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 z-30 p-2 sm:p-2.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 text-white hover:bg-white/30 transition-all hover:scale-110 active:scale-95 touch-manipulation"
            type="button"
            aria-label="Diapositiva anterior"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
});

// Add display name for debugging
HeroCarousel.displayName = 'HeroCarousel';

export default HeroCarousel;
