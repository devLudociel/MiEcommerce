import type { Timestamp } from 'firebase/firestore';

export interface FirebaseProduct {
  id?: string; // Se genera automáticamente por Firestore
  name: string;
  description: string;
  category: ProductCategory;
  basePrice: number;
  images: string[]; // URLs de Firebase Storage
  customizable: boolean;
  customizationOptions?: CustomizationOption[];
  tags: string[];
  featured: boolean;
  slug: string;
  active: boolean; // Para poder desactivar productos sin borrarlos
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CustomizationOption {
  id: string;
  name: string;
  type: 'select' | 'size' | 'position' | 'color' | 'text' | 'file';
  required: boolean;
  options?: OptionValue[];
  priceModifier?: number;
  priceMultiplier?: number;
}

export interface OptionValue {
  value: string;
  label: string;
  price?: number;
  description?: string;
}

export type ProductCategory =
  | 'textil'
  | 'impresion-3d'
  | 'laser'
  | 'eventos'
  | 'regalos'
  | 'bordado';

// Para las órdenes/pedidos (futuro)
export interface FirebaseOrder {
  id?: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  shipping?: number;
  tax?: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customization?: Record<string, any>;
  uploadedFiles?: string[]; // URLs de los archivos subidos
}
