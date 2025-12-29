# Productos y Templates Propuestos para ImprimeArte

## 📊 Estado Actual

### Categorías Existentes (9)
1. Productos Gráficos
2. Productos Textiles
3. Papelería
4. Sublimación
5. Corte Láser
6. Eventos
7. Impresión 3D
8. Packaging Personalizado
9. Servicios Digitales

### Templates de Personalización Existentes (11)
- `candy_box` - Cajas de chuches
- `event_invitation` - Invitaciones
- `mug_customization` - Tazas
- `cajas-personalizadas` - Cajas
- `bolsas-papel` - Bolsas de papel
- `etiquetas-adhesivas` - Etiquetas
- Camisetas, Cuadros, Figuras Resina, Hoodies, Tote Bags

---

## 🆕 PRODUCTOS SUGERIDOS PARA AÑADIR

### 📁 Categoría: Productos Gráficos
| Producto | Descripción | Prioridad |
|----------|-------------|-----------|
| **Flyers/Folletos** | A5, A6, trípticos | Alta |
| **Catálogos** | Encuadernados, grapados | Media |
| **Calendarios** | Pared, escritorio, bolsillo | Alta |
| **Postales** | Estándar, premium | Media |
| **Imanes** | Nevera, coche | Media |

### 📁 Categoría: Productos Textiles
| Producto | Descripción | Prioridad |
|----------|-------------|-----------|
| **Gorras/Caps** | Snapback, trucker, dad hat | Alta |
| **Delantales** | Cocina, BBQ, artista | Media |
| **Baberos** | Bebé personalizados | Media |
| **Calcetines** | Sublimación full print | Baja |
| **Mascarillas** | Tela reutilizables | Baja |

### 📁 Categoría: Sublimación
| Producto | Descripción | Prioridad |
|----------|-------------|-----------|
| **Cojines** | Varios tamaños, formas | Alta |
| **Puzzles** | 100, 500, 1000 piezas | Alta |
| **Alfombrillas ratón** | Varios tamaños | Media |
| **Posavasos** | Cerámica, corcho | Media |
| **Fundas móvil** | iPhone, Samsung, etc. | Alta |
| **Botellas/Termos** | Acero, aluminio | Media |

### 📁 Categoría: Corte Láser / Grabado
| Producto | Descripción | Prioridad |
|----------|-------------|-----------|
| **Placas identificativas** | Mascotas, maletas | Alta |
| **Señalización** | Oficina, hogar | Media |
| **Joyería** | Pendientes, colgantes madera | Media |
| **Porta alianzas** | Bodas | Media |
| **Cajas de madera** | Regalo, almacenaje | Alta |

### 📁 Categoría: Eventos
| Producto | Descripción | Prioridad |
|----------|-------------|-----------|
| **Photocalls** | Bodas, cumpleaños | Alta |
| **Banderines** | Guirnaldas personalizadas | Media |
| **Meseros/Números mesa** | Bodas, eventos | Media |
| **Libro de firmas** | Personalizado | Media |
| **Bengalas frías** | Etiqueta personalizada | Baja |

### 📁 Categoría: Papelería
| Producto | Descripción | Prioridad |
|----------|-------------|-----------|
| **Agendas** | Anuales personalizadas | Alta |
| **Planificadores** | Semanales, mensuales | Media |
| **Blocs de notas** | Con logo/diseño | Media |
| **Sobres personalizados** | Varios tamaños | Media |
| **Papel de carta** | Membretado | Media |

### 📁 Categoría: Impresión 3D
| Producto | Descripción | Prioridad |
|----------|-------------|-----------|
| **Bustos personalizados** | A partir de foto | Alta |
| **Maquetas arquitectura** | Edificios, casas | Media |
| **Prototipos** | Diseño industrial | Media |
| **Figuras anime/gaming** | Personajes | Media |
| **Piezas de repuesto** | Funcionales | Baja |

---

## 🎨 TEMPLATES DE PERSONALIZACIÓN PROPUESTOS

