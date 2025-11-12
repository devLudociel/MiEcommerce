// src/components/sections/SocialProof.tsx
import { useState, useEffect } from 'react';

export default function SocialProof() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      id: 1,
      name: 'María González',
      role: 'Cliente verificada',
      image: '👩',
      rating: 5,
      text: '¡Increíble calidad! Pedí camisetas personalizadas para mi equipo y quedaron perfectas. El servicio de atención fue excepcional.',
      date: 'Hace 2 semanas',
    },
    {
      id: 2,
      name: 'Carlos Rodríguez',
      role: 'Compra verificada',
      image: '👨',
      rating: 5,
      text: 'La impresión 3D de mi proyecto superó mis expectativas. Detalles perfectos y entrega rápida. ¡Totalmente recomendado!',
      date: 'Hace 1 mes',
    },
    {
      id: 3,
      name: 'Ana Martínez',
      role: 'Cliente frecuente',
      image: '👩‍🦰',
      rating: 5,
      text: 'Llevo años comprando aquí. Nunca me han fallado. Calidad premium, precios justos y un trato siempre amable.',
      date: 'Hace 3 días',
    },
  ];

  const stats = [
    { value: '1,500+', label: 'Clientes Satisfechos', icon: '😊' },
    { value: '5,000+', label: 'Productos Entregados', icon: '📦' },
    { value: '4.8/5', label: 'Valoración Media', icon: '⭐' },
    { value: '98%', label: 'Tasa de Satisfacción', icon: '💯' },
  ];

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Nuestros clientes nos aman ❤️
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Miles de clientes satisfechos respaldan nuestro trabajo
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2"
            >
              <div className="text-4xl mb-3">{stat.icon}</div>
              <div className="text-3xl font-bold text-gray-800 mb-2">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials Carousel */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-100 to-purple-100 rounded-full blur-3xl opacity-30 -z-10" />

            {/* Quote icon */}
            <div className="text-cyan-200 text-8xl font-serif absolute top-4 left-4 opacity-50">
              "
            </div>

            {/* Testimonial Content */}
            <div className="relative z-10">
              {testimonials.map((testimonial, index) => (
                <div
                  key={testimonial.id}
                  className={`transition-all duration-500 ${
                    index === currentTestimonial
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 absolute inset-0 translate-x-full'
                  }`}
                >
                  {/* Stars */}
                  <div className="flex justify-center mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-3xl">⭐</span>
                    ))}
                  </div>

                  {/* Text */}
                  <p className="text-gray-700 text-xl md:text-2xl text-center leading-relaxed mb-8 font-light italic">
                    {testimonial.text}
                  </p>

                  {/* Author */}
                  <div className="flex flex-col items-center">
                    <div className="text-6xl mb-4">{testimonial.image}</div>
                    <div className="text-center">
                      <div className="font-bold text-gray-800 text-lg">
                        {testimonial.name}
                      </div>
                      <div className="text-cyan-600 text-sm flex items-center justify-center gap-2">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                        {testimonial.role}
                      </div>
                      <div className="text-gray-500 text-xs mt-1">{testimonial.date}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Dots */}
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentTestimonial
                      ? 'bg-cyan-500 w-8'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Ver testimonio ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 flex flex-wrap justify-center items-center gap-8 opacity-70">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-2xl">🔒</span>
            <span className="font-semibold">Pago Seguro</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-2xl">📦</span>
            <span className="font-semibold">Envío Asegurado</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-2xl">💰</span>
            <span className="font-semibold">30 Días Garantía</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-2xl">✅</span>
            <span className="font-semibold">Calidad Verificada</span>
          </div>
        </div>
      </div>
    </section>
  );
}
