#!/usr/bin/env node

/**
 * One-time production data reset for a client "go-live" clean slate.
 *
 * Keeps: facilities, rooms (rooms have status/occupancy fields reset), users,
 *        organizationSettings, trainingProgress, userSettings, feedback.
 * Wipes: renters, leases, payment_schedules, paymentSchedules, payment_approvals,
 *        deposit_payouts, maintenance_expenses, inspections, complaints,
 *        notifications, penalties, roomStatusHistory — plus the Storage files
 *        under renters/, leases/, payments/, maintenance/, inspections/.
 *
 * Two of the wiped collections (notifications, roomStatusHistory) have
 * `allow delete: if false` in firestore.rules — no client SDK can ever delete
 * them, regardless of role. This script uses the Admin SDK, which bypasses
 * security rules entirely, and is the only way to fully complete the reset.
 *
 * Usage:
 *   node scripts/reset-tenant-data.js --emulator [--yes]   # dry run against local emulator
 *   node scripts/reset-tenant-data.js [--yes]              # real run against production
 *
 * Requires (production run only): scripts/serviceAccountKey.json
 * (Firebase Console → Project Settings → Service Accounts → Generate new private key)
 */

import admin from 'firebase-admin';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EXPECTED_PROJECT_ID = 'rmsv3-becf7';
const EMULATOR_PROJECT_ID = 'demo-test';

const args = process.argv.slice(2);
const useEmulator = args.includes('--emulator');
const skipConfirm = args.includes('--yes');

// Collections that must be fully deleted, in leaf-to-root order so a partial
// failure leaves orphaned "detail" records rather than orphaned "parent" ones.
const COLLECTIONS_TO_DELETE = [
  'payment_approvals',
  'deposit_payouts',
  'penalties',
  'maintenance_expenses',
  'inspections',
  'complaints',
  'notifications',
  'roomStatusHistory',
  'payment_schedules',
  'paymentSchedules', // camelCase duplicate — used by penaltyService.ts, distinct collection
  'leases',
  'renters',
];

// Storage prefixes containing tenant-related files (ID docs, receipts, lease
// documents, inspection photos). rooms/, facilities/, users/ are preserved.
const STORAGE_PREFIXES_TO_DELETE = [
  'renters/',
  'leases/',
  'payments/',
  'maintenance/',
  'inspections/',
];

// ── Init ─────────────────────────────────────────────────────────────────────

let expectedProjectId;

