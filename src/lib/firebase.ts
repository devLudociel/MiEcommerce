// src/lib/firebase.ts
import { logger } from '../lib/logger';
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

const isTestEnv = Boolean(import.meta.env.VITEST);
const testFirebaseConfig = {
  apiKey: 'AIzaSyDUMMYTESTKEY00000000000000000000',
  authDomain: 'demo-test.firebaseapp.com',
  projectId: 'demo-test',
  storageBucket: 'demo-test.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:demo-test',
  measurementId: 'G-TEST',
};

const resolvedFirebaseConfig = isTestEnv
  ? {
      apiKey: firebaseConfig.apiKey || testFirebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain || testFirebaseConfig.authDomain,
      projectId: firebaseConfig.projectId || testFirebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket || testFirebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId || testFirebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId || testFirebaseConfig.appId,
      measurementId: firebaseConfig.measurementId || testFirebaseConfig.measurementId,
    }
  : firebaseConfig;

// Initialize Firebase (avoid duplicate-app in HMR / multiple imports)
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(resolvedFirebaseConfig);

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
} catch (e) {
  // Non-critical: app works without persistence, just won't remember session
  console.warn('[Firebase] Could not set auth persistence:', e);
}
try {
  // Mostrar emails en español (restablecer contraseña, etc.)
  // Nota: puedes sobreescribir por usuario si lo necesitas
  auth.languageCode = 'es';
} catch (e) {
  // Non-critical: emails will be in default language
  console.warn('[Firebase] Could not set language code:', e);
}

// Reduce Firestore console noise
try {
  setLogLevel('error');
} catch (e) {
  // Non-critical: just more console noise
  console.warn('[Firebase] Could not set Firestore log level:', e);
}

export default app;

// ============================================
// 📁 TIPOS E INTERFACES
// ============================================

export interface CustomImageUpload {
  path: string;
  name: string;
}

export interface CustomizationData {
  userId: string;
  productType: string;
  [key: string]: string | number | boolean | null | undefined | object;
}

export interface CustomizationDoc extends DocumentData {
  id: string;
  userId: string;
  productType: string;
  createdAt: import('firebase/firestore').Timestamp | import('firebase/firestore').FieldValue;
  updatedAt?: import('firebase/firestore').Timestamp | import('firebase/firestore').FieldValue;
  status: string;
}

export interface ProductData {
  id?: string;
  categoria: string;
  nombre?: string;
  descripcion?: string;
  precio?: number;
  variantes?: string[];
  [key: string]: string | number | boolean | null | undefined | object | string[];
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
    logger.info(`✅ Imagen cargada: variants/${categoria}/${variante}/preview.jpg`);
    return url;
  } catch (error) {
    logger.error(`❌ Error obteniendo imagen de variants/${categoria}/${variante}:`, error);
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

    logger.info('✅ Imagen personalizada subida:', snapshot.ref.fullPath);

    return {
      path: snapshot.ref.fullPath,
      name: fileName,
    };
  } catch (error) {
    logger.error('❌ Error subiendo imagen personalizada:', error);
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
    logger.info('✅ Imagen eliminada:', imagePath);
    return true;
  } catch (error) {
    logger.error('❌ Error eliminando imagen:', error);
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
    logger.info(`✅ ${urls.length} imágenes de variantes subidas para ${categoria}`);
    return urls;
  } catch (error) {
    logger.error('❌ Error subiendo imágenes de productos:', error);
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

    logger.info('✅ Personalización guardada con ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    logger.error('❌ Error guardando personalización:', error);
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

    logger.info('✅ Personalización actualizada:', customizationId);
    return true;
  } catch (error) {
    logger.error('❌ Error actualizando personalización:', error);
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
      logger.info('⚠️ Personalización no encontrada:', customizationId);
      return null;
    }
  } catch (error) {
    logger.error('❌ Error obteniendo personalización:', error);
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

    logger.info(`✅ ${customizations.length} personalizaciones encontradas para usuario ${userId}`);
    return customizations;
  } catch (error) {
    logger.error('❌ Error obteniendo personalizaciones:', error);
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

    logger.info('✅ Producto guardado con ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    logger.error('❌ Error guardando producto:', error);
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

    logger.info(`✅ ${products.length} productos encontrados en categoría ${categoria}`);
    return products;
  } catch (error) {
    logger.error('❌ Error obteniendo productos:', error);
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

    logger.info(`✅ ${products.length} productos totales encontrados`);
    return products;
  } catch (error) {
    logger.error('❌ Error obteniendo todos los productos:', error);
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
export async function getSpecialOffers(): Promise<ProductData[]> {
  try {
    const q = query(
      collection(db, 'products'),
      where('isSpecialOffer', '==', true),
      where('active', '==', true),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    const offers: ProductData[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      offers.push({
        id: doc.id,
        ...data,
      });
    });

    logger.info(`✅ ${offers.length} ofertas especiales encontradas`);
    return offers;
  } catch (error) {
    logger.error('❌ Error obteniendo ofertas especiales:', error);
    // Si falla por falta de índice, devolver array vacío
    return [];
  }
}

// ============================================
// 📦 FUNCIONES PARA PEDIDOS
// ============================================

// Import type definitions from centralized types file
import type {
  OrderData,
  OrderItem,
  TrackingEvent,
  ShippingInfo,
  PaymentInfo,
} from '../types/firebase';
export type {
  OrderData,
  OrderItem,
  TrackingEvent,
  ShippingInfo,
  PaymentInfo,
} from '../types/firebase';

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
      logger.info('⚠️ Pedido no encontrado:', orderId);
      return null;
    }
  } catch (error) {
    logger.error('❌ Error obteniendo pedido:', error);
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

    logger.info(`✅ ${orders.length} pedidos encontrados para usuario ${userId}`);
    return orders;
  } catch (error) {
    logger.error('❌ Error obteniendo pedidos del usuario:', error);
    throw error;
  }
}

