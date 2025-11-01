// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
  setDoc,
  increment,
  orderBy,
  startAfter,
  getCountFromServer,
} from 'firebase/firestore';
import type {
  Firestore,
  DocumentData,
  QuerySnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { FirebaseStorage, StorageReference, UploadResult } from 'firebase/storage';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import type { Analytics } from 'firebase/analytics';

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
  measurementId: import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (avoid duplicate-app in HMR / multiple imports)
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore with transport tweaks to reduce WebChannel noise
export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch (_) {
    return getFirestore(app);
  }
})();

// Initialize Cloud Storage
export const storage: FirebaseStorage = getStorage(app);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);
try {
  // Persist session across reloads (incluye resultado de redirect)
  await setPersistence(auth, browserLocalPersistence);
} catch {}
try {
  // Mostrar emails en español (restablecer contraseña, etc.)
  // Nota: puedes sobreescribir por usuario si lo necesitas
  (auth as any).languageCode = 'es';
} catch {}

// Initialize Analytics (only in browser)
export const analytics: Analytics | null = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Reduce Firestore console noise
try {
  setLogLevel('error');
} catch {}

export default app;

// ============================================
// 📁 TIPOS E INTERFACES
// ============================================

export interface CustomImageUpload {
  url: string;
  path: string;
  name: string;
}

export interface CustomizationData {
  userId: string;
  productType: string;
  [key: string]: any;
}

export interface CustomizationDoc extends DocumentData {
  id: string;
  userId: string;
  productType: string;
  createdAt: any;
  updatedAt?: any;
  status: string;
}

export interface ProductData {
  id?: string;
  categoria: string;
  nombre?: string;
  descripcion?: string;
  precio?: number;
  variantes?: string[];
  [key: string]: any;
}

// ============================================
// 📁 FUNCIONES PARA FIREBASE STORAGE
// ============================================

/**
 * Obtener URL de imagen de variante de producto
 * @param categoria - 'camisetas', 'cuadros', 'cajas'
 * @param variante - ej: 'blanco', 'rosa', 'azul'
 */
export async function getProductImageUrl(
  categoria: string,
  variante: string
): Promise<string | null> {
  try {
    // 🔄 CAMBIO: productos/ → variants/
    const storageRef: StorageReference = ref(
      storage,
      `variants/${categoria}/${variante}/preview.jpg`
    );
    const url: string = await getDownloadURL(storageRef);
    console.log(`✅ Imagen cargada: variants/${categoria}/${variante}/preview.jpg`);
    return url;
  } catch (error) {
    console.error(`❌ Error obteniendo imagen de variants/${categoria}/${variante}:`, error);
    return null;
  }
}

/**
 * Subir imagen personalizada del cliente
 * @param file - Archivo de imagen
 * @param userId - ID del usuario
 * @param productType - Tipo de producto (camiseta, cuadro, resina)
 */
export async function uploadCustomImage(
  file: File,
  userId: string,
  productType: string
): Promise<CustomImageUpload> {
  try {
    const timestamp: number = Date.now();
    const fileName: string = `${timestamp}_${file.name}`;
    const storageRef: StorageReference = ref(
      storage,
      `personalizaciones/${userId}/${productType}/${fileName}`
    );

    const snapshot: UploadResult = await uploadBytes(storageRef, file);
    const url: string = await getDownloadURL(snapshot.ref);

    console.log('✅ Imagen personalizada subida:', url);

    return {
      url,
      path: snapshot.ref.fullPath,
      name: fileName,
    };
  } catch (error) {
    console.error('❌ Error subiendo imagen personalizada:', error);
    throw error;
  }
}

/**
 * Eliminar imagen personalizada
 * @param imagePath - Ruta completa en Storage
 */
export async function deleteCustomImage(imagePath: string): Promise<boolean> {
  try {
    const storageRef: StorageReference = ref(storage, imagePath);
    await deleteObject(storageRef);
    console.log('✅ Imagen eliminada:', imagePath);
    return true;
  } catch (error) {
    console.error('❌ Error eliminando imagen:', error);
    return false;
  }
}

/**
 * Subir múltiples variantes de un producto (para admin)
 * @param files - Array de archivos
 * @param categoria - Categoría del producto
 * @param variantes - Array de nombres de variantes
 */