### 1. Template: Tarjetas de Visita
**ID:** `business_cards`
```typescript
{
  id: 'business_cards',
  name: 'Tarjetas de Visita',
  description: 'Personalización de tarjetas de visita profesionales',
  fields: [
    {
      id: 'card_format',
      type: 'card_selector',
      label: 'Formato de tarjeta',
      required: true,
      options: [
        { value: 'standard', label: 'Estándar (85x55mm)', image: '/templates/card-standard.png' },
        { value: 'square', label: 'Cuadrada (55x55mm)', image: '/templates/card-square.png', priceModifier: 2 },
        { value: 'mini', label: 'Mini (70x28mm)', image: '/templates/card-mini.png' },
        { value: 'xl', label: 'XL (90x55mm)', image: '/templates/card-xl.png', priceModifier: 3 }
      ]
    },
    {
      id: 'paper_type',
      type: 'card_selector',
      label: 'Tipo de papel',
      required: true,
      options: [
        { value: 'mate_350', label: 'Mate 350g', image: '/templates/paper-mate.png' },
        { value: 'brillo_350', label: 'Brillo 350g', image: '/templates/paper-brillo.png' },
        { value: 'lino', label: 'Textura Lino', priceModifier: 5 },
        { value: 'kraft', label: 'Kraft Ecológico', priceModifier: 3 },
        { value: 'premium_400', label: 'Premium 400g', priceModifier: 8 }
      ]
    },
    {
      id: 'finish',
      type: 'card_selector',
      label: 'Acabado especial',
      required: false,
      options: [
        { value: 'none', label: 'Sin acabado especial' },
        { value: 'laminate_mate', label: 'Plastificado Mate', priceModifier: 10 },
        { value: 'laminate_brillo', label: 'Plastificado Brillo', priceModifier: 10 },
        { value: 'soft_touch', label: 'Soft Touch', priceModifier: 15 },
        { value: 'uv_selective', label: 'Barniz UV Selectivo', priceModifier: 25 },
        { value: 'foil_gold', label: 'Stamping Dorado', priceModifier: 40 },
        { value: 'foil_silver', label: 'Stamping Plateado', priceModifier: 40 }
      ]
    },
    {
      id: 'corners',
      type: 'radio_group',
      label: 'Esquinas',
      required: true,
      options: [
        { value: 'square', label: 'Rectas' },
        { value: 'rounded', label: 'Redondeadas', priceModifier: 3 }
      ]
    },
    {
      id: 'print_sides',
      type: 'radio_group',
      label: 'Impresión',
      required: true,
      options: [
        { value: 'one_side', label: 'Una cara' },
        { value: 'two_sides', label: 'Dos caras', priceModifier: 15 }
      ]
    },
    {
      id: 'design_front',
      type: 'image_upload',
      label: 'Diseño cara frontal',
      required: true,
      helpText: 'Sube tu diseño en alta resolución (300 DPI mínimo)'
    },
    {
      id: 'design_back',
      type: 'image_upload',
      label: 'Diseño cara trasera',
      required: false,
      condition: { field: 'print_sides', value: 'two_sides' }
    },
    {
      id: 'quantity',
      type: 'dropdown',
      label: 'Cantidad',
      required: true,
      isQuantityMultiplier: true,
      options: [
        { value: '100', label: '100 unidades', unitPriceOverride: 0.15 },
        { value: '250', label: '250 unidades', unitPriceOverride: 0.10 },
        { value: '500', label: '500 unidades', unitPriceOverride: 0.08 },
        { value: '1000', label: '1000 unidades', unitPriceOverride: 0.06 },
        { value: '2500', label: '2500 unidades', unitPriceOverride: 0.04 }
      ]
    }
  ]
}
```

---

### 2. Template: Gorras Personalizadas
**ID:** `custom_caps`
```typescript
{
  id: 'custom_caps',
  name: 'Gorras Personalizadas',
  description: 'Personalización de gorras y caps',
  fields: [
    {
      id: 'cap_style',
      type: 'card_selector',
      label: 'Estilo de gorra',
      required: true,
      options: [
        { value: 'snapback', label: 'Snapback', image: '/templates/cap-snapback.png' },
        { value: 'trucker', label: 'Trucker (malla)', image: '/templates/cap-trucker.png' },
        { value: 'dad_hat', label: 'Dad Hat', image: '/templates/cap-dad.png' },
        { value: 'fitted', label: 'Fitted (ajustada)', image: '/templates/cap-fitted.png', priceModifier: 5 },
        { value: 'bucket', label: 'Bucket Hat', image: '/templates/cap-bucket.png', priceModifier: 3 }
      ]
    },
    {
      id: 'color',
      type: 'color_selector',
      label: 'Color de la gorra',
      required: true,
      options: [
        { value: 'black', label: 'Negro', color: '#000000' },
        { value: 'white', label: 'Blanco', color: '#FFFFFF' },
        { value: 'navy', label: 'Azul Marino', color: '#1a365d' },
        { value: 'red', label: 'Rojo', color: '#e53e3e' },
        { value: 'gray', label: 'Gris', color: '#718096' },
        { value: 'green', label: 'Verde', color: '#38a169' },
        { value: 'camo', label: 'Camuflaje', color: '#4a5568', image: '/templates/camo-pattern.png' }
      ]
    },
    {
      id: 'personalization_type',
      type: 'card_selector',
      label: 'Tipo de personalización',
      required: true,
      options: [
        { value: 'embroidery', label: 'Bordado', image: '/templates/embroidery.png', priceModifier: 8 },
        { value: 'vinyl', label: 'Vinilo textil', image: '/templates/vinyl.png' },
        { value: 'dtf', label: 'DTF (Full color)', image: '/templates/dtf.png', priceModifier: 3 },
        { value: 'sublimation', label: 'Sublimación (solo blanca)', image: '/templates/sublimation.png' }
      ]
    },
    {
      id: 'design_position',
      type: 'card_selector',
      label: 'Posición del diseño',
      required: true,
      options: [
        { value: 'front_center', label: 'Frontal centrado' },
        { value: 'front_left', label: 'Frontal izquierda' },
        { value: 'side_left', label: 'Lateral izquierdo', priceModifier: 2 },
        { value: 'side_right', label: 'Lateral derecho', priceModifier: 2 },
        { value: 'back', label: 'Trasera', priceModifier: 3 }
      ]
    },
    {
      id: 'design',
      type: 'image_upload',
      label: 'Tu diseño/logo',
      required: true,
      helpText: 'Para bordado: máximo 3 colores. PNG o SVG recomendado.'
    },
    {
      id: 'text_below',
      type: 'text_input',
      label: 'Texto adicional (opcional)',
      required: false,
      placeholder: 'Ej: Tu nombre, equipo, empresa...',
      priceModifier: 3
    },
    {
      id: 'quantity',
      type: 'dropdown',
      label: 'Cantidad',
      required: true,
      isQuantityMultiplier: true,
      options: [
        { value: '1', label: '1 unidad', unitPriceOverride: 18 },
        { value: '5', label: '5 unidades', unitPriceOverride: 15 },
        { value: '10', label: '10 unidades', unitPriceOverride: 12 },
        { value: '25', label: '25 unidades', unitPriceOverride: 10 },
        { value: '50', label: '50 unidades', unitPriceOverride: 8 }
      ]
    }
  ]
}
```

