// src/lib/customization/schemaTemplates.ts
// Plantillas de esquemas de personalización predefinidos

import type { CustomizationSchema, CustomizationField } from '../../types/customization';

// ============================================================================
// PLANTILLA: CAJAS DE CHUCHES / EVENTOS INFANTILES
// ============================================================================

export const CANDY_BOX_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    // 1. TEMÁTICA (obligatorio)
    {
      id: 'theme',
      fieldType: 'card_selector',
      label: '¿Qué temática te gustaría para la caja?',
      required: true,
      priceModifier: 0,
      order: 1,
      helpText: 'Selecciona la temática principal para el diseño de la caja',
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'videojuegos', label: 'Videojuegos', icon: '🎮' },
          { value: 'unicornio', label: 'Unicornio', icon: '🦄' },
          { value: 'futbol', label: 'Fútbol', icon: '⚽' },
          { value: 'dinosaurios', label: 'Dinosaurios', icon: '🦕' },
          { value: 'princesa', label: 'Princesa', icon: '👸' },
          { value: 'superheroes', label: 'Superhéroes', icon: '🦸' },
          { value: 'sirenas', label: 'Sirenas', icon: '🧜‍♀️' },
          { value: 'espacial', label: 'Espacial', icon: '🚀' },
          { value: 'animales', label: 'Animales', icon: '🐾' },
          { value: 'otro', label: 'Otro', icon: '✨', description: 'Especifica tu temática' },
        ],
      },
    },

    // 2. TEMÁTICA PERSONALIZADA (condicional - solo si elige "otro")
    {
      id: 'custom_theme',
      fieldType: 'text_input',
      label: 'Especifica la temática',
      required: true,
      priceModifier: 0,
      order: 2,
      helpText: 'Describe la temática que te gustaría (ej: Frozen, Minecraft, Peppa Pig...)',
      condition: {
        dependsOn: 'theme',
        showWhen: 'otro',
      },
      config: {
        placeholder: 'Ej: Frozen, Minecraft, Peppa Pig...',
        maxLength: 100,
        showCharCounter: true,
      },
    },

    // 3. IMAGEN DE REFERENCIA (opcional)
    {
      id: 'reference_image_1',
      fieldType: 'image_upload',
      label: '¿Tienes alguna imagen o referencia del estilo que te gusta?',
      required: false,
      priceModifier: 0,
      order: 3,
      helpText:
        'Puede ser una imagen, invitación, personaje o idea. No es obligatorio. (Imagen 1 de 3)',
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
        helpText: 'Sube una imagen de referencia (opcional)',
      },
    },

    // 3b. IMAGEN DE REFERENCIA 2 (opcional)
    {
      id: 'reference_image_2',
      fieldType: 'image_upload',
      label: 'Imagen de referencia adicional (opcional)',
      required: false,
      priceModifier: 0,
      order: 4,
      helpText: 'Imagen 2 de 3',
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },

    // 3c. IMAGEN DE REFERENCIA 3 (opcional)
    {
      id: 'reference_image_3',
      fieldType: 'image_upload',
      label: 'Imagen de referencia adicional (opcional)',
      required: false,
      priceModifier: 0,
      order: 5,
      helpText: 'Imagen 3 de 3',
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },

    // 4. NOMBRE DEL NIÑO/A (obligatorio)
    {
      id: 'child_name',
      fieldType: 'text_input',
      label: 'Nombre para la caja',
      required: true,
      priceModifier: 0,
      order: 6,
      helpText: 'El nombre que aparecerá en la caja',
      config: {
        placeholder: 'Ej: Mateo',
        maxLength: 30,
        showCharCounter: true,
        validationPattern: '^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\\s]+$',
        helpText: 'Solo letras y espacios',
      },
    },

    // 5. EDAD (obligatorio)
    {
      id: 'age',
      fieldType: 'dropdown',
      label: 'Edad que cumple',
      required: true,
      priceModifier: 0,
      order: 7,
      helpText: 'La edad que aparecerá en el diseño',
      config: {
        placeholder: 'Selecciona la edad',
        options: [
          { value: '1', label: '1 añito' },
          { value: '2', label: '2 años' },
          { value: '3', label: '3 años' },
          { value: '4', label: '4 años' },
          { value: '5', label: '5 años' },
          { value: '6', label: '6 años' },
          { value: '7', label: '7 años' },
          { value: '8', label: '8 años' },
          { value: '9', label: '9 años' },
          { value: '10', label: '10 años' },
          { value: '11', label: '11 años' },
          { value: '12', label: '12 años' },
          { value: 'otro', label: 'Otra edad...' },
        ],
      },
    },

    // 5b. EDAD PERSONALIZADA (condicional)
    {
      id: 'custom_age',
      fieldType: 'text_input',
      label: 'Especifica la edad o año',
      required: true,
      priceModifier: 0,
      order: 8,
      helpText: 'Ej: 15, 2025',
      condition: {
        dependsOn: 'age',
        showWhen: 'otro',
      },
      config: {
        placeholder: 'Ej: 15 o 2025',
        maxLength: 10,
      },
    },

    // 6. MENSAJE CORTO (opcional)
    {
      id: 'short_message',
      fieldType: 'text_input',
      label: '¿Quieres añadir una frase? (opcional)',
      required: false,
      priceModifier: 0,
      order: 9,
      helpText: 'Ejemplos: "Feliz Cumpleaños", "Mis 6 añitos", "Un día mágico"',
      config: {
        placeholder: 'Ej: Feliz Cumpleaños',
        maxLength: 50,
        showCharCounter: true,
      },
    },

    // 7. TAMAÑO DE CAJA (se puede ocultar si solo hay un tamaño)
    {
      id: 'box_size',
      fieldType: 'card_selector',
      label: 'Tamaño de la caja',
      required: true,
      priceModifier: 0,
      order: 10,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'pequena', label: 'Pequeña', description: 'Ideal para pocos dulces' },
          { value: 'mediana', label: 'Mediana', description: 'Tamaño estándar', badge: 'Popular' },
          { value: 'grande', label: 'Grande', description: 'Para muchos dulces' },
        ],
      },
    },

    // 8. CHECKBOX DE CONFIRMACIÓN (obligatorio)
    {
      id: 'design_confirmation',
      fieldType: 'checkbox',
      label:
        'Entiendo que el diseño se adaptará a la temática elegida y recibiré una vista previa antes de imprimir.',
      required: true,
      priceModifier: 0,
      order: 11,
      config: {
        description:
          'El diseño final lo realiza nuestro equipo basándose en tus preferencias. Recibirás un preview para aprobar antes de la producción.',
        helpText: 'Debes aceptar para continuar',
      },
    },
  ],
};

// ============================================================================
// PLANTILLA: INVITACIONES DE EVENTOS
// ============================================================================

export const EVENT_INVITATION_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    // Tipo de evento
    {
      id: 'event_type',
      fieldType: 'card_selector',
      label: '¿Qué tipo de evento es?',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'cumpleanos', label: 'Cumpleaños', icon: '🎂' },
          { value: 'bautizo', label: 'Bautizo', icon: '👼' },
          { value: 'comunion', label: 'Comunión', icon: '✝️' },
          { value: 'boda', label: 'Boda', icon: '💒' },
          { value: 'baby_shower', label: 'Baby Shower', icon: '👶' },
          { value: 'graduacion', label: 'Graduación', icon: '🎓' },
          { value: 'otro', label: 'Otro evento', icon: '🎉' },
        ],
      },
    },

    // Evento personalizado
    {
      id: 'custom_event',
      fieldType: 'text_input',
      label: 'Especifica el tipo de evento',
      required: true,
      priceModifier: 0,
      order: 2,
      condition: {
        dependsOn: 'event_type',
        showWhen: 'otro',
      },
      config: {
        placeholder: 'Ej: Aniversario, Jubilación...',
        maxLength: 50,
      },
    },

    // Nombre del homenajeado
    {
      id: 'honoree_name',
      fieldType: 'text_input',
      label: 'Nombre del homenajeado/a',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        placeholder: 'Ej: María García',
        maxLength: 50,
        validationPattern: '^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\\s]+$',
      },
    },

    // Fecha del evento
    {
      id: 'event_date',
      fieldType: 'text_input',
      label: 'Fecha del evento',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        placeholder: 'Ej: 15 de Marzo de 2025',
        maxLength: 50,
      },
    },

    // Hora del evento
    {
      id: 'event_time',
      fieldType: 'text_input',
      label: 'Hora del evento',
      required: true,
      priceModifier: 0,
      order: 5,
      config: {
        placeholder: 'Ej: 17:00h',
        maxLength: 20,
      },
    },

    // Lugar del evento
    {
      id: 'event_location',
      fieldType: 'text_input',
      label: 'Lugar del evento',
      required: true,
      priceModifier: 0,
      order: 6,
      config: {
        placeholder: 'Ej: Salón de Fiestas "La Alegría"',
        maxLength: 100,
      },
    },

    // Dirección
    {
      id: 'event_address',
      fieldType: 'text_input',
      label: 'Dirección (opcional)',
      required: false,
      priceModifier: 0,
      order: 7,
      config: {
        placeholder: 'Ej: Calle Mayor 123, Madrid',
        maxLength: 150,
      },
    },

    // Mensaje personalizado
    {
      id: 'custom_message',
      fieldType: 'text_input',
      label: 'Mensaje adicional (opcional)',
      required: false,
      priceModifier: 0,
      order: 8,
      helpText: 'Ej: "¡Te esperamos!", "Confirmar asistencia al 600123456"',
      config: {
        placeholder: 'Mensaje adicional para la invitación',
        maxLength: 200,
        showCharCounter: true,
      },
    },

    // Imagen de referencia
    {
      id: 'reference_image',
      fieldType: 'image_upload',
      label: 'Imagen o logo (opcional)',
      required: false,
      priceModifier: 0,
      order: 9,
      helpText: 'Sube una foto o logo que quieras incluir en el diseño',
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },

    // Confirmación
    {
      id: 'design_confirmation',
      fieldType: 'checkbox',
      label: 'Entiendo que recibiré una vista previa del diseño para aprobar antes de imprimir.',
      required: true,
      priceModifier: 0,
      order: 10,
      config: {
        description: 'Nuestro equipo creará el diseño basándose en tus datos.',
      },
    },
  ],
};

