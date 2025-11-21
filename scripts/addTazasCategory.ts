import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env') });

// Initialize Firebase Admin
let serviceAccount;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;

if (serviceAccountPath) {
  if (existsSync(serviceAccountPath)) {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
  } else {
    console.error(`❌ Service account file not found: ${serviceAccountPath}`);
    process.exit(1);
  }
} else {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT environment variable not set');
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function addTazasCategory() {
  try {
    console.log('📦 Adding Tazas category...');

    const categoryData = {
      name: 'Tazas',
      slug: 'tazas',
      description: 'Tazas personalizadas, termos y vasos',
    };

    // Check if category already exists
    const snapshot = await db.collection('categories').where('slug', '==', 'tazas').get();

    if (!snapshot.empty) {
      console.log('⚠️  Category "Tazas" already exists with slug "tazas"');
      const existing = snapshot.docs[0];
      console.log(`   ID: ${existing.id}`);
      console.log(`   Data:`, existing.data());
      return;
    }

    // Add new category
    const docRef = await db.collection('categories').add(categoryData);
    console.log('✅ Category "Tazas" added successfully!');
    console.log(`   ID: ${docRef.id}`);
    console.log(`   Slug: tazas`);
    console.log(`   URL: /productos?category=tazas`);

  } catch (error) {
    console.error('❌ Error adding category:', error);
    process.exit(1);
  }
}

addTazasCategory()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