export async function uploadProductImages(
  files: File[],
  categoria: string,
  variantes: string[]
): Promise<string[]> {
  try {
    const uploadPromises = files.map((file: File, index: number) => {
      const varianteName: string = variantes[index];
      // 🔄 CAMBIO: productos/ → variants/
      const storageRef: StorageReference = ref(
        storage,
        `variants/${categoria}/${varianteName}/preview.jpg`
      );
      return uploadBytes(storageRef, file).then(() => getDownloadURL(storageRef));
    });

    const urls: string[] = await Promise.all(uploadPromises);
    console.log(`✅ ${urls.length} imágenes de variantes subidas para ${categoria}`);
    return urls;
  } catch (error) {
    console.error('❌ Error subiendo imágenes de productos:', error);
    throw error;
  }
}

// ============================================
// 📊 FUNCIONES PARA FIRESTORE
// ============================================

/**
 * Guardar configuración de producto personalizado
 * @param customizationData - Datos de personalización
 */
export async function saveCustomization(customizationData: CustomizationData): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'personalizaciones'), {
      ...customizationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'pending',
    });

    console.log('✅ Personalización guardada con ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error guardando personalización:', error);
    throw error;
  }
}

/**
 * Actualizar personalización existente
 * @param customizationId - ID de la personalización
 * @param updates - Datos a actualizar
 */
export async function updateCustomization(
  customizationId: string,
  updates: Partial<CustomizationData>
): Promise<boolean> {
  try {
    const docRef = doc(db, 'personalizaciones', customizationId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Personalización actualizada:', customizationId);
    return true;
  } catch (error) {
    console.error('❌ Error actualizando personalización:', error);
    throw error;
  }
}

/**
 * Obtener personalización por ID
 * @param customizationId - ID de la personalización
 */
export async function getCustomization(customizationId: string): Promise<CustomizationDoc | null> {
  try {
    const docRef = doc(db, 'personalizaciones', customizationId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as CustomizationDoc;
    } else {
      console.log('⚠️ Personalización no encontrada:', customizationId);
      return null;
    }
  } catch (error) {
    console.error('❌ Error obteniendo personalización:', error);
    throw error;
  }
}

/**
 * Obtener personalizaciones de un usuario
 * @param userId - ID del usuario
 */
export async function getUserCustomizations(userId: string): Promise<CustomizationDoc[]> {
  try {
    const q = query(collection(db, 'personalizaciones'), where('userId', '==', userId));

    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    const customizations: CustomizationDoc[] = [];

    querySnapshot.forEach((doc) => {
      customizations.push({ id: doc.id, ...doc.data() } as CustomizationDoc);
    });

    console.log(`✅ ${customizations.length} personalizaciones encontradas para usuario ${userId}`);
    return customizations;
  } catch (error) {
    console.error('❌ Error obteniendo personalizaciones:', error);
    throw error;
  }
}

/**
 * Guardar producto base (para administración)
 * @param productData - Datos del producto
 */
export async function saveProduct(productData: ProductData): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'productos'), {
      ...productData,
      createdAt: serverTimestamp(),
    });

    console.log('✅ Producto guardado con ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error guardando producto:', error);
    throw error;
  }
}

/**
 * Obtener productos por categoría
 * @param categoria - Categoría del producto
 */
export async function getProductsByCategory(categoria: string): Promise<ProductData[]> {
  try {
    const q = query(collection(db, 'productos'), where('categoria', '==', categoria));

    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    const products: ProductData[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        categoria: data.categoria || '',
        ...data,
      } as ProductData);
    });

    console.log(`✅ ${products.length} productos encontrados en categoría ${categoria}`);
    return products;
  } catch (error) {
    console.error('❌ Error obteniendo productos:', error);
    throw error;
  }
}

/**
 * Obtener todos los productos
 */
export async function getAllProducts(): Promise<ProductData[]> {
  try {
    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(collection(db, 'productos'));
    const products: ProductData[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      products.push({
        id: doc.id,
        categoria: data.categoria || '',
        ...data,
      } as ProductData);
    });

    console.log(`✅ ${products.length} productos totales encontrados`);
    return products;
  } catch (error) {
    console.error('❌ Error obteniendo todos los productos:', error);
    throw error;
  }
}

