import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

/**
 * Inicializa Firebase Admin SDK
 * Admin SDK tiene privilegios completos y bypasea las reglas de seguridad
 */
export function getAdminApp(): App {
  // Si ya está inicializado, devolverlo
  if (adminApp) {
    return adminApp;
  }

  // Verificar si ya hay una app inicializada
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  // Inicializar nueva app
  try {
    // Opción 1: Usar Service Account JSON (RECOMENDADO para producción)
    if (import.meta.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(import.meta.env.FIREBASE_SERVICE_ACCOUNT);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
      });
      console.log('✅ Firebase Admin inicializado con Service Account');
      return adminApp;
    }

    // Opción 2: Usar credenciales individuales del .env
    if (
      import.meta.env.FIREBASE_CLIENT_EMAIL &&
      import.meta.env.FIREBASE_PRIVATE_KEY &&
      import.meta.env.PUBLIC_FIREBASE_PROJECT_ID
    ) {
      const privateKey = import.meta.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

      adminApp = initializeApp({
        credential: cert({
          projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: import.meta.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
        projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
      });
      console.log('✅ Firebase Admin inicializado con credenciales individuales');
      return adminApp;
    }

    // Opción 3: Para desarrollo local con emuladores
    // Application Default Credentials (funciona si tienes gcloud configurado)
    console.warn('⚠️ Intentando usar Application Default Credentials');
    adminApp = initializeApp({
      projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
    });
    return adminApp;

  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error);
    throw new Error(
      'Firebase Admin no pudo inicializarse. Verifica tus credenciales en .env\n' +
      'Necesitas configurar FIREBASE_SERVICE_ACCOUNT o (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)'
    );
  }
}

/**
 * Obtiene la instancia de Firestore con privilegios de Admin
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
    const app = getAdminApp();
    adminDb = getFirestore(app);
  }
  return adminDb;
}

// Exportaciones por defecto
export const adminApp = getAdminApp();
export const adminDb = getAdminDb();
