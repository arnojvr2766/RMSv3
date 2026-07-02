import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// NOTE: admin.initializeApp() is called once in index.ts. Do not call it again
// here — Firestore/Storage handles below are only ever touched lazily inside
// handler bodies (never at module load time) so import order can't matter.

// ─── Shared helpers ─────────────────────────────────────────────────────────

async function requireSystemAdmin(auth: { uid: string } | undefined): Promise<void> {
  if (!auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }
  const userSnap = await admin.firestore().collection('users').doc(auth.uid).get();
  if (!userSnap.exists || userSnap.data()?.role !== 'system_admin') {
    throw new functions.https.HttpsError('permission-denied', 'System admin role required.');
  }
}

const IN_CHUNK_SIZE = 30; // Firestore's cap for a single `in` / documentId() `in` clause.
const DELETE_CHUNK_SIZE = 400; // headroom under Firestore's 500-op batch cap.

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function queryByFieldIn(
  db: FirebaseFirestore.Firestore,
  collectionName: string,
  field: string,
  values: string[]
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  if (values.length === 0) return [];
  const results: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (const group of chunk(values, IN_CHUNK_SIZE)) {
    const snap = await db.collection(collectionName).where(field, 'in', group).get();
    results.push(...snap.docs);
  }
  return results;
}

async function queryDocsByIdIn(
  db: FirebaseFirestore.Firestore,
  collectionName: string,
  ids: string[]
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  if (ids.length === 0) return [];
  const results: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (const group of chunk(ids, IN_CHUNK_SIZE)) {
    const snap = await db
      .collection(collectionName)
      .where(admin.firestore.FieldPath.documentId(), 'in', group)
      .get();
    results.push(...snap.docs);
  }
  return results;
}

async function getAllDocs(
  db: FirebaseFirestore.Firestore,
  collectionName: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const snap = await db.collection(collectionName).get();
  return snap.docs;
}

async function chunkedDelete(db: FirebaseFirestore.Firestore, docs: FirebaseFirestore.QueryDocumentSnapshot[]): Promise<void> {
  for (const group of chunk(docs, DELETE_CHUNK_SIZE)) {
    const batch = db.batch();
    for (const doc of group) batch.delete(doc.ref);
    await batch.commit();
  }
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof admin.firestore.Timestamp) {
    return { __timestamp__: value.toDate().toISOString() };
  }
  return value;
}

type StorageBucket = ReturnType<ReturnType<typeof admin.storage>['bucket']>;

async function backupDocs(
  bucket: StorageBucket,
  runId: string,
  collectionName: string,
  docs: FirebaseFirestore.QueryDocumentSnapshot[]
): Promise<void> {
  if (docs.length === 0) return;
  const payload = docs.map((d) => ({ id: d.id, ...d.data() }));
  const file = bucket.file(`bulk-data-backups/${runId}/${collectionName}.json`);
  await file.save(JSON.stringify(payload, jsonReplacer, 2), { contentType: 'application/json' });
}

async function deleteStoragePrefix(bucket: StorageBucket, prefix: string): Promise<number> {
  const [files] = await bucket.getFiles({ prefix });
  if (files.length === 0) return 0;
  await Promise.all(files.map((f) => f.delete()));
  return files.length;
}

// ─── bulkDeleteTenantData ───────────────────────────────────────────────────
//
// Mirrors scripts/reset-tenant-data.js's scope (tenant/operational data only —
// facilities and rooms are never touched here) but adds facility-scoping,
// dependency-aware entity selection, a dry-run preview, and a Cloud Storage
// backup before every real delete. Runs as Admin SDK because `notifications`
// and `roomStatusHistory` have `allow delete: if false` in firestore.rules —
// no client, regardless of role, can ever delete those two collections.

type DeletableEntityType =
  | 'renters'
  | 'leases'
  | 'payment_schedules'
  | 'payment_approvals'
  | 'penalties'
  | 'deposit_payouts'
  | 'maintenance_expenses'
  | 'inspections'
  | 'complaints';