---

### 3. Template: Cojines Personalizados
**ID:** `custom_cushions`
```typescript
{
  id: 'custom_cushions',
  name: 'Cojines Personalizados',
  description: 'Cojines sublimados con tu foto o diseño',
  fields: [
    {
      id: 'cushion_shape',
      type: 'card_selector',
      label: 'Forma del cojín',
      required: true,
      options: [
        { value: 'square_40', label: 'Cuadrado 40x40cm', image: '/templates/cushion-square.png' },
        { value: 'square_50', label: 'Cuadrado 50x50cm', priceModifier: 5 },
        { value: 'rectangular', label: 'Rectangular 30x50cm' },
        { value: 'heart', label: 'Corazón', image: '/templates/cushion-heart.png', priceModifier: 3 },
        { value: 'round', label: 'Redondo', image: '/templates/cushion-round.png', priceModifier: 3 },
        { value: 'star', label: 'Estrella', image: '/templates/cushion-star.png', priceModifier: 5 }
      ]
    },
    {
      id: 'fabric_type',
      type: 'card_selector',
      label: 'Tipo de tela',
      required: true,
      options: [
        { value: 'polyester', label: 'Poliéster suave', helpText: 'Ideal para sublimación' },
        { value: 'satin', label: 'Satén brillante', priceModifier: 4 },
        { value: 'linen_look', label: 'Aspecto lino', priceModifier: 6 },
        { value: 'velvet', label: 'Terciopelo', priceModifier: 8 }
      ]
    },
    {
      id: 'print_type',
      type: 'radio_group',
      label: 'Impresión',
      required: true,
      options: [
        { value: 'one_side', label: 'Solo frontal' },
        { value: 'both_sides', label: 'Ambas caras (mismo diseño)', priceModifier: 8 },
        { value: 'different_sides', label: 'Ambas caras (diferente diseño)', priceModifier: 12 }
      ]
    },
    {
      id: 'design_front',
      type: 'image_upload',
      label: 'Diseño frontal',
      required: true,
      helpText: 'Foto o diseño en alta resolución'
    },
    {
      id: 'design_back',
      type: 'image_upload',
      label: 'Diseño trasero',
      required: false,
      condition: { field: 'print_type', value: 'different_sides' }
    },
    {
      id: 'add_text',
      type: 'checkbox',
      label: 'Añadir texto personalizado',
      required: false
    },
    {
      id: 'custom_text',
      type: 'text_input',
      label: 'Texto',
      required: false,
      condition: { field: 'add_text', value: true },
      placeholder: 'Ej: Te quiero mamá, Feliz cumpleaños...',
      priceModifier: 3
    },
    {
      id: 'include_filling',
      type: 'radio_group',
      label: 'Relleno',
      required: true,
      options: [
        { value: 'no', label: 'Solo funda' },
        { value: 'yes', label: 'Con relleno incluido', priceModifier: 8 }
      ]
    },
    {
      id: 'quantity',
      type: 'dropdown',
      label: 'Cantidad',
      required: true,
      isQuantityMultiplier: true,
      options: [
        { value: '1', label: '1 unidad', unitPriceOverride: 22 },
        { value: '2', label: '2 unidades', unitPriceOverride: 20 },
        { value: '5', label: '5 unidades', unitPriceOverride: 18 },
        { value: '10', label: '10 unidades', unitPriceOverride: 15 }
      ]
    }
  ]
}
```

---

### 4. Template: Puzzles Personalizados
**ID:** `custom_puzzles`
```typescript
{
  id: 'custom_puzzles',
  name: 'Puzzles Personalizados',
  description: 'Puzzles con tu foto favorita',
  fields: [
    {
      id: 'puzzle_size',
      type: 'card_selector',
      label: 'Tamaño y piezas',
      required: true,
      options: [
        { value: '30_a5', label: '30 piezas (A5)', image: '/templates/puzzle-30.png', helpText: 'Ideal para niños' },
        { value: '120_a4', label: '120 piezas (A4)', image: '/templates/puzzle-120.png' },
        { value: '300_a3', label: '300 piezas (A3)', priceModifier: 8 },
        { value: '500_a3', label: '500 piezas (A3)', priceModifier: 12 },
        { value: '1000_a2', label: '1000 piezas (A2)', priceModifier: 20 }
      ]
    },
    {
      id: 'puzzle_material',
      type: 'card_selector',
      label: 'Material',
      required: true,
      options: [
        { value: 'cardboard', label: 'Cartón premium', helpText: 'Clásico y económico' },
        { value: 'wood', label: 'Madera', priceModifier: 15, helpText: 'Más duradero' }
      ]
    },
    {
      id: 'photo',
      type: 'image_upload',
      label: 'Tu foto',
      required: true,
      helpText: 'Usa fotos horizontales para mejor resultado. Mínimo 300 DPI.'
    },
    {
      id: 'add_frame',
      type: 'checkbox',
      label: 'Añadir marco decorativo',
      required: false,
      priceModifier: 5
    },
    {
      id: 'frame_style',
      type: 'dropdown',
      label: 'Estilo del marco',
      required: false,
      condition: { field: 'add_frame', value: true },
      options: [
        { value: 'classic', label: 'Clásico dorado' },
        { value: 'modern', label: 'Moderno minimalista' },
        { value: 'vintage', label: 'Vintage' },
        { value: 'hearts', label: 'Corazones (romántico)' },
        { value: 'kids', label: 'Infantil (estrellas)' }
      ]
    },
    {
      id: 'add_text',
      type: 'checkbox',
      label: 'Añadir texto',
      required: false,
      priceModifier: 3
    },
    {
      id: 'custom_text',
      type: 'text_input',
      label: 'Texto personalizado',
      required: false,
      condition: { field: 'add_text', value: true },
      placeholder: 'Ej: Recuerdo de nuestras vacaciones 2024'
    },
    {
      id: 'packaging',
      type: 'card_selector',
      label: 'Presentación',
      required: true,
      options: [
        { value: 'bag', label: 'Bolsa zip estándar' },
        { value: 'box_simple', label: 'Caja blanca', priceModifier: 3 },
        { value: 'box_photo', label: 'Caja con la foto', priceModifier: 8 },
        { value: 'tin_box', label: 'Caja metálica', priceModifier: 12 }
      ]
    },
    {
      id: 'quantity',
      type: 'dropdown',
      label: 'Cantidad',
      required: true,
      isQuantityMultiplier: true,
      options: [
        { value: '1', label: '1 unidad', unitPriceOverride: 15 },
        { value: '2', label: '2 unidades', unitPriceOverride: 13 },
        { value: '5', label: '5 unidades', unitPriceOverride: 11 },
        { value: '10', label: '10 unidades', unitPriceOverride: 9 }
      ]
    }
  ]
}
```