if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';
  admin.initializeApp({
    projectId: EMULATOR_PROJECT_ID,
    storageBucket: `${EMULATOR_PROJECT_ID}.appspot.com`,
  });
  expectedProjectId = EMULATOR_PROJECT_ID;
} else {
  const keyPath = path.join(__dirname, 'serviceAccountKey.json');
  if (!fs.existsSync(keyPath)) {
    console.error(`❌ Missing ${keyPath}. Download it from Firebase Console → Project Settings → Service Accounts.`);
    process.exit(1);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

  if (serviceAccount.project_id !== EXPECTED_PROJECT_ID) {
    console.error(
      `❌ Service account project "${serviceAccount.project_id}" does not match expected "${EXPECTED_PROJECT_ID}". Aborting — refusing to run against the wrong project.`
    );
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${EXPECTED_PROJECT_ID}.appspot.com`,
  });
  expectedProjectId = EXPECTED_PROJECT_ID;
}

const db = getFirestore();
const bucket = getStorage().bucket();

const runTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(__dirname, 'backups', `reset-tenant-data-${runTimestamp}`);

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonReplacer(_key, value) {
  if (value instanceof Timestamp) {
    return { __timestamp__: value.toDate().toISOString() };
  }
  return value;
}

async function confirm(promptText) {
  if (skipConfirm) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(promptText, resolve));
  rl.close();
  return answer.trim() === expectedProjectId;
}

async function countCollection(name) {
  const snap = await db.collection(name).count().get();
  return snap.data().count;
}

async function backupCollection(name) {
  const snap = await db.collection(name).get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  fs.writeFileSync(path.join(backupDir, `${name}.json`), JSON.stringify(docs, jsonReplacer, 2));
  return docs.length;
}

async function backupStoragePrefix(prefix) {
  const [files] = await bucket.getFiles({ prefix });
  const destDir = path.join(backupDir, 'storage-files', prefix.replace(/\/$/, ''));
  const manifest = [];
  for (const file of files) {
    const destPath = path.join(destDir, path.basename(file.name));
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    await file.download({ destination: destPath });
    manifest.push(file.name);
  }
  fs.mkdirSync(backupDir, { recursive: true });
  const manifestPath = path.join(backupDir, `storage-manifest-${prefix.replace(/\//g, '_')}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return files.length;
}

async function deleteCollectionBatched(name, batchSize = 400) {
  let deletedTotal = 0;
  while (true) {
    const snap = await db.collection(name).limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deletedTotal += snap.size;
    console.log(`    ...deleted ${deletedTotal} from ${name} so far`);
  }
  return deletedTotal;
}

async function deleteStoragePrefix(prefix) {
  const [files] = await bucket.getFiles({ prefix });
  await Promise.all(files.map((f) => f.delete()));
  return files.length;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎯 Target project: ${expectedProjectId} ${useEmulator ? '(EMULATOR)' : '(PRODUCTION)'}\n`);
  console.log('This will PERMANENTLY DELETE all documents in:');
  COLLECTIONS_TO_DELETE.forEach((c) => console.log(`  - ${c}`));
  console.log('\nAnd reset every "rooms" document to status=available (occupancy fields cleared).');
  console.log('\nAnd PERMANENTLY DELETE all Storage files under:');
  STORAGE_PREFIXES_TO_DELETE.forEach((p) => console.log(`  - ${p}`));
  console.log('\n"facilities", "rooms" (documents), and "users" are preserved.\n');

  if (!useEmulator) {
    const ok = await confirm(`Type the project id "${expectedProjectId}" to confirm and proceed: `);
    if (!ok) {
      console.error('❌ Confirmation did not match. Aborting.');
      process.exit(1);
    }
  }

  // ── Pre-run baseline ────────────────────────────────────────────────────
  const facilitiesBefore = await countCollection('facilities');
  const roomsBefore = await countCollection('rooms');
  console.log(`\n📊 Baseline: facilities=${facilitiesBefore}, rooms=${roomsBefore}\n`);

  // ── Backup ──────────────────────────────────────────────────────────────
  console.log(`── Backup phase → ${backupDir} ──`);
  fs.mkdirSync(backupDir, { recursive: true });

  for (const name of COLLECTIONS_TO_DELETE) {
    const count = await backupCollection(name);
    console.log(`  📦 Backed up ${count} docs from ${name}`);
  }

  const roomsBackupCount = await backupCollection('rooms');
  fs.renameSync(path.join(backupDir, 'rooms.json'), path.join(backupDir, 'rooms-before-reset.json'));
  console.log(`  📦 Backed up ${roomsBackupCount} room docs (pre-reset) → rooms-before-reset.json`);

  for (const prefix of STORAGE_PREFIXES_TO_DELETE) {
    const count = await backupStoragePrefix(prefix);
    console.log(`  📦 Backed up ${count} Storage files under ${prefix}`);
  }

  console.log('\n✅ Backup complete.\n');

  // ── Delete Firestore documents ──────────────────────────────────────────
  console.log('── Deleting Firestore documents ──');
  const deleteResults = {};
  for (const name of COLLECTIONS_TO_DELETE) {
    try {
      console.log(`  🗑️  ${name}...`);
      deleteResults[name] = await deleteCollectionBatched(name);
    } catch (err) {
      console.error(`  ❌ Failed deleting ${name}:`, err.message);
      deleteResults[name] = `FAILED: ${err.message}`;
    }
  }

  // ── Reset rooms ─────────────────────────────────────────────────────────
  console.log('\n── Resetting rooms ──');
  const roomsSnap = await db.collection('rooms').get();
  let roomsReset = 0;
  const roomDocs = roomsSnap.docs;
  for (let i = 0; i < roomDocs.length; i += 400) {
    const chunk = roomDocs.slice(i, i + 400);
    const batch = db.batch();
    chunk.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'available',
        lastOccupancyState: FieldValue.delete(),
        lastMonthStatus: FieldValue.delete(),
        updatedAt: Timestamp.now(),
      });
    });
    await batch.commit();
    roomsReset += chunk.length;
  }
  console.log(`  ✅ Reset ${roomsReset} room documents to status=available`);

  // ── Delete Storage files ────────────────────────────────────────────────
  console.log('\n── Deleting Storage files ──');
  const storageResults = {};
  for (const prefix of STORAGE_PREFIXES_TO_DELETE) {
    try {
      storageResults[prefix] = await deleteStoragePrefix(prefix);
      console.log(`  🗑️  Deleted ${storageResults[prefix]} files under ${prefix}`);
    } catch (err) {
      console.error(`  ❌ Failed deleting Storage prefix ${prefix}:`, err.message);
      storageResults[prefix] = `FAILED: ${err.message}`;
    }
  }

  // ── Final report ────────────────────────────────────────────────────────
  console.log('\n── Final verification ──');
  const facilitiesAfter = await countCollection('facilities');
  const roomsAfter = await countCollection('rooms');
  console.log(`  facilities: ${facilitiesAfter} (expected unchanged: ${facilitiesBefore})`);
  console.log(`  rooms:      ${roomsAfter} (expected unchanged: ${roomsBefore})`);

  for (const name of COLLECTIONS_TO_DELETE) {
    const remaining = await countCollection(name);
    console.log(`  ${name}: ${remaining} remaining (deleted ${deleteResults[name]})`);
  }

  console.log('\n🎉 Reset complete.');
  console.log(`📦 Backup saved at: ${backupDir}`);
  console.log('⚠️  Archive this backup to secure storage immediately, then delete the local copy — it contains tenant PII.\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
