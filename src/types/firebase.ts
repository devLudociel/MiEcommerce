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

// Para reseñas y ratings
export interface Review {
  id?: string;
  productId: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  images?: string[];
  verified: boolean;
  helpful: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

// Para monedero de recompensas (Wallet)
export interface Wallet {
  id?: string;
  userId: string;
  balance: number; // Saldo disponible en moneda local
  totalEarned: number; // Total acumulado históricamente
  totalSpent: number; // Total gastado del wallet
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WalletTransaction {
  id?: string;
  userId: string;
  type: 'earn' | 'spend' | 'refund';
  amount: number;
  balance: number; // Saldo después de la transacción
  orderId?: string; // Pedido relacionado
  description: string;
  createdAt?: Timestamp;
}

// Para sistema de cupones
export interface Coupon {
  id?: string;
  code: string; // Código único (ej: "BIENVENIDO10")
  description: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number; // % o monto fijo según el tipo
  minPurchase?: number; // Monto mínimo de compra
  maxDiscount?: number; // Descuento máximo (para % cupones)
  maxUses?: number; // Usos totales permitidos
  maxUsesPerUser?: number; // Usos por usuario
  currentUses: number; // Usos actuales
  startDate: Timestamp;
  endDate: Timestamp;
  active: boolean;
  createdBy: string; // Admin que lo creó
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface CouponUsage {
  id?: string;
  couponId: string;
  couponCode: string;
  userId: string;
  orderId: string;
  discountAmount: number;
  usedAt: Timestamp;
}