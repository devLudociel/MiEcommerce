import type { App } from 'firebase-admin/app';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

/**
 * Inicializa Firebase Admin SDK (bypasa reglas de seguridad)
 */
export function getAdminApp(): App {
  if (adminApp) return adminApp;

  const apps = getApps();
  if (apps && apps.length > 0) {
    adminApp = apps[0];
    return adminApp;
  }

  try {
    const projectId = (import.meta.env.PUBLIC_FIREBASE_PROJECT_ID as string | undefined) || undefined;

    // Opción 1: Service Account JSON (recomendada)
    const svc = import.meta.env.FIREBASE_SERVICE_ACCOUNT as string | undefined;
    if (svc) {
      const serviceAccount = JSON.parse(svc);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      console.log('Firebase Admin inicializado con Service Account');
      return adminApp;
    }

    // Opción 2: Credenciales sueltas
    const clientEmail = import.meta.env.FIREBASE_CLIENT_EMAIL as string | undefined;
    const privateKeyRaw = import.meta.env.FIREBASE_PRIVATE_KEY as string | undefined;
    if (clientEmail && privateKeyRaw) {
      const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
      adminApp = initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
      console.log('Firebase Admin inicializado con credenciales individuales');
      return adminApp;
    }

    // Opción 3: Application Default Credentials (ADC)
    console.warn('Intentando usar Application Default Credentials');
    adminApp = initializeApp({
      credential: applicationDefault(),
      projectId,
    });
    return adminApp;
  } catch (error) {
    console.error('Error inicializando Firebase Admin:', error);
    throw new Error(
      'Firebase Admin no pudo inicializarse. Configura FIREBASE_SERVICE_ACCOUNT o (FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) en .env'
    );
  }
}

/**
 * Firestore (Admin)
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
    const app = getAdminApp();
    adminDb = getFirestore(app);
  }
  return adminDb;
}

