// src/lib/specialOffersMapper.ts
import { getSpecialOffers } from './firebase';

/**
 * Interfaz para mapear productos de Firebase a ofertas especiales
 */
export interface SpecialOffer {
  id: string;
  title: string;
  description: string;
  originalPrice: number;
  salePrice: number;
  discount: number;
  image: string;
  endDate: Date;
  stock: number;
  maxStock: number;
  isFlashSale: boolean;
  category: string;
  featured: boolean;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface FirebaseProduct {
  id: string;
  name?: string;
  description?: string;
  basePrice?: number | string;
  salePrice?: number | string;
  specialOfferDiscount?: number;
  images?: string[];
  maxStock?: number | string;
  specialOfferEndDate?: { toDate?: () => Date } | Date;
  categoryId?: string;
  flashSale?: boolean;
  featured?: boolean;
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Convierte un producto de Firebase a una oferta especial
 */
function mapProductToOffer(product: FirebaseProduct): SpecialOffer {
  const basePrice = Number(product.basePrice) || 0;
  const salePrice = Number(product.salePrice) || basePrice;
  const discount =
    product.specialOfferDiscount ||
    (basePrice > 0 ? Math.round((1 - salePrice / basePrice) * 100) : 0);

  // Obtener la primera imagen o usar fallback
  const image = product.images?.[0] || '';

  // Calcular stock (simulado - ajusta según tu lógica real)
  const maxStock = Number(product.maxStock) || 100;
  const stock = Math.max(5, Math.floor(maxStock * 0.3)); // Simula 30% de stock restante

  // Convertir Firestore Timestamp a Date
  let endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default: 7 días
  if (product.specialOfferEndDate) {
    if (product.specialOfferEndDate.toDate) {
      endDate = product.specialOfferEndDate.toDate();
    } else if (product.specialOfferEndDate instanceof Date) {
      endDate = product.specialOfferEndDate;
    }
  }

  // Obtener categoría nombre (simplificado)
  const categoryId = product.categoryId || '';
  const categoryNames: Record<string, string> = {
    '1': 'Camisetas',
    '2': 'Marcos',
    '3': 'Resina',
    '4': 'Tarjetas',
    '5': 'Accesorios',
    '6': 'Pegatinas',
  };
  const category = categoryNames[categoryId] || 'Productos';

  return {
    id: product.id,
    title: product.name || 'Producto sin nombre',
    description: product.description || 'Producto en oferta especial',
    originalPrice: basePrice,
    salePrice,
    discount,
    image,
    endDate,
    stock,
    maxStock,
    isFlashSale: Boolean(product.flashSale),
    category,
    featured: Boolean(product.featured),
    urgencyLevel: product.urgencyLevel || 'medium',
  };
}

/**
 * Obtiene todas las ofertas especiales de Firebase
 * y las convierte al formato esperado por el componente
 */
export async function loadSpecialOffers(): Promise<SpecialOffer[]> {
  try {
    const products = await getSpecialOffers();
    return products.map(mapProductToOffer);
  } catch (error) {
    console.error('Error cargando ofertas especiales:', error);
    return [];
  }
}
