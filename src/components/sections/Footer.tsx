import { useState, useEffect } from 'react';

interface FooterLink {
  name: string;
  href: string;
  badge?: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
  color: 'cyan' | 'magenta' | 'yellow' | 'purple';
}

interface SocialLink {
  name: string;
  icon: string;
  href: string;
  color: string;
  followers?: string;
}

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [hoveredSocial, setHoveredSocial] = useState<string | null>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Testimonios que rotan
  const testimonials = [
    {
      text: "La mejor experiencia de compra online que he tenido. Productos increíbles y entrega súper rápida.",
      author: "María González",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face"
    },
    {
      text: "Calidad excepcional y precios competitivos. Mi tienda online favorita sin dudas.",
      author: "Carlos Ruiz",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face"
    },
    {
      text: "Servicio al cliente de primera. Resolvieron todas mis dudas rápidamente. ¡Recomendado!",
      author: "Ana Torres",
      rating: 5,
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face"
    }
  ];

  // Rotar testimonios automáticamente
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  // Secciones del footer
  const footerSections: FooterSection[] = [
    {
      title: "Tienda",
      color: 'cyan',
      links: [
        { name: "Todos los Productos", href: "/productos" },
        { name: "Nuevos Lanzamientos", href: "/nuevos", badge: "NEW" },
        { name: "Ofertas Especiales", href: "/ofertas", badge: "HOT" },
        { name: "Lo Más Vendido", href: "/populares" },
        { name: "Liquidación", href: "/liquidacion", badge: "SALE" },
        { name: "Gift Cards", href: "/gift-cards" }
      ]
    },
    {
      title: "Categorías",
      color: 'magenta',
      links: [
        { name: "Tecnología", href: "/tecnologia" },
        { name: "Moda & Estilo", href: "/moda" },
        { name: "Hogar & Decoración", href: "/hogar" },
        { name: "Deportes & Fitness", href: "/deportes" },
        { name: "Arte & Creatividad", href: "/arte" },
        { name: "Viajes & Aventura", href: "/viajes" }
      ]
    },
    {
      title: "Atención al Cliente",
      color: 'yellow',
      links: [
        { name: "Centro de Ayuda", href: "/ayuda" },
        { name: "Contacto", href: "/contacto" },
        { name: "Envíos y Devoluciones", href: "/envios" },
        { name: "Guía de Tallas", href: "/tallas" },
        { name: "Garantías", href: "/garantias" },
        { name: "FAQ", href: "/faq" }
      ]
    },
    {
      title: "Empresa",
      color: 'purple',
      links: [
        { name: "Sobre Nosotros", href: "/nosotros" },
        { name: "Careers", href: "/careers", badge: "NEW" },
        { name: "Prensa", href: "/prensa" },
        { name: "Sostenibilidad", href: "/sostenibilidad" },
        { name: "Afiliados", href: "/afiliados" },
        { name: "Inversores", href: "/inversores" }
      ]
    }
  ];

  // Redes sociales
  const socialLinks: SocialLink[] = [
    {
      name: "Instagram",
      icon: "📷",
      href: "https://instagram.com",
      color: "#E1306C",
      followers: "2.5M"
    },
    {
      name: "TikTok",
      icon: "🎵",
      href: "https://tiktok.com",
      color: "#000000",
      followers: "1.8M"
    },
    {
      name: "YouTube",
      icon: "📺",
      href: "https://youtube.com",
      color: "#FF0000",
      followers: "950K"
    },
    {
      name: "Twitter",
      icon: "🐦",
      href: "https://twitter.com",
      color: "#1DA1F2",
      followers: "1.2M"
    },
    {
      name: "Facebook",
      icon: "👤",
      href: "https://facebook.com",
      color: "#1877F2",
      followers: "3.1M"
    },
    {
      name: "Pinterest",
      icon: "📌",
      href: "https://pinterest.com",
      color: "#BD081C",
      followers: "800K"
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap = {
      cyan: { 
        text: 'text-cyan-500', 
        bg: 'from-cyan-500 to-cyan-600',
        hover: 'hover:text-cyan-400',
        border: 'border-cyan-500'
      },
      magenta: { 
        text: 'text-magenta-500', 
        bg: 'from-magenta-500 to-magenta-600',
        hover: 'hover:text-magenta-400',
        border: 'border-magenta-500'
      },
      yellow: { 
        text: 'text-yellow-500', 
        bg: 'from-yellow-500 to-yellow-600',
        hover: 'hover:text-yellow-400',
        border: 'border-yellow-500'
      },
      purple: { 
        text: 'text-purple-500', 
        bg: 'from-purple-500 to-purple-600',
        hover: 'hover:text-purple-400',
        border: 'border-purple-500'
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.cyan;
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubscribing(true);
    
    // Simular llamada API
    setTimeout(() => {
      setIsSubscribing(false);
      setIsSubscribed(true);
      setEmail('');
      
      // Reset después de 3 segundos
      setTimeout(() => {
        setIsSubscribed(false);
      }, 3000);
    }, 1500);
  };

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated Grid */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="h-full w-full bg-[radial-gradient(circle,_white_1px,_transparent_1px)] [background-size:50px_50px] animate-pulse" />
        </div>

        {/* Floating Elements */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float opacity-20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 3}s`
            }}
          >
            <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${
              i % 4 === 0 ? 'from-cyan-500 to-cyan-700' :
              i % 4 === 1 ? 'from-magenta-500 to-magenta-700' :
              i % 4 === 2 ? 'from-yellow-500 to-yellow-700' :
              'from-purple-500 to-purple-700'
            }`} />
          </div>
        ))}

        {/* Top Border Effect */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-rainbow animate-pulse" />
      </div>

      <div className="container mx-auto px-6 relative">
        {/* Newsletter Section */}
        <div className="py-16 border-b border-gray-700/50">
          <div className="max-w-4xl mx-auto text-center">
            {/* Newsletter Header */}
            <div className="mb-8">
              <div className="inline-block mb-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-rainbow text-white font-bold uppercase tracking-wider rounded-full animate-pulse">
                  📧 Newsletter VIP
                </span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-black mb-4">
                <span className="text-gradient-rainbow">Ofertas Exclusivas</span>
              </h2>
              
              <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                Sé el primero en conocer nuestras ofertas especiales, nuevos productos y contenido exclusivo
              </p>
            </div>

            {/* Newsletter Form */}
            <form onSubmit={handleSubscribe} className="max-w-md mx-auto mb-8">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border-2 border-gray-600 rounded-2xl text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none transition-all"
                    disabled={isSubscribing || isSubscribed}
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    📧
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isSubscribing || isSubscribed || !email}
                  className={`
                    px-8 py-4 font-bold rounded-2xl transition-all duration-300
                    ${isSubscribed 
                      ? 'bg-green-500 text-white' 
                      : isSubscribing 
                        ? 'bg-gray-500 text-white cursor-not-allowed'
                        : 'bg-gradient-rainbow text-white hover:shadow-xl transform hover:scale-105'
                    }
                    disabled:opacity-50 disabled:transform-none disabled:hover:shadow-none
                  `}
                >
                  {isSubscribing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </div>
                  ) : isSubscribed ? (
                    <div className="flex items-center gap-2">
                      ✅ ¡Suscrito!
                    </div>
                  ) : (
                    'Suscribirse'
                  )}
                </button>
              </div>
            </form>

            {/* Benefits */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Descuentos exclusivos hasta 50%
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Acceso anticipado a ofertas
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Sin spam, te lo prometemos
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial Carousel */}
        <div className="py-12 border-b border-gray-700/50">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-center mb-8">
              💬 Lo que dicen nuestros clientes
            </h3>
            
            <div className="relative h-32 overflow-hidden">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={`
                    absolute inset-0 transition-all duration-1000 ease-in-out
                    ${index === currentTestimonial 
                      ? 'opacity-100 transform translate-x-0' 
                      : index < currentTestimonial
                        ? 'opacity-0 transform -translate-x-full'
                        : 'opacity-0 transform translate-x-full'
                    }
                  `}
                >
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <span key={i} className="text-yellow-400 text-xl">⭐</span>
                      ))}
                    </div>
                    
                    <blockquote className="text-lg text-gray-300 mb-4 italic max-w-2xl mx-auto">
                      "{testimonial.text}"
                    </blockquote>
                    
                    <div className="flex items-center justify-center gap-3">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.author}
                        className="w-12 h-12 rounded-full border-2 border-cyan-500"
                      />
                      <div>
                        <div className="font-semibold text-cyan-400">
                          {testimonial.author}
                        </div>
                        <div className="text-sm text-gray-400">
                          Cliente verificado
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Testimonial Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`
                    w-2 h-2 rounded-full transition-all duration-300
                    ${index === currentTestimonial 
                      ? 'bg-gradient-rainbow w-8' 
                      : 'bg-gray-600 hover:bg-gray-500'
                    }
                  `}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-1">
              <div className="mb-6">
                <a href="/" className="flex items-center gap-3 group">
                  <div className="w-12 h-12 bg-gradient-rainbow rounded-2xl flex items-center justify-center text-white font-black text-xl animate-float">
                    C
                  </div>
                  <div>
                    <h3 className="text-2xl font-black bg-gradient-rainbow bg-clip-text text-transparent">
                      CMYK Store
                    </h3>
                    <p className="text-sm text-gray-400">Premium Shopping</p>
                  </div>
                </a>
              </div>

              <p className="text-gray-400 mb-6 leading-relaxed">
                La tienda online líder en productos premium con la mejor calidad, diseño excepcional y servicio al cliente 24/7.
              </p>

              {/* Trust Badges */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-400">🔒</span>
                  <span className="text-gray-400">Compra 100% Segura</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-blue-400">🚚</span>
                  <span className="text-gray-400">Envío Gratuito +$50</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-purple-400">↩️</span>
                  <span className="text-gray-400">30 días de garantía</span>
                </div>
              </div>
            </div>

            {/* Footer Sections */}
            {footerSections.map((section) => {
              const colorClasses = getColorClasses(section.color);
              
              return (
                <div key={section.title} className="lg:col-span-1">
                  <h4 className={`text-lg font-bold mb-6 ${colorClasses.text} relative`}>
                    {section.title}
                    <div className={`absolute -bottom-2 left-0 w-8 h-0.5 bg-gradient-to-r ${colorClasses.bg}`} />
                  </h4>
                  
                  <ul className="space-y-3">
                    {section.links.map((link) => (
                      <li key={link.name}>
                        <a
                          href={link.href}
                          className={`
                            text-gray-400 ${colorClasses.hover} transition-all duration-300
                            flex items-center gap-2 group text-sm
                          `}
                        >
                          <span className="group-hover:translate-x-1 transition-transform duration-300">
                            {link.name}
                          </span>
                          {link.badge && (
                            <span className={`
                              px-2 py-0.5 text-xs font-bold rounded-full text-white
                              ${link.badge === 'NEW' ? 'bg-green-500' :
                                link.badge === 'HOT' ? 'bg-red-500' :
                                'bg-orange-500'
                              }
                            `}>
                              {link.badge}
                            </span>
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Social Media & Stats */}
        <div className="py-12 border-t border-gray-700/50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Social Links */}
            <div>
              <h4 className="text-xl font-bold mb-6 text-center lg:text-left">
                🌟 Síguenos en nuestras redes
              </h4>
              
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    className="group relative"
                    onMouseEnter={() => setHoveredSocial(social.name)}
                    onMouseLeave={() => setHoveredSocial(null)}
                  >
                    <div 
                      className={`
                        w-16 h-16 rounded-2xl flex flex-col items-center justify-center
                        bg-white/5 backdrop-blur-sm border border-white/10
                        transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-2
                        ${hoveredSocial === social.name ? 'shadow-lg' : ''}
                      `}
                      style={{
                        boxShadow: hoveredSocial === social.name 
                          ? `0 10px 25px -3px ${social.color}40` 
                          : undefined
                      }}
                    >
                      <span className="text-xl mb-1">{social.icon}</span>
                      <span className="text-xs text-gray-400 font-medium">
                        {social.followers}
                      </span>
                    </div>
                    
                    {/* Tooltip */}
                    {hoveredSocial === social.name && (
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-1 rounded-lg text-sm font-medium animate-in fade-in duration-200">
                        {social.name}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="text-center lg:text-right">
              <h4 className="text-xl font-bold mb-6">
                📊 Nuestros números
              </h4>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-black text-gradient-rainbow mb-2">
                    500K+
                  </div>
                  <div className="text-sm text-gray-400">
                    Clientes felices
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-black text-gradient-rainbow mb-2">
                    50K+
                  </div>
                  <div className="text-sm text-gray-400">
                    Productos únicos
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-black text-gradient-rainbow mb-2">
                    99.8%
                  </div>
                  <div className="text-sm text-gray-400">
                    Satisfacción
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-black text-gradient-rainbow mb-2">
                    24/7
                  </div>
                  <div className="text-sm text-gray-400">
                    Soporte premium
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-8 border-t border-gray-700/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <p className="text-gray-400 text-sm">
                © 2025 <span className="text-gradient-rainbow font-semibold">CMYK Store</span>. 
                Todos los derechos reservados. Hecho con 💖 y mucho ☕
              </p>
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <a href="/privacy" className="hover:text-cyan-400 transition-colors">
                Privacidad
              </a>
              <a href="/terms" className="hover:text-cyan-400 transition-colors">
                Términos
              </a>
              <a href="/cookies" className="hover:text-cyan-400 transition-colors">
                Cookies
              </a>
              <a href="/sitemap" className="hover:text-cyan-400 transition-colors">
                Sitemap
              </a>
            </div>

            {/* Payment Methods */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 mr-2">Aceptamos:</span>
              <div className="flex gap-2">
                {['💳', '🏦', '📱', '💰'].map((icon, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-rainbow rounded-2xl text-white shadow-lg hover:shadow-2xl transform hover:scale-110 transition-all duration-300 z-40 animate-bounce"
      >
        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
    </footer>
  );
};

export default Footer;