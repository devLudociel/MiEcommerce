// src/components/sections/HowItWorks.tsx
export default function HowItWorks() {
  const steps = [
    {
      number: '1',
      icon: '🛍️',
      title: 'Elige tu producto',
      description: 'Explora nuestro catálogo y selecciona el producto que quieres personalizar',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      number: '2',
      icon: '🎨',
      title: 'Personalízalo',
      description: 'Sube tu diseño, añade texto, elige colores y hazlo único a tu estilo',
      color: 'from-purple-500 to-pink-500',
    },
    {
      number: '3',
      icon: '💳',
      title: 'Realiza el pago',
      description: 'Pago 100% seguro con tarjeta, PayPal o usa tu monedero',
      color: 'from-orange-500 to-red-500',
    },
    {
      number: '4',
      icon: '📦',
      title: 'Recíbelo en casa',
      description: 'Envío rápido en 3-5 días laborables. ¡Tracking en tiempo real!',
      color: 'from-green-500 to-teal-500',
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">¿Cómo funciona?</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Es súper fácil. Solo 4 pasos para tener tu producto personalizado
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Connector Line (hidden on mobile, shown on desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-1/2 w-full h-1 bg-gradient-to-r from-gray-300 to-gray-200 -z-10">
                  <div
                    className={`h-full bg-gradient-to-r ${step.color} transition-all duration-1000 group-hover:w-full`}
                    style={{ width: '0%' }}
                  />
                </div>
              )}

              {/* Card */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-cyan-200">
                {/* Step Number */}
                <div className="flex items-center justify-center mb-6">
                  <div
                    className={`w-16 h-16 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-bold text-2xl shadow-lg`}
                  >
                    {step.number}
                  </div>
                </div>

                {/* Icon */}
                <div className="text-6xl text-center mb-4 transform group-hover:scale-110 transition-transform">
                  {step.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-800 text-center mb-3">{step.title}</h3>

                {/* Description */}
                <p className="text-gray-600 text-center text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a
            href="/productos"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-full hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <span>¡Empieza ahora!</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