/**
 * 🎯 Obtener productos marcados como Ofertas Especiales
 *
 * Obtiene productos de la colección "products" que están marcados
 * como ofertas especiales (isSpecialOffer: true) y aún están activos.
 *
 * @returns Array de productos de oferta especial con todos sus datos
 */
export async function getSpecialOffers(): Promise<any[]> {
  try {
    const q = query(
      collection(db, 'products'),
      where('isSpecialOffer', '==', true),
      where('active', '==', true),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    const offers: any[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      offers.push({
        id: doc.id,
        ...data,
      });
    });

    console.log(`✅ ${offers.length} ofertas especiales encontradas`);
    return offers;
  } catch (error) {
    console.error('❌ Error obteniendo ofertas especiales:', error);
    // Si falla por falta de índice, devolver array vacío
    return [];
  }
}

// ============================================
// 📦 FUNCIONES PARA PEDIDOS
// ============================================

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
  timestamp: any;
  location?: string;
  description: string;
  updatedBy?: string; // userId del admin que hizo el update
}

export interface OrderData {
  id?: string;
  userId?: string;
  items: any[];
  shippingInfo: any;
  paymentInfo: any;
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt?: any;
  updatedAt?: any;
  invoiceNumber?: string;
  invoiceDate?: any;
  // Tracking información
  trackingNumber?: string;
  carrier?: string; // 'correos' | 'seur' | 'dhl' | 'ups' | 'fedex' | 'mrw' | 'other'
  trackingUrl?: string;
  estimatedDelivery?: any;
  trackingHistory?: TrackingEvent[];
}

/**
 * Obtener pedido por ID
 */
export async function getOrderById(orderId: string): Promise<OrderData | null> {
  try {
    const docRef = doc(db, 'orders', orderId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as OrderData;
    } else {
      console.log('⚠️ Pedido no encontrado:', orderId);
      return null;
    }
  } catch (error) {
    console.error('❌ Error obteniendo pedido:', error);
    throw error;
  }
}

/**
 * Obtener pedidos de un usuario
 */
export async function getUserOrders(userId: string, limitCount: number = 50): Promise<OrderData[]> {
  try {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    const orders: OrderData[] = [];

    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as OrderData);
    });

    console.log(`✅ ${orders.length} pedidos encontrados para usuario ${userId}`);
    return orders;
  } catch (error) {
    console.error('❌ Error obteniendo pedidos del usuario:', error);
    throw error;
  }
}

/**
 * Actualizar estado de pedido
 */
export async function updateOrderStatus(orderId: string, status: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Estado de pedido actualizado:', orderId);
    return true;
  } catch (error) {
    console.error('❌ Error actualizando estado de pedido:', error);
    throw error;
  }
}

/**
 * Actualizar información de tracking del pedido
 */
export async function updateOrderTracking(
  orderId: string,
  trackingData: {
    trackingNumber?: string;
    carrier?: string;
    trackingUrl?: string;
    estimatedDelivery?: Date;
  },
  userId?: string
): Promise<boolean> {
  try {
    const docRef = doc(db, 'orders', orderId);
    const updateData: any = {
      ...trackingData,
      updatedAt: serverTimestamp(),
    };

    if (trackingData.estimatedDelivery) {
      updateData.estimatedDelivery = trackingData.estimatedDelivery;
    }

    await updateDoc(docRef, updateData);

    console.log('✅ Tracking actualizado para pedido:', orderId);
    return true;
  } catch (error) {
    console.error('❌ Error actualizando tracking:', error);
    throw error;
  }
}

/**
 * Agregar evento al historial de tracking
 */
