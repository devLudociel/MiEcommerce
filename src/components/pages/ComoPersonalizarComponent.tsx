import { useState } from 'react';

export default function ComoPersonalizarComponent() {
  const [activeTutorial, setActiveTutorial] = useState<number | null>(null);

  const pasos = [
    {
      numero: '01',
      icon: '🛍️',
      titulo: 'Elige tu producto',
      descripcion: 'Explora nuestro catálogo y selecciona el producto que deseas personalizar',
      detalles: [
        'Navega por categorías: textil, hogar, tecnología, regalos',
        'Filtra por precio, material o técnica de impresión',
        'Lee las especificaciones y opciones disponibles',
        'Selecciona color, talla y cantidad del producto base',
      ],
      tips: [
        'Revisa la guía de tallas antes de elegir',
        'Verifica qué técnicas de impresión están disponibles',
        'Lee las opiniones de otros clientes',
        'Consulta los tiempos de producción estimados',
      ],
      color: 'from-cyan-500 to-cyan-600',
    },
    {
      numero: '02',
      icon: '🎨',
      titulo: 'Accede al personalizador',
      descripcion: 'Haz clic en "Personalizar" para abrir nuestra herramienta de diseño',
      detalles: [
        'Se abrirá el editor visual con el producto seleccionado',
        'Verás una previsualización en tiempo real',
        'Panel de herramientas a la izquierda',
        'Opciones de diseño en el panel superior',
      ],
      tips: [
        'El editor funciona mejor en pantallas grandes',
        'Usa zoom para trabajar con más precisión',
        'Guarda tu diseño frecuentemente',
        'Puedes editar tanto la parte frontal como trasera',
      ],
      color: 'from-magenta-500 to-magenta-600',
    },
    {
      numero: '03',
      icon: '📤',
      titulo: 'Sube tu diseño',
      descripcion: 'Carga tu logo, imagen o archivo desde tu ordenador',
      detalles: [
        'Haz clic en "Subir imagen" o arrastra el archivo',
        'Formatos aceptados: PNG, JPG, PDF, SVG, AI, PSD',
        'Resolución recomendada: mínimo 300 DPI',
        'Tamaño máximo: 50 MB por archivo',
      ],
      tips: [
        'Usa imágenes con fondo transparente (PNG) para mejores resultados',
        'Asegúrate de que tu imagen tenga buena calidad',
        'Vectores (SVG, AI) son ideales para logos',
        'Evita imágenes pixeladas o de baja resolución',
      ],
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      numero: '04',
      icon: '✏️',
      titulo: 'Añade texto',
      descripcion: 'Personaliza con frases, nombres o mensajes únicos',
      detalles: [
        'Haz clic en "Añadir texto" en el panel de herramientas',
        'Escribe tu mensaje en el cuadro de texto',
        'Selecciona entre más de 100 fuentes disponibles',
        'Ajusta tamaño, color y alineación',
      ],
      tips: [
        'Las fuentes bold son más legibles en productos pequeños',
        'Usa colores que contrasten con el fondo',
        'Evita textos muy largos en espacios reducidos',
        'Puedes añadir múltiples capas de texto',
      ],
      color: 'from-purple-500 to-purple-600',
    },
    {
      numero: '05',
      icon: '🎯',
      titulo: 'Ajusta posición y tamaño',
      descripcion: 'Coloca y redimensiona tu diseño perfectamente',
      detalles: [
        'Arrastra el diseño a la posición deseada',
        'Usa los tiradores de las esquinas para redimensionar',
        'Mantén proporciones bloqueadas para evitar distorsión',
        'Gira el diseño con el icono de rotación',
      ],
      tips: [
        'Usa las guías de alineación para centrar perfectamente',
        'Respeta el área de impresión marcada',
        'Deja margen suficiente en los bordes',
        'Previsualiza en diferentes vistas (frontal/trasera)',
      ],
      color: 'from-green-500 to-green-600',
    },
    {
      numero: '06',
      icon: '🎨',
      titulo: 'Personaliza colores',
      descripcion: 'Ajusta los colores de tu diseño para que luzcan perfectos',
      detalles: [
        'Haz clic en el elemento que quieres recolorear',
        'Usa el selector de color o introduce código HEX',
        'Aplica filtros y efectos especiales',
        'Ajusta brillo, contraste y saturación',
      ],
      tips: [
        'Ten en cuenta el color del producto base',
        'Los colores claros destacan en fondos oscuros',
        'Usa nuestra paleta de colores recomendados',
        'Ten en cuenta que pueden existir ligeras variaciones',
      ],
      color: 'from-blue-500 to-blue-600',
    },
    {
      numero: '07',
      icon: '👁️',
      titulo: 'Previsualiza tu diseño',
      descripcion: 'Revisa cómo quedará tu producto antes de confirmar',
      detalles: [
        'Activa la vista 3D para ver el producto en contexto',
        'Cambia entre vista frontal, trasera y lateral',
        'Comprueba cómo se ve en diferentes colores de producto',
        'Verifica todos los detalles antes de continuar',
      ],
      tips: [
        'Revisa que no haya elementos cortados',
        'Comprueba la legibilidad del texto',
        'Verifica que los colores contrasten bien',
        'Solicita una muestra si tienes dudas',
      ],
      color: 'from-orange-500 to-orange-600',
    },
    {
      numero: '08',
      icon: '💾',
      titulo: 'Guarda y añade al carrito',
      descripcion: 'Finaliza tu diseño y procede con tu pedido',
      detalles: [
        'Haz clic en "Guardar diseño" para guardarlo en tu cuenta',
        'Selecciona cantidad y opciones finales',
        'Haz clic en "Añadir al carrito"',
        'Continúa comprando o procede al pago',
      ],
      tips: [
        'Guarda tu diseño para reutilizarlo después',
        'Revisa el resumen antes de añadir al carrito',
        'Aprovecha descuentos por cantidad',
        'Podrás revisar todo antes del pago final',
      ],
      color: 'from-pink-500 to-pink-600',
    },
  ];

  const herramientas = [
    {
      icon: '📤',
      nombre: 'Subir Imagen',
      descripcion: 'Carga tu logo, foto o diseño desde tu ordenador',
      formatos: 'PNG, JPG, PDF, SVG, AI, PSD',
    },
    {
      icon: '✏️',
      nombre: 'Añadir Texto',
      descripcion: 'Inserta frases, nombres o mensajes personalizados',
      formatos: '100+ fuentes disponibles',
    },
    {
      icon: '🎨',
      nombre: 'Colores',
      descripcion: 'Cambia colores, aplica filtros y ajusta tonalidades',
      formatos: 'Selector HEX, RGB, HSL',
    },
    {
      icon: '🔲',
      nombre: 'Formas',
      descripcion: 'Añade círculos, cuadrados y formas geométricas',
      formatos: 'Biblioteca de formas',
    },
    {
      icon: '🖼️',
      nombre: 'Plantillas',
      descripcion: 'Usa diseños prediseñados listos para personalizar',
      formatos: '500+ plantillas',
    },
    {
      icon: '📐',
      nombre: 'Alineación',
      descripcion: 'Centra, alinea y distribuye elementos perfectamente',
      formatos: 'Guías inteligentes',
    },
  ];

  const formatosArchivo = [
    {
      formato: 'PNG',
      icon: '🖼️',
      calidad: '⭐⭐⭐⭐⭐',
      descripcion: 'Ideal para logos con fondo transparente',
      recomendado: true,
      caracteristicas: ['Admite transparencia', 'Sin pérdida de calidad', 'Perfecto para logos'],
    },
    {
      formato: 'JPG',
      icon: '📷',
      calidad: '⭐⭐⭐⭐',
      descripcion: 'Bueno para fotografías y diseños complejos',
      recomendado: true,
      caracteristicas: ['Tamaño de archivo pequeño', 'Bueno para fotos', 'Sin transparencia'],
    },
    {
      formato: 'SVG / AI',
      icon: '📐',
      calidad: '⭐⭐⭐⭐⭐',
      descripcion: 'Vector escalable, calidad infinita',
      recomendado: true,
      caracteristicas: ['Calidad infinita', 'Redimensionable', 'Ideal para logos'],
    },
    {
      formato: 'PDF',
      icon: '📄',
      calidad: '⭐⭐⭐⭐',
      descripcion: 'Documento universal, preserva diseño',
      recomendado: false,
      caracteristicas: ['Universal', 'Múltiples páginas', 'Preserva formato'],
    },
  ];

  const erroresComunes = [
    {
      error: '❌ Imagen de baja calidad',
      problema: 'La imagen está pixelada o borrosa',
      solucion:
        'Usa imágenes de mínimo 300 DPI. Si tu imagen se ve borrosa en el editor, probablemente también lo estará impresa.',
      icono: '📉',
    },
    {
      error: '❌ Fondo no transparente',
      problema: 'El logo tiene un cuadrado blanco alrededor',
      solucion:
        'Usa formato PNG con fondo transparente. Podemos ayudarte a eliminar el fondo gratuitamente.',
      icono: '⬜',
    },
    {
      error: '❌ Texto muy pequeño',
      problema: 'El texto es ilegible en el producto',
      solucion: 'Usa un tamaño mínimo de 8pt. Prueba fuentes bold para mejor legibilidad.',
      icono: '🔍',
    },
    {
      error: '❌ Diseño fuera del área',
      problema: 'Parte del diseño se corta',
      solucion:
        'Respeta el área de impresión marcada. Deja al menos 0.5cm de margen en los bordes.',
      icono: '✂️',
    },
    {
      error: '❌ Colores que no contrastan',
      problema: 'El diseño no se ve bien en el color del producto',
      solucion:
        'Elige colores que contrasten con el fondo. Usa nuestra herramienta de vista previa.',
      icono: '🎨',
    },
    {
      error: '❌ Derechos de autor',
      problema: 'Uso de imágenes o logos protegidos',
      solucion:
        'Solo usa imágenes de tu propiedad o con licencia. No podemos imprimir marcas registradas sin autorización.',
      icono: '©️',
    },
  ];

  const consejosPro = [
    {
      titulo: '🎯 Diseño Minimalista',
      descripcion:
        'Menos es más. Un diseño simple y limpio suele tener más impacto que uno recargado.',
      ejemplo: 'Un logo centrado en una camiseta destaca más que múltiples elementos',
    },
    {
      titulo: '🎨 Contraste es Clave',
      descripcion: 'Asegúrate de que tu diseño contraste bien con el color del producto base.',
      ejemplo: 'Colores claros en productos oscuros, colores oscuros en productos claros',
    },
    {
      titulo: '📏 Tamaño Importa',
      descripcion: 'No hagas el diseño demasiado grande ni demasiado pequeño. Busca el equilibrio.',
      ejemplo: 'En camisetas: 25-30cm de ancho para diseños centrales',
    },
    {
      titulo: '✨ Calidad ante Todo',
      descripcion: 'Una imagen de alta calidad es fundamental para un resultado profesional.',
      ejemplo: 'Usa vectores cuando sea posible, o PNG de alta resolución',
    },
    {
      titulo: '🔤 Fuentes Legibles',
      descripcion: 'Elige fuentes que sean fáciles de leer, especialmente en tamaños pequeños.',
      ejemplo: 'Evita fuentes muy decorativas para textos largos',
    },
    {
      titulo: '💡 Menos Colores, Mejor',
      descripcion: 'Limita tu paleta de colores para un diseño más cohesivo y profesional.',
      ejemplo: '2-3 colores principales suelen ser suficientes',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-16 mt-32">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-rainbow text-white font-bold text-sm rounded-full mb-4">
            <span>🎨</span>
            <span>Tutorial Completo</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
            Cómo Personalizar tus Productos
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Guía paso a paso para crear diseños increíbles con nuestra herramienta de
            personalización
          </p>
        </div>

        {/* Video Tutorial Placeholder */}
        <div className="bg-gradient-to-br from-cyan-500 to-purple-500 rounded-3xl p-8 md:p-12 text-white text-center mb-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-black/20 backdrop-blur-lg rounded-2xl p-12 mb-6">
              <div className="text-8xl mb-4">▶️</div>
              <h2 className="text-2xl font-black mb-2">Video Tutorial</h2>
              <p className="text-white/90">Aprende a usar nuestro personalizador en 5 minutos</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <button className="px-6 py-3 bg-white text-cyan-600 font-bold rounded-xl hover:shadow-2xl transform hover:scale-105 transition-all">
                🎥 Ver Video Tutorial
              </button>
              <button className="px-6 py-3 bg-white/20 backdrop-blur text-white border-2 border-white/50 font-bold rounded-xl hover:bg-white/30 transition-all">
                📄 Descargar PDF
              </button>
            </div>
          </div>
        </div>

        {/* Proceso Paso a Paso */}
        <div className="mb-16">
          <h2 className="text-3xl font-black text-gray-800 text-center mb-8">
            Proceso Paso a Paso
          </h2>
          <div className="space-y-6">
            {pasos.map((paso, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg overflow-hidden"
              >
                <button
                  onClick={() => setActiveTutorial(activeTutorial === index ? null : index)}
                  className="w-full p-6 flex items-center gap-6 hover:bg-gray-50 transition-all"
                >
                  <div
                    className={`w-20 h-20 flex-shrink-0 bg-gradient-to-br ${paso.color} rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg`}
                  >
                    {paso.numero}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-4xl">{paso.icon}</span>
                      <h3 className="text-2xl font-black text-gray-800">{paso.titulo}</h3>
                    </div>
                    <p className="text-gray-600">{paso.descripcion}</p>
                  </div>
                  <svg
                    className={`w-8 h-8 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                      activeTutorial === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {activeTutorial === index && (
                  <div className="p-6 border-t-2 border-gray-100 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                          <span>📋</span> Detalles del Paso
                        </h4>
                        <ul className="space-y-3">
                          {paso.detalles.map((detalle, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-gray-700">
                              <span className="text-cyan-500 flex-shrink-0 mt-1">✓</span>
                              <span className="text-sm">{detalle}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                          <span>💡</span> Consejos Útiles
                        </h4>
                        <ul className="space-y-3">
                          {paso.tips.map((tip, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-gray-700">
                              <span className="text-yellow-500 flex-shrink-0 mt-1">★</span>
                              <span className="text-sm">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Herramientas Disponibles */}
        <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg mb-16">
          <h2 className="text-2xl font-black text-gray-800 mb-8 text-center">
            Herramientas del Editor
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {herramientas.map((herramienta, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all"
              >
                <div className="text-5xl mb-4">{herramienta.icon}</div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">{herramienta.nombre}</h3>
                <p className="text-sm text-gray-600 mb-3">{herramienta.descripcion}</p>
                <div className="text-xs text-cyan-600 font-medium">{herramienta.formatos}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Formatos de Archivo */}
        <div className="mb-16">
          <h2 className="text-3xl font-black text-gray-800 text-center mb-8">
            Formatos de Archivo Aceptados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {formatosArchivo.map((formato, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl p-6 border-2 shadow-lg ${
                  formato.recomendado ? 'border-green-500' : 'border-gray-200'
                }`}
              >
                {formato.recomendado && (
                  <div className="inline-block px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full mb-3">
                    ✓ Recomendado
                  </div>
                )}
                <div className="text-5xl mb-3">{formato.icon}</div>
                <h3 className="text-xl font-black text-gray-800 mb-2">{formato.formato}</h3>
                <div className="text-sm mb-3">{formato.calidad}</div>
                <p className="text-sm text-gray-600 mb-4">{formato.descripcion}</p>
                <ul className="space-y-2">
                  {formato.caracteristicas.map((carac, idx) => (
                    <li key={idx} className="text-xs text-gray-700 flex items-center gap-2">
                      <span className="text-cyan-500">•</span>
                      {carac}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Errores Comunes */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl p-8 md:p-12 border-2 border-red-200 mb-16">
          <h2 className="text-3xl font-black text-gray-800 text-center mb-4">
            Errores Comunes y Cómo Evitarlos
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Aprende de estos errores frecuentes para conseguir el mejor resultado
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {erroresComunes.map((item, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl flex-shrink-0">{item.icono}</div>
                  <div>
                    <h3 className="font-bold text-red-700 mb-2">{item.error}</h3>
                    <p className="text-sm text-gray-700 mb-3">
                      <strong>Problema:</strong> {item.problema}
                    </p>
                  </div>
                </div>
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                  <p className="text-sm text-gray-800">
                    <strong className="text-green-700">✓ Solución:</strong> {item.solucion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Consejos Pro */}
        <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg mb-16">
          <h2 className="text-3xl font-black text-gray-800 text-center mb-8">
            Consejos de Diseño Profesional
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {consejosPro.map((consejo, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-cyan-50 to-purple-50 rounded-2xl p-6 border-2 border-cyan-200 hover:shadow-xl transition-all"
              >
                <h3 className="font-bold text-lg text-gray-800 mb-3">{consejo.titulo}</h3>
                <p className="text-sm text-gray-700 mb-4">{consejo.descripcion}</p>
                <div className="bg-white rounded-lg p-3 border border-cyan-200">
                  <p className="text-xs text-gray-600">
                    <strong>Ejemplo:</strong> {consejo.ejemplo}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ayuda Adicional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-3xl p-8 text-white">
            <div className="text-5xl mb-4">🎨</div>
            <h3 className="text-2xl font-black mb-4">Servicio de Diseño</h3>
            <p className="mb-6 text-white/90">
              ¿No tienes tiempo o experiencia? Nuestro equipo de diseñadores profesionales puede
              crear tu diseño por ti desde 15€.
            </p>
            <a
              href="/servicios-diseno"
              className="inline-block px-6 py-3 bg-white text-cyan-600 font-bold rounded-xl hover:shadow-2xl transform hover:scale-105 transition-all"
            >
              Ver Servicios de Diseño
            </a>
          </div>

          <div className="bg-gradient-to-br from-magenta-500 to-magenta-600 rounded-3xl p-8 text-white">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-2xl font-black mb-4">Ayuda en Vivo</h3>
            <p className="mb-6 text-white/90">
              ¿Tienes dudas mientras personalizas? Nuestro equipo está disponible por chat, WhatsApp
              o teléfono para ayudarte en tiempo real.
            </p>
            <div className="flex gap-3">
              <a
                href="https://wa.me/34645341452"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-white text-magenta-600 font-bold rounded-xl hover:shadow-2xl transform hover:scale-105 transition-all"
              >
                WhatsApp
              </a>
              <a
                href="/contacto"
                className="inline-block px-6 py-3 bg-white/20 backdrop-blur border-2 border-white/50 text-white font-bold rounded-xl hover:bg-white/30 transition-all"
              >
                Contacto
              </a>
            </div>
          </div>
        </div>

        {/* CTA Final */}
        <div className="bg-gradient-to-r from-cyan-50 via-purple-50 to-pink-50 rounded-3xl p-8 md:p-12 text-center border-2 border-cyan-200 mb-12">
          <h2 className="text-3xl font-black text-gray-800 mb-4">¿Listo para Empezar?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Explora nuestro catálogo y empieza a crear tus productos personalizados ahora
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/productos"
              className="px-8 py-4 bg-gradient-rainbow text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              🛍️ Ver Productos
            </a>
            <a
              href="/guia-materiales"
              className="px-8 py-4 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-300 hover:border-cyan-500 transform hover:scale-105 transition-all duration-300"
            >
              📚 Guía de Materiales
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/faq"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">❓</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Preguntas Frecuentes
            </h3>
            <p className="text-sm text-gray-600">Resuelve todas tus dudas sobre personalización</p>
          </a>

          <a
            href="/guia-materiales"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">📚</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Guía de Materiales
            </h3>
            <p className="text-sm text-gray-600">
              Conoce todas las técnicas de impresión disponibles
            </p>
          </a>

          <a
            href="/contacto"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">💬</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Contacto
            </h3>
            <p className="text-sm text-gray-600">Habla con nuestro equipo de expertos</p>
          </a>
        </div>
      </div>
    </div>
  );
}
