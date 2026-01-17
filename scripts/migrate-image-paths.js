// Migration: convert stored download URLs to storage paths for private uploads.
// Usage:
//   node scripts/migrate-image-paths.js --commit
//   node scripts/migrate-image-paths.js --commit --collections=orders,personalizaciones,saved_designs,shared_designs
//   node scripts/migrate-image-paths.js --limit=50 --keep-url
//   node scripts/migrate-image-paths.js --batch=200

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: path.join(__dirname, '../.env') });

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArgValue = (prefix, fallback) => {
  const match = args.find((arg) => arg.startsWith(prefix));
  if (!match) return fallback;
  const [, value] = match.split('=');
  return value || fallback;
};

const commit = hasFlag('--commit');
const keepUrl = hasFlag('--keep-url');
const limit = Number.parseInt(getArgValue('--limit=', ''), 10);
const batchSize = Number.parseInt(getArgValue('--batch=', '200'), 10);
const collectionsArg = getArgValue('--collections=', '');

const defaultCollections = ['orders', 'personalizaciones', 'saved_designs', 'shared_designs'];
const collections = collectionsArg
  ? collectionsArg.split(',').map((c) => c.trim()).filter(Boolean)
  : defaultCollections;

const PRIVATE_PREFIXES = [
  'users/',
  'uploads/',
  'personalizaciones/',
  'profiles/',
];

function extractStoragePath(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('data:')) return null;
  if (url.startsWith('gs://')) {
    return url.replace(/^gs:\/\/[^/]+\//, '');
  }
  const storageMatch = url.match(/^https?:\/\/storage\.googleapis\.com\/[^/]+\/(.+)$/);
  if (storageMatch) {
    return decodeURIComponent(storageMatch[1].split('?')[0]);
  }
  const firebaseMatch = url.match(/^https?:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/(.+)$/);
  if (firebaseMatch) {
    return decodeURIComponent(firebaseMatch[1].split('?')[0]);
  }
  const parts = url.split('/o/');
  if (parts.length < 2) return null;
  const rawPath = parts[1].split('?')[0];
  if (!rawPath) return null;
  return decodeURIComponent(rawPath);
}

function isPrivatePath(storagePath) {
  return PRIVATE_PREFIXES.some((prefix) => storagePath.startsWith(prefix));
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function migrateValue(value, stats) {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = migrateValue(item, stats);
      if (result.changed) changed = true;
      return result.value;
    });
    return { value: changed ? next : value, changed };
  }

  if (!value || typeof value !== 'object' || !isPlainObject(value)) {
    return { value, changed: false };
  }

  let changed = false;
  let next = value;

  const ensureNext = () => {
    if (!changed) {
      next = { ...value };
      changed = true;
    }
  };

  const maybeConvertField = (fieldName) => {
    const rawValue = value[fieldName];
    if (typeof rawValue !== 'string') return;
    const storagePath = extractStoragePath(rawValue);
    if (!storagePath || !isPrivatePath(storagePath)) return;

    const targetField = fieldName === 'thumbnail' ? 'thumbnailPath' : 'imagePath';

    if (!value[targetField]) {
      ensureNext();
      next[targetField] = storagePath;
    }

    if (!keepUrl) {
      ensureNext();
      delete next[fieldName];
    }

    if (fieldName === 'imageUrl') {
      stats.imageUrlConverted += 1;
      if (!keepUrl) stats.imageUrlRemoved += 1;
    }
    if (fieldName === 'previewImage') {
      stats.previewImageConverted += 1;
      if (!keepUrl) stats.previewImageRemoved += 1;
    }
    if (fieldName === 'thumbnail') {
      stats.thumbnailConverted += 1;
      if (!keepUrl) stats.thumbnailRemoved += 1;
    }
  };

  maybeConvertField('imageUrl');
  maybeConvertField('previewImage');
  maybeConvertField('thumbnail');

  for (const [key, child] of Object.entries(value)) {
    if (key === 'imageUrl' || key === 'previewImage' || key === 'thumbnail') continue;
    const result = migrateValue(child, stats);
    if (result.changed) {
      ensureNext();
      next[key] = result.value;
    }
  }

  return { value: next, changed };
}