/**
 * PERFORMANCE: Obtener pedidos de un usuario con paginación
 * @param userId - ID del usuario
 * @param pageSize - Número de pedidos por página
 * @param lastDoc - Último documento de la página anterior (para paginación)
 * @returns Objeto con pedidos, si hay más páginas, y el cursor para la siguiente página
 */
export async function getUserOrdersPaginated(
  userId: string,
  pageSize: number = 10,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{
  orders: OrderData[];
  hasMore: boolean;
  lastVisible: QueryDocumentSnapshot<DocumentData> | null;
}> {
  try {
    let q = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(pageSize + 1) // Fetch one extra to know if there are more
    );

    // Add cursor for pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const querySnapshot = await getDocs(q);
    const orders: OrderData[] = [];
    const docs: QueryDocumentSnapshot<DocumentData>[] = [];

    querySnapshot.forEach((doc) => {
      docs.push(doc);
      orders.push({ id: doc.id, ...doc.data() } as OrderData);
    });

    // Check if there are more pages
    const hasMore = orders.length > pageSize;
    if (hasMore) {
      orders.pop(); // Remove the extra item
      docs.pop();
    }

    const lastVisible = docs.length > 0 ? docs[docs.length - 1] : null;

    logger.info(`✅ ${orders.length} pedidos cargados (página), hasMore: ${hasMore}`);
    return { orders, hasMore, lastVisible };
  } catch (error) {
    logger.error('❌ Error obteniendo pedidos paginados:', error);
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

    logger.info('✅ Estado de pedido actualizado:', orderId);
    return true;
  } catch (error) {
    logger.error('❌ Error actualizando estado de pedido:', error);
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
    const updateData: Record<string, any> = {
      ...trackingData,
      updatedAt: serverTimestamp(),
    };

    if (trackingData.estimatedDelivery) {
      updateData.estimatedDelivery = trackingData.estimatedDelivery;
    }

    await updateDoc(docRef, updateData);

    logger.info('✅ Tracking actualizado para pedido:', orderId);
    return true;
  } catch (error) {
    logger.error('❌ Error actualizando tracking:', error);
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

    logger.info('✅ Evento de tracking agregado:', orderId, event.status);
    return true;
  } catch (error) {
    logger.error('❌ Error agregando evento de tracking:', error);
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

    logger.info(`✅ ${orders.length} pedidos totales encontrados`);
    return orders;
  } catch (error) {
    logger.error('❌ Error obteniendo todos los pedidos:', error);
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

    logger.info(`✅ ${orders.length} pedidos con estado ${status}`);
    return orders;
  } catch (error) {
    logger.error('❌ Error obteniendo pedidos por estado:', error);
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
    logger.error('❌ Error obteniendo conteo de pedidos:', error);
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

    logger.info(`✅ ${orders.length} pedidos obtenidos (página), hasMore: ${hasMore}`);

    return {
      data: orders,
      lastDoc: newLastDoc,
      hasMore,
    };
  } catch (error) {
    logger.error('❌ Error obteniendo pedidos paginados:', error);
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

    logger.info('✅ Review agregada:', docRef.id);
    return docRef.id;
  } catch (error) {
    logger.error('❌ Error agregando review:', error);
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

    logger.info(`✅ ${reviews.length} reviews encontradas para producto ${productId}`);
    return reviews;
  } catch (error) {
    logger.error('❌ Error obteniendo reviews:', error);
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

    return stats;
  } catch (error) {
    logger.error('❌ Error obteniendo stats de reviews:', error);
    throw error;
  }
}

