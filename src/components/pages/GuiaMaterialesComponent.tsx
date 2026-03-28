import { useState } from 'react';

export default function GuiaMaterialesComponent() {
  const [selectedTecnica, setSelectedTecnica] = useState<string | null>(null);

  const handleToggleTecnica = (id: string) => {
    setSelectedTecnica((current) => (current === id ? null : id));
  };

  const tecnicas = [
    {
      id: 'dtf',
      icon: '🖨️',
      nombre: 'Impresión DTF',
      subtitulo: 'Direct to Film',
      color: 'from-cyan-500 to-cyan-600',
      descripcion:
        'Tecnología de impresión directa a film que se transfiere posteriormente al tejido mediante calor y presión. Ideal para diseños complejos y colores vibrantes.',
      ventajas: [
        'Colores brillantes y vivos',
        'Alta durabilidad (50+ lavados)',
        'Funciona en cualquier color de tela',
        'Detalles precisos y degradados',
        'Tacto suave y flexible',
        'Resistente al agua y decoloración',
      ],
      desventajas: [
        'Ligeramente más costoso que vinilo',
        'Requiere pretratamiento en algunos tejidos',
        'Tiempo de producción de 3-4 días',
      ],
      mejorPara: [
        'Diseños con muchos colores',
        'Fotografías y degradados',
        'Tiradas medias y grandes',
        'Telas oscuras',
        'Diseños complejos',
      ],
      materiales: ['Algodón 100%', 'Poliéster', 'Mezclas cotton-poly', 'Tejidos técnicos'],
      cuidados: [
        'Lavar del revés a máx. 30°C',
        'No usar lejía',
        'Planchar del revés a baja temperatura',
        'No usar secadora industrial',
        'Secar a la sombra',
      ],
      precio: '€€€',
    },
    {
      id: 'sublimacion',
      icon: '☁️',
      nombre: 'Sublimación',
      subtitulo: 'Impresión por Gas',
      color: 'from-magenta-500 to-magenta-600',
      descripcion:
        'Proceso de impresión donde la tinta se convierte en gas y penetra en las fibras del material. El resultado es permanente y de máxima calidad.',
      ventajas: [
        'Máxima durabilidad permanente',
        'Colores extremadamente vivos',
        'Sin tacto, se integra en el material',
        'Resistente a lavados ilimitados',
        'No se agrieta ni despega',
        'Ideal para fotografías',
      ],
      desventajas: [
        'Solo funciona en materiales claros',
        'Requiere poliéster o superficies especiales',
        'No apto para algodón 100%',
      ],
      mejorPara: [
        'Tazas y vajilla cerámica',
        'Textil deportivo',
        'Fotografías de alta calidad',
        'Productos promocionales',
        'Fundas y accesorios',
      ],
      materiales: [
        'Poliéster 100%',
        'Cerámica blanca',
        'Metal con recubrimiento',
        'Mezclas min. 65% poliéster',
      ],
      cuidados: [
        'Lavar a cualquier temperatura',
        'Apto para lavavajillas',
        'Planchar sin problemas',
        'Resistente a UV',
        'Mantenimiento mínimo',
      ],
      precio: '€€',
    },
    {
      id: 'vinilo',
      icon: '📏',
      nombre: 'Vinilo Textil',
      subtitulo: 'Corte y Termo',
      color: 'from-yellow-500 to-yellow-600',
      descripcion:
        'Láminas de vinilo que se cortan con precisión y se adhieren al tejido mediante calor. Perfecto para textos, logos y diseños sin degradados.',
      ventajas: [
        'Precio económico',
        'Producción muy rápida (24h)',
        'Acabado profesional mate o brillante',
        'Gran durabilidad',
        'Ideal para textos y logos simples',
        'Variedad de acabados especiales',
      ],
      desventajas: [
        'Solo diseños de pocos colores',
        'No apto para degradados o fotos',
        'Tacto ligeramente más rígido',
        'Puede agrietarse si no se cuida',
      ],
      mejorPara: [
        'Logos empresariales',
        'Textos y frases',
        'Números de equipos',
        'Diseños de 1-3 colores',
        'Pedidos urgentes',
      ],
      materiales: ['Algodón', 'Poliéster', 'Mezclas', 'Tejidos técnicos', 'Nylon'],
      cuidados: [
        'Lavar del revés a 30°C',
        'No planchar directamente',
        'Evitar secadora a alta temperatura',
        'No usar suavizante',
        'Secar colgado',
      ],
      precio: '€',
    },
    {
      id: 'uvdtf',
      icon: '✨',
      nombre: 'UV DTF',
      subtitulo: 'Universal Transfer',
      color: 'from-purple-500 to-purple-600',
      descripcion:
        'Tecnología revolucionaria que permite imprimir sobre prácticamente cualquier superficie rígida. La tinta UV cura instantáneamente.',
      ventajas: [
        'Funciona en cualquier superficie',
        'Colores vibrantes y duraderos',
        'Resistente al agua y rayado',
        'Aplicación fácil y rápida',
        'No requiere preparación de superficie',
        'Acabado profesional 3D',
      ],
      desventajas: ['Solo superficies rígidas', 'Coste medio-alto', 'No apto para textil'],
      mejorPara: [
        'Fundas de móvil',
        'Botellas y termos',
        'Cristal y vidrio',
        'Madera',
        'Metal y plástico duro',
      ],
      materiales: ['Plástico', 'Metal', 'Cristal', 'Madera', 'Cerámica', 'Acrílico'],
      cuidados: [
        'Lavar con agua y jabón',
        'No usar estropajos abrasivos',
        'Resistente al lavavajillas',
        'Proteger de golpes fuertes',
        'Evitar exposición prolongada al sol',
      ],
      precio: '€€€',
    },
    {
      id: 'laser',
      icon: '⚡',
      nombre: 'Grabado Láser',
      subtitulo: 'Corte y Grabado',
      color: 'from-green-500 to-green-600',
      descripcion:
        'Tecnología de grabado permanente mediante rayo láser. Crea diseños elegantes y duraderos con precisión milimétrica.',
      ventajas: [
        'Permanente e indeleble',
        'Precisión extrema',
        'Acabado elegante y premium',
        'Sin tintas ni químicos',
        'Múltiples profundidades',
        'Ecológico',
      ],
      desventajas: [
        'Solo tonos del material',
        'No admite colores',
        'Coste alto en algunos materiales',
      ],
      mejorPara: [
        'Productos premium',
        'Joyería personalizada',
        'Regalos corporativos',
        'Decoración del hogar',
        'Señalética profesional',
      ],
      materiales: ['Madera', 'Cuero', 'Metal', 'Vidrio', 'Piedra', 'Acrílico', 'Cartón'],
      cuidados: [
        'Limpiar con paño suave',
        'Evitar químicos agresivos',
        'No sumergir en agua (madera)',
        'Proteger de arañazos',
        'Mantenimiento mínimo',
      ],
      precio: '€€€€',
    },
    {
      id: 'impresion3d',
      icon: '🔮',
      nombre: 'Impresión 3D',
      subtitulo: 'Fabricación Aditiva',
      color: 'from-blue-500 to-blue-600',
      descripcion:
        'Creación de objetos tridimensionales capa por capa. Ideal para prototipos, figuras personalizadas y piezas únicas.',
      ventajas: [
        'Diseños totalmente personalizados',
        'Geometrías imposibles por otros métodos',
        'Prototipos rápidos',
        'Sin moldes ni herramental',
        'Alta precisión',
        'Variedad de materiales',
      ],
      desventajas: [
        'Tiempo de producción largo',
        'Limitaciones de tamaño',
        'Acabado puede requerir post-proceso',
      ],
      mejorPara: [
        'Figuras personalizadas',
        'Prototipos',
        'Piezas de repuesto',
        'Maquetas',
        'Objetos decorativos',
      ],
      materiales: ['PLA (biodegradable)', 'ABS', 'PETG', 'Resina', 'TPU (flexible)', 'Nylon'],
      cuidados: [
        'Evitar exposición solar directa',
        'No usar en exteriores (PLA)',
        'Limpiar con agua tibia',
        'Almacenar en lugar seco',
        'Proteger de golpes',
      ],
      precio: '€€€',
    },
  ];

  const comparativa = [
    {
      aspecto: 'Durabilidad',
      dtf: '⭐⭐⭐⭐',
      sublimacion: '⭐⭐⭐⭐⭐',
      vinilo: '⭐⭐⭐⭐',
      laser: '⭐⭐⭐⭐⭐',
    },
    {
      aspecto: 'Calidad Color',
      dtf: '⭐⭐⭐⭐⭐',
      sublimacion: '⭐⭐⭐⭐⭐',
      vinilo: '⭐⭐⭐',
      laser: '⭐⭐',
    },
    {
      aspecto: 'Velocidad',
      dtf: '⭐⭐⭐',
      sublimacion: '⭐⭐⭐⭐',
      vinilo: '⭐⭐⭐⭐⭐',
      laser: '⭐⭐⭐⭐',
    },
    {
      aspecto: 'Precio',
      dtf: '€€€',
      sublimacion: '€€',
      vinilo: '€',
      laser: '€€€€',
    },
    {
      aspecto: 'Complejidad',
      dtf: 'Alta',
      sublimacion: 'Alta',
      vinilo: 'Baja',
      laser: 'Media',
    },
  ];

  const materialTextil = [
    {
      nombre: 'Algodón 100%',
      icon: '👕',
      descripcion: 'Material natural, suave y transpirable',
      tecnicas: ['DTF', 'Vinilo'],
      ventajas: ['Cómodo', 'Transpirable', 'Hipoalergénico'],
      precio: '€€',
    },
    {
      nombre: 'Poliéster',
      icon: '🏃',
      descripcion: 'Fibra sintética duradera y de secado rápido',
      tecnicas: ['Sublimación', 'DTF', 'Vinilo'],
      ventajas: ['Duradero', 'No se arruga', 'Secado rápido'],
      precio: '€',
    },
    {
      nombre: 'Mezcla Cotton-Poly',
      icon: '👔',
      descripcion: 'Lo mejor de ambos mundos',
      tecnicas: ['DTF', 'Vinilo', 'Sublimación (min. 65% poly)'],
      ventajas: ['Versátil', 'Equilibrado', 'Buen precio'],
      precio: '€€',
    },
    {
      nombre: 'Premium',
      icon: '⭐',
      descripcion: 'Algodón peinado de alta calidad',
      tecnicas: ['DTF', 'Vinilo'],
      ventajas: ['Máxima suavidad', 'Acabado premium', 'Larga vida'],
      precio: '€€€',
    },
  ];

  const guiasCuidado = [
    {
      categoria: 'Textil Personalizado',
      icon: '👕',
      consejos: [
        'Lava del revés para proteger la impresión',
        'Temperatura máxima 30°C',
        'No uses lejía ni productos químicos agresivos',
        'Plancha del revés a temperatura baja/media',
        'Evita la secadora a alta temperatura',
        'Seca a la sombra para evitar decoloración',
      ],
    },
    {
      categoria: 'Vajilla Personalizada',
      icon: '☕',
      consejos: [
        'Primera lavada a mano recomendada',
        'Apto para lavavajillas (programa suave)',
        'No usar estropajos metálicos',
        'Apto para microondas (salvo decoración metálica)',
        'Evitar cambios bruscos de temperatura',
        'Secar con paño suave',
      ],
    },
    {
      categoria: 'Productos Grabados',
      icon: '🪵',
      consejos: [
        'Limpiar con paño húmedo suave',
        'No sumergir en agua (madera)',
        'Aplicar aceite protector (madera)',
        'Evitar exposición solar directa',
        'No usar productos químicos abrasivos',
        'Almacenar en lugar seco',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-16 mt-32">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-rainbow text-white font-bold text-sm rounded-full mb-4">
            <span>📚</span>
            <span>Guía Educativa</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
            Guía de Materiales y Técnicas
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Conoce todas las tecnologías de impresión que utilizamos y elige la mejor opción para tu
            proyecto
          </p>
        </div>

        {/* Técnicas de Impresión */}
        <div className="mb-16">
          <h2 className="text-3xl font-black text-gray-800 text-center mb-8">
            Tecnologías de Impresión
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tecnicas.map((tecnica) => (
              <div
                key={tecnica.id}
                onClick={() => handleToggleTecnica(tecnica.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleToggleTecnica(tecnica.id);
                  }
                }}
                role="button"
                tabIndex={0}
                className={`bg-white rounded-3xl p-6 border-2 transition-all duration-300 cursor-pointer ${
                  selectedTecnica === tecnica.id
                    ? 'border-cyan-500 shadow-2xl scale-105'
                    : 'border-gray-200 hover:border-cyan-300 hover:shadow-lg'
                }`}
              >
                <div
                  className={`w-16 h-16 bg-gradient-to-br ${tecnica.color} rounded-xl flex items-center justify-center text-4xl mb-4`}
                >
                  {tecnica.icon}
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-1">{tecnica.nombre}</h3>
                <p className="text-sm text-cyan-600 font-bold mb-3">{tecnica.subtitulo}</p>
                <p className="text-sm text-gray-600 mb-4">{tecnica.descripcion}</p>

                {selectedTecnica === tecnica.id && (
                  <div className="mt-6 space-y-4 border-t-2 border-gray-100 pt-6">
                    {/* Ventajas */}
                    <div>
                      <h4 className="font-bold text-green-700 mb-2 flex items-center gap-2">
                        <span>✅</span> Ventajas
                      </h4>
                      <ul className="space-y-1">
                        {tecnica.ventajas.map((v, idx) => (
                          <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                            <span className="text-green-500 flex-shrink-0">•</span>
                            {v}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Mejor para */}
                    <div>
                      <h4 className="font-bold text-cyan-700 mb-2 flex items-center gap-2">
                        <span>🎯</span> Ideal para
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {tecnica.mejorPara.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-medium"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Materiales */}
                    <div>
                      <h4 className="font-bold text-purple-700 mb-2 flex items-center gap-2">
                        <span>📦</span> Materiales
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {tecnica.materiales.map((mat, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium"
                          >
                            {mat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Cuidados */}
                    <div>
                      <h4 className="font-bold text-orange-700 mb-2 flex items-center gap-2">
                        <span>🧼</span> Cuidados
                      </h4>
                      <ul className="space-y-1">
                        {tecnica.cuidados.slice(0, 3).map((c, idx) => (
                          <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                            <span className="text-orange-500 flex-shrink-0">•</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Precio */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-sm font-bold text-gray-700">Precio:</span>
                      <span className="text-lg font-black text-gray-800">{tecnica.precio}</span>
                    </div>
                  </div>
                )}

                <button className="mt-4 text-sm text-cyan-600 font-bold hover:text-cyan-700">
                  {selectedTecnica === tecnica.id ? '▲ Ver menos' : '▼ Ver más detalles'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tabla Comparativa */}
        <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg mb-16">
          <h2 className="text-2xl font-black text-gray-800 mb-6 text-center">Comparativa Rápida</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-bold text-gray-800">Aspecto</th>
                  <th className="text-center py-4 px-4 font-bold text-cyan-600">DTF</th>
                  <th className="text-center py-4 px-4 font-bold text-magenta-600">Sublimación</th>
                  <th className="text-center py-4 px-4 font-bold text-yellow-600">Vinilo</th>
                  <th className="text-center py-4 px-4 font-bold text-green-600">Láser</th>
                </tr>
              </thead>
              <tbody>
                {comparativa.map((fila, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 font-bold text-gray-700">{fila.aspecto}</td>
                    <td className="text-center py-4 px-4">{fila.dtf}</td>
                    <td className="text-center py-4 px-4">{fila.sublimacion}</td>
                    <td className="text-center py-4 px-4">{fila.vinilo}</td>
                    <td className="text-center py-4 px-4">{fila.laser}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Materiales Textiles */}
        <div className="mb-16">
          <h2 className="text-3xl font-black text-gray-800 text-center mb-8">Tipos de Tela</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {materialTextil.map((material, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all"
              >
                <div className="text-4xl mb-3">{material.icon}</div>
                <h3 className="font-bold text-lg text-gray-800 mb-2">{material.nombre}</h3>
                <p className="text-sm text-gray-600 mb-4">{material.descripcion}</p>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-700 mb-2">Técnicas compatibles:</p>
                  <div className="flex flex-wrap gap-1">
                    {material.tecnicas.map((tec, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-cyan-50 text-cyan-700 rounded text-xs"
                      >
                        {tec}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-700 mb-2">Ventajas:</p>
                  <ul className="space-y-1">
                    {material.ventajas.map((v, idx) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                        <span className="text-green-500">✓</span>
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <span className="text-sm font-bold text-gray-800">{material.precio}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Guías de Cuidado */}
        <div className="bg-gradient-to-br from-cyan-50 to-purple-50 rounded-3xl p-8 md:p-12 border-2 border-cyan-200 mb-16">
          <h2 className="text-3xl font-black text-gray-800 text-center mb-8">Guías de Cuidado</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {guiasCuidado.map((guia, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="text-4xl mb-4 text-center">{guia.icon}</div>
                <h3 className="font-bold text-lg text-gray-800 mb-4 text-center">
                  {guia.categoria}
                </h3>
                <ul className="space-y-3">
                  {guia.consejos.map((consejo, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-cyan-500 flex-shrink-0 mt-1">✓</span>
                      {consejo}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Visual */}
        <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg mb-16">
          <h2 className="text-2xl font-black text-gray-800 mb-8 text-center">
            Preguntas Frecuentes sobre Materiales
          </h2>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-xl p-6">
              <h3 className="font-bold text-gray-800 mb-2">
                ¿Qué técnica es mejor para mi proyecto?
              </h3>
              <p className="text-sm text-gray-700">
                Depende de varios factores: tipo de producto, cantidad de colores, material,
                durabilidad requerida y presupuesto. Contacta con nosotros y te asesoramos
                gratuitamente.
              </p>
            </div>

            <div className="bg-gradient-to-r from-magenta-50 to-magenta-100 rounded-xl p-6">
              <h3 className="font-bold text-gray-800 mb-2">¿Cuánto duran las impresiones?</h3>
              <p className="text-sm text-gray-700">
                Con los cuidados adecuados, DTF dura 50+ lavados, sublimación es permanente, vinilo
                40+ lavados, y grabado láser es para toda la vida.
              </p>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-6">
              <h3 className="font-bold text-gray-800 mb-2">
                ¿Puedo lavar los productos personalizados en lavadora?
              </h3>
              <p className="text-sm text-gray-700">
                Sí, todos nuestros productos textiles son aptos para lavadora. Recomendamos lavar
                del revés a máximo 30°C y evitar secadora a alta temperatura.
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6">
              <h3 className="font-bold text-gray-800 mb-2">
                ¿Las tintas son seguras y ecológicas?
              </h3>
              <p className="text-sm text-gray-700">
                Sí, utilizamos tintas certificadas sin sustancias tóxicas, aptas para contacto con
                piel y alimentos. Cumplimos con todas las normativas europeas.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-cyan-50 via-purple-50 to-pink-50 rounded-3xl p-8 md:p-12 text-center border-2 border-cyan-200 mb-12">
          <h2 className="text-3xl font-black text-gray-800 mb-4">
            ¿Necesitas asesoramiento personalizado?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Nuestro equipo te ayudará a elegir la mejor técnica y material para tu proyecto
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/contacto"
              className="px-8 py-4 bg-gradient-rainbow text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              📧 Contactar Ahora
            </a>
            <a
              href="/como-funciona"
              className="px-8 py-4 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-300 hover:border-cyan-500 transform hover:scale-105 transition-all duration-300"
            >
              🎨 Cómo Personalizar
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              Resuelve todas tus dudas sobre productos y procesos
            </p>
          </a>

          <a
            href="/productos"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">🛍️</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Ver Productos
            </h3>
            <p className="text-sm text-gray-600">Explora nuestro catálogo completo de productos</p>
          </a>
        </div>
      </div>
    </div>
  );
}
