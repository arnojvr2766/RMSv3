# RentDesk Data Import — Internal Guide

> For RentDesk onboarding staff only. Do not share with clients.

---

## Overview — Import Order & Relationships

Data must be imported in this exact order because each step depends on IDs created by the previous step:

```
1. Facilities          →  generates facilityId
2. Rooms               →  requires facilityId          →  generates roomId
3. Renters             →  standalone                   →  generates renterId
4. Leases              →  requires facilityId + roomId + renterId  →  generates leaseId
5. Payment Schedules   →  requires leaseId
6. Payment History     →  requires leaseId + scheduleId
7. Penalties           →  requires leaseId + renterId
8. Deposit Payouts     →  requires leaseId + renterId
```

**Never skip steps or import out of order.** A lease without a valid roomId will break the room status, payment lookups, and reports.

---

## Tools Required

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Project access: `firebase login` then confirm `firebase use rmsv3-becf7`
- The import script: `scripts/import-takeon.js` (see below)
- xlsx package: `npm install xlsx` in scripts folder

---

## Step 0 — Validate the Client's Excel File

Before running any import, open the Excel file and check:

**Facilities sheet:**
- [ ] No blank facility names
- [ ] No duplicate facility names

**Rooms sheet:**
- [ ] Every `facility_name` value exists in the Facilities sheet (exact match, case-sensitive)
- [ ] No duplicate `room_number` within the same facility
- [ ] `monthly_rent` and `deposit_amount` are numbers (not text)
- [ ] `room_type` is one of: `single`, `double`, `family`, `studio`

**Renters sheet:**
- [ ] No duplicate `email` values
- [ ] `status` is `active` or `inactive` (not blank)

**Leases sheet:**
- [ ] Every `facility_name` matches Facilities
- [ ] Every `room_number` matches Rooms within that facility
- [ ] Every `renter_email` matches Renters
- [ ] Dates are in YYYY-MM-DD format
- [ ] `status` is `active`, `terminated`, or `expired`
- [ ] `termination_date` is present for all rows where `status` is `terminated`

**Payments sheet:**
- [ ] Every row links to an existing facility + room + renter combination
- [ ] `payment_month` is in YYYY-MM format
- [ ] `amount_paid` is a number

Fix all issues in the Excel before importing. Do not try to work around bad data programmatically.

---

## Step 1 — Prepare the Import Script

Create the file `scripts/import-takeon.js`:

