import { useState, useEffect, memo, useCallback } from 'react';
import { heroSlides, type HeroSlide } from '../../data/heroSlides';
import { getActiveBanners, type HeroBanner } from '../../lib/heroBanners';

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

function staticToSlide(slide: HeroSlide): SlideData {
  return {
    id: slide.id,
    title: slide.title,
    subtitle: slide.subtitle,
    description: slide.description,
    ctaPrimary: slide.ctaPrimary,
    ctaPrimaryUrl: '/productos',
    ctaSecondary: slide.ctaSecondary,
    ctaSecondaryUrl: '/como-personalizar',
    backgroundImage: slide.backgroundImage,
    accentColor: slide.accentColor,
  };
}

// Tarjetas decorativas del lado derecho
const PRODUCT_CARDS = [
  { label: 'Camiseta personalizada', tag: 'TEXTIL · DTF' },
  { label: 'Grabado láser', tag: 'MADERA · METACRILATO' },
  { label: 'Taza sublimada', tag: 'SUBLIMACIÓN · 11oz' },
];

const HeroCarousel = memo(() => {
  const [slides, setSlides] = useState<SlideData[]>(() => heroSlides.map(staticToSlide));
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadBanners() {
      try {
        const banners = await getActiveBanners();
        if (mounted && banners.length > 0) {
          setSlides(banners.map(bannerToSlide));
        }
      } catch {
        // keep static slides
      }
    }
    loadBanners();
    return () => { mounted = false; };
  }, []);

  // Ciclo automático de texto cada 6s
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setIsTransitioning(false);
      }, 300);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleCtaClick = useCallback((url: string) => {
    if (url) window.location.href = url;
  }, []);

  const slide = slides[currentSlide] || slides[0];
  if (!slide) return null;

  // Usa la imagen del slide actual como fondo de la tarjeta principal
  const cardImages = slides.slice(0, 3).map((s) => s.backgroundImage);

  return (
    <section
      style={{ backgroundColor: '#F5F0E8', fontFamily: "'Montserrat', sans-serif" }}
      className="w-full overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

          {/* ── COLUMNA IZQUIERDA ── */}
          <div className="w-full lg:w-[52%] flex flex-col gap-6">

            {/* Pill badge */}
            <div className="flex">
              <span
                style={{
                  backgroundColor: '#1A1A1A',
                  color: '#fff',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold uppercase"
              >
                <span
                  style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#EC008C', flexShrink: 0 }}
                />
                Taller en La Palma · Envíos a toda Canarias
              </span>
            </div>

            {/* Título mixto serif + italic */}
            <div
              style={{
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'translateY(8px)' : 'translateY(0)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
              }}
            >
              <h1
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: 'clamp(2.6rem, 5.5vw, 4.2rem)',
                  fontWeight: 500,
                  lineHeight: 1.1,
                  color: '#1A1A1A',
                  letterSpacing: '-0.01em',
                }}
              >
                {slide.subtitle && (
                  <span style={{ display: 'block', fontSize: '55%', fontWeight: 400, color: '#555', marginBottom: '0.15em', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif", fontSize: 'clamp(0.7rem, 1.2vw, 0.9rem)' }}>
                    {slide.subtitle}
                  </span>
                )}
                <span style={{ display: 'block' }}>
                  {/* Divide el título: última palabra en itálica */}
                  {(() => {
                    const words = slide.title.trim().split(' ');
                    const italic = words.slice(-2).join(' ');
                    const normal = words.slice(0, -2).join(' ');
                    return (
                      <>
                        {normal && <>{normal} </>}
                        <em style={{ fontStyle: 'italic', color: '#1A1A1A' }}>{italic}</em>
                        <span style={{ color: '#FFF200', marginLeft: 4, display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: '#EC008C', verticalAlign: 'middle' }} />
                      </>
                    );
                  })()}
                </span>
              </h1>
            </div>

            {/* Descripción */}
            <p
              style={{
                color: '#555',
                fontSize: 'clamp(0.95rem, 1.4vw, 1.1rem)',
                lineHeight: 1.7,
                maxWidth: 480,
                opacity: isTransitioning ? 0 : 1,
                transition: 'opacity 0.3s ease',
              }}
            >
              {slide.description}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              {slide.ctaPrimary && (
                <button
                  onClick={() => handleCtaClick(slide.ctaPrimaryUrl)}
                  style={{
                    backgroundColor: '#1A1A1A',
                    color: '#fff',
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    padding: '14px 28px',
                    borderRadius: 50,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background 0.2s, transform 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#EC008C'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A1A1A'; }}
                >
                  {slide.ctaPrimary}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              {slide.ctaSecondary && (
                <button
                  onClick={() => handleCtaClick(slide.ctaSecondaryUrl)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#1A1A1A',
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    padding: '13px 28px',
                    borderRadius: 50,
                    border: '1.5px solid #1A1A1A',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, color 0.2s',
                  }}
                  onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#EC008C'; b.style.color = '#EC008C'; }}
                  onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = '#1A1A1A'; b.style.color = '#1A1A1A'; }}
                >
                  {slide.ctaSecondary}
                </button>
              )}
            </div>

            {/* Stats */}
            <div
              style={{
                borderTop: '1px solid rgba(26,26,26,0.12)',
                paddingTop: '1.25rem',
                marginTop: '0.5rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '2rem',
              }}
            >
              {[
                { value: '+1.200', label: 'Pedidos personalizados' },
                { value: '24–72h', label: 'Entrega en La Palma' },
                { value: '4,9 ★', label: 'Opiniones Google' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 800,
                      fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
                      color: '#EC008C',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      fontWeight: 600,
                      marginTop: 2,
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Dots de slides */}
            {slides.length > 1 && (
              <div style={{ display: 'flex', gap: 6 }}>
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                    style={{
                      width: i === currentSlide ? 24 : 8,
                      height: 8,
                      borderRadius: 50,
                      backgroundColor: i === currentSlide ? '#EC008C' : 'rgba(26,26,26,0.2)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'width 0.3s, background 0.3s',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── COLUMNA DERECHA — imagen principal del banner ── */}
          <div className="w-full lg:w-[46%] relative hidden md:flex items-center justify-center" style={{ minHeight: 420 }}>

            {/* Tarjeta imagen principal */}
            <div style={{
              position: 'relative',
              width: '88%',
              maxWidth: 440,
              aspectRatio: '4/5',
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
              backgroundColor: '#e8ddd0',
            }}>
              {slide.backgroundImage ? (
                <img
                  src={slide.backgroundImage}
                  alt={slide.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    opacity: isTransitioning ? 0.6 : 1,
                    transition: 'opacity 0.3s ease',
                  }}
                />
              ) : (
                /* Placeholder con gradiente de marca cuando no hay imagen */
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #EC008C22 0%, #00AEEF22 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '1.1rem',
                    color: 'rgba(26,26,26,0.3)',
                    textAlign: 'center',
                    padding: '0 2rem',
                  }}>
                    Sube una imagen desde<br/>Admin → Banners
                  </span>
                </div>
              )}

              {/* Overlay degradado abajo */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(to top, rgba(26,26,26,0.65) 0%, transparent 55%)',
                padding: '28px 20px 20px',
              }}>
                <div style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.6rem',
                  color: 'rgba(255,255,255,0.7)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}>
                  Hecho a mano · La Palma
                </div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 500,
                  fontSize: '1.15rem',
                  color: '#fff',
                  lineHeight: 1.3,
                  opacity: isTransitioning ? 0 : 1,
                  transition: 'opacity 0.3s ease',
                }}>
                  {slide.subtitle || slide.title}
                </div>
              </div>

              {/* Badge amarillo superior */}
              <div style={{
                position: 'absolute',
                top: 16,
                left: 16,
                backgroundColor: '#FFF200',
                color: '#1A1A1A',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 800,
                fontSize: '0.6rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '6px 12px',
                borderRadius: 50,
              }}>
                ImprimeArte
              </div>
            </div>

            {/* Tarjeta flotante "Pedido reciente" */}
            <div style={{
              position: 'absolute',
              bottom: '6%',
              right: '2%',
              backgroundColor: '#fff',
              borderRadius: 14,
              padding: '12px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
              minWidth: 190,
              maxWidth: 230,
              zIndex: 10,
            }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.58rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>
                Pedido reciente
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '0.95rem', color: '#1A1A1A', lineHeight: 1.3 }}>
                Taza sublimada · Foto familiar
              </div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.66rem', color: '#888', marginTop: 4 }}>
                Encargado por María, Los Llanos · 12,90 €
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e' }} />
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.6rem', color: '#22c55e', fontWeight: 600 }}>Listo en 48h</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
});

HeroCarousel.displayName = 'HeroCarousel';
export default HeroCarousel;
