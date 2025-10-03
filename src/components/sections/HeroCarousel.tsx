import { useState, useEffect, useCallback } from 'react';

interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  ctaPrimary: string;
  ctaSecondary: string;
  backgroundImage: string;
  accentColor: 'cyan' | 'magenta' | 'yellow' | 'rainbow';
}

// Interfaz para partículas flotantes
interface FloatingParticle {
  id: number;
  left: number;
  top: number;
  delay: number;
  duration: number;
}

const HeroCarousel: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  
  // ✅ Estado para partículas flotantes - se inicializa solo en el cliente
  const [floatingParticles, setFloatingParticles] = useState<FloatingParticle[]>([]);
  const [isClient, setIsClient] = useState(false);

  // ✅ Inicializar partículas flotantes solo en el cliente
  useEffect(() => {
    setIsClient(true);
    
    // Generar partículas flotantes de forma consistente
    const particles: FloatingParticle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2
    }));
    
    setFloatingParticles(particles);
  }, []);

  // Datos de ejemplo para los slides - reemplaza con tus datos reales
  const slides: HeroSlide[] = [
    {
      id: 1,
      title: "Tecnología del Futuro",
      subtitle: "Nueva Colección 2025",
      description: "Descubre los productos más innovadores con diseño futurista y calidad premium",
      ctaPrimary: "Explorar Ahora",
      ctaSecondary: "Ver Catálogo",
      backgroundImage: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1920&h=1080&fit=crop",
      accentColor: 'cyan'
    },
    {
      id: 2,
      title: "Estilo Único",
      subtitle: "Edición Limitada",
      description: "Productos exclusivos que combinan elegancia, funcionalidad y diseño vanguardista",
      ctaPrimary: "Comprar Ya",
      ctaSecondary: "Más Info",
      backgroundImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop",
      accentColor: 'magenta'
    },
    {
      id: 3,
      title: "Ofertas Increíbles",
      subtitle: "Hasta 70% de Descuento",
      description: "No te pierdas nuestras ofertas especiales en los mejores productos seleccionados",
      ctaPrimary: "Ver Ofertas",
      ctaSecondary: "Suscribirse",
      backgroundImage: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1920&h=1080&fit=crop",
      accentColor: 'yellow'
    },
    {
      id: 4,
      title: "Experiencia Premium",
      subtitle: "Calidad Garantizada",
      description: "Productos premium con la mejor calidad, diseño excepcional y servicio al cliente 24/7",
      ctaPrimary: "Descubrir",
      ctaSecondary: "Contactar",
      backgroundImage: "https://images.unsplash.com/photo-1560472355-536de3962603?w=1920&h=1080&fit=crop",
      accentColor: 'rainbow'
    }
  ];

  const nextSlide = useCallback(() => {
    setSlideDirection('next');
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setSlideDirection('prev');
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setSlideDirection(index > currentSlide ? 'next' : 'prev');
    setCurrentSlide(index);
  };

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 5000); // Cambia cada 5 segundos

    return () => clearInterval(interval);
  }, [nextSlide, isAutoPlaying]);

  const getAccentClasses = (color: string) => {
    const classes = {
      cyan: {
        gradient: 'bg-gradient-primary',
        text: 'text-cyan',
        shadow: 'shadow-cyan',
        border: 'border-cyan-500'
      },
      magenta: {
        gradient: 'bg-gradient-secondary',
        text: 'text-magenta',
        shadow: 'shadow-magenta',
        border: 'border-magenta-500'
      },
      yellow: {
        gradient: 'bg-gradient-accent',
        text: 'text-yellow',
        shadow: 'shadow-yellow',
        border: 'border-yellow-500'
      },
      rainbow: {
        gradient: 'bg-gradient-rainbow',
        text: 'text-gradient',
        shadow: 'shadow-lg',
        border: 'border-purple-500'
      }
    };
    return classes[color as keyof typeof classes] || classes.cyan;
  };

  return (
    <section className="hero-carousel relative h-screen overflow-hidden">
      {/* Partículas flotantes de fondo - Solo se renderiza en el cliente */}
      {isClient && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {floatingParticles.map((particle) => (
            <div
              key={particle.id}
              className="absolute w-2 h-2 rounded-full opacity-30 animate-float"
              style={{
                background: `linear-gradient(135deg, var(--color-cyan-500), var(--color-magenta-500))`,
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Slides Container */}
      <div className="relative h-full">
        {slides.map((slide, index) => {
          const accentClasses = getAccentClasses(slide.accentColor);
          const isActive = index === currentSlide;
          const isNext = index === (currentSlide + 1) % slides.length;
          const isPrev = index === (currentSlide - 1 + slides.length) % slides.length;

          return (
            <div
              key={slide.id}
              className={`
                absolute inset-0 transition-all duration-1000 ease-in-out
                ${isActive 
                  ? 'opacity-100 translate-x-0 z-20' 
                  : isNext 
                    ? 'opacity-0 translate-x-full z-10'
                    : isPrev
                      ? 'opacity-0 -translate-x-full z-10'
                      : 'opacity-0 translate-x-full z-0'
                }
              `}
            >
              {/* Background Image con Parallax */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out"
                style={{
                  backgroundImage: `url(${slide.backgroundImage})`,
                  transform: isActive ? 'scale(1)' : 'scale(1.1)'
                }}
              />
              
              {/* Overlay con gradiente */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
              
              {/* Overlay de color accent */}
              <div 
                className={`absolute inset-0 mix-blend-multiply opacity-20`}
                style={{
                  background: slide.accentColor === 'rainbow' 
                    ? 'linear-gradient(135deg, #00d7fa, #f000f0, #fff000)'
                    : slide.accentColor === 'cyan' 
                      ? '#00d7fa'
                      : slide.accentColor === 'magenta'
                        ? '#f000f0'
                        : '#fff000'
                }}
              />

              {/* Contenido del slide */}
              <div className="relative z-10 h-full flex items-center">
                <div className="container mx-auto px-6">
                  <div className="max-w-4xl">
                    {/* Subtitle con animación */}
                    <div 
                      className={`
                        transform transition-all duration-1000 delay-200
                        ${isActive 
                          ? 'translate-y-0 opacity-100' 
                          : 'translate-y-8 opacity-0'
                        }
                      `}
                    >
                      <span className={`
                        inline-block px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider
                        bg-white/20 backdrop-blur-sm border border-white/30 text-white mb-6
                      `}>
                        {slide.subtitle}
                      </span>
                    </div>

                    {/* Title con animación */}
                    <h1 
                      className={`
                        text-6xl md:text-8xl font-black mb-8 leading-tight
                        transform transition-all duration-1000 delay-400
                        ${isActive 
                          ? 'translate-y-0 opacity-100' 
                          : 'translate-y-12 opacity-0'
                        }
                      `}
                    >
                      <span className="text-white drop-shadow-2xl">
                        {slide.title.split(' ').map((word, i) => (
                          <span key={i} className="inline-block mr-4">
                            {i === slide.title.split(' ').length - 1 ? (
                              <span className={slide.accentColor === 'rainbow' ? 'text-gradient' : `text-${slide.accentColor}`}>
                                {word}
                              </span>
                            ) : (
                              word
                            )}
                          </span>
                        ))}
                      </span>
                    </h1>

                    {/* Description con animación */}
                    <p 
                      className={`
                        text-xl md:text-2xl text-white/90 mb-10 max-w-2xl leading-relaxed
                        transform transition-all duration-1000 delay-600
                        ${isActive 
                          ? 'translate-y-0 opacity-100' 
                          : 'translate-y-8 opacity-0'
                        }
                      `}
                    >
                      {slide.description}
                    </p>

                    {/* Call to Actions con animación */}
                    <div 
                      className={`
                        flex flex-col sm:flex-row gap-6
                        transform transition-all duration-1000 delay-800
                        ${isActive 
                          ? 'translate-y-0 opacity-100' 
                          : 'translate-y-8 opacity-0'
                        }
                      `}
                    >
                      <button className={`
                        btn btn-lg px-8 py-4 text-white font-bold relative overflow-hidden
                        ${accentClasses.gradient} ${accentClasses.shadow}
                        transform transition-all hover:scale-105 hover:-translate-y-1
                        group
                      `}>
                        <span className="relative z-10">{slide.ctaPrimary}</span>
                        <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                      </button>

                      <button className={`
                        btn btn-lg px-8 py-4 text-white font-bold relative overflow-hidden
                        bg-white/20 backdrop-blur-sm border-2 border-white/30
                        hover:bg-white hover:text-gray-800 transition-all
                        transform hover:scale-105 hover:-translate-y-1
                      `}>
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
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30">
        <div className="flex items-center gap-4">
          {/* Dots Indicator */}
          <div className="flex items-center gap-3">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`
                  w-3 h-3 rounded-full transition-all duration-300
                  ${index === currentSlide 
                    ? 'bg-white scale-125' 
                    : 'bg-white/50 hover:bg-white/80'
                  }
                `}
              />
            ))}
          </div>

          {/* Play/Pause Button */}
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="ml-4 p-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 text-white hover:bg-white/30 transition-all"
          >
            {isAutoPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Arrow Navigation */}
      <button
        onClick={prevSlide}
        className="absolute left-6 top-1/2 transform -translate-y-1/2 z-30 p-3 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 text-white hover:bg-white/30 transition-all hover:scale-110"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-6 top-1/2 transform -translate-y-1/2 z-30 p-3 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 text-white hover:bg-white/30 transition-all hover:scale-110"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 right-8 z-30 flex flex-col items-center text-white/70">
        <span className="text-sm font-medium mb-2 rotate-90 origin-center transform">Scroll</span>
        <div className="w-px h-12 bg-white/30 relative overflow-hidden">
          <div className="absolute w-full h-full bg-gradient-to-b from-transparent to-white animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;