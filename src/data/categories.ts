// PERFORMANCE: Static category data moved out of Header component
// Prevents recreation of this 376-line array on every render

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  subcategories: MenuSubcategory[];
}

export interface MenuSubcategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
}

export const categories: MenuCategory[] = [
  {
    id: '1',
    name: 'Productos Gráficos',
    slug: 'graficos-impresos',
    subcategories: [
      {
        id: '1',
        name: 'Tarjetas de Visita',
        slug: 'tarjetas-visita',
        description: 'Standard, cuadradas, mate y brillo',
        icon: '🎴',
      },
      {
        id: '2',
        name: 'Etiquetas y Pegatinas',
        slug: 'etiquetas-pegatinas',
        description: 'Papel, vinilo, UV DTF, formas personalizadas',
        icon: '🏷️',
      },
      {
        id: '3',
        name: 'Carteles para Eventos',
        slug: 'carteles-eventos',
        description: 'Bodas, bautizos, comuniones en vinilo y cartón',
        icon: '📋',
      },
    ],
  },
  {
    id: '2',
    name: 'Productos Textiles',
    slug: 'textiles',
    subcategories: [
      {
        id: '4',
        name: 'Ropa Personalizada',
        slug: 'ropa-personalizada',
        description: 'Camisetas, sudaderas, polos con DTF, vinilo, bordado',
        icon: '👕',
      },
      {
        id: '5',
        name: 'Complementos Textiles',
        slug: 'complementos-textiles',
        description: 'Totebags y otros textiles personalizados',
        icon: '🛍️',
      },
    ],
  },
  {
    id: '3',
    name: 'Papelería',
    slug: 'papeleria',
    subcategories: [
      {
        id: '6',
        name: 'Cuadernos y Libretas',
        slug: 'cuadernos-libretas',
        description: 'Libretas y cuadernos personalizados',
        icon: '📓',
      },
      {
        id: '7',
        name: 'Packaging Corporativo',
        slug: 'packaging-corporativo',
        description: 'Bolsas de papel personalizadas para empresas',
        icon: '📦',
      },
    ],
  },
  {
    id: '4',
    name: 'Sublimación',
    slug: 'sublimados',
    subcategories: [
      {
        id: '8',
        name: 'Vajilla Personalizada',
        slug: 'vajilla-personalizada',
        description: 'Tazas, vasos, termos sublimados y UV DTF',
        icon: '☕',
      },
      {
        id: '9',
        name: 'Decoración Sublimada',
        slug: 'decoracion-sublimada',
        description: 'Cuadros metálicos sublimados con fotos',
        icon: '🖼️',
      },
    ],
  },
  {
    id: '5',
    name: 'Corte Láser',
    slug: 'corte-grabado',
    subcategories: [
      {
        id: '10',
        name: 'Llaveros Personalizados',
        slug: 'llaveros',
        description: 'Llaveros en madera y metal, corte y grabado',
        icon: '🔑',
      },
      {
        id: '11',
        name: 'Decoración en Madera',
        slug: 'decoracion-madera-eventos',
        description: 'Nombres, figuras para bodas y eventos',
        icon: '🌳',
      },
      {
        id: '12',
        name: 'Cuadros de Madera',
        slug: 'cuadros-madera',
        description: 'Cuadros estilo visor con flores preservadas',
        icon: '🌸',
      },
    ],
  },
  {
    id: '6',
    name: 'Eventos',
    slug: 'eventos',
    subcategories: [
      {
        id: '13',
        name: 'Packaging para Eventos',
        slug: 'packaging-eventos',
        description: 'Cajas de chuches, empaques personalizados',
        icon: '🎉',
      },
    ],
  },
  {
    id: '7',
    name: 'Impresión 3D',
    slug: 'impresion-3d',
    subcategories: [
      {
        id: '14',
        name: 'Impresión en Resina',
        slug: 'impresion-resina',
        description: 'Figuras, personajes, personas en alta definición',
        icon: '🎭',
      },
      {
        id: '15',
        name: 'Impresión en Filamento',
        slug: 'impresion-filamento',
        description: 'PLA, ABS, PETG, TPU para piezas funcionales',
        icon: '⚙️',
      },
    ],
  },
  {
    id: '8',
    name: 'Servicios Digitales',
    slug: 'servicios-digitales',
    subcategories: [
      {
        id: '16',
        name: 'Diseño Gráfico',
        slug: 'diseno-grafico',
        description: 'Logos, identidad corporativa, diseños personalizados',
        icon: '🎨',
      },
      {
        id: '17',
        name: 'Desarrollo Web',
        slug: 'desarrollo-web',
        description: 'Páginas web básicas y funcionales',
        icon: '💻',
      },
    ],
  },
];
