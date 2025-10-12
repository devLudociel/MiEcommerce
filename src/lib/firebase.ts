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
  serverTimestamp
} from 'firebase/firestore';
import type { Firestore, DocumentData, QuerySnapshot } from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject
} from 'firebase/storage';
import type { FirebaseStorage, StorageReference, UploadResult } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
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
  measurementId: import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase (avoid duplicate-app in HMR / multiple imports)
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore with transport tweaks to reduce WebChannel noise
export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true
    });
  } catch (_) {
    return getFirestore(app);
  }
})();

// Initialize Cloud Storage
export const storage: FirebaseStorage = getStorage(app);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

// Initialize Analytics (only in browser)
export const analytics: Analytics | null = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Reduce Firestore console noise
try { setLogLevel('error'); } catch {}

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
    const storageRef: StorageReference = ref(storage, `variants/${categoria}/${variante}/preview.jpg`);
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
    const storageRef: StorageReference = ref(storage, `personalizaciones/${userId}/${productType}/${fileName}`);
    
    const snapshot: UploadResult = await uploadBytes(storageRef, file);
    const url: string = await getDownloadURL(snapshot.ref);
    
    console.log('✅ Imagen personalizada subida:', url);
    
    return {
      url,
      path: snapshot.ref.fullPath,
      name: fileName
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
      const storageRef: StorageReference = ref(storage, `variants/${categoria}/${varianteName}/preview.jpg`);
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
      status: 'pending'
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
      updatedAt: serverTimestamp()
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
    const q = query(
      collection(db, 'personalizaciones'),
      where('userId', '==', userId)
    );
    
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
      createdAt: serverTimestamp()
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
    const q = query(
      collection(db, 'productos'),
      where('categoria', '==', categoria)
    );
    
    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(q);
    const products: ProductData[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      products.push({ 
        id: doc.id, 
        categoria: data.categoria || '',
        ...data 
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
        ...data 
      } as ProductData);
    });
    
    console.log(`✅ ${products.length} productos totales encontrados`);
    return products;
  } catch (error) {
    console.error('❌ Error obteniendo todos los productos:', error);
    throw error;
  }
}