type SweepExtraType = 'notifications' | 'roomStatusHistory';

const COLLECTION_NAME: Record<DeletableEntityType, string> = {
  renters: 'renters',
  leases: 'leases',
  payment_schedules: 'payment_schedules',
  payment_approvals: 'payment_approvals',
  penalties: 'penalties',
  deposit_payouts: 'deposit_payouts',
  maintenance_expenses: 'maintenance_expenses',
  inspections: 'inspections',
  complaints: 'complaints',
};

// Parent → children. Selecting a parent auto-includes every descendant, even
// if the caller didn't explicitly ask for them — this is the "auto-detect
// dependencies" behaviour, enforced server-side (never trust a client-sent set).
const CASCADE_CHILDREN: Record<DeletableEntityType, DeletableEntityType[]> = {
  renters: ['leases'],
  leases: ['payment_schedules', 'deposit_payouts', 'inspections'],
  payment_schedules: ['payment_approvals', 'penalties'],
  payment_approvals: [],
  penalties: [],
  deposit_payouts: [],
  inspections: [],
  maintenance_expenses: [],
  complaints: [],
};

// Leaf-to-root order, matching reset-tenant-data.js, so a partial failure
// never leaves orphaned "detail" records pointing at an already-deleted parent.
const DELETE_ORDER: DeletableEntityType[] = [
  'payment_approvals',
  'deposit_payouts',
  'penalties',
  'maintenance_expenses',
  'inspections',
  'complaints',
  'payment_schedules',
  'leases',
  'renters',
];

function expandEntityTypes(selected: DeletableEntityType[]): Set<DeletableEntityType> {
  const result = new Set<DeletableEntityType>(selected);
  const queue = [...selected];
  while (queue.length) {
    const current = queue.shift()!;
    for (const child of CASCADE_CHILDREN[current]) {
      if (!result.has(child)) {
        result.add(child);
        queue.push(child);
      }
    }
  }
  return result;
}

interface ResolvedDeleteTargets {
  docsByType: Partial<Record<DeletableEntityType, FirebaseFirestore.QueryDocumentSnapshot[]>>;
  notificationDocs: FirebaseFirestore.QueryDocumentSnapshot[];
  roomStatusHistoryDocs: FirebaseFirestore.QueryDocumentSnapshot[];
}

async function resolveDeleteTargets(
  db: FirebaseFirestore.Firestore,
  finalTypes: Set<DeletableEntityType>,
  facilityIds: string[] | undefined,
  sweepExtras: SweepExtraType[]
): Promise<ResolvedDeleteTargets> {
  const hasScope = !!facilityIds && facilityIds.length > 0;
  const docsByType: Partial<Record<DeletableEntityType, FirebaseFirestore.QueryDocumentSnapshot[]>> = {};

  // Every collection here except `renters` carries a facilityId field directly,
  // so each can be resolved independently — no need to walk through leases.
  for (const type of finalTypes) {
    if (type === 'renters') continue;
    docsByType[type] = hasScope
      ? await queryByFieldIn(db, COLLECTION_NAME[type], 'facilityId', facilityIds!)
      : await getAllDocs(db, COLLECTION_NAME[type]);
  }

  if (finalTypes.has('renters')) {
    if (hasScope) {
      // renters carry no facilityId — derive the target set from the
      // already-resolved (facility-scoped) leases. Known limitation: an
      // "orphan" renter with no lease at all in this facility won't be
      // caught by a facility-scoped delete (only an unscoped "all" run
      // reaches every renter, including orphans).
      const leaseDocs = docsByType.leases ?? [];
      const renterIds = Array.from(new Set(leaseDocs.map((d) => d.data().renterId as string)));
      docsByType.renters = await queryDocsByIdIn(db, 'renters', renterIds);
    } else {
      docsByType.renters = await getAllDocs(db, 'renters');
    }
  }

  let notificationDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  let roomStatusHistoryDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

  if (sweepExtras.includes('notifications')) {
    // notifications.relatedId is polymorphic (lease/room/schedule id depending
    // on type) with no reliable facility scope, so sweeping is always
    // system-wide regardless of `facilityIds`.
    notificationDocs = await getAllDocs(db, 'notifications');
  }
  if (sweepExtras.includes('roomStatusHistory')) {
    if (hasScope) {
      const roomDocs = await queryByFieldIn(db, 'rooms', 'facilityId', facilityIds!);
      roomStatusHistoryDocs = await queryByFieldIn(
        db,
        'roomStatusHistory',
        'roomId',
        roomDocs.map((d) => d.id)
      );
    } else {
      roomStatusHistoryDocs = await getAllDocs(db, 'roomStatusHistory');
    }
  }

  return { docsByType, notificationDocs, roomStatusHistoryDocs };
}