```javascript
/**
 * RentDesk Data Takeover Import Script
 *
 * Usage:
 *   node scripts/import-takeon.js path/to/client-data.xlsx
 *
 * Requires: npm install xlsx firebase-admin
 */

const XLSX = require('xlsx');
const admin = require('firebase-admin');
const path = require('path');

// ── Init Firebase Admin ──────────────────────────────────────────────────────
// Download your service account key from Firebase Console → Project Settings → Service accounts
// Save it as scripts/serviceAccountKey.json (NEVER commit this file)
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDate(value) {
  if (!value) return null;
  // Handle Excel date serial numbers
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return new Date(date.y, date.m - 1, date.d);
  }
  // Handle string YYYY-MM-DD
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(value);
  }
  return null;
}

function toTimestamp(value) {
  const d = toDate(value);
  return d ? admin.firestore.Timestamp.fromDate(d) : null;
}

function clean(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') return value.trim();
  return value;
}

function required(row, field, rowNum, sheetName) {
  const val = clean(row[field]);
  if (!val && val !== 0) {
    throw new Error(`[${sheetName}] Row ${rowNum}: missing required field "${field}"`);
  }
  return val;
}

// ── Main Import ───────────────────────────────────────────────────────────────

async function runImport(filePath) {
  console.log(`\n📂 Reading: ${filePath}\n`);
  const workbook = XLSX.readFile(filePath);

  // Maps to hold generated IDs for cross-referencing
  const facilityMap = new Map();  // facilityName → facilityId
  const roomMap = new Map();      // "facilityName::roomNumber" → roomId
  const renterMap = new Map();    // email → renterId
  const leaseMap = new Map();     // "facilityName::roomNumber::renterEmail" → leaseId

  // ── 1. Facilities ──────────────────────────────────────────────────────────
  console.log('── Step 1: Importing Facilities ──');
  const facilitiesSheet = workbook.Sheets['Facilities'] || workbook.Sheets['Sheet1'];
  const facilities = XLSX.utils.sheet_to_json(facilitiesSheet);

  for (let i = 0; i < facilities.length; i++) {
    const row = facilities[i];
    const rowNum = i + 2;

    const name = required(row, 'facility_name', rowNum, 'Facilities');
    const address = required(row, 'address', rowNum, 'Facilities');
    const phone = required(row, 'contact_phone', rowNum, 'Facilities');

    const data = {
      name,
      address,
      contactInfo: {
        phone: String(phone),
        email: clean(row['contact_email']) || '',
      },
      settings: {
        lateFeeAmount: Number(clean(row['late_fee_amount'])) || 0,
        lateFeeStartDay: Number(clean(row['late_fee_start_day'])) || 7,
        childSurcharge: Number(clean(row['child_surcharge'])) || 0,
        gracePeriodDays: Number(clean(row['grace_period_days'])) || 3,
        paymentMethods: ['cash', 'eft', 'mobile_money'],
      },
      billingEntity: clean(row['billing_entity']) || name,
      status: 'active',
      notes: clean(row['notes']) || '',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const ref = await db.collection('facilities').add(data);
    facilityMap.set(name, ref.id);
    console.log(`  ✅ Facility: ${name} → ${ref.id}`);
  }

  // ── 2. Rooms ───────────────────────────────────────────────────────────────
  console.log('\n── Step 2: Importing Rooms ──');
  const roomsSheet = workbook.Sheets['Rooms'] || workbook.Sheets['Sheet2'];
  const rooms = XLSX.utils.sheet_to_json(roomsSheet);

  for (let i = 0; i < rooms.length; i++) {
    const row = rooms[i];
    const rowNum = i + 2;

    const facilityName = required(row, 'facility_name', rowNum, 'Rooms');
    const facilityId = facilityMap.get(facilityName);
    if (!facilityId) throw new Error(`[Rooms] Row ${rowNum}: facility "${facilityName}" not found`);

    const roomNumber = String(required(row, 'room_number', rowNum, 'Rooms'));
    const monthlyRent = Number(required(row, 'monthly_rent', rowNum, 'Rooms'));
    const depositAmount = Number(required(row, 'deposit_amount', rowNum, 'Rooms'));

    const validTypes = ['single', 'double', 'family', 'studio'];
    const roomType = clean(row['room_type']) || 'single';
    if (!validTypes.includes(roomType)) {
      throw new Error(`[Rooms] Row ${rowNum}: invalid room_type "${roomType}". Must be one of: ${validTypes.join(', ')}`);
    }

    const validStatuses = ['available', 'occupied', 'maintenance', 'empty', 'locked'];
    const statusRaw = clean(row['status']) || 'available';
    const status = validStatuses.includes(statusRaw) ? statusRaw : 'available';

    const amenitiesRaw = clean(row['amenities']) || '';
    const amenities = amenitiesRaw ? amenitiesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    const data = {
      facilityId,
      roomNumber,
      type: roomType,
      capacity: Number(clean(row['capacity'])) || 1,
      monthlyRent,
      depositAmount,
      amenities,
      status,
      floor: clean(row['floor']) ? Number(clean(row['floor'])) : null,
      notes: clean(row['notes']) || '',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const ref = await db.collection('rooms').add(data);
    roomMap.set(`${facilityName}::${roomNumber}`, ref.id);
    console.log(`  ✅ Room: ${facilityName} / ${roomNumber} → ${ref.id}`);
  }

  // ── 3. Renters ─────────────────────────────────────────────────────────────
  console.log('\n── Step 3: Importing Renters ──');
  const rentersSheet = workbook.Sheets['Renters'] || workbook.Sheets['Sheet3'];
  const renters = XLSX.utils.sheet_to_json(rentersSheet);

  for (let i = 0; i < renters.length; i++) {
    const row = renters[i];
    const rowNum = i + 2;

    const firstName = required(row, 'first_name', rowNum, 'Renters');
    const lastName = required(row, 'last_name', rowNum, 'Renters');
    const email = required(row, 'email', rowNum, 'Renters').toLowerCase();
    const phone = String(required(row, 'phone', rowNum, 'Renters'));

    const validStatuses = ['active', 'inactive', 'blacklisted'];
    const statusRaw = clean(row['status']) || 'active';
    const status = validStatuses.includes(statusRaw) ? statusRaw : 'active';

    const data = {
      personalInfo: {
        firstName,
        lastName,
        email,
        phone,
        idNumber: clean(row['id_number']) || '',
        emergencyContact: {
          name: clean(row['emergency_contact_name']) || '',
          phone: clean(row['emergency_contact_phone']) || '',
          relationship: clean(row['emergency_contact_relationship']) || '',
        },
      },
      status,
      notes: clean(row['notes']) || '',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const ref = await db.collection('renters').add(data);
    renterMap.set(email, ref.id);
    console.log(`  ✅ Renter: ${firstName} ${lastName} (${email}) → ${ref.id}`);
  }

  // ── 4. Leases ──────────────────────────────────────────────────────────────
  console.log('\n── Step 4: Importing Leases ──');
  const leasesSheet = workbook.Sheets['Leases'] || workbook.Sheets['Sheet4'];
  const leases = XLSX.utils.sheet_to_json(leasesSheet);

  for (let i = 0; i < leases.length; i++) {
    const row = leases[i];
    const rowNum = i + 2;

    const facilityName = required(row, 'facility_name', rowNum, 'Leases');
    const roomNumber = String(required(row, 'room_number', rowNum, 'Leases'));
    const renterEmail = required(row, 'renter_email', rowNum, 'Leases').toLowerCase();

    const facilityId = facilityMap.get(facilityName);
    if (!facilityId) throw new Error(`[Leases] Row ${rowNum}: facility "${facilityName}" not found`);

    const roomId = roomMap.get(`${facilityName}::${roomNumber}`);
    if (!roomId) throw new Error(`[Leases] Row ${rowNum}: room "${roomNumber}" in facility "${facilityName}" not found`);

    const renterId = renterMap.get(renterEmail);
    if (!renterId) throw new Error(`[Leases] Row ${rowNum}: renter "${renterEmail}" not found`);

    const startDate = toTimestamp(row['start_date']);
    if (!startDate) throw new Error(`[Leases] Row ${rowNum}: invalid start_date`);

    const validStatuses = ['active', 'terminated', 'expired'];
    const status = clean(row['status']) || 'active';
    if (!validStatuses.includes(status)) {
      throw new Error(`[Leases] Row ${rowNum}: invalid status "${status}"`);
    }

    if (status === 'terminated' && !clean(row['termination_date'])) {
      throw new Error(`[Leases] Row ${rowNum}: terminated lease requires termination_date`);
    }

    const data = {
      facilityId,
      roomId,
      renterId,
      startDate,
      endDate: toTimestamp(row['end_date']) || null,
      monthlyRent: Number(required(row, 'monthly_rent', rowNum, 'Leases')),
      depositAmount: Number(required(row, 'deposit_amount', rowNum, 'Leases')),
      depositPaid: clean(row['deposit_paid']) === 'yes',
      paymentDueDay: Number(clean(row['payment_due_day'])) || 1,
      paymentFrequency: clean(row['payment_frequency']) || 'monthly',
      leaseType: clean(row['lease_type']) || 'monthly',
      status,
      terminationDate: toTimestamp(row['termination_date']) || null,
      terminationReason: clean(row['termination_reason']) || null,
      children: Number(clean(row['children'])) || 0,
      notes: clean(row['notes']) || '',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const ref = await db.collection('leases').add(data);
    const leaseKey = `${facilityName}::${roomNumber}::${renterEmail}`;
    leaseMap.set(leaseKey, ref.id);
    console.log(`  ✅ Lease: ${facilityName} / Room ${roomNumber} / ${renterEmail} → ${ref.id}`);

    // Update room status if this is an active lease
    if (status === 'active') {
      await db.collection('rooms').doc(roomId).update({ status: 'occupied', updatedAt: admin.firestore.Timestamp.now() });
    }
  }

  // ── 5. Payment History ────────────────────────────────────────────────────
  const paymentsSheet = workbook.Sheets['Payments'] || workbook.Sheets['Sheet5'];
  if (paymentsSheet) {
    console.log('\n── Step 5: Importing Payment History ──');
    const payments = XLSX.utils.sheet_to_json(paymentsSheet);

    // Batch writes for performance
    let batch = db.batch();
    let batchCount = 0;

    for (let i = 0; i < payments.length; i++) {
      const row = payments[i];
      const rowNum = i + 2;

      const facilityName = required(row, 'facility_name', rowNum, 'Payments');
      const roomNumber = String(required(row, 'room_number', rowNum, 'Payments'));
      const renterEmail = required(row, 'renter_email', rowNum, 'Payments').toLowerCase();

      const facilityId = facilityMap.get(facilityName);
      const roomId = roomMap.get(`${facilityName}::${roomNumber}`);
      const renterId = renterMap.get(renterEmail);
      const leaseId = leaseMap.get(`${facilityName}::${roomNumber}::${renterEmail}`);

      if (!facilityId || !roomId || !renterId) {
        console.warn(`  ⚠️  Payments Row ${rowNum}: skipped — missing facility/room/renter link`);
        continue;
      }

      const paymentDate = toTimestamp(row['payment_date']);
      if (!paymentDate) {
        console.warn(`  ⚠️  Payments Row ${rowNum}: skipped — invalid payment_date`);
        continue;
      }

      const validMethods = ['cash', 'eft', 'mobile_money', 'card'];
      const methodRaw = (clean(row['payment_method']) || 'cash').toLowerCase().replace(' ', '_');
      const method = validMethods.includes(methodRaw) ? methodRaw : 'cash';

      const paymentMonth = clean(row['payment_month']);
      if (!paymentMonth || !paymentMonth.match(/^\d{4}-\d{2}$/)) {
        console.warn(`  ⚠️  Payments Row ${rowNum}: skipped — invalid payment_month format (need YYYY-MM)`);
        continue;
      }

      const data = {
        facilityId,
        roomId,
        renterId,
        leaseId: leaseId || null,
        paymentDate,
        paymentMonth,
        amountPaid: Number(required(row, 'amount_paid', rowNum, 'Payments')),
        method,
        referenceNumber: clean(row['reference_number']) || '',
        status: clean(row['status']) || 'approved',
        notes: clean(row['notes']) || '',
        importedFromHistory: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      const ref = db.collection('payment_approvals').doc();
      batch.set(ref, data);
      batchCount++;

      // Firestore batch limit is 500
      if (batchCount === 499) {
        await batch.commit();
        console.log(`  ✅ Committed batch of 499 payments`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(`  ✅ Committed final batch of ${batchCount} payments`);
    }

    console.log(`  ✅ Payment history imported: ${payments.length} records`);
  }

  // ── 6. Penalties ─────────────────────────────────────────────────────────
  const penaltiesSheet = workbook.Sheets['Penalties'] || workbook.Sheets['Sheet7'];
  if (penaltiesSheet) {
    console.log('\n── Step 6: Importing Penalties ──');
    const penalties = XLSX.utils.sheet_to_json(penaltiesSheet);

    for (let i = 0; i < penalties.length; i++) {
      const row = penalties[i];
      const rowNum = i + 2;

      const facilityName = required(row, 'facility_name', rowNum, 'Penalties');
      const roomNumber = String(required(row, 'room_number', rowNum, 'Penalties'));
      const renterEmail = required(row, 'renter_email', rowNum, 'Penalties').toLowerCase();

      const facilityId = facilityMap.get(facilityName);
      const roomId = roomMap.get(`${facilityName}::${roomNumber}`);
      const renterId = renterMap.get(renterEmail);
      const leaseId = leaseMap.get(`${facilityName}::${roomNumber}::${renterEmail}`);

      if (!facilityId || !roomId || !renterId) {
        console.warn(`  ⚠️  Penalties Row ${rowNum}: skipped — missing link`);
        continue;
      }

      const validTypes = ['late_payment', 'damage', 'noise', 'other'];
      const typeRaw = (clean(row['type']) || 'other').toLowerCase().replace(' ', '_');
      const type = validTypes.includes(typeRaw) ? typeRaw : 'other';

      const validStatuses = ['paid', 'pending', 'waived'];
      const statusRaw = clean(row['status']) || 'paid';
      const status = validStatuses.includes(statusRaw) ? statusRaw : 'paid';

      const data = {
        facilityId,
        roomId,
        renterId,
        leaseId: leaseId || null,
        type,
        amount: Number(required(row, 'amount', rowNum, 'Penalties')),
        description: required(row, 'description', rowNum, 'Penalties'),
        penaltyDate: toTimestamp(row['penalty_date']) || admin.firestore.Timestamp.now(),
        status,
        importedFromHistory: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await db.collection('penalties').add(data);
      console.log(`  ✅ Penalty: ${facilityName} / ${roomNumber} / ${renterEmail} — ${type}`);
    }
  }

  // ── 7. Deposit Refunds ────────────────────────────────────────────────────
  const refundsSheet = workbook.Sheets['Deposit Refunds'] || workbook.Sheets['Sheet8'];
  if (refundsSheet) {
    console.log('\n── Step 7: Importing Deposit Refunds ──');
    const refunds = XLSX.utils.sheet_to_json(refundsSheet);

    for (let i = 0; i < refunds.length; i++) {
      const row = refunds[i];
      const rowNum = i + 2;

      const facilityName = required(row, 'facility_name', rowNum, 'Deposit Refunds');
      const roomNumber = String(required(row, 'room_number', rowNum, 'Deposit Refunds'));
      const renterEmail = required(row, 'renter_email', rowNum, 'Deposit Refunds').toLowerCase();

      const facilityId = facilityMap.get(facilityName);
      const roomId = roomMap.get(`${facilityName}::${roomNumber}`);
      const renterId = renterMap.get(renterEmail);
      const leaseId = leaseMap.get(`${facilityName}::${roomNumber}::${renterEmail}`);

      if (!facilityId || !roomId || !renterId) {
        console.warn(`  ⚠️  Deposit Refunds Row ${rowNum}: skipped — missing link`);
        continue;
      }

      const data = {
        facilityId,
        roomId,
        renterId,
        leaseId: leaseId || null,
        originalDeposit: Number(required(row, 'original_deposit', rowNum, 'Deposit Refunds')),
        deductions: {
          damages: Number(clean(row['deduction_damages'])) || 0,
          cleaning: Number(clean(row['deduction_cleaning'])) || 0,
          unpaidRent: Number(clean(row['deduction_unpaid_rent'])) || 0,
          other: Number(clean(row['deduction_other'])) || 0,
        },
        refundAmount: Number(required(row, 'refund_amount', rowNum, 'Deposit Refunds')),
        refundDate: toTimestamp(row['refund_date']) || null,
        status: 'paid',
        notes: clean(row['notes']) || '',
        importedFromHistory: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await db.collection('deposit_payouts').add(data);
      console.log(`  ✅ Deposit refund: ${facilityName} / ${roomNumber} / ${renterEmail}`);
    }
  }

  console.log('\n🎉 Import complete!\n');
  console.log(`Summary:`);
  console.log(`  Facilities: ${facilityMap.size}`);
  console.log(`  Rooms:      ${roomMap.size}`);
  console.log(`  Renters:    ${renterMap.size}`);
  console.log(`  Leases:     ${leaseMap.size}`);
}

// ── Run ───────────────────────────────────────────────────────────────────────
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/import-takeon.js path/to/data.xlsx');
  process.exit(1);
}

runImport(path.resolve(filePath)).catch(err => {
  console.error('\n❌ Import failed:', err.message);
  process.exit(1);
});
```

