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
  // Digital product fields
  isDigital?: boolean; // Si es producto digital
  digitalFiles?: DigitalFile[]; // Archivos descargables
  // Stock/Inventory management
  trackInventory?: boolean; // Si true, se controla el stock
  stock?: number; // Cantidad disponible
  lowStockThreshold?: number; // Umbral para alerta de bajo stock (default: 5)
  allowBackorder?: boolean; // Si true, permite comprar sin stock (bajo pedido)
  // SEO fields
  metaTitle?: string; // Título para buscadores (máx 60 caracteres)
  metaDescription?: string; // Descripción para buscadores (máx 160 caracteres)
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
  | 'bordado'
  | 'digital';

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
  image?: string;
  variantId?: number;
  variantName?: string;
  customization?: {
    customizationId?: string;
    uploadedImage?: string | null;
    text?: string;
    textColor?: string;
    textFont?: string;
    textSize?: number;
    backgroundColor?: string;
    selectedColor?: string;
    selectedSize?: string;
    selectedMaterial?: string;
    selectedFinish?: string;
    position?: { x: number; y: number };
    rotation?: number;
    scale?: number;
    [key: string]: string | number | boolean | { x: number; y: number } | null | undefined;
  };
  uploadedFiles?: string[]; // URLs de los archivos subidos
  productionNotes?: string; // Notas internas del equipo de producción
  productionStatus?: 'pending' | 'in_production' | 'ready' | 'shipped'; // Estado individual del producto
}

// CHECKOUT & ORDER: Shipping information
export interface ShippingInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  shippingMethod?: 'standard' | 'express' | 'urgent';
  notes?: string;
}

// CHECKOUT & ORDER: Billing information
export interface BillingInfo {
  fiscalName: string;
  nifCif: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// CHECKOUT & ORDER: Payment information
export interface PaymentInfo {
  method: 'card' | 'paypal' | 'transfer' | 'cash';
  // Card data removed - handled securely by Stripe Elements (PCI-DSS compliant)
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
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
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

// TRACKING: Event tracking for order shipments
export interface TrackingEvent {
  status:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'packed'
    | 'shipped'
    | 'in_transit'
    | 'out_for_delivery'
    | 'delivered'
    | 'failed'
    | 'returned';
  timestamp: Timestamp;
  location?: string;
  description: string;
  updatedBy?: string; // userId del admin que hizo el update
}

// ORDERS: Complete order data structure
export interface OrderData {
  id?: string;
  userId?: string;
  items: OrderItem[];
  shippingInfo: ShippingInfo;
  paymentInfo: PaymentInfo;
  subtotal: number;
  shipping: number;
  tax?: number;
  taxInfo?: {
    rate: number;
    name: string;
    label: string;
  };
  discount?: number;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  invoiceNumber?: string;
  invoiceDate?: Timestamp;
  // Tracking información
  trackingNumber?: string;
  carrier?: 'correos' | 'seur' | 'dhl' | 'ups' | 'fedex' | 'mrw' | 'other';
  trackingUrl?: string;
  estimatedDelivery?: Timestamp;
  trackingHistory?: TrackingEvent[];
  // Coupon information
  couponId?: string;
  couponCode?: string;
  couponDiscount?: number;
  // Wallet information
  walletDiscount?: number;
}

// ============================================================================
// DIGITAL PRODUCTS: Downloadable files system
// ============================================================================

/**
 * Digital file attached to a product
 */
export interface DigitalFile {
  id: string; // Unique file ID
  name: string; // Display name (e.g., "Pack de 100 imágenes.zip")
  description?: string;
  fileUrl: string; // Firebase Storage URL (private)
  fileSize: number; // Size in bytes
  fileType: string; // MIME type (e.g., "application/zip", "image/png")
  format: 'image' | 'pdf' | 'zip' | 'other'; // File category
  uploadedAt: Timestamp;
}

/**
 * User access to digital products
 * Created when user purchases a digital product
 */
export interface DigitalAccess {
  id?: string;
  userId: string; // User who purchased
  userEmail: string;
  productId: string; // Digital product purchased
  productName: string;
  orderId: string; // Order that granted access
  files: DigitalFile[]; // Files user can download
  purchasedAt: Timestamp;
  totalDownloads: number; // Total times downloaded
  lastDownloadAt?: Timestamp;
  // Unlimited downloads, permanent access (Etsy style)
  expiresAt?: null; // null = never expires
  maxDownloads?: null; // null = unlimited
}

/**
 * Download log for analytics
 */
export interface DownloadLog {
  id?: string;
  userId: string;
  digitalAccessId: string;
  productId: string;
  productName: string;
  fileId: string;
  fileName: string;
  downloadedAt: Timestamp;
  ipAddress?: string;
  userAgent?: string;
}