---

### 5. Template: Fundas de Móvil
**ID:** `phone_cases`
```typescript
{
  id: 'phone_cases',
  name: 'Fundas de Móvil',
  description: 'Fundas personalizadas para tu smartphone',
  fields: [
    {
      id: 'phone_brand',
      type: 'dropdown',
      label: 'Marca del móvil',
      required: true,
      options: [
        { value: 'iphone', label: 'iPhone' },
        { value: 'samsung', label: 'Samsung Galaxy' },
        { value: 'xiaomi', label: 'Xiaomi' },
        { value: 'huawei', label: 'Huawei' },
        { value: 'oppo', label: 'OPPO' },
        { value: 'oneplus', label: 'OnePlus' },
        { value: 'google', label: 'Google Pixel' }
      ]
    },
    {
      id: 'phone_model_iphone',
      type: 'dropdown',
      label: 'Modelo',
      required: true,
      condition: { field: 'phone_brand', value: 'iphone' },
      options: [
        { value: 'ip15_pro_max', label: 'iPhone 15 Pro Max' },
        { value: 'ip15_pro', label: 'iPhone 15 Pro' },
        { value: 'ip15_plus', label: 'iPhone 15 Plus' },
        { value: 'ip15', label: 'iPhone 15' },
        { value: 'ip14_pro_max', label: 'iPhone 14 Pro Max' },
        { value: 'ip14_pro', label: 'iPhone 14 Pro' },
        { value: 'ip14_plus', label: 'iPhone 14 Plus' },
        { value: 'ip14', label: 'iPhone 14' },
        { value: 'ip13_pro_max', label: 'iPhone 13 Pro Max' },
        { value: 'ip13_pro', label: 'iPhone 13 Pro' },
        { value: 'ip13', label: 'iPhone 13' },
        { value: 'ip12', label: 'iPhone 12 / 12 Pro' },
        { value: 'ip11', label: 'iPhone 11' },
        { value: 'ipse3', label: 'iPhone SE (3ª gen)' }
      ]
    },
    {
      id: 'phone_model_samsung',
      type: 'dropdown',
      label: 'Modelo',
      required: true,
      condition: { field: 'phone_brand', value: 'samsung' },
      options: [
        { value: 's24_ultra', label: 'Galaxy S24 Ultra' },
        { value: 's24_plus', label: 'Galaxy S24+' },
        { value: 's24', label: 'Galaxy S24' },
        { value: 's23_ultra', label: 'Galaxy S23 Ultra' },
        { value: 's23_plus', label: 'Galaxy S23+' },
        { value: 's23', label: 'Galaxy S23' },
        { value: 'a54', label: 'Galaxy A54' },
        { value: 'a34', label: 'Galaxy A34' },
        { value: 'a14', label: 'Galaxy A14' }
      ]
    },
    {
      id: 'case_type',
      type: 'card_selector',
      label: 'Tipo de funda',
      required: true,
      options: [
        { value: 'soft_tpu', label: 'Silicona TPU', image: '/templates/case-soft.png', helpText: 'Flexible y ligera' },
        { value: 'hard_plastic', label: 'Plástico duro', image: '/templates/case-hard.png', helpText: 'Máxima protección' },
        { value: 'biodegradable', label: 'Biodegradable', priceModifier: 4, helpText: 'Ecológica' },
        { value: 'wallet', label: 'Tipo cartera', image: '/templates/case-wallet.png', priceModifier: 8 },
        { value: 'tough', label: 'Ultra resistente', priceModifier: 6, helpText: 'Doble capa' }
      ]
    },
    {
      id: 'design_style',
      type: 'card_selector',
      label: 'Estilo de diseño',
      required: true,
      options: [
        { value: 'full_photo', label: 'Foto completa' },
        { value: 'collage', label: 'Collage de fotos', priceModifier: 3 },
        { value: 'text_only', label: 'Solo texto/nombre' },
        { value: 'logo', label: 'Logo/diseño propio' },
        { value: 'template', label: 'Usar plantilla' }
      ]
    },
    {
      id: 'main_image',
      type: 'image_upload',
      label: 'Tu imagen/diseño',
      required: true,
      condition: { field: 'design_style', value: ['full_photo', 'logo'] },
      helpText: 'PNG o JPG de alta resolución'
    },
    {
      id: 'collage_images',
      type: 'image_upload',
      label: 'Fotos para collage (hasta 6)',
      required: true,
      multiple: true,
      maxFiles: 6,
      condition: { field: 'design_style', value: 'collage' }
    },
    {
      id: 'custom_text',
      type: 'text_input',
      label: 'Texto personalizado',
      required: true,
      condition: { field: 'design_style', value: 'text_only' },
      placeholder: 'Ej: Tu nombre, iniciales, frase...'
    },
    {
      id: 'finish',
      type: 'radio_group',
      label: 'Acabado',
      required: true,
      options: [
        { value: 'glossy', label: 'Brillante' },
        { value: 'matte', label: 'Mate' }
      ]
    },
    {
      id: 'quantity',
      type: 'dropdown',
      label: 'Cantidad',
      required: true,
      isQuantityMultiplier: true,
      options: [
        { value: '1', label: '1 unidad', unitPriceOverride: 15 },
        { value: '2', label: '2 unidades', unitPriceOverride: 13 },
        { value: '5', label: '5 unidades', unitPriceOverride: 11 }
      ]
    }
  ]
}
```