---

## Step 2 — Set Up the Script

```bash
# Install dependencies for the import script
cd scripts
npm init -y
npm install xlsx firebase-admin

# Download service account key from Firebase Console:
# Project Settings → Service accounts → Generate new private key
# Save it as: scripts/serviceAccountKey.json
# ⚠️  NEVER commit this file. Add it to .gitignore.
```

Make sure `scripts/serviceAccountKey.json` is in `.gitignore`:
```
scripts/serviceAccountKey.json
```

---

## Step 3 — Dry Run (Validation Only)

Before importing into production, run against a test/emulator environment first if possible. Alternatively, run the validation checks in Step 0 manually.

The script will throw a clear error and stop immediately at the first problem — it does not partially import.

---

## Step 4 — Run the Import

```bash
node scripts/import-takeon.js path/to/client-data.xlsx
```

Watch the output carefully. Every created record is logged with its Firestore ID. Warnings (`⚠️`) mean a row was skipped — review them after the run.

---

## Step 5 — Post-Import Verification

After the script completes, verify in the Firestore Console and in the RentDesk app:

**In Firestore Console:**
- [ ] `facilities` collection has the correct number of documents
- [ ] `rooms` collection — open a few and confirm `facilityId` is a valid Firestore ID
- [ ] `renters` collection — check `personalInfo` is nested correctly
- [ ] `leases` collection — check `facilityId`, `roomId`, `renterId` all exist and cross-reference correctly
- [ ] `payment_approvals` — sample a few and confirm `leaseId`, `renterId`, `roomId` all look correct