// ============================================================================
// PLANTILLA: TAZAS / MUGS PERSONALIZADOS
// ============================================================================

export const MUG_CUSTOMIZATION_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    // 1. TIPO DE TAZA (obligatorio)
    {
      id: 'mug_type',
      fieldType: 'card_selector',
      label: 'Tipo de taza',
      required: true,
      priceModifier: 0,
      order: 1,
      helpText: 'Selecciona el tipo de taza que prefieres',
      config: {
        displayStyle: 'visual_cards',
        layout: 'horizontal',
        options: [
          {
            value: 'blanca_clasica',
            label: 'Taza blanca clásica',
            icon: '☕',
            description: 'Cerámica blanca estándar',
          },
          {
            value: 'magica_negra',
            label: 'Taza mágica',
            icon: '✨',
            description: 'Negra que revela el diseño con calor',
            priceModifier: 3,
          },
          {
            value: 'interior_color',
            label: 'Interior y asa de color',
            icon: '🎨',
            description: 'Blanca exterior, color interior',
            priceModifier: 2,
          },
          {
            value: 'metalica_camping',
            label: 'Taza metálica / camping',
            icon: '🏕️',
            description: 'Estilo esmaltado vintage',
            priceModifier: 4,
          },
        ],
      },
    },

    // 2. ESTILO DE DISEÑO (obligatorio)
    {
      id: 'design_style',
      fieldType: 'card_selector',
      label: '¿Qué estilo de diseño te gustaría?',
      required: true,
      priceModifier: 0,
      order: 2,
      helpText: 'El estilo determina qué información necesitaremos',
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          {
            value: 'foto',
            label: 'Foto personalizada',
            icon: '📷',
            description: 'Tu foto favorita en la taza',
          },
          {
            value: 'texto_nombre',
            label: 'Texto + nombre',
            icon: '✍️',
            description: 'Nombre con mensaje especial',
          },
          {
            value: 'ilustracion',
            label: 'Ilustración / caricatura',
            icon: '🎨',
            description: 'Diseño ilustrado personalizado',
          },
          {
            value: 'infantil',
            label: 'Diseño infantil',
            icon: '🧸',
            description: 'Para los más pequeños',
          },
          {
            value: 'frase_divertida',
            label: 'Frase divertida',
            icon: '😄',
            description: 'Humor y frases ingeniosas',
          },
          {
            value: 'logo_empresa',
            label: 'Logo / empresa',
            icon: '🏢',
            description: 'Corporativo o negocio',
          },
        ],
      },
    },

    // 3. IMAGEN (condicional - solo para estilos con imagen)
    {
      id: 'main_image',
      fieldType: 'image_upload',
      label: 'Sube la imagen que quieres usar',
      required: true,
      priceModifier: 0,
      order: 3,
      helpText: 'Recomendamos fotos nítidas y bien iluminadas. (Imagen 1)',
      condition: {
        dependsOn: 'design_style',
        showWhen: ['foto', 'ilustracion', 'infantil', 'logo_empresa'],
      },
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
        helpText: 'Formato: JPG, PNG, WEBP • Máximo 10MB',
      },
    },

    // 3b. IMAGEN ADICIONAL (opcional)
    {
      id: 'secondary_image',
      fieldType: 'image_upload',
      label: 'Imagen adicional (opcional)',
      required: false,
      priceModifier: 0,
      order: 4,
      helpText: 'Si quieres añadir una segunda imagen. (Imagen 2 de 2)',
      condition: {
        dependsOn: 'design_style',
        showWhen: ['foto', 'ilustracion', 'infantil'],
      },
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },

    // 4. TEXTO PRINCIPAL (condicional)
    {
      id: 'main_text',
      fieldType: 'text_input',
      label: 'Texto principal',
      required: true,
      priceModifier: 0,
      order: 5,
      helpText: 'El texto principal que aparecerá en la taza',
      condition: {
        dependsOn: 'design_style',
        showWhen: ['texto_nombre', 'frase_divertida', 'infantil'],
      },
      config: {
        placeholder: 'Ej: Juan, Mamá, Feliz Cumpleaños',
        maxLength: 50,
        showCharCounter: true,
      },
    },

    // 5. TEXTO SECUNDARIO (opcional)
    {
      id: 'secondary_text',
      fieldType: 'text_input',
      label: 'Texto secundario (opcional)',
      required: false,
      priceModifier: 0,
      order: 6,
      helpText: 'Un mensaje adicional o subtítulo',
      condition: {
        dependsOn: 'design_style',
        showWhen: ['texto_nombre', 'frase_divertida', 'infantil', 'foto'],
      },
      config: {
        placeholder: 'Ej: El mejor del mundo, Te quiero mucho',
        maxLength: 80,
        showCharCounter: true,
      },
    },

    // 6. NOMBRE (para estilos que lo necesiten)
    {
      id: 'person_name',
      fieldType: 'text_input',
      label: 'Nombre',
      required: true,
      priceModifier: 0,
      order: 7,
      helpText: 'El nombre que aparecerá destacado',
      condition: {
        dependsOn: 'design_style',
        showWhen: ['texto_nombre', 'infantil'],
      },
      config: {
        placeholder: 'Ej: María, Papá, Abuelo',
        maxLength: 30,
        validationPattern: '^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\\s]+$',
        helpText: 'Solo letras y espacios',
      },
    },

    // 7. ORIENTACIÓN DEL DISEÑO (opcional)
    {
      id: 'design_orientation',
      fieldType: 'radio_group',
      label: '¿Dónde prefieres el diseño?',
      required: false,
      priceModifier: 0,
      order: 8,
      helpText: 'Si no eliges, haremos un diseño equilibrado',
      config: {
        layout: 'horizontal',
        options: [
          { value: 'izquierda', label: 'Lado izquierdo' },
          { value: 'derecha', label: 'Lado derecho' },
          { value: 'ambos', label: 'Ambos lados', priceModifier: 2 },
        ],
      },
    },

    // 8. COLOR INTERIOR (condicional para tazas con interior de color)
    {
      id: 'interior_color',
      fieldType: 'color_selector',
      label: 'Color del interior y asa',
      required: true,
      priceModifier: 0,
      order: 9,
      condition: {
        dependsOn: 'mug_type',
        showWhen: 'interior_color',
      },
      config: {
        displayStyle: 'color_blocks',
        availableColors: [
          { id: 'rojo', name: 'Rojo', hex: '#DC2626' },
          { id: 'azul', name: 'Azul', hex: '#2563EB' },
          { id: 'verde', name: 'Verde', hex: '#16A34A' },
          { id: 'rosa', name: 'Rosa', hex: '#EC4899' },
          { id: 'amarillo', name: 'Amarillo', hex: '#EAB308' },
          { id: 'negro', name: 'Negro', hex: '#171717' },
        ],
      },
    },

    // 9. CONFIRMACIÓN (obligatorio)
    {
      id: 'design_confirmation',
      fieldType: 'checkbox',
      label:
        'Confirmo que los textos están correctamente escritos y entiendo que recibiré una vista previa antes de imprimir.',
      required: true,
      priceModifier: 0,
      order: 10,
      config: {
        description:
          'Te enviaremos una vista previa para confirmar el diseño antes de producir. El diseño final lo realiza nuestro equipo adaptándolo al tipo de taza seleccionado.',
        helpText: 'Debes aceptar para continuar',
      },
    },
  ],
};