---

### 6. Template: Calendarios Personalizados
**ID:** `custom_calendars`
```typescript
{
  id: 'custom_calendars',
  name: 'Calendarios Personalizados',
  description: 'Calendarios con tus fotos favoritas',
  fields: [
    {
      id: 'calendar_type',
      type: 'card_selector',
      label: 'Tipo de calendario',
      required: true,
      options: [
        { value: 'wall_a3', label: 'Pared A3', image: '/templates/calendar-wall.png' },
        { value: 'wall_a4', label: 'Pared A4' },
        { value: 'desk', label: 'Escritorio', image: '/templates/calendar-desk.png' },
        { value: 'poster', label: 'Póster anual', priceModifier: 5 },
        { value: 'pocket', label: 'Bolsillo (pack 10)', priceModifier: -5 }
      ]
    },
    {
      id: 'start_month',
      type: 'dropdown',
      label: 'Mes de inicio',
      required: true,
      options: [
        { value: '1', label: 'Enero' },
        { value: '2', label: 'Febrero' },
        { value: '3', label: 'Marzo' },
        { value: '4', label: 'Abril' },
        { value: '5', label: 'Mayo' },
        { value: '6', label: 'Junio' },
        { value: '7', label: 'Julio' },
        { value: '8', label: 'Agosto' },
        { value: '9', label: 'Septiembre' },
        { value: '10', label: 'Octubre' },
        { value: '11', label: 'Noviembre' },
        { value: '12', label: 'Diciembre' }
      ]
    },
    {
      id: 'year',
      type: 'dropdown',
      label: 'Año',
      required: true,
      options: [
        { value: '2025', label: '2025' },
        { value: '2026', label: '2026' }
      ]
    },
    {
      id: 'photos',
      type: 'image_upload',
      label: 'Fotos (12 para calendario mensual)',
      required: true,
      multiple: true,
      maxFiles: 12,
      helpText: 'Sube 12 fotos, una por cada mes'
    },
    {
      id: 'cover_photo',
      type: 'image_upload',
      label: 'Foto de portada',
      required: false,
      helpText: 'Opcional: foto especial para la portada'
    },
    {
      id: 'highlight_dates',
      type: 'checkbox',
      label: 'Marcar fechas especiales',
      required: false,
      priceModifier: 5
    },
    {
      id: 'special_dates',
      type: 'text_input',
      label: 'Fechas especiales',
      required: false,
      condition: { field: 'highlight_dates', value: true },
      placeholder: 'Ej: 15/03 Cumple María, 22/06 Aniversario...',
      helpText: 'Formato: DD/MM Descripción, separadas por coma'
    },
    {
      id: 'title',
      type: 'text_input',
      label: 'Título del calendario',
      required: false,
      placeholder: 'Ej: Familia García 2025'
    },
    {
      id: 'quantity',
      type: 'dropdown',
      label: 'Cantidad',
      required: true,
      isQuantityMultiplier: true,
      options: [
        { value: '1', label: '1 unidad', unitPriceOverride: 18 },
        { value: '2', label: '2 unidades', unitPriceOverride: 16 },
        { value: '5', label: '5 unidades', unitPriceOverride: 14 },
        { value: '10', label: '10 unidades', unitPriceOverride: 12 }
      ]
    }
  ]
}
```

---

