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
  const [slides, setSlides] = useState<SlideData[]>(() =>
    heroSlides.map(staticToSlide)
  );
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

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
        if (mounted) {
          setIsLoading(false);
        }
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

  const getGradientClass = useCallback((color: string) => {
    const gradients = {
      cyan: 'bg-gradient-primary',
      magenta: 'bg-gradient-secondary',
      yellow: 'bg-gradient-accent',
      rainbow: 'bg-gradient-rainbow',
    };
    return gradients[color as keyof typeof gradients] || gradients.cyan;
  }, []);

  const getTextClass = useCallback((color: string) => {
    const textColors = {
      cyan: 'text-cyan',
      magenta: 'text-magenta',
      yellow: 'text-yellow',
      rainbow: 'text-gradient',
    };
    return textColors[color as keyof typeof textColors] || textColors.cyan;
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
    <section className="w-full px-3 sm:px-4 md:px-6 lg:px-8 mt-3 sm:mt-4 mb-4 sm:mb-6">
      <div className="max-w-7xl mx-auto">
        <div
          className="relative overflow-hidden h-[200px] sm:h-[260px] md:h-[320px] lg:h-[380px] rounded-xl sm:rounded-2xl"
        >
      {/* Slides Container */}
      <div className="relative h-full">
        {slides.map((slide, index) => {
          const isActive = index === currentSlide;
          const gradientClass = getGradientClass(slide.accentColor);
          const textClass = getTextClass(slide.accentColor);

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
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${slide.backgroundImage})`,
                  transform: isActive ? 'scale(1)' : 'scale(1.1)',
                  transition: 'transform 1000ms ease-out',
                }}
              />

              {/* Overlay - más oscuro en móvil para mejor legibilidad */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 sm:from-black/70 via-black/50 sm:via-black/40 to-black/30 sm:to-transparent" />

              {/* Content - Padding responsive */}
              <div className="relative z-10 h-full flex items-center py-4 sm:py-6 md:py-8">
                <div className="container mx-auto px-4 sm:px-6">
                  <div className="max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl">
                    {/* Subtitle - Responsive */}
                    <div
                      className="transform transition-all duration-1000"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'translateY(0)' : 'translateY(2rem)',
                        transitionDelay: '200ms',
                      }}
                    >
                      <span className="inline-block px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm border border-white/30 text-white mb-2 sm:mb-4">
                        {slide.subtitle}
                      </span>
                    </div>

                    {/* Title - Responsive font size */}
                    <h1
                      className="font-black mb-1 sm:mb-2 md:mb-3 leading-tight text-white drop-shadow-2xl transform transition-all duration-1000 text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'translateY(0)' : 'translateY(3rem)',
                        transitionDelay: '400ms',
                      }}
                    >
                      {slide.title.split(' ').map((word, i) => {
                        const isLastWord = i === slide.title.split(' ').length - 1;
                        return (
                          <span
                            key={i}
                            className={`inline-block mr-1.5 sm:mr-2 md:mr-3 ${isLastWord ? textClass : ''}`}
                          >
                            {word}
                          </span>
                        );
                      })}
                    </h1>

                    {/* Description - Ocultar en móviles muy pequeños */}
                    <p
                      className="text-white/90 mb-2 sm:mb-3 md:mb-4 leading-relaxed transform transition-all duration-1000 text-xs sm:text-sm md:text-sm lg:text-base max-w-[280px] sm:max-w-md md:max-w-lg line-clamp-2 md:line-clamp-2"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'translateY(0)' : 'translateY(2rem)',
                        transitionDelay: '600ms',
                      }}
                    >
                      {slide.description}
                    </p>

                    {/* Call to Actions - Responsive */}
                    <div
                      className="flex flex-row gap-2 sm:gap-3 transform transition-all duration-1000"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'translateY(0)' : 'translateY(2rem)',
                        transitionDelay: '800ms',
                      }}
                    >
                      {slide.ctaPrimary && (
                        <button
                          onClick={() => handleCtaClick(slide.ctaPrimaryUrl)}
                          className={`px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 text-white text-xs sm:text-sm font-bold rounded-lg ${gradientClass} hover:scale-105 active:scale-95 transform transition-all shadow-lg hover:shadow-2xl touch-manipulation`}
                        >
                          {slide.ctaPrimary}
                        </button>
                      )}
                      {slide.ctaSecondary && (
                        <button
                          onClick={() => handleCtaClick(slide.ctaSecondaryUrl)}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-2.5 text-white text-xs sm:text-sm font-bold rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white hover:text-gray-800 transition-all transform hover:scale-105 active:scale-95 touch-manipulation"
                        >
                          {slide.ctaSecondary}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Controls - Responsive */}
      <div className="absolute bottom-3 sm:bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 z-30">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          {/* Dots - Tamaño responsive */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 touch-manipulation ${
                  index === currentSlide ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