// ============================================================================
// PLANTILLA: TARJETAS DE VISITA
// ============================================================================

export const BUSINESS_CARDS_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'card_format',
      fieldType: 'card_selector',
      label: 'Formato de tarjeta',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'horizontal',
        options: [
          { value: 'standard', label: 'Estándar (85x55mm)', icon: '📇' },
          { value: 'square', label: 'Cuadrada (55x55mm)', icon: '⬜', priceModifier: 2 },
          { value: 'mini', label: 'Mini (70x28mm)', icon: '📄' },
          { value: 'xl', label: 'XL (90x55mm)', icon: '📋', priceModifier: 3 },
        ],
      },
    },
    {
      id: 'paper_type',
      fieldType: 'card_selector',
      label: 'Tipo de papel',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'mate_350', label: 'Mate 350g', icon: '📄', description: 'Acabado elegante' },
          { value: 'brillo_350', label: 'Brillo 350g', icon: '✨', description: 'Colores vibrantes' },
          { value: 'lino', label: 'Textura Lino', icon: '🧵', priceModifier: 5, description: 'Premium texturizado' },
          { value: 'kraft', label: 'Kraft Ecológico', icon: '🌱', priceModifier: 3, description: 'Natural y sostenible' },
          { value: 'premium_400', label: 'Premium 400g', icon: '💎', priceModifier: 8, description: 'Máxima calidad' },
        ],
      },
    },
    {
      id: 'finish',
      fieldType: 'card_selector',
      label: 'Acabado especial',
      required: false,
      priceModifier: 0,
      order: 3,
      helpText: 'Opcional: añade un acabado premium a tus tarjetas',
      config: {
        displayStyle: 'simple_cards',
        layout: 'vertical',
        options: [
          { value: 'none', label: 'Sin acabado especial', priceModifier: 0 },
          { value: 'laminate_mate', label: 'Plastificado Mate', priceModifier: 10 },
          { value: 'laminate_brillo', label: 'Plastificado Brillo', priceModifier: 10 },
          { value: 'soft_touch', label: 'Soft Touch', priceModifier: 15, badge: 'Premium' },
          { value: 'uv_selective', label: 'Barniz UV Selectivo', priceModifier: 25 },
          { value: 'foil_gold', label: 'Stamping Dorado', priceModifier: 40 },
          { value: 'foil_silver', label: 'Stamping Plateado', priceModifier: 40 },
        ],
      },
    },
    {
      id: 'corners',
      fieldType: 'radio_group',
      label: 'Esquinas',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        layout: 'horizontal',
        options: [
          { value: 'square', label: 'Rectas' },
          { value: 'rounded', label: 'Redondeadas', priceModifier: 3 },
        ],
      },
    },
    {
      id: 'print_sides',
      fieldType: 'radio_group',
      label: 'Impresión',
      required: true,
      priceModifier: 0,
      order: 5,
      config: {
        layout: 'horizontal',
        options: [
          { value: 'one_side', label: 'Una cara' },
          { value: 'two_sides', label: 'Dos caras', priceModifier: 15 },
        ],
      },
    },
    {
      id: 'design_front',
      fieldType: 'image_upload',
      label: 'Diseño cara frontal',
      required: true,
      priceModifier: 0,
      order: 6,
      helpText: 'Sube tu diseño en alta resolución (300 DPI mínimo)',
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'pdf', 'ai'],
        showPreview: true,
      },
    },
    {
      id: 'design_back',
      fieldType: 'image_upload',
      label: 'Diseño cara trasera',
      required: false,
      priceModifier: 0,
      order: 7,
      condition: {
        dependsOn: 'print_sides',
        showWhen: 'two_sides',
      },
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'pdf', 'ai'],
        showPreview: true,
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 8,
      isQuantityMultiplier: true,
      config: {
        placeholder: 'Selecciona cantidad',
        options: [
          { value: '100', label: '100 unidades', unitPriceOverride: 0.15, description: '€0.15/ud' },
          { value: '250', label: '250 unidades', unitPriceOverride: 0.10, description: '€0.10/ud' },
          { value: '500', label: '500 unidades', unitPriceOverride: 0.08, description: '€0.08/ud' },
          { value: '1000', label: '1000 unidades', unitPriceOverride: 0.06, description: '€0.06/ud' },
          { value: '2500', label: '2500 unidades', unitPriceOverride: 0.04, description: '€0.04/ud' },
        ],
      },
    },
  ],
};

// ============================================================================
// PLANTILLA: GORRAS PERSONALIZADAS
// ============================================================================

export const CUSTOM_CAPS_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'cap_style',
      fieldType: 'card_selector',
      label: 'Estilo de gorra',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'snapback', label: 'Snapback', icon: '🧢', description: 'Cierre ajustable' },
          { value: 'trucker', label: 'Trucker (malla)', icon: '🏈', description: 'Transpirable' },
          { value: 'dad_hat', label: 'Dad Hat', icon: '👴', description: 'Estilo relajado' },
          { value: 'fitted', label: 'Fitted (ajustada)', icon: '⚾', priceModifier: 5, description: 'Sin ajuste' },
          { value: 'bucket', label: 'Bucket Hat', icon: '🎣', priceModifier: 3, description: 'Estilo pescador' },
        ],
      },
    },
    {
      id: 'color',
      fieldType: 'color_selector',
      label: 'Color de la gorra',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'color_blocks',
        availableColors: [
          { id: 'black', name: 'Negro', hex: '#000000' },
          { id: 'white', name: 'Blanco', hex: '#FFFFFF' },
          { id: 'navy', name: 'Azul Marino', hex: '#1a365d' },
          { id: 'red', name: 'Rojo', hex: '#e53e3e' },
          { id: 'gray', name: 'Gris', hex: '#718096' },
          { id: 'green', name: 'Verde', hex: '#38a169' },
          { id: 'beige', name: 'Beige', hex: '#d4a574' },
        ],
      },
    },
    {
      id: 'personalization_type',
      fieldType: 'card_selector',
      label: 'Tipo de personalización',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        displayStyle: 'visual_cards',
        layout: 'horizontal',
        options: [
          { value: 'embroidery', label: 'Bordado', icon: '🧵', priceModifier: 8, badge: 'Premium' },
          { value: 'vinyl', label: 'Vinilo textil', icon: '🎨' },
          { value: 'dtf', label: 'DTF (Full color)', icon: '🖨️', priceModifier: 3 },
          { value: 'sublimation', label: 'Sublimación', icon: '✨', description: 'Solo gorras blancas' },
        ],
      },
    },
    {
      id: 'design_position',
      fieldType: 'card_selector',
      label: 'Posición del diseño',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'front_center', label: 'Frontal centrado' },
          { value: 'front_left', label: 'Frontal izquierda' },
          { value: 'side_left', label: 'Lateral izquierdo', priceModifier: 2 },
          { value: 'side_right', label: 'Lateral derecho', priceModifier: 2 },
          { value: 'back', label: 'Trasera', priceModifier: 3 },
        ],
      },
    },
    {
      id: 'design',
      fieldType: 'image_upload',
      label: 'Tu diseño/logo',
      required: true,
      priceModifier: 0,
      order: 5,
      helpText: 'Para bordado: máximo 3 colores. PNG o SVG recomendado.',
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'svg'],
        showPreview: true,
      },
    },
    {
      id: 'text_below',
      fieldType: 'text_input',
      label: 'Texto adicional (opcional)',
      required: false,
      priceModifier: 3,
      order: 6,
      config: {
        placeholder: 'Ej: Tu nombre, equipo, empresa...',
        maxLength: 30,
        showCharCounter: true,
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 7,
      isQuantityMultiplier: true,
      config: {
        placeholder: 'Selecciona cantidad',
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 18 },
          { value: '5', label: '5 unidades', unitPriceOverride: 15, description: '€15/ud' },
          { value: '10', label: '10 unidades', unitPriceOverride: 12, description: '€12/ud' },
          { value: '25', label: '25 unidades', unitPriceOverride: 10, description: '€10/ud' },
          { value: '50', label: '50 unidades', unitPriceOverride: 8, description: '€8/ud' },
        ],
      },
    },
  ],
};