interface BulkDeleteRequest {
  dryRun: boolean;
  scope?: { facilityIds?: string[] };
  entityTypes: string[];
  sweepExtras?: string[];
}

interface BulkDeleteResult {
  dryRun: boolean;
  counts: Record<string, number>;
  storageFilesCount: number;
  roomsResetCount: number;
  backupPath?: string;
  errors: Array<{ collection: string; message: string }>;
}

export const bulkDeleteTenantData = onCall(async (request) => {
  await requireSystemAdmin(request.auth);

  const data = request.data as BulkDeleteRequest;
  if (!data || typeof data.dryRun !== 'boolean' || !Array.isArray(data.entityTypes)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'dryRun (boolean) and entityTypes (array) are required.'
    );
  }
  const validTypes = new Set(Object.keys(COLLECTION_NAME));
  for (const t of data.entityTypes) {
    if (!validTypes.has(t)) {
      throw new functions.https.HttpsError('invalid-argument', `Unknown entity type: ${t}`);
    }
  }
  const validSweeps = new Set<SweepExtraType>(['notifications', 'roomStatusHistory']);
  const sweepExtras = (data.sweepExtras ?? []).filter((s): s is SweepExtraType =>
    validSweeps.has(s as SweepExtraType)
  );
  const facilityIds = data.scope?.facilityIds?.filter(Boolean);

  const db = admin.firestore();
  const finalTypes = expandEntityTypes(data.entityTypes as DeletableEntityType[]);
  const { docsByType, notificationDocs, roomStatusHistoryDocs } = await resolveDeleteTargets(
    db,
    finalTypes,
    facilityIds,
    sweepExtras
  );

  const counts: Record<string, number> = {};
  for (const type of DELETE_ORDER) counts[type] = docsByType[type]?.length ?? 0;
  if (sweepExtras.includes('notifications')) counts.notifications = notificationDocs.length;
  if (sweepExtras.includes('roomStatusHistory')) counts.roomStatusHistory = roomStatusHistoryDocs.length;

  // A deleted lease shouldn't leave its room stuck showing `occupied` — mirror
  // src/services/leaseTerminationService.ts's real termination flow, which sets
  // the room straight to 'available' (this codebase never actually implements
  // the 'locked' pending-payout stage CLAUDE.md describes). Only rooms currently
  // `occupied` are touched — `maintenance`/`unavailable`/`locked` rooms are left
  // alone since those states can be unrelated to the specific lease being deleted
  // (e.g. staff-flagged maintenance, or an overdue-rent auto-lock).
  const leaseDocsForRoomReset = docsByType.leases ?? [];
  const roomIdsForReset = Array.from(new Set(leaseDocsForRoomReset.map((d) => d.data().roomId as string)));
  const roomDocsForReset = await queryDocsByIdIn(db, 'rooms', roomIdsForReset);
  const occupiedRoomDocsForReset = roomDocsForReset.filter((d) => d.data().status === 'occupied');

  if (data.dryRun) {
    const result: BulkDeleteResult = {
      dryRun: true,
      counts,
      storageFilesCount: 0,
      roomsResetCount: occupiedRoomDocsForReset.length,
      errors: [],
    };
    return result;
  }

  // ── Real run ──
  const bucket = admin.storage().bucket();
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${request.auth!.uid.slice(0, 8)}`;

  try {
    for (const type of DELETE_ORDER) {
      const docs = docsByType[type];
      if (docs?.length) await backupDocs(bucket, runId, type, docs);
    }
    if (notificationDocs.length) await backupDocs(bucket, runId, 'notifications', notificationDocs);
    if (roomStatusHistoryDocs.length) await backupDocs(bucket, runId, 'roomStatusHistory', roomStatusHistoryDocs);
  } catch (err) {
    throw new functions.https.HttpsError(
      'aborted',
      `Backup failed, no data was deleted: ${(err as Error).message}`
    );
  }

  const errors: Array<{ collection: string; message: string }> = [];
  for (const type of DELETE_ORDER) {
    const docs = docsByType[type];
    if (!docs?.length) continue;
    try {
      await chunkedDelete(db, docs);
    } catch (err) {
      errors.push({ collection: type, message: (err as Error).message });
    }
  }
  if (sweepExtras.includes('notifications') && notificationDocs.length) {
    try {
      await chunkedDelete(db, notificationDocs);
    } catch (err) {
      errors.push({ collection: 'notifications', message: (err as Error).message });
    }
  }
  if (sweepExtras.includes('roomStatusHistory') && roomStatusHistoryDocs.length) {
    try {
      await chunkedDelete(db, roomStatusHistoryDocs);
    } catch (err) {
      errors.push({ collection: 'roomStatusHistory', message: (err as Error).message });
    }
  }

  // Facilities are never touched by this tool.
  let storageFilesCount = 0;
  const leaseDocs = docsByType.leases ?? [];
  for (const leaseDoc of leaseDocs) {
    try {
      storageFilesCount += await deleteStoragePrefix(bucket, `leases/${leaseDoc.id}/`);
      storageFilesCount += await deleteStoragePrefix(bucket, `inspections/${leaseDoc.id}/`);
    } catch (err) {
      errors.push({
        collection: 'storage',
        message: `Failed cleaning Storage for lease ${leaseDoc.id}: ${(err as Error).message}`,
      });
    }
  }

  if (occupiedRoomDocsForReset.length) {
    try {
      const nowTs = admin.firestore.Timestamp.now();
      for (const group of chunk(occupiedRoomDocsForReset, DELETE_CHUNK_SIZE)) {
        const roomBatch = db.batch();
        for (const roomDoc of group) {
          roomBatch.update(roomDoc.ref, { status: 'available', updatedAt: nowTs });
        }
        await roomBatch.commit();
      }
    } catch (err) {
      errors.push({ collection: 'rooms', message: `Failed resetting room statuses: ${(err as Error).message}` });
    }
  }

  const result: BulkDeleteResult = {
    dryRun: false,
    counts,
    storageFilesCount,
    roomsResetCount: occupiedRoomDocsForReset.length,
    backupPath: `gs://${bucket.name}/bulk-data-backups/${runId}/`,
    errors,
  };
  return result;
});

