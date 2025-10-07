import { useState } from 'react';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

export default function FAQComponent() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const faqs: FAQ[] = [
    // Pedidos y Personalización
    {
      category: 'pedidos',
      question: '¿Cómo puedo personalizar un producto?',
      answer: 'Es muy sencillo: Selecciona el producto que te guste, haz clic en "Personalizar", sube tu logo o imagen, añade texto si lo deseas, y previsualiza el resultado en tiempo real. Una vez satisfecho con el diseño, agrégalo al carrito y procede con la compra. Nuestro equipo revisará tu diseño antes de producirlo.'
    },
    {
      category: 'pedidos',
      question: '¿Puedo ver el diseño antes de la producción?',
      answer: 'Sí, absolutamente. Una vez que hagas tu pedido, te enviaremos una prueba digital para tu aprobación en un plazo de 24 horas. No comenzaremos la producción hasta que apruebes el diseño final. Puedes solicitar cambios sin costo adicional.'
    },
    {
      category: 'pedidos',
      question: '¿Qué formatos de archivo aceptan?',
      answer: 'Aceptamos PNG, JPG, PDF, AI, SVG, EPS y PSD. Para mejores resultados, recomendamos archivos en alta resolución (mínimo 300 DPI) con fondo transparente. Si tu archivo no cumple los requisitos, nuestro equipo de diseño puede ayudarte a optimizarlo.'
    },
    {
      category: 'pedidos',
      question: '¿Puedo hacer cambios después de confirmar mi pedido?',
      answer: 'Sí, puedes hacer cambios antes de que aprobemos la prueba digital y comencemos la producción. Una vez iniciada la fabricación, no será posible realizar modificaciones. Te recomendamos revisar cuidadosamente tu pedido antes de la aprobación final.'
    },
    
    // Envíos y Entregas
    {
      category: 'envios',
      question: '¿Cuánto tarda la producción y el envío?',
      answer: 'La producción tarda entre 3-5 días hábiles dependiendo del producto y la técnica de personalización. El envío estándar tarda 2-3 días adicionales. Ofrecemos opciones de envío express (24-48h) y urgente (24h) por un coste adicional.'
    },
    {
      category: 'envios',
      question: '¿Hacen envíos a toda España?',
      answer: 'Sí, enviamos a toda España peninsular y Baleares. Para envíos a Canarias, Ceuta y Melilla, consulta las condiciones especiales en nuestra página de envíos. También realizamos envíos internacionales a la Unión Europea.'
    },
    {
      category: 'envios',
      question: '¿El envío es gratuito?',
      answer: 'El envío estándar es gratuito en pedidos superiores a 50€. Para pedidos inferiores, el coste de envío es de 5.99€. Los envíos express y urgentes tienen un coste adicional independientemente del importe del pedido.'
    },
    {
      category: 'envios',
      question: '¿Puedo hacer seguimiento de mi pedido?',
      answer: 'Sí, una vez que tu pedido sea enviado, recibirás un email con el número de seguimiento. Podrás consultar el estado de tu envío en tiempo real desde tu cuenta en la sección "Mis Pedidos" o directamente con la empresa de transporte.'
    },

    // Pagos y Facturación
    {
      category: 'pagos',
      question: '¿Qué métodos de pago aceptan?',
      answer: 'Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express), PayPal, transferencia bancaria y pago contra reembolso. Todos los pagos con tarjeta están protegidos con tecnología de encriptación SSL.'
    },
    {
      category: 'pagos',
      question: '¿Emiten factura?',
      answer: 'Sí, emitimos factura para todos los pedidos. Si necesitas factura con tus datos fiscales (NIF/CIF), asegúrate de incluir esta información durante el proceso de compra. La factura se enviará por email una vez completado el pedido.'
    },
    {
      category: 'pagos',
      question: '¿Puedo solicitar un presupuesto para pedidos grandes?',
      answer: 'Por supuesto. Para pedidos corporativos o de gran volumen (más de 50 unidades), contáctanos a través del formulario de contacto o llámanos al 645 341 452. Te prepararemos un presupuesto personalizado con descuentos por cantidad.'
    },

    // Productos y Técnicas
    {
      category: 'productos',
      question: '¿Qué técnicas de personalización utilizan?',
      answer: 'Utilizamos diversas técnicas según el producto: impresión DTF y vinilo para textiles, sublimación para tazas y vajilla, UV DTF para superficies rígidas, corte y grabado láser para madera y metal, impresión offset y digital para papelería, e impresión 3D en resina y filamento.'
    },
    {
      category: 'productos',
      question: '¿Cuál es la calidad de los materiales?',
      answer: 'Trabajamos únicamente con materiales de primera calidad certificados. Todos nuestros productos textiles son 100% algodón o mezclas premium, nuestros vinilos son de larga duración, y utilizamos tintas ecológicas y resistentes al lavado. Ofrecemos garantía de calidad en todos nuestros productos.'
    },
    {
      category: 'productos',
      question: '¿Puedo pedir una muestra antes de hacer un pedido grande?',
      answer: 'Sí, para pedidos corporativos o de gran volumen, podemos preparar una muestra previa. El coste de la muestra se descontará del pedido final si este supera las 25 unidades. Contáctanos para más información.'
    },
    {
      category: 'productos',
      question: '¿Los colores se ven igual que en pantalla?',
      answer: 'Hacemos todo lo posible para que los colores sean fieles, pero pueden existir ligeras variaciones debido a las calibraciones de pantalla y las técnicas de impresión. Si el color es crítico para tu proyecto, te recomendamos solicitar una muestra previa.'
    },

    // Devoluciones y Garantía
    {
      category: 'devoluciones',
      question: '¿Puedo devolver un producto personalizado?',
      answer: 'Los productos personalizados no admiten devolución salvo que presenten defectos de fabricación o no se correspondan con el diseño aprobado. En estos casos, reemplazaremos el producto sin coste adicional. Los productos estándar sin personalizar tienen 30 días de devolución.'
    },
    {
      category: 'devoluciones',
      question: '¿Qué garantía tienen los productos?',
      answer: 'Todos nuestros productos tienen garantía de calidad de 12 meses contra defectos de fabricación. Si un producto personalizado presenta problemas de impresión, decoloración prematura o defectos en el material, lo reemplazaremos sin coste.'
    },
    {
      category: 'devoluciones',
      question: '¿Qué hago si recibo un producto defectuoso?',
      answer: 'Contacta con nosotros inmediatamente a través del email info@imprimarte.com o por teléfono al 645 341 452. Envíanos fotos del producto y una descripción del problema. Resolveremos tu caso en menos de 48 horas, reemplazando el producto o reembolsando el importe.'
    },

    // Diseño y Ayuda
    {
      category: 'diseno',
      question: '¿Ofrecen servicios de diseño gráfico?',
      answer: 'Sí, tenemos un equipo de diseñadores gráficos que pueden crear o adaptar tu diseño. Este servicio tiene un coste adicional que varía según la complejidad. Consulta nuestros precios en la sección de Servicios Digitales o contáctanos para un presupuesto.'
    },
    {
      category: 'diseno',
      question: '¿Puedo usar imágenes de internet?',
      answer: 'Solo puedes usar imágenes que sean de tu propiedad o que tengas licencia para usar comercialmente. No podemos imprimir diseños con copyright de terceros (logos de marcas, personajes, etc.) sin autorización. Te recomendamos usar tus propias fotos o imágenes de bancos gratuitos como Unsplash o Pixabay.'
    },
    {
      category: 'diseno',
      question: '¿Necesito conocimientos de diseño para personalizar?',
      answer: 'No, nuestro sistema de personalización es muy intuitivo. Simplemente arrastra y suelta tu imagen, añade texto, ajusta el tamaño y la posición. Si necesitas ayuda, nuestro equipo está disponible por WhatsApp, email o teléfono para guiarte en el proceso.'
    }
  ];

  const categories = [
    { id: 'all', name: 'Todas', icon: '📋' },
    { id: 'pedidos', name: 'Pedidos', icon: '📦' },
    { id: 'envios', name: 'Envíos', icon: '🚚' },
    { id: 'pagos', name: 'Pagos', icon: '💳' },
    { id: 'productos', name: 'Productos', icon: '✨' },
    { id: 'devoluciones', name: 'Devoluciones', icon: '↩️' },
    { id: 'diseno', name: 'Diseño', icon: '🎨' }
  ];

  const filteredFAQs = activeCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-16 mt-32">
      <div className="container mx-auto px-6">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-rainbow text-white font-bold text-sm rounded-full mb-4">
            <span>❓</span>
            <span>Centro de Ayuda</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4">
            Preguntas Frecuentes
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Encuentra respuestas rápidas a las dudas más comunes sobre nuestros productos y servicios
          </p>
        </div>

        {/* Categories Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                activeCategory === category.id
                  ? 'bg-gradient-primary text-white shadow-lg scale-105'
                  : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-cyan-500'
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            {filteredFAQs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden transition-all duration-300 hover:border-cyan-500"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-gray-800 text-lg">
                    {faq.question}
                  </span>
                  <svg
                    className={`w-6 h-6 text-cyan-500 flex-shrink-0 transition-transform duration-300 ${
                      openIndex === index ? 'rotate-180' : ''
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
                
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    openIndex === index ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <div className="px-6 pb-5 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-16 bg-gradient-to-r from-cyan-50 via-purple-50 to-pink-50 rounded-3xl p-8 md:p-12 text-center border-2 border-cyan-200">
          <h2 className="text-3xl font-black text-gray-800 mb-4">
            ¿No encuentras lo que buscas?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Nuestro equipo está aquí para ayudarte. Contáctanos y resolveremos tus dudas.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="/contacto"
              className="px-8 py-4 bg-gradient-rainbow text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              📧 Enviar Mensaje
            </a>
            <a
              href="https://wa.me/34645341452"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-green-500 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              💬 WhatsApp
            </a>
            <a
              href="tel:+34645341452"
              className="px-8 py-4 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-300 hover:border-cyan-500 transform hover:scale-105 transition-all duration-300"
            >
              📞 Llamar Ahora
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
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
            href="/como-personalizar"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">🎨</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Cómo Personalizar
            </h3>
            <p className="text-sm text-gray-600">
              Guía paso a paso para crear tus diseños perfectos
            </p>
          </a>

          <a
            href="/tiempos-produccion"
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-cyan-500 transition-all duration-300 group"
          >
            <div className="text-4xl mb-3">⏱️</div>
            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-cyan-600">
              Tiempos de Producción
            </h3>
            <p className="text-sm text-gray-600">
              Consulta los plazos de fabricación y entrega
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}