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
      href: '/productos?tag=camisetas', // ✅ Cambiado de category a tag
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
      href: '/productos?tag=sudaderas', // ✅ Cambiado de category a tag
    },
    {
      id: 'marcos',
      name: 'Marcos',
      icon: '🖼️',
      description: 'Decora tus momentos',
      priceFrom: '20',
      image: 'bg-gradient-to-br from-orange-400 to-red-500',
      href: '/productos?tag=marcos', // ✅ Cambiado de category a tag
    },
    {
      id: 'tazas',
      name: 'Tazas',
      icon: '☕',
      description: 'Empieza el día con estilo',
      priceFrom: '8',
      image: 'bg-gradient-to-br from-green-400 to-teal-500',
      href: '/productos?tag=tazas', // ✅ Cambiado de category a tag
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
      href: '/productos?tag=resina', // ✅ Cambiado de category a tag
    },
    {
      id: 'regalos',
      name: 'Regalos',
      icon: '🎁',
      description: 'Ideas especiales',
      priceFrom: '10',
      image: 'bg-gradient-to-br from-pink-400 to-rose-500',
      href: '/productos?tag=regalos', // ✅ Cambiado de category a tag
    },
  ];

  return (
    <section className="py-10 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header - Responsive */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-2 sm:mb-4">
            Explora nuestras categorías
          </h2>
          <p className="text-sm sm:text-base lg:text-xl text-gray-600 max-w-2xl mx-auto px-2">
            Encuentra el producto perfecto para personalizar
          </p>
        </div>

        {/* Categories Grid - Responsive con scroll horizontal en móvil muy pequeño */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-8">
          {categories.map((category, index) => (
            <a
              key={category.id}
              href={category.href}
              className="group relative bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl shadow-md hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:-translate-y-1 sm:hover:-translate-y-2 border border-gray-100 sm:border-2 hover:border-cyan-200 active:scale-[0.98]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Badge */}
              {category.badge && (
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
                  <span
                    className={`${category.badgeColor} text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full shadow-lg animate-pulse`}
                  >
                    {category.badge}
                  </span>
                </div>
              )}

              {/* Image/Gradient Background - Altura responsive */}
              <div
                className={`${category.image} h-28 sm:h-36 lg:h-48 flex items-center justify-center relative overflow-hidden`}
              >
                {/* Icon - Tamaño responsive */}
                <div className="text-5xl sm:text-7xl lg:text-9xl transform group-hover:scale-110 sm:group-hover:scale-125 transition-transform duration-500 filter drop-shadow-2xl">
                  {category.icon}
                </div>

                {/* Overlay effect on hover */}
                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              </div>

              {/* Content - Padding responsive */}
              <div className="p-3 sm:p-4 lg:p-6">
                <h3 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-800 mb-1 sm:mb-2 group-hover:text-cyan-600 transition-colors leading-tight">
                  {category.name}
                </h3>
                <p className="text-gray-600 mb-2 sm:mb-4 text-xs sm:text-sm line-clamp-2 sm:line-clamp-none">
                  {category.description}
                </p>

                {/* Price - Layout responsive */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <div className="text-cyan-600 font-bold text-sm sm:text-base lg:text-lg">
                    Desde €{category.priceFrom}
                  </div>
                  <div className="flex items-center gap-1 text-gray-400 group-hover:text-cyan-500 transition-colors">
                    <span className="text-xs sm:text-sm font-semibold">Ver más</span>
                    <svg
                      className="w-3 h-3 sm:w-4 sm:h-4 transform group-hover:translate-x-1 transition-transform"
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

              {/* Hover shine effect - Solo desktop */}
              <div className="hidden sm:block absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </div>
            </a>
          ))}
        </div>

        {/* View All CTA - Responsive */}
        <div className="text-center mt-8 sm:mt-10 lg:mt-12">
          <a
            href="/productos"
            className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-8 sm:py-4 border-2 border-cyan-500 text-cyan-600 text-sm sm:text-base font-semibold rounded-full hover:bg-cyan-500 hover:text-white transform hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <span>Ver todos los productos</span>
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