// ─── bulkCreatePlaceholderRenters ───────────────────────────────────────────
//
// Fabricates clearly-flagged placeholder Renter records (and optionally a
// draft Lease + PaymentSchedule) for vacant rooms, so staff aren't blocked
// from progressing a room's lifecycle just because real tenant info hasn't
// been captured yet. Every placeholder is greppable via the `PLACEHOLDER-`
// idNumber prefix, the `.invalid` email TLD, and an explicit `notes` marker.

const VACANT_ROOM_STATUSES = new Set(['available', 'empty']);
// Up to 4 writes per room (renter+lease+schedule+room status) kept under the 400-op batch cap.
const CREATE_CHUNK_ROOMS = 100;

// Ported from src/components/forms/NewRentalWizard.tsx's parseDateLocal — duplicated,
// not imported, since functions/ is a separate TS build from the Vite frontend (same
// convention already used by buildPlaceholderPaymentSchedule vs. generatePaymentSchedule).
// Parses a "YYYY-MM-DD" string using its numeric components (not `new Date(dateString)`,
// which parses as UTC midnight and can shift a day backward once rendered in a local
// timezone); noon avoids DST edge cases.
function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

interface PlaceholderRoom {
  id: string;
  facilityId: string;
  roomNumber: string;
  monthlyRent: number;
  depositAmount: number;
  businessRules: {
    usesFacilityDefaults: boolean;
    lateFeeAmount: number;
    lateFeeStartDay: number;
    childSurcharge: number;
    gracePeriodDays: number;
    paymentMethods: string[];
  };
}

