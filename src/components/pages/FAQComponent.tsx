import { useState, useEffect } from 'react';
import { getActiveFAQs, getAllCategories, type FAQ, type FAQCategory } from '../../lib/faqs';

// Default FAQs for fallback
const defaultFAQs: Omit<FAQ, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    category: 'pedidos',
    question: '¿Cómo puedo personalizar un producto?',
    answer:
      'Es muy sencillo: Selecciona el producto que te guste, haz clic en "Personalizar", sube tu logo o imagen, añade texto si lo deseas, y previsualiza el resultado en tiempo real.',
    order: 0,
    active: true,
  },
  {
    category: 'envios',
    question: '¿Cuánto tarda la producción y el envío?',
    answer:
      'La producción tarda entre 3-5 días hábiles. El envío estándar tarda 2-3 días adicionales.',
    order: 1,
    active: true,
  },
  {
    category: 'pagos',
    question: '¿Qué métodos de pago aceptan?',
    answer:
      'Aceptamos tarjetas de crédito y débito, PayPal, transferencia bancaria y pago contra reembolso.',
    order: 2,
    active: true,
  },
];

const defaultCategories: Omit<FAQCategory, 'id'>[] = [
  { name: 'Pedidos', icon: '📦', order: 0 },
  { name: 'Envíos', icon: '🚚', order: 1 },
  { name: 'Pagos', icon: '💳', order: 2 },
  { name: 'Productos', icon: '✨', order: 3 },
  { name: 'Devoluciones', icon: '↩️', order: 4 },
  { name: 'Diseño', icon: '🎨', order: 5 },
];

export default function FAQComponent() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [faqs, setFaqs] = useState<Omit<FAQ, 'id' | 'createdAt' | 'updatedAt'>[]>(defaultFAQs);
  const [categories, setCategories] = useState<Omit<FAQCategory, 'id'>[]>(defaultCategories);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [loadedFAQs, loadedCategories] = await Promise.all([
          getActiveFAQs(),
          getAllCategories(),
        ]);

        if (loadedFAQs.length > 0) {
          setFaqs(loadedFAQs);
        }
        if (loadedCategories.length > 0) {
          setCategories(loadedCategories);
        }
      } catch (error) {
        console.error('Error loading FAQs:', error);
        // Keep using defaults on error
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const allCategories = [
    { id: 'all', name: 'Todas', icon: '📋' },
    ...categories.map((c) => ({
      id: c.name.toLowerCase(),
      name: c.name,
      icon: c.icon,
    })),
  ];

  const filteredFAQs =
    activeCategory === 'all' ? faqs : faqs.filter((faq) => faq.category === activeCategory);

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
            Encuentra respuestas rápidas a las dudas más comunes sobre nuestros productos y
            servicios
          </p>
        </div>

        {/* Categories Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {allCategories.map((category) => (
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
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando preguntas...</p>
            </div>
          ) : (
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
                    <span className="font-bold text-gray-800 text-lg">{faq.question}</span>
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
          )}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 bg-gradient-to-r from-cyan-50 via-purple-50 to-pink-50 rounded-3xl p-8 md:p-12 text-center border-2 border-cyan-200">
          <h2 className="text-3xl font-black text-gray-800 mb-4">¿No encuentras lo que buscas?</h2>
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
            <p className="text-sm text-gray-600">Consulta los plazos de fabricación y entrega</p>
          </a>
        </div>
      </div>
    </div>
  );
}
