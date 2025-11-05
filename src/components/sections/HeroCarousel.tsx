import { useState, useEffect, memo, useCallback } from 'react';
import { heroSlides } from '../../data/heroSlides';

// PERFORMANCE: Memoize component to prevent unnecessary re-renders
const HeroCarousel = memo(() => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // PERFORMANCE: Wrap event handlers in useCallback
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, currentSlide, nextSlide]);

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

  return (
    <section
      className="relative overflow-hidden"
      style={{ height: '65vh', minHeight: '500px', maxHeight: '700px' }}
    >
      {/* Slides Container */}
      <div className="relative h-full">
        {heroSlides.map((slide, index) => {
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

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

              {/* Content */}
              <div className="relative z-10 h-full flex items-center py-8">
                <div className="container mx-auto px-6">
                  <div style={{ maxWidth: '48rem' }}>
                    {/* Subtitle */}
                    <div
                      className="transform transition-all duration-1000"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'translateY(0)' : 'translateY(2rem)',
                        transitionDelay: '200ms',
                      }}
                    >
                      <span className="inline-block px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm border border-white/30 text-white mb-4">
                        {slide.subtitle}
                      </span>
                    </div>

                    {/* Title */}
                    <h1
                      className="font-black mb-4 leading-tight text-white drop-shadow-2xl transform transition-all duration-1000"
                      style={{
                        fontSize: 'clamp(2rem, 5vw, 3.5rem)',
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
                            className={`inline-block mr-3 ${isLastWord ? textClass : ''}`}
                          >
                            {word}
                          </span>
                        );
                      })}
                    </h1>

                    {/* Description */}
                    <p
                      className="text-white/90 mb-6 leading-relaxed transform transition-all duration-1000"
                      style={{
                        fontSize: 'clamp(0.875rem, 2vw, 1.125rem)',
                        maxWidth: '36rem',
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'translateY(0)' : 'translateY(2rem)',
                        transitionDelay: '600ms',
                      }}
                    >
                      {slide.description}
                    </p>

                    {/* Call to Actions */}
                    <div
                      className="flex flex-col sm:flex-row gap-4 transform transition-all duration-1000"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive ? 'translateY(0)' : 'translateY(2rem)',
                        transitionDelay: '800ms',
                      }}
                    >
                      <button
                        className={`px-6 py-3 text-white font-bold rounded-xl ${gradientClass} hover:scale-105 transform transition-all shadow-lg hover:shadow-2xl`}
                      >
                        {slide.ctaPrimary}
                      </button>
                      <button className="px-6 py-3 text-white font-bold rounded-xl bg-white/20 backdrop-blur-sm border-2 border-white/30 hover:bg-white hover:text-gray-800 transition-all transform hover:scale-105">
                        {slide.ctaSecondary}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30">
        <div className="flex items-center gap-4">
          {/* Dots */}
          <div className="flex items-center gap-2">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'
                }`}
                type="button"
                aria-label={`Ir a la diapositiva ${index + 1}`}
                aria-current={index === currentSlide ? 'true' : undefined}
                aria-pressed={index === currentSlide}
              />
            ))}
          </div>

          {/* Play/Pause */}
          <button
            onClick={toggleAutoPlay}
            className="ml-4 p-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 text-white hover:bg-white/30 transition-all"
            type="button"
            aria-label={isAutoPlaying ? 'Pausar carrusel' : 'Reproducir carrusel'}
            aria-pressed={!isAutoPlaying}
          >
            {isAutoPlaying ? (
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
              </svg>
            ) : (
              <svg
                className="w-3.5 h-3.5"
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

      {/* Arrow Navigation */}
      <button
        onClick={nextSlide}
        onMouseEnter={pauseAutoPlay}
        onMouseLeave={resumeAutoPlay}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-30 p-2.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 text-white hover:bg-white/30 transition-all hover:scale-110"
        type="button"
        aria-label="Siguiente diapositiva"
      >
        <svg
          className="w-5 h-5"
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
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30 p-2.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 text-white hover:bg-white/30 transition-all hover:scale-110"
        type="button"
        aria-label="Diapositiva anterior"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </section>
  );
});

// Add display name for debugging
HeroCarousel.displayName = 'HeroCarousel';

export default HeroCarousel;