export async function addTrackingEvent(
  orderId: string,
  event: {
    status: TrackingEvent['status'];
    location?: string;
    description: string;
  },
  userId?: string
): Promise<boolean> {
  try {
    const docRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(docRef);

    if (!orderSnap.exists()) {
      throw new Error('Pedido no encontrado');
    }

    const orderData = orderSnap.data();
    const currentHistory: TrackingEvent[] = orderData.trackingHistory || [];

    const newEvent: TrackingEvent = {
      ...event,
      timestamp: serverTimestamp(),
      updatedBy: userId,
    };

    const updatedHistory = [...currentHistory, newEvent];

    await updateDoc(docRef, {
      trackingHistory: updatedHistory,
      status: event.status,
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Evento de tracking agregado:', orderId, event.status);
    return true;
  } catch (error) {
    console.error('❌ Error agregando evento de tracking:', error);
    throw error;
  }
}

/**
 * Obtener carriers soportados con sus URLs de tracking
 */
export function getCarrierInfo(
  carrier: string,
  trackingNumber: string
): { name: string; url: string } {
  const carriers: Record<string, { name: string; urlTemplate: string }> = {
    correos: {
      name: 'Correos',
      urlTemplate: 'https://www.correos.es/es/es/herramientas/localizador/envios?numero={tracking}',
    },
    seur: {
      name: 'SEUR',
      urlTemplate: 'https://www.seur.com/livetracking/?segOnlineIdentificador={tracking}',
    },
    dhl: {
      name: 'DHL',
      urlTemplate:
        'https://www.dhl.com/es-es/home/tracking/tracking-express.html?submit=1&tracking-id={tracking}',
    },
    ups: {
      name: 'UPS',
      urlTemplate: 'https://www.ups.com/track?loc=es_ES&tracknum={tracking}',
    },
    fedex: {
      name: 'FedEx',
      urlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={tracking}',
    },
    mrw: {
      name: 'MRW',
      urlTemplate:
        'https://www.mrw.es/seguimiento_envios/MRW_resultados_consultas.asp?modo=nacional&envio={tracking}',
    },
  };

  const carrierData = carriers[carrier.toLowerCase()] || { name: carrier, urlTemplate: '' };

  return {
    name: carrierData.name,
    url: carrierData.urlTemplate.replace('{tracking}', trackingNumber),
  };
}

/**
 * Obtener todos los pedidos (para admin)
 */
export async function getAllOrders(): Promise<OrderData[]> {
  try {
    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(collection(db, 'orders'));
    const orders: OrderData[] = [];

    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as OrderData);
    });

    // Ordenar por fecha más reciente
    orders.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`✅ ${orders.length} pedidos totales encontrados`);
    return orders;
  } catch (error) {
    console.error('❌ Error obteniendo todos los pedidos:', error);
    throw error;
  }
}

/**
 * Obtener pedidos por estado
 */
export async function getOrdersByStatus(status: string): Promise<OrderData[]> {
  try {
    const q = query(collection(db, 'orders'), where('status', '==', status));

    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    const orders: OrderData[] = [];

    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as OrderData);
    });

    console.log(`✅ ${orders.length} pedidos con estado ${status}`);
    return orders;
  } catch (error) {
    console.error('❌ Error obteniendo pedidos por estado:', error);
    throw error;
  }
}

// ============================================
// 📄 FUNCIONES DE PAGINACIÓN
// ============================================

export interface PaginatedResult<T> {
  data: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  total?: number;
}

/**
 * Obtener total de pedidos (para calcular páginas)
 */
export async function getOrdersCount(statusFilter?: string): Promise<number> {
  try {
    let q;
    if (statusFilter && statusFilter !== 'all') {
      q = query(collection(db, 'orders'), where('status', '==', statusFilter));
    } else {
      q = query(collection(db, 'orders'));
    }

    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('❌ Error obteniendo conteo de pedidos:', error);
    return 0;
  }
}

/**
 * Obtener pedidos paginados (para admin)
 *
 * @param pageSize - Cantidad de pedidos por página (default: 20)
 * @param lastDoc - Último documento de la página anterior (para paginación)
 * @param statusFilter - Filtrar por estado (opcional)
 * @returns Objeto con pedidos, último documento y si hay más páginas
 */