### 7. Template: Llaveros Personalizados (Láser)
**ID:** `custom_keychains`
```typescript
{
  id: 'custom_keychains',
  name: 'Llaveros Personalizados',
  description: 'Llaveros grabados con láser',
  fields: [
    {
      id: 'material',
      type: 'card_selector',
      label: 'Material',
      required: true,
      options: [
        { value: 'wood_birch', label: 'Madera Abedul', image: '/templates/keychain-wood.png' },
        { value: 'wood_walnut', label: 'Madera Nogal', priceModifier: 2 },
        { value: 'acrylic_clear', label: 'Acrílico Transparente', image: '/templates/keychain-acrylic.png' },
        { value: 'acrylic_color', label: 'Acrílico Color' },
        { value: 'metal_steel', label: 'Acero Inox', priceModifier: 5 },
        { value: 'metal_aluminum', label: 'Aluminio', priceModifier: 3 },
        { value: 'leather', label: 'Cuero sintético', priceModifier: 4 }
      ]
    },
    {
      id: 'shape',
      type: 'card_selector',
      label: 'Forma',
      required: true,
      options: [
        { value: 'rectangle', label: 'Rectangular' },
        { value: 'circle', label: 'Circular' },
        { value: 'heart', label: 'Corazón' },
        { value: 'star', label: 'Estrella' },
        { value: 'dog_tag', label: 'Placa militar' },
        { value: 'house', label: 'Casa' },
        { value: 'car', label: 'Coche' },
        { value: 'custom', label: 'Forma personalizada', priceModifier: 5 }
      ]
    },
    {
      id: 'size',
      type: 'dropdown',
      label: 'Tamaño',
      required: true,
      options: [
        { value: 'small', label: 'Pequeño (3-4cm)' },
        { value: 'medium', label: 'Mediano (5-6cm)' },
        { value: 'large', label: 'Grande (7-8cm)', priceModifier: 2 }
      ]
    },
    {
      id: 'design_type',
      type: 'card_selector',
      label: 'Tipo de diseño',
      required: true,
      options: [
        { value: 'text_only', label: 'Solo texto' },
        { value: 'image_only', label: 'Solo imagen/logo' },
        { value: 'text_image', label: 'Texto + imagen' },
        { value: 'qr_code', label: 'Código QR', priceModifier: 2 }
      ]
    },
    {
      id: 'text_line_1',
      type: 'text_input',
      label: 'Texto línea 1',
      required: false,
      condition: { field: 'design_type', value: ['text_only', 'text_image'] },
      placeholder: 'Nombre, fecha, etc.',
      maxLength: 20
    },
    {
      id: 'text_line_2',
      type: 'text_input',
      label: 'Texto línea 2 (opcional)',
      required: false,
      condition: { field: 'design_type', value: ['text_only', 'text_image'] },
      placeholder: 'Segunda línea',
      maxLength: 20
    },
    {
      id: 'image',
      type: 'image_upload',
      label: 'Imagen/Logo',
      required: false,
      condition: { field: 'design_type', value: ['image_only', 'text_image'] },
      helpText: 'Vectorial (SVG) recomendado para mejor resultado'
    },
    {
      id: 'qr_content',
      type: 'text_input',
      label: 'Contenido del QR',
      required: false,
      condition: { field: 'design_type', value: 'qr_code' },
      placeholder: 'URL, teléfono, texto...'
    },
    {
      id: 'ring_type',
      type: 'dropdown',
      label: 'Tipo de anilla',
      required: true,
      options: [
        { value: 'standard', label: 'Anilla estándar' },
        { value: 'split', label: 'Anilla partida reforzada' },
        { value: 'lobster', label: 'Mosquetón', priceModifier: 1 },
        { value: 'carabiner', label: 'Mini mosquetón escalada', priceModifier: 2 }
      ]
    },
    {
      id: 'quantity',
      type: 'dropdown',
      label: 'Cantidad',
      required: true,
      isQuantityMultiplier: true,
      options: [
        { value: '1', label: '1 unidad', unitPriceOverride: 6 },
        { value: '5', label: '5 unidades', unitPriceOverride: 5 },
        { value: '10', label: '10 unidades', unitPriceOverride: 4 },
        { value: '25', label: '25 unidades', unitPriceOverride: 3.5 },
        { value: '50', label: '50 unidades', unitPriceOverride: 3 },
        { value: '100', label: '100 unidades', unitPriceOverride: 2.5 }
      ]
    }
  ]
}
```

---

### 8. Template: Placas Identificativas (Mascotas)
**ID:** `pet_tags`
```typescript
{
  id: 'pet_tags',
  name: 'Placas para Mascotas',
  description: 'Placas identificativas grabadas',
  fields: [
    {
      id: 'shape',
      type: 'card_selector',
      label: 'Forma',
      required: true,
      options: [
        { value: 'bone', label: 'Hueso', image: '/templates/pet-bone.png' },
        { value: 'heart', label: 'Corazón', image: '/templates/pet-heart.png' },
        { value: 'circle', label: 'Círculo' },
        { value: 'star', label: 'Estrella' },
        { value: 'paw', label: 'Huella', image: '/templates/pet-paw.png' },
        { value: 'fish', label: 'Pez (gatos)', image: '/templates/pet-fish.png' }
      ]
    },
    {
      id: 'material',
      type: 'card_selector',
      label: 'Material',
      required: true,
      options: [
        { value: 'aluminum_colors', label: 'Aluminio anodizado (colores)', image: '/templates/pet-aluminum.png' },
        { value: 'stainless', label: 'Acero inoxidable', priceModifier: 3 },
        { value: 'brass', label: 'Latón dorado', priceModifier: 4 }
      ]
    },
    {
      id: 'color',
      type: 'color_selector',
      label: 'Color (solo aluminio)',
      required: false,
      condition: { field: 'material', value: 'aluminum_colors' },
      options: [
        { value: 'red', label: 'Rojo', color: '#e53e3e' },
        { value: 'blue', label: 'Azul', color: '#3182ce' },
        { value: 'green', label: 'Verde', color: '#38a169' },
        { value: 'pink', label: 'Rosa', color: '#ed64a6' },
        { value: 'purple', label: 'Morado', color: '#805ad5' },
        { value: 'gold', label: 'Dorado', color: '#d69e2e' },
        { value: 'black', label: 'Negro', color: '#1a202c' }
      ]
    },
    {
      id: 'pet_name',
      type: 'text_input',
      label: 'Nombre de la mascota',
      required: true,
      placeholder: 'Ej: Luna, Max, Coco...',
      maxLength: 15
    },
    {
      id: 'phone',
      type: 'text_input',
      label: 'Teléfono de contacto',
      required: true,
      placeholder: 'Ej: 612345678'
    },
    {
      id: 'extra_info',
      type: 'text_input',
      label: 'Info adicional (opcional)',
      required: false,
      placeholder: 'Ej: "Tiene chip", dirección corta...',
      maxLength: 30
    },
    {
      id: 'add_icon',
      type: 'checkbox',
      label: 'Añadir icono decorativo',
      required: false,
      priceModifier: 1
    },
    {
      id: 'icon',
      type: 'dropdown',
      label: 'Icono',
      required: false,
      condition: { field: 'add_icon', value: true },
      options: [
        { value: 'paw', label: '🐾 Huella' },
        { value: 'bone', label: '🦴 Hueso' },
        { value: 'heart', label: '❤️ Corazón' },
        { value: 'star', label: '⭐ Estrella' },
        { value: 'crown', label: '👑 Corona' }
      ]
    },
    {
      id: 'quantity',
      type: 'dropdown',
      label: 'Cantidad',
      required: true,
      isQuantityMultiplier: true,
      options: [
        { value: '1', label: '1 unidad', unitPriceOverride: 8 },
        { value: '2', label: '2 unidades', unitPriceOverride: 7 },
        { value: '3', label: '3 unidades', unitPriceOverride: 6 }
      ]
    }
  ]
}
```