// ============================================================================
// PLANTILLA: COJINES PERSONALIZADOS
// ============================================================================

export const CUSTOM_CUSHIONS_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'cushion_shape',
      fieldType: 'card_selector',
      label: 'Forma del cojín',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'square_40', label: 'Cuadrado 40x40cm', icon: '⬜' },
          { value: 'square_50', label: 'Cuadrado 50x50cm', icon: '⬛', priceModifier: 5 },
          { value: 'rectangular', label: 'Rectangular 30x50cm', icon: '▭' },
          { value: 'heart', label: 'Corazón', icon: '❤️', priceModifier: 3 },
          { value: 'round', label: 'Redondo', icon: '⭕', priceModifier: 3 },
          { value: 'star', label: 'Estrella', icon: '⭐', priceModifier: 5 },
        ],
      },
    },
    {
      id: 'fabric_type',
      fieldType: 'card_selector',
      label: 'Tipo de tela',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'simple_cards',
        layout: 'vertical',
        options: [
          { value: 'polyester', label: 'Poliéster suave', description: 'Ideal para sublimación' },
          { value: 'satin', label: 'Satén brillante', priceModifier: 4 },
          { value: 'linen_look', label: 'Aspecto lino', priceModifier: 6 },
          { value: 'velvet', label: 'Terciopelo', priceModifier: 8, badge: 'Premium' },
        ],
      },
    },
    {
      id: 'print_type',
      fieldType: 'radio_group',
      label: 'Impresión',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        layout: 'vertical',
        options: [
          { value: 'one_side', label: 'Solo frontal' },
          { value: 'both_sides', label: 'Ambas caras (mismo diseño)', priceModifier: 8 },
          { value: 'different_sides', label: 'Ambas caras (diferente diseño)', priceModifier: 12 },
        ],
      },
    },
    {
      id: 'design_front',
      fieldType: 'image_upload',
      label: 'Diseño frontal',
      required: true,
      priceModifier: 0,
      order: 4,
      helpText: 'Foto o diseño en alta resolución',
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'design_back',
      fieldType: 'image_upload',
      label: 'Diseño trasero',
      required: false,
      priceModifier: 0,
      order: 5,
      condition: {
        dependsOn: 'print_type',
        showWhen: 'different_sides',
      },
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'add_text',
      fieldType: 'checkbox',
      label: 'Añadir texto personalizado',
      required: false,
      priceModifier: 0,
      order: 6,
      config: {
        description: 'Incluye un texto especial en tu cojín',
      },
    },
    {
      id: 'custom_text',
      fieldType: 'text_input',
      label: 'Texto',
      required: false,
      priceModifier: 3,
      order: 7,
      condition: {
        dependsOn: 'add_text',
        showWhen: true,
      },
      config: {
        placeholder: 'Ej: Te quiero mamá, Feliz cumpleaños...',
        maxLength: 50,
        showCharCounter: true,
      },
    },
    {
      id: 'include_filling',
      fieldType: 'radio_group',
      label: 'Relleno',
      required: true,
      priceModifier: 0,
      order: 8,
      config: {
        layout: 'horizontal',
        options: [
          { value: 'no', label: 'Solo funda' },
          { value: 'yes', label: 'Con relleno incluido', priceModifier: 8 },
        ],
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 9,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 22 },
          { value: '2', label: '2 unidades', unitPriceOverride: 20, description: '€20/ud' },
          { value: '5', label: '5 unidades', unitPriceOverride: 18, description: '€18/ud' },
          { value: '10', label: '10 unidades', unitPriceOverride: 15, description: '€15/ud' },
        ],
      },
    },
  ],
};

// ============================================================================
// PLANTILLA: PUZZLES PERSONALIZADOS
// ============================================================================

export const CUSTOM_PUZZLES_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'puzzle_size',
      fieldType: 'card_selector',
      label: 'Tamaño y piezas',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: '30_a5', label: '30 piezas (A5)', icon: '🧩', description: 'Ideal para niños' },
          { value: '120_a4', label: '120 piezas (A4)', icon: '🧩', badge: 'Popular' },
          { value: '300_a3', label: '300 piezas (A3)', icon: '🧩', priceModifier: 8 },
          { value: '500_a3', label: '500 piezas (A3)', icon: '🧩', priceModifier: 12 },
          { value: '1000_a2', label: '1000 piezas (A2)', icon: '🧩', priceModifier: 20, badge: 'Pro' },
        ],
      },
    },
    {
      id: 'puzzle_material',
      fieldType: 'card_selector',
      label: 'Material',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'cardboard', label: 'Cartón premium', description: 'Clásico y económico' },
          { value: 'wood', label: 'Madera', priceModifier: 15, description: 'Más duradero' },
        ],
      },
    },
    {
      id: 'photo',
      fieldType: 'image_upload',
      label: 'Tu foto',
      required: true,
      priceModifier: 0,
      order: 3,
      helpText: 'Usa fotos horizontales para mejor resultado. Mínimo 300 DPI.',
      config: {
        maxSizeMB: 15,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'add_frame',
      fieldType: 'checkbox',
      label: 'Añadir marco decorativo',
      required: false,
      priceModifier: 5,
      order: 4,
      config: {
        description: 'Un marco elegante alrededor de tu foto',
      },
    },
    {
      id: 'frame_style',
      fieldType: 'dropdown',
      label: 'Estilo del marco',
      required: false,
      priceModifier: 0,
      order: 5,
      condition: {
        dependsOn: 'add_frame',
        showWhen: true,
      },
      config: {
        placeholder: 'Selecciona estilo',
        options: [
          { value: 'classic', label: 'Clásico dorado' },
          { value: 'modern', label: 'Moderno minimalista' },
          { value: 'vintage', label: 'Vintage' },
          { value: 'hearts', label: 'Corazones (romántico)' },
          { value: 'kids', label: 'Infantil (estrellas)' },
        ],
      },
    },
    {
      id: 'add_text',
      fieldType: 'checkbox',
      label: 'Añadir texto',
      required: false,
      priceModifier: 3,
      order: 6,
      config: {
        description: 'Incluye un título o mensaje en el puzzle',
      },
    },
    {
      id: 'custom_text',
      fieldType: 'text_input',
      label: 'Texto personalizado',
      required: false,
      priceModifier: 0,
      order: 7,
      condition: {
        dependsOn: 'add_text',
        showWhen: true,
      },
      config: {
        placeholder: 'Ej: Recuerdo de nuestras vacaciones 2024',
        maxLength: 60,
        showCharCounter: true,
      },
    },
    {
      id: 'packaging',
      fieldType: 'card_selector',
      label: 'Presentación',
      required: true,
      priceModifier: 0,
      order: 8,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'bag', label: 'Bolsa zip estándar' },
          { value: 'box_simple', label: 'Caja blanca', priceModifier: 3 },
          { value: 'box_photo', label: 'Caja con la foto', priceModifier: 8, badge: 'Regalo' },
          { value: 'tin_box', label: 'Caja metálica', priceModifier: 12 },
        ],
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 9,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 15 },
          { value: '2', label: '2 unidades', unitPriceOverride: 13, description: '€13/ud' },
          { value: '5', label: '5 unidades', unitPriceOverride: 11, description: '€11/ud' },
          { value: '10', label: '10 unidades', unitPriceOverride: 9, description: '€9/ud' },
        ],
      },
    },
  ],
};

// ============================================================================
// PLANTILLA: FUNDAS DE MÓVIL
// ============================================================================

