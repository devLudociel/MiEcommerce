// ARCHIVO COMPARTIDO - Crea este archivo en src/data/productAttributes.ts
// Aquí defines UNA SOLA VEZ todos los atributos y precios

export interface ProductAttribute {
  id: string;
  name: string;
  type: 'select' | 'number' | 'text' | 'boolean';
  required: boolean;
  options?: AttributeOption[];
}

export interface AttributeOption {
  id: string;
  value: string;
  priceModifier: number; // 👈 AQUÍ AJUSTAS LOS PRECIOS
}

export interface ProductAttributeValue {
  attributeId: string;
  value: string;
}

export interface SubcategoryAttribute {
  subcategoryId: string;
  attributeId: string;
}

// 💰 PRECIOS Y ATRIBUTOS - Ajusta aquí
export const attributes: ProductAttribute[] = [
  // Tarjetas de Visita
  {
    id: '1',
    name: 'Forma',
    type: 'select',
    required: true,
    options: [
      { id: '1', value: 'Standard', priceModifier: 0 },
      { id: '2', value: 'Cuadrada', priceModifier: 2.5 }, // 👈 Cambia este precio
    ],
  },
  {
    id: '2',
    name: 'Acabado',
    type: 'select',
    required: true,
    options: [
      { id: '3', value: 'Mate', priceModifier: 0 },
      { id: '4', value: 'Brillo', priceModifier: 1.5 }, // 👈 Cambia este precio
    ],
  },

  // Textiles
  {
    id: '3',
    name: 'Tipo de Prenda',
    type: 'select',
    required: true,
    options: [
      { id: '5', value: 'Camiseta', priceModifier: 0 },
      { id: '6', value: 'Sudadera', priceModifier: 8 }, // 👈 Ajusta aquí el precio de sudadera
      { id: '7', value: 'Polo', priceModifier: 3 },
      { id: '8', value: 'Totebag', priceModifier: -2 }, // Puede ser negativo (descuento)
    ],
  },
  {
    id: '4',
    name: 'Técnica de Personalización',
    type: 'select',
    required: true,
    options: [
      { id: '9', value: 'DTF', priceModifier: 0 },
      { id: '10', value: 'Vinilo', priceModifier: -1 },
      { id: '11', value: 'Bordado', priceModifier: 3 }, // 👈 Ajusta aquí el precio de bordado
    ],
  },
  {
    id: '5',
    name: 'Talla',
    type: 'select',
    required: true,
    options: [
      { id: '12', value: 'XS', priceModifier: 0 },
      { id: '13', value: 'S', priceModifier: 0 },
      { id: '14', value: 'M', priceModifier: 0 },
      { id: '15', value: 'L', priceModifier: 0 },
      { id: '16', value: 'XL', priceModifier: 1 },
      { id: '17', value: 'XXL', priceModifier: 2 },
      { id: '18', value: 'XXXL', priceModifier: 3 },
    ],
  },

  // Etiquetas
  {
    id: '6',
    name: 'Material',
    type: 'select',
    required: true,
    options: [
      { id: '19', value: 'Papel', priceModifier: 0 },
      { id: '20', value: 'Vinilo', priceModifier: 1.5 },
      { id: '21', value: 'UV DTF', priceModifier: 2 },
    ],
  },
  {
    id: '7',
    name: 'Forma',
    type: 'select',
    required: true,
    options: [
      { id: '22', value: 'Redonda', priceModifier: 0 },
      { id: '23', value: 'Personalizada', priceModifier: 1 },
    ],
  },

  // Sublimación
  {
    id: '8',
    name: 'Producto',
    type: 'select',
    required: true,
    options: [
      { id: '24', value: 'Taza', priceModifier: 0 },
      { id: '25', value: 'Vaso', priceModifier: -1 },
      { id: '26', value: 'Termo', priceModifier: 5 },
    ],
  },
  {
    id: '9',
    name: 'Tipo Especial',
    type: 'select',
    required: false,
    options: [
      { id: '27', value: 'Normal', priceModifier: 0 },
      { id: '28', value: 'Mágica', priceModifier: 3 },
    ],
  },

  // Láser
  {
    id: '10',
    name: 'Material Base',
    type: 'select',
    required: true,
    options: [
      { id: '29', value: 'Madera', priceModifier: 0 },
      { id: '30', value: 'Metal', priceModifier: 2 },
    ],
  },

  // Impresión 3D
  {
    id: '11',
    name: 'Material Impresión',
    type: 'select',
    required: true,
    options: [
      { id: '31', value: 'Resina', priceModifier: 3 },
      { id: '32', value: 'PLA', priceModifier: 0 },
      { id: '33', value: 'ABS', priceModifier: 1 },
      { id: '34', value: 'PETG', priceModifier: 1.5 },
      { id: '35', value: 'TPU', priceModifier: 2 },
    ],
  },

  // Atributos generales
  { id: '12', name: 'Tamaño', type: 'text', required: false },
  { id: '13', name: 'Cantidad', type: 'number', required: true },
  { id: '14', name: 'Color Base', type: 'text', required: false },
];

// 🔗 Relación: qué atributos tiene cada subcategoría
export const subcategoryAttributes: SubcategoryAttribute[] = [
  // Tarjetas de Visita (subcategoryId: '1')
  { subcategoryId: '1', attributeId: '1' }, // Forma
  { subcategoryId: '1', attributeId: '2' }, // Acabado
  { subcategoryId: '1', attributeId: '13' }, // Cantidad

  // Etiquetas y Pegatinas (subcategoryId: '2')
  { subcategoryId: '2', attributeId: '6' }, // Material
  { subcategoryId: '2', attributeId: '7' }, // Forma
  { subcategoryId: '2', attributeId: '12' }, // Tamaño
  { subcategoryId: '2', attributeId: '13' }, // Cantidad

  // Ropa Personalizada (subcategoryId: '4')
  { subcategoryId: '4', attributeId: '3' }, // Tipo de Prenda
  { subcategoryId: '4', attributeId: '4' }, // Técnica
  { subcategoryId: '4', attributeId: '5' }, // Talla
  { subcategoryId: '4', attributeId: '14' }, // Color Base

  // Complementos Textiles (subcategoryId: '5')
  { subcategoryId: '5', attributeId: '4' }, // Técnica
  { subcategoryId: '5', attributeId: '12' }, // Tamaño
  { subcategoryId: '5', attributeId: '14' }, // Color Base

  // Vajilla Personalizada (subcategoryId: '8')
  { subcategoryId: '8', attributeId: '8' }, // Producto
  { subcategoryId: '8', attributeId: '9' }, // Tipo Especial
  { subcategoryId: '8', attributeId: '13' }, // Cantidad

  // Llaveros (subcategoryId: '10')
  { subcategoryId: '10', attributeId: '10' }, // Material Base
  { subcategoryId: '10', attributeId: '12' }, // Tamaño
  { subcategoryId: '10', attributeId: '13' }, // Cantidad

  // Impresión 3D - Resina (subcategoryId: '14')
  { subcategoryId: '14', attributeId: '11' }, // Material Impresión
  { subcategoryId: '14', attributeId: '12' }, // Tamaño
  { subcategoryId: '14', attributeId: '14' }, // Color

  // Impresión 3D - Filamento (subcategoryId: '15')
  { subcategoryId: '15', attributeId: '11' }, // Material Impresión
  { subcategoryId: '15', attributeId: '12' }, // Tamaño
  { subcategoryId: '15', attributeId: '14' }, // Color
];