export async function getOrdersPaginated(
  pageSize: number = 20,
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null,
  statusFilter?: string
): Promise<PaginatedResult<OrderData>> {
  try {
    // Construir query base
    let q;

    if (statusFilter && statusFilter !== 'all') {
      // Filtrar por estado
      q = query(
        collection(db, 'orders'),
        where('status', '==', statusFilter),
        orderBy('createdAt', 'desc'),
        limit(pageSize + 1) // Traer uno más para saber si hay siguiente página
      );
    } else {
      // Todos los pedidos
      q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(pageSize + 1));
    }

    // Si hay un documento anterior, empezar después de él
    if (lastDoc) {
      if (statusFilter && statusFilter !== 'all') {
        q = query(
          collection(db, 'orders'),
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(pageSize + 1)
        );
      } else {
        q = query(
          collection(db, 'orders'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(pageSize + 1)
        );
      }
    }

    const querySnapshot = await getDocs(q);
    const orders: OrderData[] = [];
    let newLastDoc: QueryDocumentSnapshot<DocumentData> | null = null;
    let hasMore = false;

    // Si hay más documentos que el límite, hay siguiente página
    if (querySnapshot.size > pageSize) {
      hasMore = true;
    }

    // Procesar documentos (máximo pageSize, ignorar el extra)
    const docsToProcess = querySnapshot.docs.slice(0, pageSize);

    docsToProcess.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as OrderData);
      newLastDoc = doc;
    });

    console.log(`✅ ${orders.length} pedidos obtenidos (página), hasMore: ${hasMore}`);

    return {
      data: orders,
      lastDoc: newLastDoc,
      hasMore,
    };
  } catch (error) {
    console.error('❌ Error obteniendo pedidos paginados:', error);
    throw error;
  }
}

// ============================================
// ⭐ FUNCIONES PARA REVIEWS Y RATINGS
// ============================================

import type { Review, ReviewStats } from '../types/firebase';
export type { Review, ReviewStats } from '../types/firebase';

/**
 * Agregar una review a un producto
 */
export async function addReview(
  reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'helpful'>
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'reviews'), {
      ...reviewData,
      helpful: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Review agregada:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error agregando review:', error);
    throw error;
  }
}

/**
 * Obtener reviews de un producto
 */
export async function getProductReviews(productId: string): Promise<Review[]> {
  try {
    const q = query(collection(db, 'reviews'), where('productId', '==', productId));

    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    const reviews: Review[] = [];

    querySnapshot.forEach((doc) => {
      reviews.push({ id: doc.id, ...doc.data() } as Review);
    });

    // Ordenar por fecha más reciente
    reviews.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`✅ ${reviews.length} reviews encontradas para producto ${productId}`);
    return reviews;
  } catch (error) {
    console.error('❌ Error obteniendo reviews:', error);
    throw error;
  }
}

/**
 * Obtener estadísticas de reviews de un producto
 */
export async function getProductReviewStats(productId: string): Promise<ReviewStats> {
  try {
    const reviews = await getProductReviews(productId);

    const stats: ReviewStats = {
      averageRating: 0,
      totalReviews: reviews.length,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };

    if (reviews.length === 0) {
      return stats;
    }

    let totalRating = 0;
    reviews.forEach((review) => {
      totalRating += review.rating;
      stats.ratingDistribution[review.rating as keyof typeof stats.ratingDistribution]++;
    });

    stats.averageRating = Number((totalRating / reviews.length).toFixed(1));

    console.log(
      `✅ Stats calculadas: ${stats.averageRating} estrellas (${stats.totalReviews} reviews)`
    );
    return stats;
  } catch (error) {
    console.error('❌ Error obteniendo stats de reviews:', error);
    throw error;
  }
}

/**
 * Verificar si el usuario ya dejó review en un producto
 */
export async function hasUserReviewed(productId: string, userId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', productId),
      where('userId', '==', userId)
    );

    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('❌ Error verificando review del usuario:', error);
    throw error;
  }
}

/**
 * Incrementar contador de "útil" en una review
 */
export async function markReviewHelpful(reviewId: string): Promise<void> {
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    const reviewDoc = await getDoc(reviewRef);

    if (reviewDoc.exists()) {
      const currentHelpful = reviewDoc.data().helpful || 0;
      await updateDoc(reviewRef, {
        helpful: currentHelpful + 1,
        updatedAt: serverTimestamp(),
      });
      console.log('✅ Review marcada como útil');
    }
  } catch (error) {
    console.error('❌ Error marcando review como útil:', error);
    throw error;
  }
}

// ============================================
// 💰 FUNCIONES PARA MONEDERO (WALLET)
// ============================================

import type { Wallet, WalletTransaction } from '../types/firebase';
export type { Wallet, WalletTransaction } from '../types/firebase';

/**
 * Obtener o crear wallet del usuario
 */