/**
 * PERFORMANCE: Batch get review stats for multiple products
 * Solves N+1 query problem by fetching all reviews in a single query
 */
export async function batchGetProductReviewStats(
  productIds: string[]
): Promise<Map<string, ReviewStats>> {
  const statsMap = new Map<string, ReviewStats>();

  // Initialize empty stats for all products
  productIds.forEach((id) => {
    statsMap.set(id, {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    });
  });

  if (productIds.length === 0) {
    return statsMap;
  }

  try {
    // PERFORMANCE: Single query for all reviews instead of N queries
    // Firestore 'in' operator supports up to 10 values, so we need to batch
    const batchSize = 10;
    const batches: string[][] = [];

    for (let i = 0; i < productIds.length; i += batchSize) {
      batches.push(productIds.slice(i, i + batchSize));
    }

    // Execute all batch queries in parallel
    const allReviewsPromises = batches.map(async (batch) => {
      const q = query(collection(db, 'reviews'), where('productId', 'in', batch));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Review);
    });

    const allReviewsArrays = await Promise.all(allReviewsPromises);
    const allReviews = allReviewsArrays.flat();

    // Group reviews by productId and calculate stats
    allReviews.forEach((review) => {
      const stats = statsMap.get(review.productId);
      if (!stats) return;

      stats.totalReviews++;
      stats.ratingDistribution[review.rating as keyof typeof stats.ratingDistribution]++;
    });

    // Calculate average ratings
    statsMap.forEach((stats, productId) => {
      if (stats.totalReviews === 0) return;

      let totalRating = 0;
      Object.entries(stats.ratingDistribution).forEach(([rating, count]) => {
        totalRating += Number(rating) * count;
      });

      stats.averageRating = Number((totalRating / stats.totalReviews).toFixed(1));
    });

    if (import.meta.env.DEV) {
      logger.info(
        `[batchGetProductReviewStats] Loaded stats for ${productIds.length} products, ${allReviews.length} total reviews`
      );
    }

    return statsMap;
  } catch (error) {
    logger.error('❌ Error in batchGetProductReviewStats:', error);
    // Return empty stats instead of throwing to avoid breaking product display
    return statsMap;
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
    logger.error('❌ Error verificando review del usuario:', error);
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
      logger.info('✅ Review marcada como útil');
    }
  } catch (error) {
    logger.error('❌ Error marcando review como útil:', error);
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
      promoBalance: 0,
      promoMinPurchase: 50,
      totalEarned: 0,
      totalSpent: 0,
    };

    await setDoc(walletRef, {
      ...newWallet,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    logger.info('✅ Wallet creado para usuario:', userId);
    return newWallet;
  } catch (error) {
    logger.error('❌ Error obteniendo/creando wallet:', error);
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
    logger.error('❌ Error obteniendo saldo del wallet:', error);
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

    logger.info(`✅ ${transactions.length} transacciones encontradas`);
    return transactions;
  } catch (error) {
    logger.error('❌ Error obteniendo transacciones del wallet:', error);
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
    logger.error('❌ Error validando cupón:', error);
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

    logger.info(`✅ Cupón ${couponCode} usado por usuario ${userId}`);
    return true;
  } catch (error) {
    logger.error('❌ Error usando cupón:', error);
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
    logger.info('🔍 [v3-FINAL] Datos recibidos:', couponData);

    // Preparar datos base
    const baseData: Record<string, any> = {
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
    const cleanData = Object.entries(baseData).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, any>
    );

    logger.info('🧹 [v3-FINAL] Datos limpios:', cleanData);
    logger.info(
      '🔍 [v3-FINAL] Campos undefined restantes:',
      Object.entries(cleanData).filter(([k, v]) => v === undefined).length
    );

    const docRef = await addDoc(collection(db, 'coupons'), cleanData);

    logger.info('✅ Cupón creado:', docRef.id);
    return docRef.id;
  } catch (error) {
    logger.error('❌ [v3-FINAL] Error creando cupón:', error);
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

    logger.info(`✅ ${coupons.length} cupones activos encontrados`);
    return coupons;
  } catch (error) {
    logger.error('❌ Error obteniendo cupones:', error);
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

    logger.info('✅ Cupón actualizado:', couponId);
    return true;
  } catch (error) {
    logger.error('❌ Error actualizando cupón:', error);
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
    logger.error('❌ Error desactivando cupón:', error);
    return false;
  }
}
