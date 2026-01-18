/**
 * Script to sanitize public digital file metadata and rotate storage tokens.
 *
 * USO:
 * npx tsx scripts/rotateDigitalTokens.ts
 *
 * Requisitos:
 * - FIREBASE_SERVICE_ACCOUNT en .env (JSON) o service-account-key.json en la raíz
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import type { ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: path.join(__dirname, '../.env') });

function initializeFirebase() {
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET_NAME;

  if (!bucketName) {
    throw new Error(
      'Bucket no configurado. Define FIREBASE_STORAGE_BUCKET o PUBLIC_FIREBASE_STORAGE_BUCKET en .env'
    );
  }

  if (getApps().length === 0) {
    let serviceAccount: ServiceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount;
        console.log('✅ Credenciales cargadas desde FIREBASE_SERVICE_ACCOUNT');
      } catch (error) {
        console.error('❌ Error parseando FIREBASE_SERVICE_ACCOUNT:', error);
        process.exit(1);
      }
    } else {
      const serviceAccountPath =
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        path.join(__dirname, '../service-account-key.json');

      if (!fs.existsSync(serviceAccountPath)) {
        console.error('❌ Error: No se encontraron credenciales de Firebase Admin');
        console.error('   Opciones:');
        console.error('   1. Agregar FIREBASE_SERVICE_ACCOUNT en .env');
        console.error('   2. Crear service-account-key.json en la raíz del proyecto');
        console.error('   3. Establecer GOOGLE_APPLICATION_CREDENTIALS en .env');
        process.exit(1);
      }

      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')) as ServiceAccount;
      console.log('✅ Credenciales cargadas desde archivo');
    }

    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: bucketName,
    });

    console.log('✅ Firebase Admin inicializado correctamente');
  }

  return {
    db: getFirestore(),
    bucket: getStorage().bucket(bucketName),
  };
}

async function sanitizePublicDigitalFiles(db: ReturnType<typeof getFirestore>) {
  const productsSnap = await db.collection('products').where('isDigital', '==', true).get();

  if (productsSnap.empty) {
    console.log('ℹ️  No se encontraron productos digitales para sanear');
    return;
  }

  let updatedCount = 0;

  for (const doc of productsSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const digitalFiles = Array.isArray(data.digitalFiles) ? data.digitalFiles : [];
    const sanitized = digitalFiles.map((file) => {
      if (file && typeof file === 'object') {
        const { fileUrl, storagePath, ...rest } = file as Record<string, unknown>;
        return rest;
      }
      return file;
    });

    const hasChanges = JSON.stringify(digitalFiles) !== JSON.stringify(sanitized);
    if (hasChanges) {
      await doc.ref.set(
        {
          digitalFiles: sanitized,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      updatedCount++;
      console.log(`✅ Producto actualizado: ${doc.id}`);
    }
  }

  console.log(`ℹ️  Productos digitales saneados: ${updatedCount}`);
}

async function rotateStorageTokens(prefixes: string[]) {
  const { bucket } = initializeFirebase();
  let rotated = 0;

  for (const prefix of prefixes) {
    const [files] = await bucket.getFiles({ prefix });
    if (files.length === 0) {
      console.log(`ℹ️  Sin archivos en el prefijo "${prefix}"`);
      continue;
    }

    for (const file of files) {
      const newToken = randomUUID();
      await file.setMetadata({
        metadata: {
          firebaseStorageDownloadTokens: newToken,
        },
      });
      rotated++;
      console.log(`🔁 Token rotado: ${file.name}`);
    }
  }

  console.log(`✅ Tokens rotados: ${rotated}`);
}

async function main() {
  console.log('🔐 Iniciando saneamiento de productos digitales...\n');

  const { db } = initializeFirebase();

  await sanitizePublicDigitalFiles(db);
  await rotateStorageTokens(['digital-products/', 'digital/', 'downloads/']);

  console.log('\n✅ Proceso completado');
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