export const PHONE_CASES_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'phone_brand',
      fieldType: 'dropdown',
      label: 'Marca del móvil',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        placeholder: 'Selecciona la marca',
        options: [
          { value: 'iphone', label: 'iPhone' },
          { value: 'samsung', label: 'Samsung Galaxy' },
          { value: 'xiaomi', label: 'Xiaomi' },
          { value: 'huawei', label: 'Huawei' },
          { value: 'oppo', label: 'OPPO' },
          { value: 'oneplus', label: 'OnePlus' },
          { value: 'google', label: 'Google Pixel' },
        ],
      },
    },
    {
      id: 'phone_model_iphone',
      fieldType: 'dropdown',
      label: 'Modelo de iPhone',
      required: true,
      priceModifier: 0,
      order: 2,
      condition: {
        dependsOn: 'phone_brand',
        showWhen: 'iphone',
      },
      config: {
        placeholder: 'Selecciona el modelo',
        options: [
          { value: 'ip16_pro_max', label: 'iPhone 16 Pro Max' },
          { value: 'ip16_pro', label: 'iPhone 16 Pro' },
          { value: 'ip16', label: 'iPhone 16' },
          { value: 'ip15_pro_max', label: 'iPhone 15 Pro Max' },
          { value: 'ip15_pro', label: 'iPhone 15 Pro' },
          { value: 'ip15', label: 'iPhone 15' },
          { value: 'ip14_pro_max', label: 'iPhone 14 Pro Max' },
          { value: 'ip14_pro', label: 'iPhone 14 Pro' },
          { value: 'ip14', label: 'iPhone 14' },
          { value: 'ip13', label: 'iPhone 13' },
          { value: 'ip12', label: 'iPhone 12 / 12 Pro' },
          { value: 'ipse3', label: 'iPhone SE (3ª gen)' },
        ],
      },
    },
    {
      id: 'phone_model_samsung',
      fieldType: 'dropdown',
      label: 'Modelo de Samsung',
      required: true,
      priceModifier: 0,
      order: 2,
      condition: {
        dependsOn: 'phone_brand',
        showWhen: 'samsung',
      },
      config: {
        placeholder: 'Selecciona el modelo',
        options: [
          { value: 's24_ultra', label: 'Galaxy S24 Ultra' },
          { value: 's24_plus', label: 'Galaxy S24+' },
          { value: 's24', label: 'Galaxy S24' },
          { value: 's23_ultra', label: 'Galaxy S23 Ultra' },
          { value: 's23', label: 'Galaxy S23' },
          { value: 'a54', label: 'Galaxy A54' },
          { value: 'a34', label: 'Galaxy A34' },
          { value: 'a14', label: 'Galaxy A14' },
        ],
      },
    },
    {
      id: 'phone_model_xiaomi',
      fieldType: 'dropdown',
      label: 'Modelo de Xiaomi',
      required: true,
      priceModifier: 0,
      order: 2,
      condition: {
        dependsOn: 'phone_brand',
        showWhen: 'xiaomi',
      },
      config: {
        placeholder: 'Selecciona el modelo',
        options: [
          { value: '14_ultra', label: 'Xiaomi 14 Ultra' },
          { value: '14_pro', label: 'Xiaomi 14 Pro' },
          { value: '14', label: 'Xiaomi 14' },
          { value: 'redmi_note_13', label: 'Redmi Note 13' },
          { value: 'redmi_note_12', label: 'Redmi Note 12' },
          { value: 'poco_x6', label: 'POCO X6' },
        ],
      },
    },
    {
      id: 'phone_model_other',
      fieldType: 'text_input',
      label: 'Modelo específico',
      required: true,
      priceModifier: 0,
      order: 2,
      condition: {
        dependsOn: 'phone_brand',
        showWhen: ['huawei', 'oppo', 'oneplus', 'google'],
      },
      config: {
        placeholder: 'Escribe el modelo exacto',
        maxLength: 50,
      },
    },
    {
      id: 'case_type',
      fieldType: 'card_selector',
      label: 'Tipo de funda',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'soft_tpu', label: 'Silicona TPU', icon: '📱', description: 'Flexible y ligera' },
          { value: 'hard_plastic', label: 'Plástico duro', icon: '🛡️', description: 'Máxima protección' },
          { value: 'biodegradable', label: 'Biodegradable', icon: '🌱', priceModifier: 4, description: 'Ecológica' },
          { value: 'wallet', label: 'Tipo cartera', icon: '👛', priceModifier: 8 },
          { value: 'tough', label: 'Ultra resistente', icon: '💪', priceModifier: 6, description: 'Doble capa' },
        ],
      },
    },
    {
      id: 'design_style',
      fieldType: 'card_selector',
      label: 'Estilo de diseño',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        displayStyle: 'visual_cards',
        layout: 'horizontal',
        options: [
          { value: 'full_photo', label: 'Foto completa', icon: '📷' },
          { value: 'collage', label: 'Collage de fotos', icon: '🖼️', priceModifier: 3 },
          { value: 'text_only', label: 'Solo texto/nombre', icon: '✍️' },
          { value: 'logo', label: 'Logo/diseño propio', icon: '🎨' },
        ],
      },
    },
    {
      id: 'main_image',
      fieldType: 'image_upload',
      label: 'Tu imagen/diseño',
      required: true,
      priceModifier: 0,
      order: 5,
      helpText: 'PNG o JPG de alta resolución',
      condition: {
        dependsOn: 'design_style',
        showWhen: ['full_photo', 'logo'],
      },
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'collage_image_1',
      fieldType: 'image_upload',
      label: 'Foto 1 para collage',
      required: true,
      priceModifier: 0,
      order: 5,
      condition: {
        dependsOn: 'design_style',
        showWhen: 'collage',
      },
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'collage_image_2',
      fieldType: 'image_upload',
      label: 'Foto 2 para collage',
      required: false,
      priceModifier: 0,
      order: 6,
      condition: {
        dependsOn: 'design_style',
        showWhen: 'collage',
      },
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'collage_image_3',
      fieldType: 'image_upload',
      label: 'Foto 3 para collage',
      required: false,
      priceModifier: 0,
      order: 7,
      condition: {
        dependsOn: 'design_style',
        showWhen: 'collage',
      },
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'custom_text',
      fieldType: 'text_input',
      label: 'Texto personalizado',
      required: true,
      priceModifier: 0,
      order: 5,
      condition: {
        dependsOn: 'design_style',
        showWhen: 'text_only',
      },
      config: {
        placeholder: 'Ej: Tu nombre, iniciales, frase...',
        maxLength: 30,
        showCharCounter: true,
      },
    },
    {
      id: 'finish',
      fieldType: 'radio_group',
      label: 'Acabado',
      required: true,
      priceModifier: 0,
      order: 8,
      config: {
        layout: 'horizontal',
        options: [
          { value: 'glossy', label: 'Brillante' },
          { value: 'matte', label: 'Mate' },
        ],
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 9,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 15 },
          { value: '2', label: '2 unidades', unitPriceOverride: 13, description: '€13/ud' },
          { value: '5', label: '5 unidades', unitPriceOverride: 11, description: '€11/ud' },
        ],
      },
    },
  ],
};

// ============================================================================
// PLANTILLA: CALENDARIOS PERSONALIZADOS
// ============================================================================

export const CUSTOM_CALENDARS_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'calendar_type',
      fieldType: 'card_selector',
      label: 'Tipo de calendario',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'wall_a3', label: 'Pared A3', icon: '🗓️', description: 'Clásico grande' },
          { value: 'wall_a4', label: 'Pared A4', icon: '📅', badge: 'Popular' },
          { value: 'desk', label: 'Escritorio', icon: '🖥️', description: 'Con soporte' },
          { value: 'poster', label: 'Póster anual', icon: '📋', priceModifier: 5 },
          { value: 'pocket', label: 'Bolsillo (pack 10)', icon: '👛', priceModifier: -5 },
        ],
      },
    },
    {
      id: 'start_month',
      fieldType: 'dropdown',
      label: 'Mes de inicio',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        placeholder: 'Selecciona el mes',
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
          { value: '12', label: 'Diciembre' },
        ],
      },
    },
    {
      id: 'year',
      fieldType: 'dropdown',
      label: 'Año',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        options: [
          { value: '2025', label: '2025' },
          { value: '2026', label: '2026' },
        ],
      },
    },
    {
      id: 'photo_1',
      fieldType: 'image_upload',
      label: 'Foto mes 1 (Ej: Enero)',
      required: true,
      priceModifier: 0,
      order: 4,
      helpText: 'Sube 12 fotos, una por cada mes. Comienza con la primera.',
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'photo_2',
      fieldType: 'image_upload',
      label: 'Foto mes 2',
      required: false,
      priceModifier: 0,
      order: 5,
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'photo_3',
      fieldType: 'image_upload',
      label: 'Foto mes 3',
      required: false,
      priceModifier: 0,
      order: 6,
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'more_photos_note',
      fieldType: 'checkbox',
      label: 'Subiré el resto de fotos por email después del pedido',
      required: false,
      priceModifier: 0,
      order: 7,
      config: {
        description: 'Te contactaremos para recibir las fotos restantes',
      },
    },
    {
      id: 'cover_photo',
      fieldType: 'image_upload',
      label: 'Foto de portada (opcional)',
      required: false,
      priceModifier: 0,
      order: 8,
      helpText: 'Opcional: foto especial para la portada',
      config: {
        maxSizeMB: 10,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'highlight_dates',
      fieldType: 'checkbox',
      label: 'Marcar fechas especiales',
      required: false,
      priceModifier: 5,
      order: 9,
      config: {
        description: 'Añade cumpleaños, aniversarios y fechas importantes',
      },
    },
    {
      id: 'special_dates',
      fieldType: 'text_input',
      label: 'Fechas especiales',
      required: false,
      priceModifier: 0,
      order: 10,
      condition: {
        dependsOn: 'highlight_dates',
        showWhen: true,
      },
      config: {
        placeholder: 'Ej: 15/03 Cumple María, 22/06 Aniversario...',
        maxLength: 500,
        showCharCounter: true,
        helpText: 'Formato: DD/MM Descripción, separadas por coma',
      },
    },
    {
      id: 'title',
      fieldType: 'text_input',
      label: 'Título del calendario',
      required: false,
      priceModifier: 0,
      order: 11,
      config: {
        placeholder: 'Ej: Familia García 2025',
        maxLength: 40,
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 12,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 18 },
          { value: '2', label: '2 unidades', unitPriceOverride: 16, description: '€16/ud' },
          { value: '5', label: '5 unidades', unitPriceOverride: 14, description: '€14/ud' },
          { value: '10', label: '10 unidades', unitPriceOverride: 12, description: '€12/ud' },
        ],
      },
    },
  ],
};