export async function getOrCreateWallet(userId: string): Promise<Wallet> {
  try {
    const walletRef = doc(db, 'wallets', userId);
    const walletSnap = await getDoc(walletRef);

    if (walletSnap.exists()) {
      return { id: walletSnap.id, ...walletSnap.data() } as Wallet;
    }

    // Crear wallet nuevo
    const newWallet: Wallet = {
      userId,
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
    };

    await setDoc(walletRef, {
      ...newWallet,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Wallet creado para usuario:', userId);
    return newWallet;
  } catch (error) {
    console.error('❌ Error obteniendo/creando wallet:', error);
    throw error;
  }
}

/**
 * Obtener saldo del wallet
 */
export async function getWalletBalance(userId: string): Promise<number> {
  try {
    const wallet = await getOrCreateWallet(userId);
    return wallet.balance;
  } catch (error) {
    console.error('❌ Error obteniendo saldo del wallet:', error);
    return 0;
  }
}

// ============================================
// ⚠️ FUNCIONES REMOVIDAS POR SEGURIDAD
// ============================================
//
// Las siguientes funciones fueron removidas porque permiten manipular
// el saldo del wallet desde el cliente, lo cual es un riesgo de seguridad:
//
// - addWalletFunds(): Permitía agregar fondos al wallet desde el cliente
// - spendWalletFunds(): Permitía gastar fondos del wallet desde el cliente
//
// ✅ SOLUCIÓN:
// Todas las operaciones de modificación del wallet deben hacerse a través
// de endpoints API protegidos que usan Firebase Admin SDK:
//
// - /api/save-order: Maneja débito de wallet y cashback
// - /api/get-wallet-balance: Obtiene saldo (solo lectura)
// - /api/get-wallet-transactions: Obtiene historial (solo lectura)
//
// Las reglas de Firestore ya previenen la modificación directa del wallet,
// pero es mejor no exponer estas funciones en el código del cliente.
// ============================================

/**
 * Obtener historial de transacciones del wallet
 */
export async function getWalletTransactions(
  userId: string,
  limitCount: number = 50
): Promise<WalletTransaction[]> {
  try {
    const q = query(
      collection(db, 'wallet_transactions'),
      where('userId', '==', userId),
      limit(limitCount)
    );

    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    const transactions: WalletTransaction[] = [];

    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() } as WalletTransaction);
    });

    // Ordenar por fecha más reciente
    transactions.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`✅ ${transactions.length} transacciones encontradas`);
    return transactions;
  } catch (error) {
    console.error('❌ Error obteniendo transacciones del wallet:', error);
    throw error;
  }
}

// ============================================
// 🎟️ FUNCIONES PARA CUPONES
// ============================================

import type { Coupon, CouponUsage } from '../types/firebase';
export type { Coupon, CouponUsage } from '../types/firebase';

/**
 * Validar y obtener cupón por código
 */
export async function validateCoupon(
  code: string,
  userId: string,
  cartTotal: number
): Promise<{ valid: boolean; coupon?: Coupon; error?: string; discount?: number }> {
  try {
    // Buscar cupón por código
    const q = query(
      collection(db, 'coupons'),
      where('code', '==', code.toUpperCase()),
      where('active', '==', true),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { valid: false, error: 'Cupón no válido' };
    }

    const couponDoc = querySnapshot.docs[0];
    const coupon = { id: couponDoc.id, ...couponDoc.data() } as Coupon;

    // Verificar fecha de expiración
    const now = new Date();
    const startDate = coupon.startDate.toDate();
    const endDate = coupon.endDate.toDate();

    if (now < startDate || now > endDate) {
      return { valid: false, error: 'Cupón expirado' };
    }

    // Verificar usos máximos totales
    if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
      return { valid: false, error: 'Cupón agotado' };
    }

    // Verificar usos por usuario
    if (coupon.maxUsesPerUser) {
      const usageQuery = query(
        collection(db, 'coupon_usage'),
        where('couponId', '==', coupon.id),
        where('userId', '==', userId)
      );
      const usageSnapshot = await getDocs(usageQuery);

      if (usageSnapshot.size >= coupon.maxUsesPerUser) {
        return { valid: false, error: 'Ya usaste este cupón el máximo de veces' };
      }
    }

    // Verificar monto mínimo
    if (coupon.minPurchase && cartTotal < coupon.minPurchase) {
      return {
        valid: false,
        error: `Compra mínima: $${coupon.minPurchase.toFixed(2)}`,
      };
    }

    // Calcular descuento
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (cartTotal * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else if (coupon.type === 'fixed') {
      discount = Math.min(coupon.value, cartTotal);
    }
    // Para 'free_shipping', el descuento se maneja en el checkout

    return { valid: true, coupon, discount };
  } catch (error) {
    console.error('❌ Error validando cupón:', error);
    return { valid: false, error: 'Error al validar cupón' };
  }
}

