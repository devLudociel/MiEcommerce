import { ProductService } from './services/productService.ts';
import type { FirebaseProduct } from '../types/firebase';

// Productos iniciales para poblar la base de datos
const initialProducts: Omit<FirebaseProduct, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Camiseta Básica Personalizada',
    description:
      'Camiseta de algodón 100% personalizable con tu diseño. Calidad premium y acabado profesional.',
    category: 'textil',
    basePrice: 8.0,
    images: [
      'https://via.placeholder.com/400x400/3b82f6/white?text=Camiseta+Básica',
      'https://via.placeholder.com/400x400/1d4ed8/white?text=Camiseta+Básica+2',
    ],
    customizable: true,
    customizationOptions: [
      {
        id: 'size',
        name: 'Talla',
        type: 'select',
        required: true,
        options: [
          { value: 'xs', label: 'XS', price: 0 },
          { value: 's', label: 'S', price: 0 },
          { value: 'm', label: 'M', price: 0 },
          { value: 'l', label: 'L', price: 0 },
          { value: 'xl', label: 'XL', price: 1 },
          { value: 'xxl', label: 'XXL', price: 2 },
        ],
      },
      {
        id: 'color',
        name: 'Color de camiseta',
        type: 'color',
        required: true,
        options: [
          { value: 'white', label: 'Blanco', price: 0 },
          { value: 'black', label: 'Negro', price: 0 },
          { value: 'navy', label: 'Azul Marino', price: 0 },
          { value: 'red', label: 'Rojo', price: 0 },
        ],
      },
      {
        id: 'print-size',
        name: 'Tamaño de estampado',
        type: 'select',
        required: true,
        options: [
          { value: 'small', label: 'Pequeño (15x15cm)', price: 2 },
          { value: 'medium', label: 'Mediano (20x20cm)', price: 3 },
          { value: 'large', label: 'Grande (30x30cm)', price: 5 },
        ],
      },
    ],
    tags: ['camiseta', 'estampado', 'personalizable', 'algodón'],
    featured: true,
    slug: 'camiseta-basica-personalizada',
    active: true,
  },
  {
    name: 'Sudadera Premium con Capucha',
    description:
      'Sudadera de alta calidad con interior de felpa. Perfecta para estampados y bordados.',
    category: 'textil',
    basePrice: 25.0,
    images: ['https://via.placeholder.com/400x400/f59e0b/white?text=Sudadera+Premium'],
    customizable: true,
    customizationOptions: [
      {
        id: 'size',
        name: 'Talla',
        type: 'select',
        required: true,
        options: [
          { value: 's', label: 'S', price: 0 },
          { value: 'm', label: 'M', price: 0 },
          { value: 'l', label: 'L', price: 0 },
          { value: 'xl', label: 'XL', price: 3 },
        ],
      },
    ],
    tags: ['sudadera', 'capucha', 'premium'],
    featured: true,
    slug: 'sudadera-premium-capucha',
    active: true,
  },
  {
    name: 'Cuadro Personalizado',
    description: 'Cuadro impreso en alta calidad con marco elegante.',
    category: 'regalos',
    basePrice: 15.0,
    images: ['https://via.placeholder.com/400x400/10b981/white?text=Cuadro+Personalizado'],
    customizable: true,
    customizationOptions: [
      {
        id: 'size',
        name: 'Tamaño',
        type: 'select',
        required: true,
        options: [
          { value: 'a4', label: 'A4 (21x30cm)', price: 0 },
          { value: 'a3', label: 'A3 (30x42cm)', price: 8 },
        ],
      },
    ],
    tags: ['cuadro', 'regalo', 'personalizado'],
    featured: false,
    slug: 'cuadro-personalizado',
    active: true,
  },
];

// Función para poblar la base de datos con productos iniciales
export async function seedProducts() {
  console.log('🌱 Iniciando seed de productos...');

  try {
    for (const product of initialProducts) {
      const productId = await ProductService.createProduct(product);
      if (productId) {
        console.log(`✅ Producto creado: ${product.name} (ID: ${productId})`);
      } else {
        console.log(`❌ Error creando: ${product.name}`);
      }
    }
    console.log('🎉 Seed completado!');
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
  }
}

// Función para limpiar todos los productos (usar con cuidado)
export async function clearProducts() {
  console.log('🧹 Limpiando productos...');
  // Implementaremos esto después si lo necesitas
}
