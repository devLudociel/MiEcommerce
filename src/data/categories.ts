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
  href?: string; // optional direct link override
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
      {
        id: '26',
        name: 'Calendarios Personalizados',
        slug: 'calendarios',
        description: 'Calendarios de pared, escritorio y bolsillo con tus fotos',
        icon: '📅',
      },
      {
        id: '27',
        name: 'Flyers y Folletos',
        slug: 'flyers-folletos',
        description: 'Flyers A5, A6, trípticos y dípticos',
        icon: '📰',
      },
      {
        id: '28',
        name: 'Imanes Personalizados',
        slug: 'imanes',
        description: 'Imanes de nevera con tu foto o diseño',
        icon: '🧲',
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
      {
        id: '29',
        name: 'Gorras y Caps',
        slug: 'gorras-caps',
        description: 'Snapback, trucker, dad hat con bordado o vinilo',
        icon: '🧢',
      },
      {
        id: '30',
        name: 'Delantales',
        slug: 'delantales',
        description: 'Delantales de cocina, BBQ y artista personalizados',
        icon: '👨‍🍳',
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
      {
        id: '31',
        name: 'Cojines Personalizados',
        slug: 'cojines',
        description: 'Cojines sublimados con tu foto en varias formas',
        icon: '🛋️',
      },
      {
        id: '32',
        name: 'Puzzles Personalizados',
        slug: 'puzzles',
        description: 'Puzzles con tu foto de 30 a 1000 piezas',
        icon: '🧩',
      },
      {
        id: '33',
        name: 'Fundas de Móvil',
        slug: 'fundas-movil',
        description: 'Fundas personalizadas para iPhone, Samsung, Xiaomi',
        icon: '📱',
      },
      {
        id: '34',
        name: 'Alfombrillas de Ratón',
        slug: 'alfombrillas-raton',
        description: 'Alfombrillas sublimadas con tu diseño',
        icon: '🖱️',
      },
      {
        id: '35',
        name: 'Posavasos',
        slug: 'posavasos',
        description: 'Posavasos de cerámica y corcho sublimados',
        icon: '🍵',
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
        description: 'Llaveros en madera, acrílico y metal grabados',
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
      {
        id: '36',
        name: 'Placas para Mascotas',
        slug: 'placas-mascotas',
        description: 'Placas identificativas grabadas para perros y gatos',
        icon: '🐾',
      },
      {
        id: '37',
        name: 'Señalización',
        slug: 'senalizacion',
        description: 'Carteles y señales grabadas para oficina y hogar',
        icon: '🪧',
      },
      {
        id: '38',
        name: 'Cajas de Madera',
        slug: 'cajas-madera',
        description: 'Cajas de madera grabadas para regalo y almacenaje',
        icon: '📦',
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
      {
        id: '40',
        name: 'Invitaciones',
        slug: 'invitaciones',
        description: 'Invitaciones personalizadas para todo tipo de eventos',
        icon: '💌',
      },
      {
        id: '41',
        name: 'Banderines y Guirnaldas',
        slug: 'banderines-guirnaldas',
        description: 'Decoración personalizada para celebraciones',
        icon: '🎊',
      },
      {
        id: '42',
        name: 'Meseros y Números de Mesa',
        slug: 'meseros',
        description: 'Numeración de mesas para bodas y eventos',
        icon: '🔢',
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
      {
        id: '43',
        name: 'Figuras Personalizadas',
        slug: 'figuras-3d',
        description: 'Bustos, miniaturas y figuras a partir de fotos',
        icon: '👤',
      },
      {
        id: '44',
        name: 'Maquetas y Prototipos',
        slug: 'maquetas-prototipos',
        description: 'Maquetas arquitectónicas y prototipos funcionales',
        icon: '🏗️',
      },
      {
        id: '45',
        name: 'Figuras Gaming/Anime',
        slug: 'figuras-gaming',
        description: 'Figuras de personajes de videojuegos y anime',
        icon: '🎮',
      },
    ],
  },
  {
    id: '8',
    name: 'Packaging Personalizado',
    slug: 'packaging',
    subcategories: [
      {
        id: '18',
        name: 'Cajas Personalizadas',
        slug: 'cajas-personalizadas',
        description: 'Cajas de cartón, kraft, rígidas para productos',
        icon: '📦',
      },
      {
        id: '19',
        name: 'Bolsas de Papel',
        slug: 'bolsas-papel',
        description: 'Bolsas kraft, estucadas, con asa para tiendas',
        icon: '🛍️',
      },
      {
        id: '20',
        name: 'Bolsas de Tela',
        slug: 'bolsas-tela',
        description: 'Totebags, bolsas algodón personalizadas',
        icon: '👜',
      },
      {
        id: '21',
        name: 'Packaging para Eventos',
        slug: 'packaging-eventos',
        description: 'Cajas de chuches, detalles de boda, comuniones',
        icon: '🎁',
      },
      {
        id: '22',
        name: 'Etiquetas Adhesivas',
        slug: 'etiquetas-adhesivas',
        description: 'Etiquetas para productos, logos, ingredientes',
        icon: '🏷️',
      },
      {
        id: '23',
        name: 'Papel de Regalo',
        slug: 'papel-regalo',
        description: 'Papel personalizado, tisú, de seda',
        icon: '🎀',
      },
    ],
  },
  {
    id: '9',
    name: 'Servicios Digitales',
    slug: 'servicios-digitales',
    subcategories: [
      {
        id: '24',
        name: 'Diseño Gráfico',
        slug: 'diseno-grafico',
        description: 'Logos, identidad corporativa, diseños personalizados',
        icon: '🎨',
      },
      {
        id: '25',
        name: 'Desarrollo Web',
        slug: 'desarrollo-web',
        description: 'Páginas web básicas y funcionales',
        icon: '💻',
      },
      {
        id: '18',
        name: 'Productos Digitales',
        slug: 'productos-digitales',
        description: 'Plantillas y recursos descargables al instante',
        icon: '🪄',
        href: '/productos/digitales',
      },
    ],
  },
];
