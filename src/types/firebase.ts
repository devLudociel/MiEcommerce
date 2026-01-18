import type { Timestamp } from 'firebase/firestore';

export interface FirebaseProduct {
  id?: string; // Se genera automáticamente por Firestore
  name: string;
  description: string;
  category: ProductCategory;
  basePrice: number;
  images: string[]; // URLs de Firebase Storage
  variants?: ProductVariant[]; // Variantes con talla/color/precio
  readyMade?: boolean; // Listos para comprar (sin personalización)
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
  // Customization examples for inspiration
  customizationExamples?: CustomizationExample[];
}

// Ejemplo de personalización para mostrar en la página del producto
export interface CustomizationExample {
  id: string;
  image: string; // URL de la imagen
  description: string; // Descripción corta
  order?: number; // Orden de visualización
}

export interface ProductVariant {
  id: number;
  name: string; // Ej: "M", "L", "Pack 2"
  price: number;
  originalPrice?: number;
  color: string; // Hex (ej: #FF0000)
  colorName: string; // Ej: "Rojo"
  stock: number;
  sku: string;
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
  reservedBalance?: number; // Saldo reservado para pedidos en proceso
  totalEarned: number; // Total acumulado históricamente
  totalSpent: number; // Total gastado del wallet
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WalletTransaction {
  id?: string;
  userId: string;
  type: 'earn' | 'spend' | 'refund' | 'credit' | 'debit' | 'cashback';
  amount: number;
  balance?: number; // Saldo después de la transacción
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

// ============================================================================
// BUNDLE DISCOUNTS: Quantity-based promotions (3x2, 2nd at 50%, etc.)
// ============================================================================

/**
 * Bundle discount rule types
 */
export type BundleDiscountType =
  | 'buy_x_get_y_free' // Compra X, lleva Y gratis (3x2, 4x3)
  | 'buy_x_get_y_percent' // Compra X, el Y tiene X% descuento (2do al 50%)
  | 'buy_x_fixed_price' // Compra X unidades por precio fijo (3 por €10)
  | 'quantity_percent'; // Descuento % por cantidad (5+ unidades = 10% off)

/**
 * Bundle discount configuration
 */
export interface BundleDiscount {
  id?: string;
  name: string; // "3x2 en Camisetas", "2do al 50%"
  description: string; // Descripción para mostrar al cliente
  type: BundleDiscountType;

  // Configuración según tipo
  buyQuantity: number; // Cantidad que debe comprar (ej: 3 en 3x2)
  getQuantity?: number; // Cantidad gratis o con descuento (ej: 1 en 3x2)
  discountPercent?: number; // Porcentaje de descuento (ej: 50 para 2do al 50%)
  fixedPrice?: number; // Precio fijo para el paquete (ej: €10 para "3 por €10")

  // Aplicabilidad
  applyTo: 'all' | 'categories' | 'products' | 'tags';
  categoryIds?: string[]; // IDs de categorías donde aplica
  productIds?: string[]; // IDs de productos donde aplica
  tagIds?: string[]; // Tags donde aplica

  // Restricciones
  minPurchase?: number; // Compra mínima para activar
  maxDiscount?: number; // Descuento máximo por orden
  maxUsesPerOrder?: number; // Máximo de veces que se puede aplicar por orden

  // Vigencia
  startDate: Timestamp;
  endDate: Timestamp;
  active: boolean;

  // Metadata
  priority: number; // Prioridad (mayor = se aplica primero)
  stackable: boolean; // Si se puede combinar con otros descuentos
  createdBy: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Applied bundle discount in cart/order
 */
export interface AppliedBundleDiscount {
  bundleId: string;
  bundleName: string;
  productIds: string[]; // Productos a los que se aplicó
  originalPrice: number; // Precio original
  discountedPrice: number; // Precio con descuento
  savedAmount: number; // Cantidad ahorrada
}

// ============================================================================
// PRODUCT TAGS: Customizable tags with colors
// ============================================================================

/**
 * Special tag types with predefined behavior
 */
export type SpecialTagType =
  | 'nuevo'
  | 'oferta'
  | 'destacado'
  | 'agotado'
  | 'exclusivo'
  | 'limitado'
  | 'custom';

/**
 * Product tag with customizable appearance
 */
export interface ProductTag {
  id?: string;
  name: string; // Display name (e.g., "Nuevo", "Oferta")
  slug: string; // URL-friendly identifier
  color: string; // Background color (hex)
  textColor: string; // Text color (hex)
  icon?: string; // Optional emoji or icon
  type: SpecialTagType; // Tag type for special behavior
  description?: string; // Optional description
  priority: number; // Display order (higher = first)
  active: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Preset colors for tags
 */
export const TAG_COLOR_PRESETS = [
  { name: 'Rojo', bg: '#EF4444', text: '#FFFFFF' },
  { name: 'Naranja', bg: '#F97316', text: '#FFFFFF' },
  { name: 'Ámbar', bg: '#F59E0B', text: '#000000' },
  { name: 'Amarillo', bg: '#EAB308', text: '#000000' },
  { name: 'Verde', bg: '#22C55E', text: '#FFFFFF' },
  { name: 'Esmeralda', bg: '#10B981', text: '#FFFFFF' },
  { name: 'Cyan', bg: '#06B6D4', text: '#FFFFFF' },
  { name: 'Azul', bg: '#3B82F6', text: '#FFFFFF' },
  { name: 'Índigo', bg: '#6366F1', text: '#FFFFFF' },
  { name: 'Púrpura', bg: '#A855F7', text: '#FFFFFF' },
  { name: 'Rosa', bg: '#EC4899', text: '#FFFFFF' },
  { name: 'Gris', bg: '#6B7280', text: '#FFFFFF' },
] as const;

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
  walletReservationStatus?: 'reserved' | 'released' | 'captured';
  walletReservedAmount?: number;
  walletCapturedAmount?: number;
  walletReleasedAmount?: number;
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
  storagePath?: string; // Firebase Storage path (private, server-only)
  fileUrl?: string; // Legacy download URL (avoid storing for new records)
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

// ============================================================================
// STOCK NOTIFICATIONS: "Notify me when available" feature
// ============================================================================

/**
 * Stock notification request
 * Created when a user wants to be notified when a product is back in stock
 */
export interface StockNotification {
  id?: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  email: string;
  userId?: string; // Optional - if user is logged in
  status: 'pending' | 'notified' | 'cancelled';
  createdAt: Timestamp;
  notifiedAt?: Timestamp; // When notification was sent
  cancelledAt?: Timestamp; // When user cancelled subscription
}

/**
 * Notification settings for a product
 * Tracks how many people are waiting for this product
 */
export interface ProductNotificationStats {
  productId: string;
  pendingCount: number; // Number of people waiting
  totalRequests: number; // All-time requests
  lastNotificationSent?: Timestamp;
}

// ============================================================================
// INSPIRATION IMAGES: Library of example images for customer inspiration
// ============================================================================

/**
 * Imagen de inspiración/ejemplo para mostrar en productos
 * Se asocian por tags y categoría para mostrarse automáticamente
 */
export interface InspirationImage {
  id?: string;
  imageUrl: string; // URL en Firebase Storage
  thumbnailUrl?: string; // Thumbnail para carga rápida
  title: string; // Título descriptivo (ej: "Camiseta con logo empresarial")
  description?: string; // Descripción opcional más larga

  // Asociaciones para matching automático
  categorySlug: string; // Categoría principal (textiles, sublimacion, etc.)
  subcategorySlug?: string; // Subcategoría opcional (ropa-personalizada, tazas)
  tags: string[]; // Tags para matching (logo, texto, foto, empresarial, cumpleaños)

  // Metadata
  active: boolean;
  featured: boolean; // Si se muestra primero
  order?: number; // Orden de visualización
  viewCount?: number; // Veces mostrada
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Categorías predefinidas para organizar imágenes de inspiración
 */
export const INSPIRATION_CATEGORIES = [
  { slug: 'textiles', name: 'Textiles', icon: '👕' },
  { slug: 'sublimacion', name: 'Sublimación', icon: '☕' },
  { slug: 'impresion-3d', name: 'Impresión 3D', icon: '🎮' },
  { slug: 'laser', name: 'Corte Láser', icon: '✂️' },
  { slug: 'eventos', name: 'Eventos', icon: '🎉' },
  { slug: 'packaging', name: 'Packaging', icon: '📦' },
  { slug: 'papeleria', name: 'Papelería', icon: '📝' },
] as const;

/**
 * Tags comunes para imágenes de inspiración
 */
export const INSPIRATION_TAGS = [
  // Tipo de diseño
  'logo', 'texto', 'foto', 'ilustracion', 'patron',
  // Uso/Ocasión
  'empresarial', 'personal', 'regalo', 'cumpleanos', 'boda', 'bautizo',
  // Estilo
  'minimalista', 'colorido', 'elegante', 'divertido', 'infantil',
  // Técnica
  'bordado', 'serigrafia', 'dtf', 'vinilo', 'sublimado', 'grabado',
] as const;
