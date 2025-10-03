// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

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
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore with transport tweaks to reduce WebChannel noise
// Force long polling + fetch streams avoids POST Write/channel terminate 400s
export const db = (() => {
  try {
    // Prefer stream transport, auto‑fallback to long polling when needed.
    // Removing experimentalForceLongPolling avoids noisy WebChannel terminate 400 logs.
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: true,
    });
  } catch (_) {
    // Fallback if already initialized elsewhere or unsupported env
    return getFirestore(app);
  }
})();

// Initialize Cloud Storage and pin the exact bucket from env
export const storage = getStorage(app)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Analytics (only in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Reduce Firestore console noise from transport channel terminations
try { setLogLevel('error'); } catch {}

export default app;
