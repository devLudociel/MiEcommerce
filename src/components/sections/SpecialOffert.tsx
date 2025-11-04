import { useState, useEffect, useCallback, useMemo } from 'react';
import { addToCart } from '../../store/cartStore';
import { FALLBACK_IMG_400x300 } from '../../lib/placeholders';
import { loadSpecialOffers } from '../../lib/specialOffersMapper';

interface SpecialOffer {
  id: string | number;
  title: string;
  description: string;
  originalPrice: number;
  salePrice: number;
  discount: number;
  image: string;
  endDate: Date;
  stock: number;
  maxStock: number;
  isFlashSale: boolean;
  category: string;
  featured: boolean;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface SpecialOffersProps {
  title?: string;
  subtitle?: string;
  offers?: SpecialOffer[];
}

// Interfaz para elementos flotantes
interface FloatingElement {
  id: number;
  left: number;
  top: number;
  delay: number;
  duration: number;
  colorClass: string;
}

const SpecialOffers: React.FC<SpecialOffersProps> = ({
  title = 'Ofertas Especiales',
  subtitle = 'Aprovecha estos descuentos increíbles antes de que se agoten',
}) => {
  const [hoveredOffer, setHoveredOffer] = useState<string | number | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ [key: string | number]: TimeLeft }>({});
  const [currentFeatured, setCurrentFeatured] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // 🎯 Estado para ofertas especiales cargadas desde Firebase
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);

  // ✅ Estado para elementos flotantes - se inicializa solo en el cliente
  const [floatingElements, setFloatingElements] = useState<FloatingElement[]>([]);
  const [isClient, setIsClient] = useState(false);

  // 🔄 Estado para forzar actualización del filtro de ofertas expiradas
  const [currentTime, setCurrentTime] = useState(Date.now());

  // ✅ Inicializar elementos flotantes solo en el cliente
  useEffect(() => {
    setIsClient(true);

    // Generar elementos flotantes de forma consistente
    const elements: FloatingElement[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2,
      colorClass:
        i % 3 === 0
          ? 'from-cyan-500 to-cyan-700'
          : i % 3 === 1
            ? 'from-magenta-500 to-magenta-700'
            : 'from-yellow-500 to-yellow-700',
    }));

    setFloatingElements(elements);
  }, []);

  // 🎯 Cargar ofertas especiales desde Firebase
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoadingOffers(true);
        const data = await loadSpecialOffers();
        setOffers(data);
      } catch (error) {
        console.error('Error cargando ofertas:', error);
        setOffers([]); // Si falla, mostrar array vacío
      } finally {
        setLoadingOffers(false);
      }
    };

    fetchOffers();
  }, []);

  // Ofertas de respaldo en caso de que no haya ninguna en Firebase
  const fallbackOffers: SpecialOffer[] = useMemo(
    () => [
      {
        id: 1,
        title: 'iPhone 15 Pro Max',
        description: 'El smartphone más avanzado con cámara profesional y chip A17 Pro',
        originalPrice: 1199.99,
        salePrice: 899.99,
        discount: 25,
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&h=500&fit=crop',
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 días
        stock: 3,
        maxStock: 50,
        isFlashSale: true,
        category: 'Tecnología',
        featured: true,
        urgencyLevel: 'critical',
      },
      {
        id: 2,
        title: 'MacBook Air M3',
        description: 'Portátil ultraligero con el nuevo chip M3 para máximo rendimiento',
        originalPrice: 1299.99,
        salePrice: 999.99,
        discount: 23,
        image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&h=500&fit=crop',
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 días
        stock: 12,
        maxStock: 30,
        isFlashSale: false,
        category: 'Tecnología',
        featured: true,
        urgencyLevel: 'medium',
      },
      {
        id: 3,
        title: 'Nike Air Jordan Retro',
        description: 'Zapatillas icónicas con diseño clásico y comodidad premium',
        originalPrice: 179.99,
        salePrice: 119.99,
        discount: 33,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop',
        endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 día
        stock: 7,
        maxStock: 25,
        isFlashSale: true,
        category: 'Moda',
        featured: false,
        urgencyLevel: 'high',
      },
      {
        id: 4,
        title: 'Sony WH-1000XM5',
        description: 'Auriculares premium con cancelación de ruido líder en la industria',
        originalPrice: 399.99,
        salePrice: 279.99,
        discount: 30,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
        endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 días
        stock: 18,
        maxStock: 40,
        isFlashSale: false,
        category: 'Audio',
        featured: false,
        urgencyLevel: 'low',
      },
      {
        id: 5,
        title: 'Canon EOS R8',
        description: 'Cámara mirrorless profesional con video 4K y estabilización',
        originalPrice: 1499.99,
        salePrice: 1199.99,
        discount: 20,
        image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=500&h=500&fit=crop',
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        stock: 5,
        maxStock: 15,
        isFlashSale: false,
        category: 'Fotografía',
        featured: true,
        urgencyLevel: 'high',
      },
      {
        id: 6,
        title: 'Gaming Setup RGB',
        description: 'Kit completo de gaming con teclado, mouse y auriculares RGB',
        originalPrice: 299.99,
        salePrice: 199.99,
        discount: 33,
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&h=500&fit=crop',
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 días
        stock: 15,
        maxStock: 50,
        isFlashSale: true,
        category: 'Gaming',
        featured: false,
        urgencyLevel: 'medium',
      },
    ],
    []
  );

  // Usar ofertas de Firebase si están disponibles, sino usar ofertas de respaldo
  // IMPORTANT: Filter out expired offers (recalculates every second via currentTime)
  const displayOffers = useMemo(() => {
    const availableOffers = offers.length > 0 ? offers : fallbackOffers;

    // Filter out offers that have already expired
    return availableOffers.filter((offer) => {
      const endTime = offer.endDate.getTime();
      return endTime > currentTime;
    });
  }, [offers, fallbackOffers, currentTime]);

  const featuredOffers = useMemo(
    () => displayOffers.filter((offer) => offer.featured),
    [displayOffers]
  );

  // Countdown timer logic (DEBE estar antes de cualquier return condicional)
  const calculateTimeLeft = useCallback((endDate: Date): TimeLeft => {
    const difference = endDate.getTime() - new Date().getTime();

    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }, []);

  // Update countdown every second AND update current time to refresh expired offers filter
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setCurrentTime(now); // Update current time to trigger filter recalculation

      const newTimeLeft: { [key: string | number]: TimeLeft } = {};
      displayOffers.forEach((offer) => {
        newTimeLeft[offer.id] = calculateTimeLeft(offer.endDate);
      });
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [displayOffers.length, calculateTimeLeft, displayOffers]);

  // Auto-rotate featured offers
  useEffect(() => {
    if (!autoPlay || featuredOffers.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentFeatured((prev) => (prev + 1) % featuredOffers.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [featuredOffers.length, autoPlay]);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(Number(n) || 0);

  const getUrgencyClasses = (urgencyLevel: string, stock: number, maxStock: number) => {
    const stockPercentage = (stock / maxStock) * 100;

    if (urgencyLevel === 'critical' || stockPercentage < 10) {
      return {
        border: 'border-red-500',
        glow: 'shadow-red-500/50',
        pulse: 'animate-pulse',
        bg: 'from-red-500 to-red-600',
      };
    } else if (urgencyLevel === 'high' || stockPercentage < 25) {
      return {
        border: 'border-orange-500',
        glow: 'shadow-orange-500/30',
        pulse: '',
        bg: 'from-orange-500 to-orange-600',
      };
    } else if (urgencyLevel === 'medium' || stockPercentage < 50) {
      return {
        border: 'border-yellow-500',
        glow: 'shadow-yellow-500/30',
        pulse: '',
        bg: 'from-yellow-500 to-yellow-600',
      };
    }

    return {
      border: 'border-green-500',
      glow: 'shadow-green-500/30',
      pulse: '',
      bg: 'from-green-500 to-green-600',
    };
  };

  const formatTime = (time: TimeLeft) => {
    return {
      days: time.days.toString().padStart(2, '0'),
      hours: time.hours.toString().padStart(2, '0'),
      minutes: time.minutes.toString().padStart(2, '0'),
      seconds: time.seconds.toString().padStart(2, '0'),
    };
  };

  // 🔵 Renderizado condicional: Loading state
  if (loadingOffers) {
    return (
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-600 text-lg">Cargando ofertas especiales...</p>
          </div>
        </div>
      </section>
    );
  }

  // 🟡 Renderizado condicional: Empty state
  if (displayOffers.length === 0) {
    return (
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
              🎯 Ofertas Especiales
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Actualmente no hay ofertas especiales disponibles.
            </p>
            <p className="text-gray-500">
              ¡Vuelve pronto para ver nuestras próximas ofertas increíbles!
            </p>
          </div>
        </div>
      </section>
    );
  }

  // 🟢 Renderizado principal con ofertas
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Animated Background (muy sutil) - Solo se renderiza en el cliente */}
      {isClient && (
        <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
          {/* Lightning Effects */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 animate-pulse" />
          <div
            className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-magenta-500 to-transparent opacity-50 animate-pulse"
            style={{ animationDelay: '1s' }}
          />

          {/* Floating Elements - ✅ Ahora sin problemas de hidratación */}
          {floatingElements.map((element) => (
            <div
              key={element.id}
              className="absolute animate-float opacity-20"
              style={{
                left: `${element.left}%`,
                top: `${element.top}%`,
                animationDelay: `${element.delay}s`,
                animationDuration: `${element.duration}s`,
              }}
            >
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${element.colorClass}`} />
            </div>
          ))}
        </div>
      )}

      <div className="container mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6">
            <span className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-rainbow text-white font-bold uppercase tracking-wider rounded-full animate-pulse">
              🔥 Ofertas Limitadas
            </span>
          </div>

          <h2 className="text-5xl md:text-7xl font-black text-gray-800 mb-8">
            <span className="text-gradient-rainbow">{title}</span>
          </h2>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">{subtitle}</p>
        </div>

        {/* Featured Deal Carousel */}
        <div className="mb-20">
          <h3 className="text-3xl font-bold text-gray-800 text-center mb-12">
            🌟 Oferta Destacada del Momento
          </h3>

          <div
            className="relative max-w-6xl mx-auto"
            onMouseEnter={() => setAutoPlay(false)}
            onMouseLeave={() => setAutoPlay(true)}
          >
            {featuredOffers.map((offer, index) => {
              const isActive = index === currentFeatured;
              const urgencyClasses = getUrgencyClasses(
                offer.urgencyLevel,
                offer.stock,
                offer.maxStock
              );
              const offerTimeLeft = timeLeft[offer.id] || {
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0,
              };
              const formattedTime = formatTime(offerTimeLeft);

              return (
                <div
                  key={offer.id}
                  className={`
                    absolute inset-0 transition-all duration-1000
                    ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
                  `}
                >
                  <div
                    className={`
                    bg-white rounded-3xl overflow-hidden
                    border-4 ${urgencyClasses.border} ${urgencyClasses.glow} shadow-2xl
                    ${urgencyClasses.pulse}
                  `}
                  >
                    <div className="grid md:grid-cols-2 gap-0">
                      {/* Image Section */}
                      <div className="relative h-80 md:h-full overflow-hidden">
                        <img
                          src={offer.image || FALLBACK_IMG_400x300}
                          alt={offer.title}
                          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            img.onerror = null;
                            img.src = FALLBACK_IMG_400x300;
                          }}
                        />

                        {/* Flash Sale Badge */}
                        {offer.isFlashSale && (
                          <div className="absolute top-4 left-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full animate-bounce">
                              ⚡ Flash Sale
                            </div>
                          </div>
                        )}

                        {/* Discount Badge */}
                        <div className="absolute top-4 right-4">
                          <div className="relative">
                            <div
                              className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg animate-spin"
                              style={{ animationDuration: '3s' }}
                            >
                              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                                <span className="text-xs font-black text-gray-800">
                                  -{offer.discount}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-8 flex flex-col justify-center">
                        <div className="mb-4">
                          <span className="text-cyan-400 text-sm font-bold uppercase tracking-wider">
                            {offer.category}
                          </span>
                        </div>

                        <h3 className="text-3xl md:text-4xl font-black text-gray-800 mb-4">
                          {offer.title}
                        </h3>

                        <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                          {offer.description}
                        </p>

                        {/* Pricing */}
                        <div className="flex items-center gap-4 mb-6">
                          <span className="text-4xl font-black text-cyan-400">
                            {formatCurrency(offer.salePrice)}
                          </span>
                          <span className="text-xl text-gray-400 line-through">
                            {formatCurrency(offer.originalPrice)}
                          </span>
                          <span className="px-3 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-bold rounded-full">
                            Ahorra {formatCurrency(offer.originalPrice - offer.salePrice)}
                          </span>
                        </div>

                        {/* Stock Progress */}
                        <div className="mb-6">
                          <div className="flex justify-between text-sm text-gray-700 mb-2">
                            <span>Stock disponible</span>
                            <span className={offer.stock < 10 ? 'text-red-400 font-bold' : ''}>
                              {offer.stock} unidades
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${urgencyClasses.bg} transition-all duration-1000 rounded-full relative`}
                              style={{ width: `${(offer.stock / offer.maxStock) * 100}%` }}
                            >
                              <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            </div>
                          </div>
                        </div>

                        {/* Countdown Timer */}
                        <div className="mb-8">
                          <p className="text-gray-700 text-sm mb-3 font-medium">
                            ⏰ Tiempo restante:
                          </p>
                          <div className="grid grid-cols-4 gap-3">
                            {[
                              { label: 'Días', value: formattedTime.days },
                              { label: 'Hrs', value: formattedTime.hours },
                              { label: 'Min', value: formattedTime.minutes },
                              { label: 'Seg', value: formattedTime.seconds },
                            ].map((item, i) => (
                              <div key={item.label} className="text-center">
                                <div
                                  className={`
                                  p-3 bg-gradient-to-b from-gray-700 to-gray-800 rounded-xl border-2
                                  ${urgencyClasses.border} ${urgencyClasses.glow}
                                  ${i === 3 ? 'animate-pulse' : ''}
                                `}
                                >
                                  <div className="text-2xl font-black text-white">{item.value}</div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 font-medium">
                                  {item.label}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* CTA Button */}
                        <button
                          className={`
                          w-full py-4 px-8 rounded-xl font-black text-lg text-white
                          bg-gradient-rainbow shadow-lg hover:shadow-2xl
                          transform hover:scale-105 hover:-translate-y-2 transition-all
                          relative overflow-hidden group
                        `}
                        >
                          <span className="relative z-10">🛒 Comprar Ahora</span>
                          <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Carousel Indicators */}
            <div className="flex justify-center gap-3 mt-8">
              {featuredOffers.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFeatured(index)}
                  aria-label={`Ver oferta destacada ${index + 1}`}
                  className={`
                    w-3 h-3 rounded-full transition-all duration-300
                    ${
                      index === currentFeatured
                        ? 'bg-gradient-rainbow scale-125'
                        : 'bg-gray-600 hover:bg-gray-500'
                    }
                  `}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Regular Offers Grid */}
        <div>
          <h3 className="text-3xl font-bold text-gray-800 text-center mb-12">
            ⚡ Más Ofertas Increíbles
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayOffers
              .filter((offer) => !offer.featured)
              .map((offer, index) => {
                const urgencyClasses = getUrgencyClasses(
                  offer.urgencyLevel,
                  offer.stock,
                  offer.maxStock
                );
                const offerTimeLeft = timeLeft[offer.id] || {
                  days: 0,
                  hours: 0,
                  minutes: 0,
                  seconds: 0,
                };
                const formattedTime = formatTime(offerTimeLeft);
                const isHovered = hoveredOffer === offer.id;

                return (
                  <div
                    key={offer.id}
                    className={`
                    group relative bg-white rounded-2xl overflow-hidden
                    border-2 ${urgencyClasses.border} ${urgencyClasses.glow}
                    transform transition-all duration-500 hover:scale-105 hover:-translate-y-2
                    ${urgencyClasses.pulse}
                  `}
                    onMouseEnter={() => setHoveredOffer(offer.id)}
                    onMouseLeave={() => setHoveredOffer(null)}
                  >
                    {/* Flash Sale Badge */}
                    {offer.isFlashSale && (
                      <div className="absolute top-3 left-3 z-20">
                        <span className="px-3 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full animate-bounce">
                          ⚡ FLASH
                        </span>
                      </div>
                    )}

                    {/* Product Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={offer.image || FALLBACK_IMG_400x300}
                        alt={offer.title}
                        className={`
                        w-full h-full object-cover transition-all duration-700
                        ${isHovered ? 'scale-110 rotate-1' : 'scale-100'}
                      `}
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          img.onerror = null;
                          img.src = FALLBACK_IMG_400x300;
                        }}
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                      {/* Discount Badge */}
                      <div className="absolute top-3 right-3">
                        <div
                          className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-gray-800 text-xs font-black animate-spin"
                          style={{ animationDuration: '4s' }}
                        >
                          -{offer.discount}%
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider">
                        {offer.category}
                      </span>

                      <h4 className="text-lg font-bold text-gray-800 mt-2 mb-3 group-hover:text-cyan-600 transition-colors">
                        {offer.title}
                      </h4>

                      {/* Mini Countdown */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex gap-1">
                          {[
                            formattedTime.days,
                            formattedTime.hours,
                            formattedTime.minutes,
                            formattedTime.seconds,
                          ].map((time, i) => (
                            <div key={i} className="flex items-center">
                              <div
                                className={`
                              px-2 py-1 bg-gradient-to-b from-gray-100 to-white rounded text-gray-800 text-sm font-bold
                              border ${urgencyClasses.border}
                            `}
                              >
                                {time}
                              </div>
                              {i < 3 && <span className="text-gray-500 mx-1">:</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-xl font-black text-cyan-400">
                          {formatCurrency(offer.salePrice)}
                        </span>
                        <span className="text-sm text-gray-400 line-through">
                          {formatCurrency(offer.originalPrice)}
                        </span>
                      </div>

                      {/* Stock Alert */}
                      <div className="mb-4">
                        <div
                          className={`
                        text-xs font-bold px-3 py-1 rounded-full inline-block
                        ${
                          offer.stock < 10
                            ? 'bg-red-500/20 text-red-400 animate-pulse'
                            : offer.stock < 20
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-green-500/20 text-green-400'
                        }
                      `}
                        >
                          {offer.stock < 10
                            ? `¡Solo quedan ${offer.stock}!`
                            : offer.stock < 20
                              ? `Últimas ${offer.stock} unidades`
                              : `${offer.stock} disponibles`}
                        </div>
                      </div>

                      {/* Add to Cart */}
                      <button
                        onClick={() => {
                          addToCart({
                            id: String(offer.id),
                            name: offer.title,
                            price: offer.salePrice,
                            quantity: 1,
                            image: offer.image,
                          });
                        }}
                        className={`
                      w-full py-3 px-6 rounded-xl font-bold text-white
                      bg-gradient-to-r ${urgencyClasses.bg} hover:shadow-lg
                      transform hover:scale-105 transition-all
                      relative overflow-hidden group
                    `}
                      >
                        <span className="relative z-10">Agregar al Carrito</span>
                        <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Emergency CTA */}
        <div className="text-center mt-16">
          <div className="inline-block p-8 bg-gradient-to-r from-red-900/50 to-red-800/50 backdrop-blur-sm rounded-2xl border-2 border-red-500/50 shadow-2xl animate-pulse">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-2xl animate-bounce">🚨</span>
              <h3 className="text-2xl font-black text-white">¡Últimas Horas!</h3>
              <span className="text-2xl animate-bounce" style={{ animationDelay: '0.5s' }}>
                🚨
              </span>
            </div>
            <p className="text-red-200 mb-6 max-w-md">
              Estas ofertas terminan pronto. No te quedes sin los productos que realmente quieres.
            </p>
            <button className="btn btn-lg bg-gradient-rainbow text-white px-12 py-4 shadow-xl hover:shadow-2xl transform hover:scale-110 font-black">
              🔥 Ver Todas las Ofertas
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpecialOffers;
