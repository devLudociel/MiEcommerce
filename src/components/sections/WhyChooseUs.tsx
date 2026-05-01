// src/components/sections/WhyChooseUs.tsx
import { Zap, Sparkles, BadgeCheck, Palette, Tag, Trophy } from 'lucide-react';

export default function WhyChooseUs() {
  const features = [
    {
      icon: <Zap size={28} />,
      title: 'Entrega Rápida',
      description: 'Recibe tus productos en 24–72h en La Palma. Envíos a toda Canarias.',
      color: 'from-yellow-400 to-orange-500',
    },
    {
      icon: <Sparkles size={28} />,
      title: 'Calidad Premium',
      description: 'Utilizamos materiales de primera calidad y tecnología de última generación.',
      color: 'from-purple-400 to-pink-500',
    },
    {
      icon: <BadgeCheck size={28} />,
      title: 'Satisfacción garantizada',
      description: 'Si algo no te convence, lo repetimos. Trabajamos hasta que quede perfecto.',
      color: 'from-green-400 to-cyan-500',
    },
    {
      icon: <Palette size={28} />,
      title: 'Diseño Personalizado',
      description: 'Crea diseños únicos con nuestro editor online o envíanos tu idea y la hacemos realidad.',
      color: 'from-blue-400 to-indigo-500',
    },
    {
      icon: <Tag size={28} />,
      title: 'Precios justos',
      description: 'Precios competitivos sin comprometer la calidad. Descuentos en pedidos grandes.',
      color: 'from-red-400 to-pink-500',
    },
    {
      icon: <Trophy size={28} />,
      title: 'Taller local en La Palma',
      description: 'Somos de aquí. Puedes venir a vernos, hablar con quien hace tu pedido.',
      color: 'from-cyan-400 to-blue-500',
    },
  ];

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-200 to-blue-200 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block mb-4">
            <span className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-bold uppercase tracking-wider rounded-full shadow-lg">
              ¿Por qué elegirnos?
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Tu mejor opción en personalización
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Combinamos calidad, rapidez y precio para ofrecerte la mejor experiencia en
            personalización
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100"
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Icon Container */}
              <div
                className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl mb-6 text-white shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}
              >
                {feature.icon}
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-cyan-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>

              {/* Decorative Gradient Border on Hover */}
              <div
                className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
                style={{
                  background: `linear-gradient(135deg, transparent 0%, transparent 100%)`,
                  border: '2px solid transparent',
                  backgroundClip: 'padding-box',
                }}
              >
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-20 blur-xl`}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500 mb-2">
              10+
            </div>
            <div className="text-gray-600 font-medium">Años de experiencia</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 mb-2">
              5,000+
            </div>
            <div className="text-gray-600 font-medium">Productos entregados</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-cyan-500 mb-2">
              1,500+
            </div>
            <div className="text-gray-600 font-medium">Clientes satisfechos</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 mb-2">
              4.8/5
            </div>
            <div className="text-gray-600 font-medium">Valoración media</div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <a
            href="/productos"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-full hover:from-cyan-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <span>Comienza tu proyecto</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
