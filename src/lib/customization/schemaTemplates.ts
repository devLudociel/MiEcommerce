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
      helpText: 'Puede ser una imagen, invitación, personaje o idea. No es obligatorio. (Imagen 1 de 3)',
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
      label: 'Entiendo que el diseño se adaptará a la temática elegida y recibiré una vista previa antes de imprimir.',
      required: true,
      priceModifier: 0,
      order: 11,
      config: {
        description: 'El diseño final lo realiza nuestro equipo basándose en tus preferencias. Recibirás un preview para aprobar antes de la producción.',
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
  {
    id: 'candy_box',
    name: 'Cajas de Chuches',
    description: 'Personalización para cajas de chuches infantiles con temática, nombre, edad y mensaje',
    icon: '🍬',
    category: 'Eventos Infantiles',
    schema: CANDY_BOX_SCHEMA,
  },
  {
    id: 'event_invitation',
    name: 'Invitaciones de Eventos',
    description: 'Personalización para invitaciones de cumpleaños, bodas, bautizos, etc.',
    icon: '💌',
    category: 'Invitaciones',
    schema: EVENT_INVITATION_SCHEMA,
  },
];

/**
 * Obtiene una plantilla por ID
 */
export function getSchemaTemplate(templateId: string): SchemaTemplate | undefined {
  return SCHEMA_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Obtiene todas las plantillas de una categoría
 */
export function getTemplatesByCategory(category: string): SchemaTemplate[] {
  return SCHEMA_TEMPLATES.filter(t => t.category === category);
}