function initializeFirebase() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  let serviceAccount = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('[ok] Using FIREBASE_SERVICE_ACCOUNT');
    } catch (error) {
      console.error('[error] FIREBASE_SERVICE_ACCOUNT is not valid JSON', error);
      process.exit(1);
    }
  } else {
    const serviceAccountPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      path.join(__dirname, '../service-account-key.json');

    if (!fs.existsSync(serviceAccountPath)) {
      console.error('[error] Firebase Admin credentials not found.');
      console.error('Set FIREBASE_SERVICE_ACCOUNT, GOOGLE_APPLICATION_CREDENTIALS, or add service-account-key.json.');
      process.exit(1);
    }

    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log('[ok] Using service-account-key.json');
  }

  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || process.env.PUBLIC_FIREBASE_PROJECT_ID,
  });

  return getFirestore();
}

async function processCollection(db, name, options) {
  const { limit: totalLimit, batchSize: batchLimit } = options;
  let processed = 0;
  let updated = 0;
  let lastDoc = null;

  const stats = {
    imageUrlConverted: 0,
    imageUrlRemoved: 0,
    previewImageConverted: 0,
    previewImageRemoved: 0,
    thumbnailConverted: 0,
    thumbnailRemoved: 0,
  };

  console.log(`\n[info] Scanning collection "${name}"`);

  while (true) {
    let query = db.collection(name).orderBy('__name__').limit(batchLimit);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snap = await query.get();
    if (snap.empty) break;

    const batch = db.batch();
    let batchUpdates = 0;

    for (const doc of snap.docs) {
      processed += 1;
      const data = doc.data();
      const result = migrateValue(data, stats);

      if (result.changed) {
        updated += 1;
        if (commit) {
          batch.set(doc.ref, result.value);
          batchUpdates += 1;
        }
      }

      if (totalLimit && processed >= totalLimit) break;
    }

    if (commit && batchUpdates > 0) {
      await batch.commit();
    }

    lastDoc = snap.docs[snap.docs.length - 1];

    if (totalLimit && processed >= totalLimit) break;
  }

  return { processed, updated, stats };
}

async function main() {
  console.log('[info] Starting migration');
  console.log(`[info] Mode: ${commit ? 'COMMIT' : 'DRY RUN'}`);
  console.log(`[info] Collections: ${collections.join(', ')}`);
  console.log(`[info] keep-url: ${keepUrl ? 'true' : 'false'}`);

  const db = initializeFirebase();
  let totalProcessed = 0;
  let totalUpdated = 0;
  const totals = {
    imageUrlConverted: 0,
    imageUrlRemoved: 0,
    previewImageConverted: 0,
    previewImageRemoved: 0,
    thumbnailConverted: 0,
    thumbnailRemoved: 0,
  };

  for (const name of collections) {
    const result = await processCollection(db, name, {
      limit: Number.isFinite(limit) && limit > 0 ? limit : null,
      batchSize,
    });

    totalProcessed += result.processed;
    totalUpdated += result.updated;
    totals.imageUrlConverted += result.stats.imageUrlConverted;
    totals.imageUrlRemoved += result.stats.imageUrlRemoved;
    totals.previewImageConverted += result.stats.previewImageConverted;
    totals.previewImageRemoved += result.stats.previewImageRemoved;
    totals.thumbnailConverted += result.stats.thumbnailConverted;
    totals.thumbnailRemoved += result.stats.thumbnailRemoved;

    console.log(
      `[info] ${name}: processed=${result.processed}, updated=${result.updated}`
    );
  }

  console.log('\n[done] Migration summary');
  console.log(`[done] Docs processed: ${totalProcessed}`);
  console.log(`[done] Docs updated: ${totalUpdated}`);
  console.log(`[done] imageUrl converted: ${totals.imageUrlConverted}`);
  console.log(`[done] imageUrl removed: ${totals.imageUrlRemoved}`);
  console.log(`[done] previewImage converted: ${totals.previewImageConverted}`);
  console.log(`[done] previewImage removed: ${totals.previewImageRemoved}`);
  console.log(`[done] thumbnail converted: ${totals.thumbnailConverted}`);
  console.log(`[done] thumbnail removed: ${totals.thumbnailRemoved}`);

  if (!commit) {
    console.log('\n[info] Dry run only. Re-run with --commit to apply changes.');
  }
}

main().catch((error) => {
  console.error('[error] Migration failed:', error);
  process.exit(1);
});