---

### 9. Template: Photocall Eventos
**ID:** `photocall`
```typescript
{
  id: 'photocall',
  name: 'Photocall para Eventos',
  description: 'Photocalls personalizados para bodas, cumpleaños y eventos',
  fields: [
    {
      id: 'event_type',
      type: 'card_selector',
      label: 'Tipo de evento',
      required: true,
      options: [
        { value: 'wedding', label: 'Boda', image: '/templates/photocall-wedding.png' },
        { value: 'birthday', label: 'Cumpleaños', image: '/templates/photocall-birthday.png' },
        { value: 'communion', label: 'Comunión' },
        { value: 'baptism', label: 'Bautizo' },
        { value: 'corporate', label: 'Evento corporativo' },
        { value: 'graduation', label: 'Graduación' },
        { value: 'baby_shower', label: 'Baby Shower' },
        { value: 'other', label: 'Otro evento' }
      ]
    },
    {
      id: 'size',
      type: 'card_selector',
      label: 'Tamaño',
      required: true,
      options: [
        { value: '150x200', label: '150x200 cm', helpText: '1-2 personas' },
        { value: '200x200', label: '200x200 cm', priceModifier: 20, helpText: '2-3 personas' },
        { value: '250x200', label: '250x200 cm', priceModifier: 40, helpText: '3-4 personas' },
        { value: '300x200', label: '300x200 cm', priceModifier: 60, helpText: 'Grupos' }
      ]
    },
    {
      id: 'material',
      type: 'card_selector',
      label: 'Material',
      required: true,
      options: [
        { value: 'vinyl', label: 'Vinilo (enrollable)', helpText: 'Económico, reutilizable' },
        { value: 'fabric', label: 'Tela (premium)', priceModifier: 30, helpText: 'Sin brillos, mejor fotos' },
        { value: 'cardboard', label: 'Cartón pluma', priceModifier: 15, helpText: 'Rígido, un solo uso' }
      ]
    },
    {
      id: 'design_option',
      type: 'card_selector',
      label: 'Diseño',
      required: true,
      options: [
        { value: 'template', label: 'Usar plantilla de ImprimeArte' },
        { value: 'custom', label: 'Subir mi diseño' },
        { value: 'design_service', label: 'Que lo diseñéis vosotros', priceModifier: 25 }
      ]
    },
    {
      id: 'template_style',
      type: 'dropdown',
      label: 'Estilo de plantilla',
      required: false,
      condition: { field: 'design_option', value: 'template' },
      options: [
        { value: 'floral', label: 'Floral romántico' },
        { value: 'modern', label: 'Moderno minimalista' },
        { value: 'vintage', label: 'Vintage' },
        { value: 'tropical', label: 'Tropical' },
        { value: 'elegant', label: 'Elegante dorado' },
        { value: 'fun', label: 'Divertido colorido' }
      ]
    },
    {
      id: 'custom_design',
      type: 'image_upload',
      label: 'Tu diseño',
      required: false,
      condition: { field: 'design_option', value: 'custom' },
      helpText: 'Archivo vectorial o imagen de alta resolución'
    },
    {
      id: 'names',
      type: 'text_input',
      label: 'Nombres principales',
      required: true,
      placeholder: 'Ej: María & Juan, Lucas cumple 5 años'
    },
    {
      id: 'date',
      type: 'text_input',
      label: 'Fecha del evento',
      required: false,
      placeholder: 'Ej: 15 de Junio 2025'
    },
    {
      id: 'hashtag',
      type: 'text_input',
      label: 'Hashtag (opcional)',
      required: false,
      placeholder: 'Ej: #BodaMariaYJuan'
    },
    {
      id: 'include_structure',
      type: 'checkbox',
      label: 'Incluir estructura/soporte',
      required: false,
      priceModifier: 45,
      helpText: 'Estructura de aluminio para montaje'
    },
    {
      id: 'quantity',
      type: 'dropdown',
      label: 'Cantidad',
      required: true,
      isQuantityMultiplier: true,
      options: [
        { value: '1', label: '1 unidad', unitPriceOverride: 65 }
      ]
    }
  ]
}
```

