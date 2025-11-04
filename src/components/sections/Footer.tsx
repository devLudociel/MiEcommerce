import { useState } from 'react';

interface FooterLink {
  name: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const footerSections: FooterSection[] = [
    {
      title: 'Categorías Populares',
      links: [
        { name: 'Productos Gráficos', href: '/categoria/graficos-impresos' },
        { name: 'Textiles Personalizados', href: '/categoria/textiles' },
        { name: 'Sublimación', href: '/categoria/sublimados' },
        { name: 'Corte y Grabado Láser', href: '/categoria/corte-grabado' },
        { name: 'Impresión 3D', href: '/categoria/impresion-3d' },
        { name: 'Papelería Corporativa', href: '/categoria/papeleria' },
      ],
    },
    {
      title: 'Información',
      links: [
        { name: 'Sobre Nosotros', href: '/sobre-nosotros' },
        { name: 'Cómo Personalizar', href: '/como-personalizar' },
        { name: 'Guía de Materiales', href: '/guia-materiales' },
        { name: 'Tiempos de Producción', href: '/tiempos-produccion' },
        { name: 'Galería de Trabajos', href: '/galeria' },
        { name: 'Blog', href: '/blog' },
      ],
    },
    {
      title: 'Ayuda y Soporte',
      links: [
        { name: 'Preguntas Frecuentes', href: '/faq' },
        { name: 'Contacto', href: '/contacto' },
        { name: 'Envíos', href: '/envios' },
        { name: 'Devoluciones', href: '/devoluciones' },
        { name: 'Política de Privacidad', href: '/privacidad' },
        { name: 'Términos y Condiciones', href: '/terminos-condiciones' },
      ],
    },
    {
      title: 'Mi Cuenta',
      links: [
        { name: 'Mis Pedidos', href: '/account/orders' },
        { name: 'Mis Diseños', href: '/account/design' },
        { name: 'Mis Favoritos', href: '/account/wishlist' },
        { name: 'Mis Direcciones', href: '/account/addresses' },
        { name: 'Configuración', href: '/account/settings' },
        { name: 'Cerrar Sesión', href: '/logout' },
      ],
    },
  ];

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Por favor, introduce un email válido');
      return;
    }

    setIsSubscribing(true);

    try {
      const response = await fetch('/api/subscribe-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          source: 'footer',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al suscribirse');
      }

      // Success!
      setIsSubscribed(true);
      setEmail('');

      // Show success message for 5 seconds
      setTimeout(() => {
        setIsSubscribed(false);
      }, 5000);

      console.log('Newsletter subscription successful:', data.message);
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      alert(error instanceof Error ? error.message : 'Error al suscribirse. Por favor, intenta de nuevo.');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="footer">
      {/* Newsletter Section */}
      <div className="bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50 border-b border-gray-200">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-rainbow text-cyan font-bold text-sm rounded-full mb-4">
              <span>📧</span>
              <span>Newsletter</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-gray-800 mb-4">
              ¡No te pierdas nuestras ofertas!
            </h2>

            <p className="text-lg text-gray-600 mb-8">
              Suscríbete y recibe descuentos exclusivos, nuevos productos y consejos de
              personalización
            </p>

            <form onSubmit={handleSubscribe} className="max-w-md mx-auto mb-6">
              <div className="flex gap-3">
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-6 py-4 bg-white border-2 border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                  disabled={isSubscribing || isSubscribed}
                />

                <button
                  type="submit"
                  disabled={isSubscribing || isSubscribed || !email}
                  className={`px-8 py-4 font-bold rounded-xl transition-all duration-300 ${
                    isSubscribed
                      ? 'bg-green-500 text-white'
                      : isSubscribing
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-gradient-rainbow text-white hover:shadow-lg transform hover:scale-105'
                  } disabled:opacity-50`}
                >
                  {isSubscribing ? 'Enviando...' : isSubscribed ? '✓ ¡Suscrito!' : 'Suscribirse'}
                </button>
              </div>
            </form>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Ofertas exclusivas
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Envío gratis en tu primera compra
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Sin spam
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="bg-gray-900 text-white">
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {/* Company Info */}
            <div className="lg:col-span-1">
              <a href="/" className="inline-flex items-center gap-3 mb-6 group">
                <div className="w-12 h-12 bg-gradient-rainbow rounded-xl flex items-center justify-center text-white font-black text-xl">
                  IA
                </div>
                <div>
                  <h3 className="text-xl font-black text-white group-hover:text-cyan-400 transition-colors">
                    ImprimeArte
                  </h3>
                  <p className="text-sm text-gray-400">Impresión y personalización</p>
                </div>
              </a>

              <p className="text-gray-400 mb-6 leading-relaxed text-sm">
                Especialistas en impresión y personalización. Damos vida a tus ideas con la más alta
                calidad y tecnología.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="text-cyan-400">📞</span>
                  <span>645 341 452</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="text-cyan-400">📧</span>
                  <span>info@imprimarte.com</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="text-cyan-400">📍</span>
                  <span>Santa Cruz de Tenerife, España</span>
                </div>
              </div>
            </div>

            {/* Footer Sections */}
            {footerSections.map((section) => (
              <div key={section.title} className="lg:col-span-1">
                <h4 className="text-lg font-bold mb-6 text-white relative">
                  {section.title}
                  <div className="absolute -bottom-2 left-0 w-8 h-0.5 bg-gradient-rainbow" />
                </h4>

                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <a
                        href={link.href}
                        className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 text-sm flex items-center gap-2 group"
                      >
                        <span className="group-hover:translate-x-1 transition-transform duration-300">
                          {link.name}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Trust Badges */}
          <div className="border-t border-gray-800 pt-8 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-3">
                  <span className="text-2xl">🔒</span>
                </div>
                <h5 className="font-bold text-white text-sm mb-1">Pago Seguro</h5>
                <p className="text-xs text-gray-400">Encriptación SSL</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-3">
                  <span className="text-2xl">🚚</span>
                </div>
                <h5 className="font-bold text-white text-sm mb-1">Envío Rápido</h5>
                <p className="text-xs text-gray-400">3-5 días hábiles</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-3">
                  <span className="text-2xl">✨</span>
                </div>
                <h5 className="font-bold text-white text-sm mb-1">Calidad Premium</h5>
                <p className="text-xs text-gray-400">Materiales certificados</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-3">
                  <span className="text-2xl">💬</span>
                </div>
                <h5 className="font-bold text-white text-sm mb-1">Soporte 24/7</h5>
                <p className="text-xs text-gray-400">Siempre disponibles</p>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="border-t border-gray-800 pt-8">
            <h4 className="text-center text-lg font-bold text-white mb-6">
              Síguenos en redes sociales
            </h4>

            <div className="flex justify-center gap-4">
              {[
                {
                  name: 'Instagram',
                  icon: '📷',
                  href: 'https://instagram.com/imprimarte',
                  color: '#E1306C',
                },
                {
                  name: 'Facebook',
                  icon: '👍',
                  href: 'https://facebook.com/imprimarte',
                  color: '#1877F2',
                },
                {
                  name: 'TikTok',
                  icon: '🎵',
                  href: 'https://tiktok.com/@imprimarte',
                  color: '#000000',
                },
                {
                  name: 'WhatsApp',
                  icon: '💬',
                  href: 'https://wa.me/34645341452',
                  color: '#25D366',
                },
                {
                  name: 'YouTube',
                  icon: '📺',
                  href: 'https://youtube.com/@imprimarte',
                  color: '#FF0000',
                },
                {
                  name: 'Pinterest',
                  icon: '📌',
                  href: 'https://pinterest.com/imprimarte',
                  color: '#BD081C',
                },
              ].map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative"
                  aria-label={social.name}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1 group-hover:bg-white/10">
                    {social.icon}
                  </div>
                  <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {social.name}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-black text-white">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-400">
                © 2025 <span className="text-cyan-400 font-semibold">ImprimeArte</span>. Todos los
                derechos reservados.
              </p>
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="/privacidad" className="text-gray-400 hover:text-cyan-400 transition-colors">
                Privacidad
              </a>
              <a href="/terminos" className="text-gray-400 hover:text-cyan-400 transition-colors">
                Términos
              </a>
              <a href="/cookies" className="text-gray-400 hover:text-cyan-400 transition-colors">
                Cookies
              </a>
              <a
                href="/devoluciones"
                className="text-gray-400 hover:text-cyan-400 transition-colors"
              >
                Devoluciones
              </a>
            </div>

            {/* Payment Methods */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Pagos:</span>
              <div className="flex gap-2">
                {['💳', '🏦', '📱', '💰'].map((icon, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
                    title={['Tarjeta', 'Transferencia', 'PayPal', 'Contra reembolso'][i]}
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
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-rainbow rounded-xl text-white shadow-lg hover:shadow-2xl transform hover:scale-110 transition-all duration-300 z-40"
        aria-label="Volver arriba"
      >
        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </button>
    </footer>
  );
};

export default Footer;