**In the RentDesk App (log in as admin):**
- [ ] Facilities page shows all imported facilities
- [ ] Rooms page shows rooms under the correct facility, with correct status
- [ ] Renters page shows all tenants
- [ ] Leases page shows active leases with correct renter and room
- [ ] Payments page shows historical payments
- [ ] Reports page shows income figures matching the client's expected numbers

---

## Rollback Plan

If something goes wrong and you need to start over:

```javascript
// scripts/rollback-takeon.js
// WARNING: This deletes ALL data in these collections.
// Only run this if the import failed and you need a clean slate.

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function deleteCollection(name) {
  const snapshot = await db.collection(name).get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Deleted ${snapshot.size} docs from ${name}`);
}

// Only deletes records with importedFromHistory: true to avoid deleting
// any manually entered records if a partial re-import is needed
async function rollbackImported(name) {
  const snapshot = await db.collection(name).where('importedFromHistory', '==', true).get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Rolled back ${snapshot.size} imported docs from ${name}`);
}

async function run() {
  // For a full reset (first import only):
  await deleteCollection('facilities');
  await deleteCollection('rooms');
  await deleteCollection('renters');
  await deleteCollection('leases');
  // For partial rollback of history only:
  await rollbackImported('payment_approvals');
  await rollbackImported('penalties');
  await rollbackImported('deposit_payouts');
}

run().then(() => console.log('Rollback complete'));
```

---

## Common Errors and Fixes

| Error | Cause | Fix |
|---|---|---|
| `facility "X" not found` | Room/Lease sheet has a facility name that doesn't match exactly | Check for trailing spaces, capitalisation differences |
| `room "X" in facility "Y" not found` | Room number doesn't match | Check room_number is a string, not a number — "101" vs 101 |
| `renter "x@y.com" not found` | Email doesn't match | Check for spaces, uppercase in email |
| `invalid start_date` | Date not in YYYY-MM-DD format | Fix client's Excel date formatting |
| `terminated lease requires termination_date` | Missing field | Add termination_date to all rows with status = terminated |
| `PERMISSION_DENIED` | Service account key wrong or project mismatch | Re-download key, confirm `firebase use rmsv3-becf7` |

---

## Notes for Large Datasets

- **Payment history > 5,000 rows:** The script already batches at 499 (Firestore limit is 500 per batch). No changes needed.
- **Multiple facilities > 10:** Import time is roughly 2–5 seconds per facility with all rooms. Normal.
- **Duplicate emails in Renters:** The script will create two renter records. Catch this in Step 0 validation.