// ============================================================================
// PLANTILLA: LLAVEROS PERSONALIZADOS
// ============================================================================

export const CUSTOM_KEYCHAINS_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'material',
      fieldType: 'card_selector',
      label: 'Material',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'wood_birch', label: 'Madera Abedul', icon: '🪵', description: 'Natural y cálido' },
          { value: 'wood_walnut', label: 'Madera Nogal', icon: '🌰', priceModifier: 2, description: 'Tono oscuro' },
          { value: 'acrylic_clear', label: 'Acrílico Transparente', icon: '💎' },
          { value: 'acrylic_color', label: 'Acrílico Color', icon: '🎨' },
          { value: 'metal_steel', label: 'Acero Inox', icon: '🔩', priceModifier: 5, badge: 'Premium' },
          { value: 'metal_aluminum', label: 'Aluminio', icon: '⚪', priceModifier: 3 },
          { value: 'leather', label: 'Cuero sintético', icon: '👜', priceModifier: 4 },
        ],
      },
    },
    {
      id: 'shape',
      fieldType: 'card_selector',
      label: 'Forma',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'rectangle', label: 'Rectangular', icon: '▭' },
          { value: 'circle', label: 'Circular', icon: '⭕' },
          { value: 'heart', label: 'Corazón', icon: '❤️' },
          { value: 'star', label: 'Estrella', icon: '⭐' },
          { value: 'dog_tag', label: 'Placa militar', icon: '🏷️' },
          { value: 'house', label: 'Casa', icon: '🏠' },
          { value: 'car', label: 'Coche', icon: '🚗' },
          { value: 'custom', label: 'Forma personalizada', icon: '✂️', priceModifier: 5 },
        ],
      },
    },
    {
      id: 'size',
      fieldType: 'dropdown',
      label: 'Tamaño',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        options: [
          { value: 'small', label: 'Pequeño (3-4cm)' },
          { value: 'medium', label: 'Mediano (5-6cm)' },
          { value: 'large', label: 'Grande (7-8cm)', priceModifier: 2 },
        ],
      },
    },
    {
      id: 'design_type',
      fieldType: 'card_selector',
      label: 'Tipo de diseño',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'text_only', label: 'Solo texto' },
          { value: 'image_only', label: 'Solo imagen/logo' },
          { value: 'text_image', label: 'Texto + imagen' },
          { value: 'qr_code', label: 'Código QR', priceModifier: 2 },
        ],
      },
    },
    {
      id: 'text_line_1',
      fieldType: 'text_input',
      label: 'Texto línea 1',
      required: false,
      priceModifier: 0,
      order: 5,
      condition: {
        dependsOn: 'design_type',
        showWhen: ['text_only', 'text_image'],
      },
      config: {
        placeholder: 'Nombre, fecha, etc.',
        maxLength: 20,
        showCharCounter: true,
      },
    },
    {
      id: 'text_line_2',
      fieldType: 'text_input',
      label: 'Texto línea 2 (opcional)',
      required: false,
      priceModifier: 0,
      order: 6,
      condition: {
        dependsOn: 'design_type',
        showWhen: ['text_only', 'text_image'],
      },
      config: {
        placeholder: 'Segunda línea',
        maxLength: 20,
      },
    },
    {
      id: 'image',
      fieldType: 'image_upload',
      label: 'Imagen/Logo',
      required: false,
      priceModifier: 0,
      order: 7,
      helpText: 'Vectorial (SVG) recomendado para mejor resultado',
      condition: {
        dependsOn: 'design_type',
        showWhen: ['image_only', 'text_image'],
      },
      config: {
        maxSizeMB: 5,
        allowedFormats: ['jpg', 'jpeg', 'png', 'svg'],
        showPreview: true,
      },
    },
    {
      id: 'qr_content',
      fieldType: 'text_input',
      label: 'Contenido del QR',
      required: false,
      priceModifier: 0,
      order: 7,
      condition: {
        dependsOn: 'design_type',
        showWhen: 'qr_code',
      },
      config: {
        placeholder: 'URL, teléfono, texto...',
        maxLength: 200,
      },
    },
    {
      id: 'ring_type',
      fieldType: 'dropdown',
      label: 'Tipo de anilla',
      required: true,
      priceModifier: 0,
      order: 8,
      config: {
        options: [
          { value: 'standard', label: 'Anilla estándar' },
          { value: 'split', label: 'Anilla partida reforzada' },
          { value: 'lobster', label: 'Mosquetón', priceModifier: 1 },
          { value: 'carabiner', label: 'Mini mosquetón escalada', priceModifier: 2 },
        ],
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 9,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 6 },
          { value: '5', label: '5 unidades', unitPriceOverride: 5, description: '€5/ud' },
          { value: '10', label: '10 unidades', unitPriceOverride: 4, description: '€4/ud' },
          { value: '25', label: '25 unidades', unitPriceOverride: 3.5, description: '€3.50/ud' },
          { value: '50', label: '50 unidades', unitPriceOverride: 3, description: '€3/ud' },
          { value: '100', label: '100 unidades', unitPriceOverride: 2.5, description: '€2.50/ud' },
        ],
      },
    },
  ],
};

// ============================================================================
// PLANTILLA: PLACAS PARA MASCOTAS
// ============================================================================

export const PET_TAGS_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'shape',
      fieldType: 'card_selector',
      label: 'Forma',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'bone', label: 'Hueso', icon: '🦴', badge: 'Popular' },
          { value: 'heart', label: 'Corazón', icon: '❤️' },
          { value: 'circle', label: 'Círculo', icon: '⭕' },
          { value: 'star', label: 'Estrella', icon: '⭐' },
          { value: 'paw', label: 'Huella', icon: '🐾' },
          { value: 'fish', label: 'Pez (gatos)', icon: '🐟' },
        ],
      },
    },
    {
      id: 'material',
      fieldType: 'card_selector',
      label: 'Material',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'simple_cards',
        layout: 'vertical',
        options: [
          { value: 'aluminum_colors', label: 'Aluminio anodizado (colores)', description: 'Ligero y colorido' },
          { value: 'stainless', label: 'Acero inoxidable', priceModifier: 3, description: 'Resistente', badge: 'Duradero' },
          { value: 'brass', label: 'Latón dorado', priceModifier: 4, description: 'Elegante' },
        ],
      },
    },
    {
      id: 'color',
      fieldType: 'color_selector',
      label: 'Color (solo aluminio)',
      required: false,
      priceModifier: 0,
      order: 3,
      condition: {
        dependsOn: 'material',
        showWhen: 'aluminum_colors',
      },
      config: {
        displayStyle: 'color_blocks',
        availableColors: [
          { id: 'red', name: 'Rojo', hex: '#e53e3e' },
          { id: 'blue', name: 'Azul', hex: '#3182ce' },
          { id: 'green', name: 'Verde', hex: '#38a169' },
          { id: 'pink', name: 'Rosa', hex: '#ed64a6' },
          { id: 'purple', name: 'Morado', hex: '#805ad5' },
          { id: 'gold', name: 'Dorado', hex: '#d69e2e' },
          { id: 'black', name: 'Negro', hex: '#1a202c' },
        ],
      },
    },
    {
      id: 'pet_name',
      fieldType: 'text_input',
      label: 'Nombre de la mascota',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        placeholder: 'Ej: Luna, Max, Coco...',
        maxLength: 15,
        showCharCounter: true,
      },
    },
    {
      id: 'phone',
      fieldType: 'text_input',
      label: 'Teléfono de contacto',
      required: true,
      priceModifier: 0,
      order: 5,
      config: {
        placeholder: 'Ej: 612345678',
        maxLength: 15,
      },
    },
    {
      id: 'extra_info',
      fieldType: 'text_input',
      label: 'Info adicional (opcional)',
      required: false,
      priceModifier: 0,
      order: 6,
      config: {
        placeholder: 'Ej: "Tiene chip", dirección corta...',
        maxLength: 30,
      },
    },
    {
      id: 'add_icon',
      fieldType: 'checkbox',
      label: 'Añadir icono decorativo',
      required: false,
      priceModifier: 1,
      order: 7,
      config: {
        description: 'Un pequeño icono junto al nombre',
      },
    },
    {
      id: 'icon',
      fieldType: 'dropdown',
      label: 'Icono',
      required: false,
      priceModifier: 0,
      order: 8,
      condition: {
        dependsOn: 'add_icon',
        showWhen: true,
      },
      config: {
        options: [
          { value: 'paw', label: '🐾 Huella' },
          { value: 'bone', label: '🦴 Hueso' },
          { value: 'heart', label: '❤️ Corazón' },
          { value: 'star', label: '⭐ Estrella' },
          { value: 'crown', label: '👑 Corona' },
        ],
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 9,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 8 },
          { value: '2', label: '2 unidades', unitPriceOverride: 7, description: '€7/ud' },
          { value: '3', label: '3 unidades', unitPriceOverride: 6, description: '€6/ud' },
        ],
      },
    },
  ],
};