---

### 10. Template: Figuras 3D Personalizadas
**ID:** `3d_figures`
```typescript
{
  id: '3d_figures',
  name: 'Figuras 3D Personalizadas',
  description: 'Figuras impresas en 3D de alta calidad',
  fields: [
    {
      id: 'figure_type',
      type: 'card_selector',
      label: 'Tipo de figura',
      required: true,
      options: [
        { value: 'bust', label: 'Busto (a partir de foto)', image: '/templates/3d-bust.png', priceModifier: 30 },
        { value: 'full_body', label: 'Cuerpo completo', priceModifier: 50 },
        { value: 'character', label: 'Personaje/Mascota' },
        { value: 'miniature', label: 'Miniatura gaming' },
        { value: 'prototype', label: 'Prototipo/Pieza funcional' },
        { value: 'architectural', label: 'Maqueta arquitectónica', priceModifier: 20 }
      ]
    },
    {
      id: 'material',
      type: 'card_selector',
      label: 'Material de impresión',
      required: true,
      options: [
        { value: 'pla', label: 'PLA (estándar)', helpText: 'Económico, buena calidad' },
        { value: 'resin_standard', label: 'Resina estándar', priceModifier: 15, helpText: 'Alto detalle' },
        { value: 'resin_premium', label: 'Resina premium', priceModifier: 30, helpText: 'Máximo detalle' },
        { value: 'abs', label: 'ABS', priceModifier: 5, helpText: 'Resistente' },
        { value: 'petg', label: 'PETG', priceModifier: 8, helpText: 'Flexible y resistente' },
        { value: 'tpu', label: 'TPU (flexible)', priceModifier: 12 }
      ]
    },
    {
      id: 'size',
      type: 'card_selector',
      label: 'Tamaño aproximado',
      required: true,
      options: [
        { value: 'xs', label: 'Mini (3-5 cm)' },
        { value: 's', label: 'Pequeño (6-10 cm)', priceModifier: 10 },
        { value: 'm', label: 'Mediano (11-15 cm)', priceModifier: 25 },
        { value: 'l', label: 'Grande (16-25 cm)', priceModifier: 50 },
        { value: 'xl', label: 'Extra grande (26+ cm)', priceModifier: 100 }
      ]
    },
    {
      id: 'finish',
      type: 'card_selector',
      label: 'Acabado',
      required: true,
      options: [
        { value: 'raw', label: 'Sin acabado (impreso)', helpText: 'Textura visible de impresión' },
        { value: 'sanded', label: 'Lijado suave', priceModifier: 10 },
        { value: 'primed', label: 'Imprimación (listo para pintar)', priceModifier: 15 },
        { value: 'painted', label: 'Pintado a mano', priceModifier: 40, helpText: 'Precio según complejidad' }
      ]
    },
    {
      id: 'reference_images',
      type: 'image_upload',
      label: 'Imágenes de referencia',
      required: true,
      multiple: true,
      maxFiles: 5,
      helpText: 'Sube fotos desde diferentes ángulos. Para bustos: frontal, perfil y 3/4'
    },
    {
      id: 'reference_3d',
      type: 'image_upload',
      label: 'Archivo 3D (opcional)',
      required: false,
      helpText: 'Si tienes el modelo: STL, OBJ, 3MF'
    },
    {
      id: 'color_preference',
      type: 'text_input',
      label: 'Preferencia de color',
      required: false,
      placeholder: 'Ej: Blanco, Negro, o describir colores deseados'
    },
    {
      id: 'special_instructions',
      type: 'text_input',
      label: 'Instrucciones especiales',
      required: false,
      placeholder: 'Describe cualquier detalle importante',
      maxLength: 500
    },
    {
      id: 'quantity',
      type: 'dropdown',
      label: 'Cantidad',
      required: true,
      isQuantityMultiplier: true,
      options: [
        { value: '1', label: '1 unidad', unitPriceOverride: 35 },
        { value: '2', label: '2 unidades', unitPriceOverride: 30 },
        { value: '5', label: '5 unidades', unitPriceOverride: 25 },
        { value: '10', label: '10 unidades', unitPriceOverride: 20 }
      ]
    }
  ]
}
```

---

## 📊 RESUMEN DE PROPUESTAS

### Nuevos Productos Sugeridos: 35+
### Nuevos Templates Propuestos: 10

| ID | Template | Categoría |
|----|----------|-----------|
| `business_cards` | Tarjetas de Visita | Gráficos |
| `custom_caps` | Gorras | Textiles |
| `custom_cushions` | Cojines | Sublimación |
| `custom_puzzles` | Puzzles | Sublimación |
| `phone_cases` | Fundas Móvil | Sublimación |
| `custom_calendars` | Calendarios | Gráficos |
| `custom_keychains` | Llaveros | Láser |
| `pet_tags` | Placas Mascotas | Láser |
| `photocall` | Photocalls | Eventos |
| `3d_figures` | Figuras 3D | Impresión 3D |

---

## 🎯 PRIORIDADES DE IMPLEMENTACIÓN

### Alta Prioridad (más demanda)
1. Tarjetas de visita (básico de imprenta)
2. Calendarios (producto estacional)
3. Fundas de móvil (margen alto)
4. Gorras (complemento textil)
5. Puzzles (regalo personalizado)

### Media Prioridad
6. Cojines
7. Llaveros
8. Placas mascotas
9. Photocalls

### Baja Prioridad (nichos específicos)
10. Figuras 3D (requiere más trabajo manual)
