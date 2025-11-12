// src/components/sections/CategoriesShowcase.tsx
export default function CategoriesShowcase() {
  const categories = [
    {
      id: 'camisetas',
      name: 'Camisetas',
      icon: '👕',
      description: 'Personalizadas a tu estilo',
      priceFrom: '15',
      image: 'bg-gradient-to-br from-blue-400 to-cyan-500',
      href: '/productos?category=camisetas',
      badge: '¡Popular!',
      badgeColor: 'bg-red-500',
    },
    {
      id: 'sudaderas',
      name: 'Sudaderas',
      icon: '🧥',
      description: 'Comodidad y diseño',
      priceFrom: '25',
      image: 'bg-gradient-to-br from-purple-400 to-pink-500',
      href: '/productos?category=sudaderas',
    },
    {
      id: 'marcos',
      name: 'Marcos',
      icon: '🖼️',
      description: 'Decora tus momentos',
      priceFrom: '20',
      image: 'bg-gradient-to-br from-orange-400 to-red-500',
      href: '/productos?category=marcos',
    },
    {
      id: 'tazas',
      name: 'Tazas',
      icon: '☕',
      description: 'Empieza el día con estilo',
      priceFrom: '8',
      image: 'bg-gradient-to-br from-green-400 to-teal-500',
      href: '/productos?category=tazas',
      badge: 'Nuevo',
      badgeColor: 'bg-green-500',
    },
    {
      id: 'resina',
      name: 'Cajas Resina',
      icon: '💎',
      description: 'Regalos únicos 3D',
      priceFrom: '35',
      image: 'bg-gradient-to-br from-indigo-400 to-purple-500',
      href: '/productos?category=resina',
    },
    {
      id: 'regalos',
      name: 'Regalos',
      icon: '🎁',
      description: 'Ideas especiales',
      priceFrom: '10',
      image: 'bg-gradient-to-br from-pink-400 to-rose-500',
      href: '/productos?category=regalos',
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Explora nuestras categorías
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Encuentra el producto perfecto para personalizar
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((category, index) => (
            <a
              key={category.id}
              href={category.href}
              className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:-translate-y-2 border-2 border-gray-100 hover:border-cyan-200"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Badge */}
              {category.badge && (
                <div className="absolute top-4 right-4 z-10">
                  <span
                    className={`${category.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse`}
                  >
                    {category.badge}
                  </span>
                </div>
              )}

              {/* Image/Gradient Background */}
              <div
                className={`${category.image} h-48 flex items-center justify-center relative overflow-hidden`}
              >
                {/* Icon */}
                <div className="text-9xl transform group-hover:scale-125 transition-transform duration-500 filter drop-shadow-2xl">
                  {category.icon}
                </div>

                {/* Overlay effect on hover */}
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-cyan-600 transition-colors">
                  {category.name}
                </h3>
                <p className="text-gray-600 mb-4 text-sm">{category.description}</p>

                {/* Price */}
                <div className="flex items-center justify-between">
                  <div className="text-cyan-600 font-bold text-lg">
                    Desde €{category.priceFrom}
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 group-hover:text-cyan-500 transition-colors">
                    <span className="text-sm font-semibold">Ver más</span>
                    <svg
                      className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Hover shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
            </a>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center mt-12">
          <a
            href="/productos"
            className="inline-flex items-center gap-2 px-8 py-4 border-2 border-cyan-500 text-cyan-600 font-semibold rounded-full hover:bg-cyan-500 hover:text-white transform hover:scale-105 transition-all duration-300"
          >
            <span>Ver todos los productos</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