// ============================================================================
// PLANTILLA: PHOTOCALL EVENTOS
// ============================================================================

export const PHOTOCALL_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'event_type',
      fieldType: 'card_selector',
      label: 'Tipo de evento',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'wedding', label: 'Boda', icon: '💒' },
          { value: 'birthday', label: 'Cumpleaños', icon: '🎂' },
          { value: 'communion', label: 'Comunión', icon: '✝️' },
          { value: 'baptism', label: 'Bautizo', icon: '👼' },
          { value: 'corporate', label: 'Evento corporativo', icon: '🏢' },
          { value: 'graduation', label: 'Graduación', icon: '🎓' },
          { value: 'baby_shower', label: 'Baby Shower', icon: '👶' },
          { value: 'other', label: 'Otro evento', icon: '🎉' },
        ],
      },
    },
    {
      id: 'size',
      fieldType: 'card_selector',
      label: 'Tamaño',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'simple_cards',
        layout: 'vertical',
        options: [
          { value: '150x200', label: '150x200 cm', description: '1-2 personas' },
          { value: '200x200', label: '200x200 cm', priceModifier: 20, description: '2-3 personas', badge: 'Popular' },
          { value: '250x200', label: '250x200 cm', priceModifier: 40, description: '3-4 personas' },
          { value: '300x200', label: '300x200 cm', priceModifier: 60, description: 'Grupos' },
        ],
      },
    },
    {
      id: 'material',
      fieldType: 'card_selector',
      label: 'Material',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        displayStyle: 'simple_cards',
        layout: 'vertical',
        options: [
          { value: 'vinyl', label: 'Vinilo (enrollable)', description: 'Económico, reutilizable' },
          { value: 'fabric', label: 'Tela (premium)', priceModifier: 30, description: 'Sin brillos, mejor fotos', badge: 'Recomendado' },
          { value: 'cardboard', label: 'Cartón pluma', priceModifier: 15, description: 'Rígido, un solo uso' },
        ],
      },
    },
    {
      id: 'design_option',
      fieldType: 'card_selector',
      label: 'Diseño',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        displayStyle: 'visual_cards',
        layout: 'horizontal',
        options: [
          { value: 'template', label: 'Usar plantilla', icon: '📋' },
          { value: 'custom', label: 'Subir mi diseño', icon: '📤' },
          { value: 'design_service', label: 'Que lo diseñéis', icon: '🎨', priceModifier: 25 },
        ],
      },
    },
    {
      id: 'template_style',
      fieldType: 'dropdown',
      label: 'Estilo de plantilla',
      required: false,
      priceModifier: 0,
      order: 5,
      condition: {
        dependsOn: 'design_option',
        showWhen: 'template',
      },
      config: {
        placeholder: 'Selecciona estilo',
        options: [
          { value: 'floral', label: 'Floral romántico' },
          { value: 'modern', label: 'Moderno minimalista' },
          { value: 'vintage', label: 'Vintage' },
          { value: 'tropical', label: 'Tropical' },
          { value: 'elegant', label: 'Elegante dorado' },
          { value: 'fun', label: 'Divertido colorido' },
        ],
      },
    },
    {
      id: 'custom_design',
      fieldType: 'image_upload',
      label: 'Tu diseño',
      required: false,
      priceModifier: 0,
      order: 5,
      helpText: 'Archivo vectorial o imagen de alta resolución',
      condition: {
        dependsOn: 'design_option',
        showWhen: 'custom',
      },
      config: {
        maxSizeMB: 20,
        allowedFormats: ['jpg', 'jpeg', 'png', 'pdf', 'ai', 'svg'],
        showPreview: true,
      },
    },
    {
      id: 'names',
      fieldType: 'text_input',
      label: 'Nombres principales',
      required: true,
      priceModifier: 0,
      order: 6,
      config: {
        placeholder: 'Ej: María & Juan, Lucas cumple 5 años',
        maxLength: 60,
      },
    },
    {
      id: 'date',
      fieldType: 'text_input',
      label: 'Fecha del evento',
      required: false,
      priceModifier: 0,
      order: 7,
      config: {
        placeholder: 'Ej: 15 de Junio 2025',
        maxLength: 30,
      },
    },
    {
      id: 'hashtag',
      fieldType: 'text_input',
      label: 'Hashtag (opcional)',
      required: false,
      priceModifier: 0,
      order: 8,
      config: {
        placeholder: 'Ej: #BodaMariaYJuan',
        maxLength: 30,
      },
    },
    {
      id: 'include_structure',
      fieldType: 'checkbox',
      label: 'Incluir estructura/soporte',
      required: false,
      priceModifier: 45,
      order: 9,
      config: {
        description: 'Estructura de aluminio para montaje',
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 10,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 65 },
        ],
      },
    },
  ],
};

// ============================================================================
// PLANTILLA: FIGURAS 3D PERSONALIZADAS
// ============================================================================

