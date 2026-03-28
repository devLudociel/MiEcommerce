export default function SobreNosotrosComponent() {
  const valores = [
    {
      icon: '🎨',
      title: 'Creatividad',
      description:
        'Transformamos tus ideas en productos únicos con diseños personalizados que destacan',
      color: 'from-cyan-500 to-cyan-600',
    },
    {
      icon: '✨',
      title: 'Calidad Premium',
      description:
        'Solo trabajamos con materiales de primera calidad y técnicas de impresión profesionales',
      color: 'from-magenta-500 to-magenta-600',
    },
    {
      icon: '⚡',
      title: 'Rapidez',
      description: 'Producción express sin comprometer la calidad. Tu proyecto, en tiempo récord',
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      icon: '🤝',
      title: 'Compromiso',
      description:
        'Tu satisfacción es nuestra prioridad. Garantizamos un servicio excepcional en cada pedido',
      color: 'from-purple-500 to-purple-600',
    },
  ];

  const estadisticas = [
    { numero: '10,000+', label: 'Productos Personalizados', icon: '📦' },
    { numero: '5,000+', label: 'Clientes Satisfechos', icon: '😊' },
    { numero: '15+', label: 'Años de Experiencia', icon: '🏆' },
    { numero: '98%', label: 'Satisfacción', icon: '⭐' },
  ];

  const servicios = [
    {
      icon: '👕',
      title: 'Textil Personalizado',
      description:
        'Camisetas, sudaderas, gorras y más con impresión DTF, vinilo y sublimación de alta calidad',
    },
    {
      icon: '☕',
      title: 'Vajilla & Hogar',
      description:
        'Tazas, platos, cojines y productos para el hogar con diseños únicos y duraderos',
    },
    {
      icon: '🎁',
      title: 'Regalos Corporativos',
      description:
        'Merchandising empresarial, regalos personalizados y material promocional profesional',
    },
    {
      icon: '📱',
      title: 'Tecnología',
      description:
        'Fundas, vinilos, accesorios y gadgets personalizados con la última tecnología de impresión',
    },
    {
      icon: '🪵',
      title: 'Grabado Láser',
      description:
        'Productos en madera, metal y acrílico con grabado láser de precisión profesional',
    },
    {
      icon: '🖼️',
      title: 'Papelería & Diseño',
      description: 'Tarjetas, invitaciones, carteles y material gráfico con acabados premium',
    },
  ];

  const proceso = [
    {
      paso: '01',
      title: 'Elige tu producto',
      description: 'Explora nuestro catálogo y selecciona el producto que deseas personalizar',
      icon: '🛍️',
    },
    {
      paso: '02',
      title: 'Personaliza tu diseño',
      description:
        'Usa nuestra herramienta intuitiva para crear tu diseño perfecto o envíanos tu archivo',
      icon: '🎨',
    },
    {
      paso: '03',
      title: 'Revisión y aprobación',
      description: 'Revisamos tu pedido y te enviamos una prueba digital para tu confirmación',
      icon: '✅',
    },
    {
      paso: '04',
      title: 'Producción express',
      description:
        'Fabricamos tu producto con las mejores técnicas y materiales de calidad premium',
      icon: '⚙️',
    },
    {
      paso: '05',
      title: 'Recibe tu pedido',
      description: 'Enviamos tu producto perfectamente embalado directamente a tu puerta',
      icon: '📦',
    },
  ];

  const certificaciones = [
    { icon: '🏅', title: 'Calidad Certificada', desc: 'ISO 9001' },
    { icon: '🌱', title: 'Eco-Friendly', desc: 'Tintas ecológicas' },
    { icon: '🔒', title: 'Pago Seguro', desc: 'SSL Certificado' },
    { icon: '✓', title: 'Garantía Total', desc: '100% satisfacción' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-16 mt-32">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-rainbow text-white font-bold text-sm rounded-full mb-4">
            <span>🏢</span>
            <span>Nuestra Historia</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">Sobre Nosotros</h1>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Somos tu partner creativo en personalización. Convertimos tus ideas en productos únicos
            con tecnología de vanguardia y pasión por los detalles
          </p>
        </div>

        {/* Hero Story Section */}
        <div className="bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50 rounded-3xl p-8 md:p-12 mb-16 border-2 border-cyan-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-black text-gray-800 mb-6">Nuestra Historia</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  <strong className="text-cyan-600">ImprimeArte nació en 2010</strong> con una
                  misión clara: democratizar la personalización y hacer que cualquier persona pueda
                  crear productos únicos que reflejen su identidad.
                </p>
                <p>
                  Comenzamos como un pequeño taller en Tenerife con una impresora y un sueño. Hoy,
                  somos líderes en personalización con tecnología de última generación, pero
                  mantenemos la misma pasión del primer día.
                </p>
                <p>
                  <strong className="text-magenta-600">Más de 15 años después</strong>, hemos
                  personalizado más de 10,000 productos para clientes en toda España, desde pequeños
                  emprendedores hasta grandes empresas, siempre con el mismo compromiso: calidad
                  excepcional y servicio personalizado.
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-cyan-500 to-magenta-500 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-black mb-6">Nuestra Misión</h3>
              <p className="text-lg leading-relaxed mb-6">
                Empoderar a personas y empresas para que expresen su creatividad a través de
                productos personalizados de calidad excepcional, utilizando tecnología innovadora y
                un servicio cercano.
              </p>
              <h3 className="text-2xl font-black mb-6">Nuestra Visión</h3>
              <p className="text-lg leading-relaxed">
                Ser el referente en personalización en España, reconocidos por nuestra innovación
                tecnológica, compromiso con la calidad y capacidad de convertir cada idea en
                realidad.
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {estadisticas.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 text-center border-2 border-gray-200 hover:border-cyan-500 transform hover:scale-105 transition-all duration-300"
            >
              <div className="text-4xl mb-3">{stat.icon}</div>
              <div className="text-3xl font-black text-gray-800 mb-2">{stat.numero}</div>
              <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Valores */}
        <div className="mb-16">
          <h2 className="text-3xl font-black text-gray-800 text-center mb-12">Nuestros Valores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {valores.map((valor, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
              >
                <div
                  className={`w-16 h-16 bg-gradient-to-br ${valor.color} rounded-xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}
                >
                  {valor.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{valor.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{valor.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Servicios */}
        <div className="mb-16">
          <h2 className="text-3xl font-black text-gray-800 text-center mb-4">Lo Que Hacemos</h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Ofrecemos una amplia gama de servicios de personalización con tecnología de vanguardia
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicios.map((servicio, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform inline-block">
                  {servicio.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{servicio.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{servicio.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Proceso */}
        <div className="bg-gradient-to-br from-cyan-50 to-purple-50 rounded-3xl p-8 md:p-12 mb-16">
          <h2 className="text-3xl font-black text-gray-800 text-center mb-4">Cómo Trabajamos</h2>
          <p className="text-center text-gray-600 mb-12">
            Un proceso simple y transparente de principio a fin
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {proceso.map((step, index) => (
              <div key={index} className="relative">
                <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 h-full">
                  <div className="text-4xl mb-3">{step.icon}</div>
                  <div className="text-cyan-600 font-black text-2xl mb-2">{step.paso}</div>
                  <h3 className="font-bold text-gray-800 mb-2 text-sm">{step.title}</h3>
                  <p className="text-gray-600 text-xs leading-relaxed">{step.description}</p>
                </div>
                {index < proceso.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-cyan-500 text-2xl z-10">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Certificaciones */}
        <div className="mb-16">
          <h2 className="text-3xl font-black text-gray-800 text-center mb-12">
            Certificaciones y Garantías
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {certificaciones.map((cert, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 text-center border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300"
              >
                <div className="text-5xl mb-3">{cert.icon}</div>
                <h3 className="font-bold text-gray-800 mb-1">{cert.title}</h3>
                <p className="text-sm text-gray-600">{cert.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tecnología */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 text-white mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-black mb-6">Tecnología de Vanguardia</h2>
              <p className="text-lg leading-relaxed mb-6 text-white/90">
                Invertimos constantemente en la última tecnología de impresión y personalización
                para ofrecerte los mejores resultados.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="text-cyan-400 text-xl">✓</span>
                  <span>Impresoras DTF de última generación</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-cyan-400 text-xl">✓</span>
                  <span>Máquinas de sublimación profesionales</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-cyan-400 text-xl">✓</span>
                  <span>Equipos de corte y grabado láser de precisión</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-cyan-400 text-xl">✓</span>
                  <span>Impresoras UV para superficies rígidas</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-cyan-400 text-xl">✓</span>
                  <span>Impresoras 3D en resina y filamento</span>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="text-4xl mb-3">🖨️</div>
                <h3 className="font-bold mb-2">Impresión Digital</h3>
                <p className="text-sm text-white/80">Alta resolución y colores vibrantes</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="text-4xl mb-3">⚡</div>
                <h3 className="font-bold mb-2">Producción Rápida</h3>
                <p className="text-sm text-white/80">Resultados en tiempo récord</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="font-bold mb-2">Precisión Láser</h3>
                <p className="text-sm text-white/80">Detalles perfectos</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <div className="text-4xl mb-3">♻️</div>
                <h3 className="font-bold mb-2">Eco-Friendly</h3>
                <p className="text-sm text-white/80">Procesos sostenibles</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-cyan-50 via-purple-50 to-pink-50 rounded-3xl p-8 md:p-12 text-center border-2 border-cyan-200 mb-12">
          <h2 className="text-3xl font-black text-gray-800 mb-4">¿Listo para crear algo único?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Únete a miles de clientes satisfechos y da vida a tus ideas
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/productos"
              className="px-8 py-4 bg-gradient-rainbow text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              🛍️ Explorar Productos
            </a>
            <a
              href="/contacto"
              className="px-8 py-4 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-300 hover:border-cyan-500 transform hover:scale-105 transition-all duration-300"
            >
              📧 Contáctanos
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/guia-materiales"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">📚</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Guía de Materiales
            </h3>
            <p className="text-sm text-gray-600">
              Conoce todas las técnicas y materiales que utilizamos
            </p>
          </a>

          <a
            href="/como-funciona"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">🎨</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Cómo Personalizar
            </h3>
            <p className="text-sm text-gray-600">
              Aprende a crear tus diseños perfectos paso a paso
            </p>
          </a>

          <a
            href="/faq"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">❓</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Preguntas Frecuentes
            </h3>
            <p className="text-sm text-gray-600">
              Encuentra respuestas rápidas a las dudas más comunes
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