/**
 * Registrar uso de cupón
 */
export async function recordCouponUsage(
  couponId: string,
  userId: string,
  orderId: string,
  discountAmount: number,
  couponCode: string
): Promise<boolean> {
  try {
    const couponRef = doc(db, 'coupons', couponId);

    // Incrementar contador de usos
    await updateDoc(couponRef, {
      currentUses: increment(1),
      updatedAt: serverTimestamp(),
    });

    // Registrar uso
    await addDoc(collection(db, 'coupon_usage'), {
      couponId,
      couponCode,
      userId,
      orderId,
      discountAmount,
      usedAt: serverTimestamp(),
    });

    console.log(`✅ Cupón ${couponCode} usado por usuario ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Error usando cupón:', error);
    return false;
  }
}

/**
 * Crear nuevo cupón (solo admin)
 */
export async function createCoupon(
  couponData: Omit<Coupon, 'id' | 'currentUses' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    console.log('🔍 [v3-FINAL] Datos recibidos:', couponData);

    // Preparar datos base
    const baseData: any = {
      code: couponData.code.toUpperCase(),
      description: couponData.description,
      type: couponData.type,
      value: couponData.value,
      startDate: couponData.startDate,
      endDate: couponData.endDate,
      active: couponData.active,
      createdBy: couponData.createdBy,
      currentUses: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Agregar campos opcionales si existen
    if (couponData.minPurchase) baseData.minPurchase = couponData.minPurchase;
    if (couponData.maxDiscount) baseData.maxDiscount = couponData.maxDiscount;
    if (couponData.maxUses) baseData.maxUses = couponData.maxUses;
    if (couponData.maxUsesPerUser) baseData.maxUsesPerUser = couponData.maxUsesPerUser;

    // ELIMINAR EXPLÍCITAMENTE cualquier campo undefined
    const cleanData = Object.entries(baseData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    console.log('🧹 [v3-FINAL] Datos limpios:', cleanData);
    console.log(
      '🔍 [v3-FINAL] Campos undefined restantes:',
      Object.entries(cleanData).filter(([k, v]) => v === undefined).length
    );

    const docRef = await addDoc(collection(db, 'coupons'), cleanData);

    console.log('✅ Cupón creado:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ [v3-FINAL] Error creando cupón:', error);
    throw error;
  }
}

/**
 * Obtener todos los cupones activos
 */
export async function getActiveCoupons(): Promise<Coupon[]> {
  try {
    const q = query(collection(db, 'coupons'), where('active', '==', true));

    const querySnapshot = await getDocs(q);
    const coupons: Coupon[] = [];

    querySnapshot.forEach((doc) => {
      coupons.push({ id: doc.id, ...doc.data() } as Coupon);
    });

    console.log(`✅ ${coupons.length} cupones activos encontrados`);
    return coupons;
  } catch (error) {
    console.error('❌ Error obteniendo cupones:', error);
    throw error;
  }
}

/**
 * Actualizar cupón
 */
export async function updateCoupon(couponId: string, updates: Partial<Coupon>): Promise<boolean> {
  try {
    const couponRef = doc(db, 'coupons', couponId);

    await updateDoc(couponRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Cupón actualizado:', couponId);
    return true;
  } catch (error) {
    console.error('❌ Error actualizando cupón:', error);
    return false;
  }
}

/**
 * Desactivar cupón
 */
export async function deactivateCoupon(couponId: string): Promise<boolean> {
  try {
    return await updateCoupon(couponId, { active: false });
  } catch (error) {
    console.error('❌ Error desactivando cupón:', error);
    return false;
  }
}