export const FIGURES_3D_SCHEMA: CustomizationSchema = {
  displayComponent: 'DynamicCustomizer',
  fields: [
    {
      id: 'figure_type',
      fieldType: 'card_selector',
      label: 'Tipo de figura',
      required: true,
      priceModifier: 0,
      order: 1,
      config: {
        displayStyle: 'visual_cards',
        layout: 'grid',
        options: [
          { value: 'bust', label: 'Busto (a partir de foto)', icon: '👤', priceModifier: 30, description: 'Retrato en 3D' },
          { value: 'full_body', label: 'Cuerpo completo', icon: '🧍', priceModifier: 50 },
          { value: 'character', label: 'Personaje/Mascota', icon: '🐱' },
          { value: 'miniature', label: 'Miniatura gaming', icon: '🎮' },
          { value: 'prototype', label: 'Prototipo/Pieza funcional', icon: '⚙️' },
          { value: 'architectural', label: 'Maqueta arquitectónica', icon: '🏠', priceModifier: 20 },
        ],
      },
    },
    {
      id: 'material',
      fieldType: 'card_selector',
      label: 'Material de impresión',
      required: true,
      priceModifier: 0,
      order: 2,
      config: {
        displayStyle: 'simple_cards',
        layout: 'vertical',
        options: [
          { value: 'pla', label: 'PLA (estándar)', description: 'Económico, buena calidad' },
          { value: 'resin_standard', label: 'Resina estándar', priceModifier: 15, description: 'Alto detalle' },
          { value: 'resin_premium', label: 'Resina premium', priceModifier: 30, description: 'Máximo detalle', badge: 'Pro' },
          { value: 'abs', label: 'ABS', priceModifier: 5, description: 'Resistente' },
          { value: 'petg', label: 'PETG', priceModifier: 8, description: 'Flexible y resistente' },
          { value: 'tpu', label: 'TPU (flexible)', priceModifier: 12 },
        ],
      },
    },
    {
      id: 'size',
      fieldType: 'card_selector',
      label: 'Tamaño aproximado',
      required: true,
      priceModifier: 0,
      order: 3,
      config: {
        displayStyle: 'simple_cards',
        layout: 'horizontal',
        options: [
          { value: 'xs', label: 'Mini (3-5 cm)' },
          { value: 's', label: 'Pequeño (6-10 cm)', priceModifier: 10 },
          { value: 'm', label: 'Mediano (11-15 cm)', priceModifier: 25, badge: 'Popular' },
          { value: 'l', label: 'Grande (16-25 cm)', priceModifier: 50 },
          { value: 'xl', label: 'Extra grande (26+ cm)', priceModifier: 100 },
        ],
      },
    },
    {
      id: 'finish',
      fieldType: 'card_selector',
      label: 'Acabado',
      required: true,
      priceModifier: 0,
      order: 4,
      config: {
        displayStyle: 'simple_cards',
        layout: 'vertical',
        options: [
          { value: 'raw', label: 'Sin acabado (impreso)', description: 'Textura visible de impresión' },
          { value: 'sanded', label: 'Lijado suave', priceModifier: 10 },
          { value: 'primed', label: 'Imprimación (listo para pintar)', priceModifier: 15 },
          { value: 'painted', label: 'Pintado a mano', priceModifier: 40, description: 'Precio según complejidad' },
        ],
      },
    },
    {
      id: 'reference_image_1',
      fieldType: 'image_upload',
      label: 'Imagen de referencia 1',
      required: true,
      priceModifier: 0,
      order: 5,
      helpText: 'Sube fotos desde diferentes ángulos. Para bustos: frontal, perfil y 3/4',
      config: {
        maxSizeMB: 15,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'reference_image_2',
      fieldType: 'image_upload',
      label: 'Imagen de referencia 2',
      required: false,
      priceModifier: 0,
      order: 6,
      config: {
        maxSizeMB: 15,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'reference_image_3',
      fieldType: 'image_upload',
      label: 'Imagen de referencia 3',
      required: false,
      priceModifier: 0,
      order: 7,
      config: {
        maxSizeMB: 15,
        allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        showPreview: true,
      },
    },
    {
      id: 'has_3d_file',
      fieldType: 'checkbox',
      label: 'Ya tengo el archivo 3D',
      required: false,
      priceModifier: 0,
      order: 8,
      config: {
        description: 'Marca si tienes el modelo STL/OBJ preparado',
      },
    },
    {
      id: 'reference_3d',
      fieldType: 'image_upload',
      label: 'Archivo 3D (STL, OBJ, 3MF)',
      required: false,
      priceModifier: 0,
      order: 9,
      condition: {
        dependsOn: 'has_3d_file',
        showWhen: true,
      },
      config: {
        maxSizeMB: 50,
        allowedFormats: ['stl', 'obj', '3mf'],
        showPreview: false,
        helpText: 'Sube tu modelo 3D directamente',
      },
    },
    {
      id: 'color_preference',
      fieldType: 'text_input',
      label: 'Preferencia de color',
      required: false,
      priceModifier: 0,
      order: 10,
      config: {
        placeholder: 'Ej: Blanco, Negro, o describir colores deseados',
        maxLength: 100,
      },
    },
    {
      id: 'special_instructions',
      fieldType: 'text_input',
      label: 'Instrucciones especiales',
      required: false,
      priceModifier: 0,
      order: 11,
      config: {
        placeholder: 'Describe cualquier detalle importante',
        maxLength: 500,
        showCharCounter: true,
      },
    },
    {
      id: 'quantity',
      fieldType: 'dropdown',
      label: 'Cantidad',
      required: true,
      priceModifier: 0,
      order: 12,
      isQuantityMultiplier: true,
      config: {
        options: [
          { value: '1', label: '1 unidad', unitPriceOverride: 35 },
          { value: '2', label: '2 unidades', unitPriceOverride: 30, description: '€30/ud' },
          { value: '5', label: '5 unidades', unitPriceOverride: 25, description: '€25/ud' },
          { value: '10', label: '10 unidades', unitPriceOverride: 20, description: '€20/ud' },
        ],
      },
    },
  ],
};

// ============================================================================
// CATÁLOGO DE PLANTILLAS
// ============================================================================

export interface SchemaTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  schema: CustomizationSchema;
}

export const SCHEMA_TEMPLATES: SchemaTemplate[] = [
  // --- EVENTOS ---
  {
    id: 'candy_box',
    name: 'Cajas de Chuches',
    description:
      'Personalización para cajas de chuches infantiles con temática, nombre, edad y mensaje',
    icon: '🍬',
    category: 'Eventos',
    schema: CANDY_BOX_SCHEMA,
  },
  {
    id: 'event_invitation',
    name: 'Invitaciones de Eventos',
    description: 'Personalización para invitaciones de cumpleaños, bodas, bautizos, etc.',
    icon: '💌',
    category: 'Eventos',
    schema: EVENT_INVITATION_SCHEMA,
  },
  {
    id: 'photocall',
    name: 'Photocall para Eventos',
    description: 'Photocalls personalizados para bodas, cumpleaños y eventos especiales',
    icon: '📸',
    category: 'Eventos',
    schema: PHOTOCALL_SCHEMA,
  },
  // --- SUBLIMACIÓN ---
  {
    id: 'mug_customization',
    name: 'Tazas Personalizadas',
    description:
      'Personalización completa para tazas con diferentes tipos, estilos de diseño y textos',
    icon: '☕',
    category: 'Sublimación',
    schema: MUG_CUSTOMIZATION_SCHEMA,
  },
  {
    id: 'custom_cushions',
    name: 'Cojines Personalizados',
    description: 'Cojines sublimados con tu foto o diseño en diferentes formas y telas',
    icon: '🛋️',
    category: 'Sublimación',
    schema: CUSTOM_CUSHIONS_SCHEMA,
  },
  {
    id: 'custom_puzzles',
    name: 'Puzzles Personalizados',
    description: 'Puzzles con tu foto favorita, desde 30 hasta 1000 piezas',
    icon: '🧩',
    category: 'Sublimación',
    schema: CUSTOM_PUZZLES_SCHEMA,
  },
  {
    id: 'phone_cases',
    name: 'Fundas de Móvil',
    description: 'Fundas personalizadas para iPhone, Samsung, Xiaomi y más',
    icon: '📱',
    category: 'Sublimación',
    schema: PHONE_CASES_SCHEMA,
  },
  // --- PRODUCTOS GRÁFICOS ---
  {
    id: 'business_cards',
    name: 'Tarjetas de Visita',
    description: 'Tarjetas de visita profesionales con múltiples acabados premium',
    icon: '🎴',
    category: 'Productos Gráficos',
    schema: BUSINESS_CARDS_SCHEMA,
  },
  {
    id: 'custom_calendars',
    name: 'Calendarios Personalizados',
    description: 'Calendarios con tus fotos favoritas, de pared o escritorio',
    icon: '📅',
    category: 'Productos Gráficos',
    schema: CUSTOM_CALENDARS_SCHEMA,
  },
  // --- TEXTILES ---
  {
    id: 'custom_caps',
    name: 'Gorras Personalizadas',
    description: 'Gorras y caps con bordado, vinilo, DTF o sublimación',
    icon: '🧢',
    category: 'Textiles',
    schema: CUSTOM_CAPS_SCHEMA,
  },
  // --- CORTE LÁSER ---
  {
    id: 'custom_keychains',
    name: 'Llaveros Personalizados',
    description: 'Llaveros grabados en madera, acrílico, metal o cuero',
    icon: '🔑',
    category: 'Corte Láser',
    schema: CUSTOM_KEYCHAINS_SCHEMA,
  },
  {
    id: 'pet_tags',
    name: 'Placas para Mascotas',
    description: 'Placas identificativas grabadas para perros y gatos',
    icon: '🐾',
    category: 'Corte Láser',
    schema: PET_TAGS_SCHEMA,
  },
  // --- IMPRESIÓN 3D ---
  {
    id: '3d_figures',
    name: 'Figuras 3D Personalizadas',
    description: 'Figuras, bustos y prototipos impresos en 3D en PLA o resina',
    icon: '🎭',
    category: 'Impresión 3D',
    schema: FIGURES_3D_SCHEMA,
  },
];

/**
 * Obtiene una plantilla por ID
 */
export function getSchemaTemplate(templateId: string): SchemaTemplate | undefined {
  return SCHEMA_TEMPLATES.find((t) => t.id === templateId);
}

/**
 * Obtiene todas las plantillas de una categoría
 */
export function getTemplatesByCategory(category: string): SchemaTemplate[] {
  return SCHEMA_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Obtiene todas las categorías disponibles
 */
export function getTemplateCategories(): string[] {
  return [...new Set(SCHEMA_TEMPLATES.map((t) => t.category))];
}
