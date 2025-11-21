/**
 * Script para importar schemas de personalización a Firestore
 *
 * Este script toma los schemas de ejemplo definidos en src/data/exampleSchemas.ts
 * y los importa a la colección 'customization_schemas' en Firestore.
 *
 * USO:
 * npx tsx scripts/importSchemas.ts
 *
 * IMPORTANTE: Solo ejecutar una vez o cuando necesites actualizar schemas
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { exampleSchemas } from '../src/data/exampleSchemas';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';

// Obtener __dirname en módulos ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno desde .env
config({ path: path.join(__dirname, '../.env') });

// Inicializar Firebase Admin
function initializeFirebase() {
  if (getApps().length === 0) {
    let serviceAccount: any;

    // Opción 1: Leer desde variable de entorno FIREBASE_SERVICE_ACCOUNT (JSON string)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('✅ Credenciales cargadas desde FIREBASE_SERVICE_ACCOUNT');
      } catch (error) {
        console.error('❌ Error parseando FIREBASE_SERVICE_ACCOUNT:', error);
        process.exit(1);
      }
    }
    // Opción 2: Leer desde archivo (GOOGLE_APPLICATION_CREDENTIALS o service-account-key.json)
    else {
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        path.join(__dirname, '../service-account-key.json');

      if (!fs.existsSync(serviceAccountPath)) {
        console.error('❌ Error: No se encontraron credenciales de Firebase Admin');
        console.error('   Opciones:');
        console.error('   1. Agregar FIREBASE_SERVICE_ACCOUNT en .env (ya la tienes!)');
        console.error('   2. Crear service-account-key.json en la raíz del proyecto');
        console.error('   3. Establecer GOOGLE_APPLICATION_CREDENTIALS en .env');
        console.error('');
        console.error('   Descargar desde: Firebase Console > Project Settings > Service Accounts');
        process.exit(1);
      }

      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      console.log('✅ Credenciales cargadas desde archivo');
    }

    initializeApp({
      credential: cert(serviceAccount),
    });

    console.log('✅ Firebase Admin inicializado correctamente');
  }

  return getFirestore();
}

/**
 * Mapeo de IDs de schema a información de categoría
 * Estos IDs deben coincidir con los usados en ProductCustomizer.tsx
 */
const SCHEMA_CATEGORY_MAP: Record<string, { id: string; name: string }> = {
  camisetas: {
    id: 'cat_camisetas',
    name: 'Camisetas / Textiles (básico)',
  },
  camisetasPro: {
    id: 'cat_camisetas_pro',
    name: 'Camisetas Pro (front/back)',
  },
  hoodies: {
    id: 'cat_hoodies',
    name: 'Hoodies / Sudaderas',
  },
  bolsas: {
    id: 'cat_bolsas',
    name: 'Bolsas / Tote Bags',
  },
  cuadros: {
    id: 'cat_cuadros',
    name: 'Cuadros / Marcos',
  },
  resina: {
    id: 'cat_resina',
    name: 'Figuras de Resina',
  },
  tazas: {
    id: 'cat_tazas',
    name: 'Tazas / Sublimados',
  },
};

async function importSchemas() {
  console.log('📦 Iniciando importación de schemas...\n');

  const db = initializeFirebase();
  const schemasCollection = db.collection('customization_schemas');

  let successCount = 0;
  let errorCount = 0;

  for (const [schemaKey, schema] of Object.entries(exampleSchemas)) {
    try {
      const categoryInfo = SCHEMA_CATEGORY_MAP[schemaKey];

      if (!categoryInfo) {
        console.warn(`⚠️  Schema "${schemaKey}" no tiene categoría mapeada, saltando...`);
        continue;
      }

      const { id: categoryId, name: categoryName } = categoryInfo;

      console.log(`📝 Importando schema: ${categoryName} (${categoryId})`);
      console.log(`   - ${schema.fields.length} campos definidos`);

      // Verificar si el schema ya existe
      const existingDoc = await schemasCollection.doc(categoryId).get();

      const schemaData = {
        schema,
        categoryId,
        categoryName,
        updatedAt: Timestamp.now(),
        createdAt: existingDoc.exists ? existingDoc.data()?.createdAt : Timestamp.now(),
      };

      await schemasCollection.doc(categoryId).set(schemaData);

      if (existingDoc.exists) {
        console.log(`   ✓ Schema actualizado`);
      } else {
        console.log(`   ✓ Schema creado`);
      }

      successCount++;
      console.log('');
    } catch (error) {
      console.error(`   ❌ Error importando schema "${schemaKey}":`, error);
      errorCount++;
      console.log('');
    }
  }

  console.log('─'.repeat(50));
  console.log(`\n📊 Resumen de importación:`);
  console.log(`   ✅ Exitosos: ${successCount}`);
  console.log(`   ❌ Errores: ${errorCount}`);
  console.log(`   📦 Total: ${successCount + errorCount}\n`);

  if (successCount > 0) {
    console.log('🎉 Schemas importados correctamente a Firestore!');
    console.log('');
    console.log('📌 Próximos pasos:');
    console.log('   1. Verificar en Firebase Console: customization_schemas collection');
    console.log('   2. Actualizar ProductCustomizer.tsx para eliminar customizers hardcodeados');
    console.log('   3. Probar DynamicCustomizer con productos existentes');
    console.log('');
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

// Ejecutar script
importSchemas().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