interface PlaceholderFacility {
  id: string;
  name: string;
  address: string;
  defaultBusinessRules: {
    lateFeeAmount: number;
    lateFeeStartDay: number;
    childSurcharge: number;
    gracePeriodDays: number;
    paymentMethods: string[];
  };
}

// Short, human-readable facility code for placeholder IDs/emails (e.g. "RBR
// Durban Central" -> "RBR") — avoids embedding raw Firestore doc IDs, which
// are long and unreadable wherever idNumber/email get displayed in the UI.
function facilityCode(facility: PlaceholderFacility): string {
  const code = (facility.name.split(/\s+/)[0] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code || 'FAC';
}

function roomSlug(roomNumber: string): string {
  return roomNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function buildPlaceholderRenter(room: PlaceholderRoom, facility: PlaceholderFacility) {
  const code = facilityCode(facility);
  return {
    personalInfo: {
      firstName: 'Placeholder',
      lastName: `Room ${room.roomNumber}`,
      idNumber: `PLACEHOLDER-${code}-${room.roomNumber}`,
      dateOfBirth: null,
      phone: '0000000000',
      email: `placeholder+${code.toLowerCase()}-${roomSlug(room.roomNumber)}@rentdesk.invalid`,
      emergencyContact: { name: 'N/A - Placeholder', phone: '0000000000', relationship: 'N/A' },
    },
    address: {
      street: 'N/A - Placeholder',
      city: facility.address || 'N/A',
      province: 'N/A',
      postalCode: '0000',
    },
    employment: { employer: 'N/A - Placeholder', position: 'N/A', monthlyIncome: 0 },
    bankDetails: {
      accountHolder: 'N/A - Placeholder',
      bankName: 'N/A',
      accountNumber: '0000000000',
      branchCode: '000000',
    },
    documents: {},
    status: 'active' as const,
    notes: `[AUTO-GENERATED PLACEHOLDER — created by Bulk Data Operations on ${new Date().toISOString()}. Replace with real tenant info before move-in.]`,
  };
}

function buildPlaceholderLease(
  room: PlaceholderRoom,
  facility: PlaceholderFacility,
  renterId: string,
  startDate: FirebaseFirestore.Timestamp,
  endDate: FirebaseFirestore.Timestamp
) {
  const businessRules = room.businessRules?.usesFacilityDefaults
    ? facility.defaultBusinessRules
    : room.businessRules;

  return {
    facilityId: room.facilityId,
    roomId: room.id,
    renterId,
    terms: {
      startDate,
      endDate,
      monthlyRent: room.monthlyRent,
      depositAmount: room.depositAmount,
      depositPaid: false, // no real payment occurred for a placeholder lease
    },
    businessRules,
    additionalTerms: '[AUTO-GENERATED PLACEHOLDER LEASE — replace with real lease terms before move-in.]',
    // Full parity with a real lease created via NewRentalWizard.tsx (which always
    // hardcodes 'active'): staff need to capture real payments against this lease
    // straight away, and leaseService.getLeaseByRoom() only ever finds leases with
    // status == 'active' — a 'pending' lease is invisible to the Rooms page's
    // "Payment Status" column and "Capture Payment" action. Trade-off, accepted by
    // product decision: checkOverdueRoomsAutoLock (index.ts) can now auto-lock this
    // room if the current month's rent is still unpaid past the grace period,
    // exactly like it would for a real tenant — expected, not a bug.
    status: 'active' as const,
  };
}

interface PlaceholderLeaseData {
  id: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  terms: { startDate: FirebaseFirestore.Timestamp; endDate: FirebaseFirestore.Timestamp; monthlyRent: number; depositAmount: number };
}

// Intentionally simplified vs. src/services/firebaseService.ts's
// generatePaymentSchedule (no proration): flat monthly amounts are good
// enough for a draft lease that staff will replace via the normal New
// Rental Agreement wizard before move-in, and it avoids porting the
// proration utils across the Functions/Vite build boundary.
function buildPlaceholderPaymentSchedule(lease: PlaceholderLeaseData) {
  const startDate = lease.terms.startDate.toDate();
  const endDate = lease.terms.endDate.toDate();

  const payments: Array<Record<string, unknown>> = [];
  let totalAmount = 0;

  payments.push({
    month: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-deposit`,
    dueDate: admin.firestore.Timestamp.fromDate(startDate),
    amount: lease.terms.depositAmount,
    type: 'deposit' as const,
    status: 'pending' as const,
  });
  totalAmount += lease.terms.depositAmount;

  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    payments.push({
      month: `${year}-${String(month).padStart(2, '0')}`,
      dueDate: admin.firestore.Timestamp.fromDate(new Date(year, month, 0)), // last day of month
      amount: lease.terms.monthlyRent,
      type: 'rent' as const,
      status: 'pending' as const,
    });
    totalAmount += lease.terms.monthlyRent;
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return {
    leaseId: lease.id,
    facilityId: lease.facilityId,
    roomId: lease.roomId,
    renterId: lease.renterId,
    paymentDueDateSetting: 'last_day' as const,
    payments,
    totalAmount,
    totalPaid: 0,
    outstandingAmount: totalAmount,
  };
}

interface BulkCreateRequest {
  dryRun: boolean;
  roomIds: string[]; // explicit opt-in set chosen by the admin in the wizard
  createLeaseAndSchedule: boolean;
  leaseStartDate?: string; // "YYYY-MM-DD", required iff createLeaseAndSchedule
  leaseEndDate?: string; // "YYYY-MM-DD", required iff createLeaseAndSchedule
}

interface BulkCreateResult {
  dryRun: boolean;
  requestedRoomsCount: number;
  targetedRoomsCount: number;
  skippedNotVacantCount: number; // room exists but is no longer vacant (defensive re-check)
  skippedNotFoundCount: number; // room id no longer exists
  createdRenterIds: string[];
  createdLeaseIds: string[];
  createdScheduleIds: string[];
  errors: Array<{ roomId: string; message: string }>;
}

export const bulkCreatePlaceholderRenters = onCall(async (request) => {
  await requireSystemAdmin(request.auth);

  const data = request.data as BulkCreateRequest;
  if (
    !data ||
    typeof data.dryRun !== 'boolean' ||
    typeof data.createLeaseAndSchedule !== 'boolean' ||
    !Array.isArray(data.roomIds) ||
    data.roomIds.length === 0
  ) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'dryRun, createLeaseAndSchedule (booleans), and a non-empty roomIds array are required.'
    );
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  let startTs: FirebaseFirestore.Timestamp | undefined;
  let endTs: FirebaseFirestore.Timestamp | undefined;
  if (data.createLeaseAndSchedule) {
    if (!data.leaseStartDate || !DATE_RE.test(data.leaseStartDate) || !data.leaseEndDate || !DATE_RE.test(data.leaseEndDate)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'leaseStartDate and leaseEndDate ("YYYY-MM-DD") are required when createLeaseAndSchedule is true.'
      );
    }
    const startDate = parseDateLocal(data.leaseStartDate);
    const endDate = parseDateLocal(data.leaseEndDate);
    if (endDate <= startDate) {
      throw new functions.https.HttpsError('invalid-argument', 'leaseEndDate must be after leaseStartDate.');
    }
    startTs = admin.firestore.Timestamp.fromDate(startDate);
    endTs = admin.firestore.Timestamp.fromDate(endDate);
  }

  const db = admin.firestore();
  const requestedRoomIds = Array.from(new Set(data.roomIds.filter(Boolean)));

  const roomDocs = await queryDocsByIdIn(db, 'rooms', requestedRoomIds);
  const skippedNotFoundCount = requestedRoomIds.length - roomDocs.length;

  let skippedNotVacantCount = 0;
  const targetRoomDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  for (const roomDoc of roomDocs) {
    if (VACANT_ROOM_STATUSES.has(roomDoc.data().status)) {
      targetRoomDocs.push(roomDoc);
    } else {
      skippedNotVacantCount++;
    }
  }

  const facilityIds = Array.from(new Set(targetRoomDocs.map((d) => d.data().facilityId as string)));
  const facilityDocs = await queryDocsByIdIn(db, 'facilities', facilityIds);
  const facilitiesById = new Map<string, PlaceholderFacility>(
    facilityDocs.map((d) => [d.id, { id: d.id, ...(d.data() as Omit<PlaceholderFacility, 'id'>) }])
  );

  if (data.dryRun) {
    const result: BulkCreateResult = {
      dryRun: true,
      requestedRoomsCount: requestedRoomIds.length,
      targetedRoomsCount: targetRoomDocs.length,
      skippedNotVacantCount,
      skippedNotFoundCount,
      createdRenterIds: [],
      createdLeaseIds: [],
      createdScheduleIds: [],
      errors: [],
    };
    return result;
  }

  const createdRenterIds: string[] = [];
  const createdLeaseIds: string[] = [];
  const createdScheduleIds: string[] = [];
  const errors: Array<{ roomId: string; message: string }> = [];

  for (const group of chunk(targetRoomDocs, CREATE_CHUNK_ROOMS)) {
    const batch = db.batch();
    for (const roomDoc of group) {
      try {
        const room: PlaceholderRoom = { id: roomDoc.id, ...(roomDoc.data() as Omit<PlaceholderRoom, 'id'>) };
        const facility = facilitiesById.get(room.facilityId);
        if (!facility) throw new Error(`Facility ${room.facilityId} not found for room ${room.id}`);

        const now = admin.firestore.Timestamp.now();
        const renterRef = db.collection('renters').doc();
        batch.set(renterRef, { ...buildPlaceholderRenter(room, facility), createdAt: now, updatedAt: now });
        createdRenterIds.push(renterRef.id);

        if (data.createLeaseAndSchedule) {
          const leaseRef = db.collection('leases').doc();
          const leaseData = buildPlaceholderLease(room, facility, renterRef.id, startTs!, endTs!);
          batch.set(leaseRef, { ...leaseData, createdAt: now, updatedAt: now });
          createdLeaseIds.push(leaseRef.id);

          const scheduleRef = db.collection('payment_schedules').doc();
          const scheduleData = buildPlaceholderPaymentSchedule({ ...leaseData, id: leaseRef.id });
          batch.set(scheduleRef, { ...scheduleData, createdAt: now, updatedAt: now });
          createdScheduleIds.push(scheduleRef.id);

          // Mirror NewRentalWizard.tsx's real-lease flow, which flips the room
          // to 'occupied' immediately on lease creation (not gated on payment).
          batch.update(roomDoc.ref, { status: 'occupied', updatedAt: now });
        }
      } catch (err) {
        errors.push({ roomId: roomDoc.id, message: (err as Error).message });
      }
    }
    await batch.commit();
  }

  const result: BulkCreateResult = {
    dryRun: false,
    requestedRoomsCount: requestedRoomIds.length,
    targetedRoomsCount: targetRoomDocs.length,
    skippedNotVacantCount,
    skippedNotFoundCount,
    createdRenterIds,
    createdLeaseIds,
    createdScheduleIds,
    errors,
  };
  return result;
});
