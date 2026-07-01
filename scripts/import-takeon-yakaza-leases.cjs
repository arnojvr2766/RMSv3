#!/usr/bin/env node
/**
 * RentDesk Data Take-on Import — Yakaza (RBR) client — Stage 2
 * ============================================================
 * Imports placeholder renters, lease agreements, payment schedules, and
 * penalties for the 509 rooms already loaded by `import-takeon-yakaza.cjs`.
 *
 * The client did NOT provide renter details so we create a placeholder renter
 * per lease, keyed by a temp email of the form `<facility>-<room>@temp.com`
 * (e.g. "A2-1@temp.com"). Every placeholder carries a top-level
 * `source: 'takeon-import-2026-04'` tag and a `notes` reminder so operators can
 * filter them later when real details come in.
 *
 * Agreed assumptions (client 2026-04):
 *   • Lease term: 2026-01-01 → 2026-12-31, monthly, fixed-term, due day 1.
 *   • deposit_amount blank in spreadsheet → 0. deposit_paid = yes.
 *   • Jan/Feb/Mar 2026 presumed paid in cash (paidDate = due date).
 *   • April 2026 paid in cash EXCEPT for the 13 rows in the outstanding table —
 *     those stay status='pending' so the app reports them as overdue.
 *   • Penalties are all 'late_payment' for paymentMonth '2026-04', status
 *     'applied', appliedDate 2026-04-15.
 *   • Lease businessRules.lateFeeAmount = 20 (every penalty amount is a
 *     multiple of 20 → R20/day rate).
 *
 * Idempotent — re-running only creates missing docs:
 *   - renters           by personalInfo.email
 *   - leases            by (facilityId, roomId)
 *   - payment_schedules by leaseId
 *   - penalties         by (leaseId, paymentMonth)
 *
 * Prereq: facilities + rooms already imported.
 *
 * Authentication (tried in order):
 *   1. --key /path/to/serviceAccountKey.json
 *   2. Firebase CLI stored credentials (~/.config/configstore/firebase-tools.json)
 *      — works automatically if you've run `firebase login`.
 *
 * Usage:
 *   node scripts/import-takeon-yakaza-leases.cjs --dry-run
 *   node scripts/import-takeon-yakaza-leases.cjs
 *
 * Flags:
 *   --project <id>       Firestore project id (default: rmsv3-becf7)
 *   --dry-run            Print planned writes, do not touch Firestore
 *   --key <path>         Path to service-account key JSON
 *   --only <stage>       Run only one stage: renters|leases|schedules|penalties
 */

const path = require('path');
const fs = require('fs');
const https = require('https');

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (n) => args.indexOf(n) >= 0;
const val = (n, def) => {
  const i = args.indexOf(n);
  return i < 0 || i + 1 >= args.length ? def : args[i + 1];
};

const PROJECT_ID = val('--project', 'rmsv3-becf7');
const DRY_RUN = flag('--dry-run');
const KEY_PATH = val('--key');
const ONLY = val('--only', null); // renters | leases | schedules | penalties

// ─── Auth / REST helpers ─────────────────────────────────────────────────────

const FIREBASE_CLI_CLIENT = {
  client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
  client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
};

function readFirebaseCliRefreshToken() {
  const cfg = path.join(process.env.HOME || '', '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(cfg)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(cfg, 'utf8'));
    return (parsed && parsed.tokens && parsed.tokens.refresh_token) || null;
  } catch {
    return null;
  }
}

function httpsRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      method,
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers,
    }, (res) => {
      let chunks = '';
      res.on('data', (d) => { chunks += d; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(chunks ? JSON.parse(chunks) : {}); }
          catch { resolve({ raw: chunks }); }
        } else {
          reject(new Error(`HTTP ${res.statusCode} ${method} ${url}: ${chunks}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

let cachedAccessToken = null;
let cachedAccessTokenExp = 0;

async function getAccessTokenFromServiceAccount(keyPath) {
  const crypto = require('crypto');
  const sa = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const toSign = `${b64(header)}.${b64(claim)}`;
  const sig = crypto.createSign('RSA-SHA256').update(toSign).sign(sa.private_key).toString('base64url');
  const jwt = `${toSign}.${sig}`;
  const body = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;
  const res = await httpsRequest('POST', 'https://oauth2.googleapis.com/token',
    { 'Content-Type': 'application/x-www-form-urlencoded' }, body);
  return { token: res.access_token, expiresAt: now + (res.expires_in || 3600) - 60 };
}

async function getAccessTokenFromRefreshToken(refreshToken) {
  const body = JSON.stringify({
    client_id: FIREBASE_CLI_CLIENT.client_id,
    client_secret: FIREBASE_CLI_CLIENT.client_secret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await httpsRequest('POST', 'https://oauth2.googleapis.com/token',
    { 'Content-Type': 'application/json' }, body);
  const now = Math.floor(Date.now() / 1000);
  return { token: res.access_token, expiresAt: now + (res.expires_in || 3600) - 60 };
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && now < cachedAccessTokenExp) return cachedAccessToken;

  let result;
  if (KEY_PATH) {
    const abs = path.resolve(KEY_PATH);
    if (!fs.existsSync(abs)) { console.error(`Key not found: ${abs}`); process.exit(1); }
    result = await getAccessTokenFromServiceAccount(abs);
    console.log(`(auth: service-account key)`);
  } else {
    const rt = readFirebaseCliRefreshToken();
    if (!rt) {
      console.error('No credentials. Run `firebase login` or pass --key.');
      process.exit(1);
    }
    result = await getAccessTokenFromRefreshToken(rt);
    console.log(`(auth: firebase-tools CLI credentials)`);
  }
  cachedAccessToken = result.token;
  cachedAccessTokenExp = result.expiresAt;
  return cachedAccessToken;
}

const BASE = () => `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function authHeaders() {
  const t = await getAccessToken();
  return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
}

function toFsValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsValue) } };
  if (typeof v === 'object') {
    const fields = {};
    Object.keys(v).forEach((k) => { fields[k] = toFsValue(v[k]); });
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

function toFsFields(obj) {
  const fields = {};
  Object.keys(obj).forEach((k) => { fields[k] = toFsValue(obj[k]); });
  return fields;
}

function fromFsValue(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFsValue);
  if ('mapValue' in v) {
    const o = {};
    Object.keys(v.mapValue.fields || {}).forEach((k) => { o[k] = fromFsValue(v.mapValue.fields[k]); });
    return o;
  }
  return null;
}

async function runQuery(structuredQuery) {
  const res = await httpsRequest('POST', `${BASE()}:runQuery`, await authHeaders(), { structuredQuery });
  if (!Array.isArray(res)) return [];
  return res
    .filter((r) => r.document)
    .map((r) => ({
      name: r.document.name,
      id: r.document.name.split('/').pop(),
      data: r.document.fields
        ? Object.fromEntries(Object.keys(r.document.fields).map((k) => [k, fromFsValue(r.document.fields[k])]))
        : {},
    }));
}

async function listCollection(collectionId, pageSize = 300) {
  // Paginate via pageToken.
  const docs = [];
  let pageToken = null;
  do {
    const qs = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) qs.set('pageToken', pageToken);
    const res = await httpsRequest(
      'GET',
      `${BASE()}/${collectionId}?${qs.toString()}`,
      await authHeaders(),
    );
    (res.documents || []).forEach((doc) => {
      docs.push({
        name: doc.name,
        id: doc.name.split('/').pop(),
        data: doc.fields
          ? Object.fromEntries(Object.keys(doc.fields).map((k) => [k, fromFsValue(doc.fields[k])]))
          : {},
      });
    });
    pageToken = res.nextPageToken || null;
  } while (pageToken);
  return docs;
}

async function createDocument(collectionId, obj) {
  const res = await httpsRequest('POST', `${BASE()}/${collectionId}`, await authHeaders(), {
    fields: toFsFields(obj),
  });
  return res.name.split('/').pop();
}

async function patchDocument(collectionId, docId, obj) {
  const mask = Object.keys(obj).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${BASE()}/${collectionId}/${docId}?${mask}`;
  await httpsRequest('PATCH', url, await authHeaders(), { fields: toFsFields(obj) });
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SOURCE_TAG = 'takeon-import-2026-04';
const LEASE_START = new Date(Date.UTC(2026, 0, 1));   // 2026-01-01
const LEASE_END = new Date(Date.UTC(2026, 11, 31));   // 2026-12-31
const APRIL_2026 = '2026-04';
const PENALTY_APPLIED_DATE = new Date(Date.UTC(2026, 3, 15)); // 2026-04-15

const LEASE_BUSINESS_RULES = {
  lateFeeAmount: 20,          // R20/day — matches penalty-amount pattern (all multiples of 20)
  lateFeeStartDay: 4,         // grace until 4th of the month
  childSurcharge: 10,         // R10 per child
  gracePeriodDays: 3,
  paymentMethods: ['cash', 'eft', 'mobile', 'card'],
};

// ─── Client data (from client spreadsheet 2026-04) ───────────────────────────
// Columns: facility  room  renter_email  start  end  rent  dep_amt  dep_paid  due_day  freq  type  status  term_date  term_reason  children
const LEASES_TSV = `
A2	1		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	2		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	terminated			0
A2	3		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	4		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	5		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	6		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	7		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	8		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	9		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	10		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	11		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	12		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	13		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	terminated			0
A2	14		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	15		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	16		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	17		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	18		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	19		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			2
A2	20		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	21		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	22		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	23		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	24		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	25		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	26		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	27		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	28		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	29		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
A2	30		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	1		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	2		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	3		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	4		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	5		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	6		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	7		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	8		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	9		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	10		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	11		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	12		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	13		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	14		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	15		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	16		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	17		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	18		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	19		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	20		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	21		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	22		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	23		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	24		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	25		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	26		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	27		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	28		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	29		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
B2	30		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	1		2026-01-01	2026-12-31	1500		yes	1	monthly	fixed-term	active			1
C2	2		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	3		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	4		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	5		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	6		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	7		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	8		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	9		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	10		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	11		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	12		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	13		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	14		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	15		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	16		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	17		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	18		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	19		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	20		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	21		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	22		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	23		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	24		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	25		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	26		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
C2	27		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	1		2026-01-01	2026-12-31	1500		yes	1	monthly	fixed-term	active			0
D2	2		2026-01-01	2026-12-31	1500		yes	1	monthly	fixed-term	active			2
D2	3		2026-01-01	2026-12-31	1500		yes	1	monthly	fixed-term	active			2
D2	4		2026-01-01	2026-12-31	1500		yes	1	monthly	fixed-term	active			0
D2	5		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	6		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	7		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	8		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	9		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	10		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	11		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	12		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	13		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	14		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	15		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	16		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	17		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	18		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	19		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	20		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
D2	21		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			1
D2	22		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	1		2026-01-01	2026-12-31	1500		yes	1	monthly	fixed-term	active			0
E2	2		2026-01-01	2026-12-31	1500		yes	1	monthly	fixed-term	active			2
E2	3		2026-01-01	2026-12-31	1500		yes	1	monthly	fixed-term	active			0
E2	4		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	5		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	6		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	7		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	8		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	9		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	10		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	11		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	12		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	13		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	14		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	15		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	16		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	17		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	18		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	19		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	20		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	21		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			2
E2	22		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			0
E2	23		2026-01-01	2026-12-31	900		yes	1	monthly	fixed-term	active			1
BR	1		2026-01-01	2026-12-31	1090		yes	1	monthly	fixed-term	active			0
BR	2		2026-01-01	2026-12-31	1590		yes	1	monthly	fixed-term	active			2
BR	3		2026-01-01	2026-12-31	1590		yes	1	monthly	fixed-term	active			1
BR	4		2026-01-01	2026-12-31	1590		yes	1	monthly	fixed-term	active			1
BR	5		2026-01-01	2026-12-31	1090		yes	1	monthly	fixed-term	active			1
BR	6		2026-01-01	2026-12-31	1090		yes	1	monthly	fixed-term	active			0
BR	7		2026-01-01	2026-12-31	1090		yes	1	monthly	fixed-term	active			0
BR	8		2026-01-01	2026-12-31	1590		yes	1	monthly	fixed-term	active			2
BR	9		2026-01-01	2026-12-31	1590		yes	1	monthly	fixed-term	active			1
BR	10		2026-01-01	2026-12-31	1590		yes	1	monthly	fixed-term	active			0
BR	11		2026-01-01	2026-12-31	1090		yes	1	monthly	fixed-term	active			0
BR	12		2026-01-01	2026-12-31	1090		yes	1	monthly	fixed-term	active			0
BR	13		2026-01-01	2026-12-31	780		yes	1	monthly	fixed-term	active			0
BR	14		2026-01-01	2026-12-31	780		yes	1	monthly	fixed-term	active			0
BR	15		2026-01-01	2026-12-31	780		yes	1	monthly	fixed-term	active			0
BR	16		2026-01-01	2026-12-31	780		yes	1	monthly	fixed-term	active			0
BR	17		2026-01-01	2026-12-31	780		yes	1	monthly	fixed-term	active			1
BR	18		2026-01-01	2026-12-31	780		yes	1	monthly	fixed-term	active			0
BR	19		2026-01-01	2026-12-31	780		yes	1	monthly	fixed-term	active			0
BR	20		2026-01-01	2026-12-31	780		yes	1	monthly	fixed-term	active			0
BR	21		2026-01-01	2026-12-31	780		yes	1	monthly	fixed-term	active			1
BR	22		2026-01-01	2026-12-31	780		yes	1	monthly	fixed-term	active			0
BR	23		2026-01-01	2026-12-31	780		yes	1	monthly	fixed-term	active			0
BR	24		2026-01-01	2026-12-31	780		yes	1	monthly	fixed-term	active			0
BR	25		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
BR	26		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
BR	27		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
BR	28		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
BR	29		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
BR	30		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
RB	1		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	2		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	3		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	4		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	5		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	6		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	7		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	8		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	9		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	10		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	11		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	12		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	13		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	14		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	15		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	16		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	17		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	18		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	19		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	20		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	21		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	22		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	23		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	24		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	25		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	26		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	27		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	28		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	29		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RB	30		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
RBR	1		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	2		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	3		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	4		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	5		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	6		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	7		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	8		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	9		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	10		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	11		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	12		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	13		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	14		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	15		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	16		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	17		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	18		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	19		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	20		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	21		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	22		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	23		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
RBR	24		2026-01-01	2026-12-31	1300		yes	1	monthly	fixed-term	active			0
MA	1		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	2		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	3		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	4		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	5		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	6		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	7		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	8		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	9		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	10		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	11		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	12		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	13		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	14		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	15		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	16		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	17		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	18		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	19		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	20		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	21		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	22		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	23		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	24		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	25		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	26		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	27		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	28		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	29		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	30		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	31		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	terminated			0
MA	32		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	33		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	34		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	35		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	36		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	37		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	38		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	39		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	40		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	41		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	42		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	43		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	44		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	45		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	46		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	47		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	48		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	49		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	50		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	51		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	52		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	53		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	54		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	55		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
MA	56		2026-01-01	2026-12-31	1650		yes	1	monthly	fixed-term	active			0
A	1		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	2		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	3		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	4		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	5		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	6		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	7		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	8		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	9		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	10		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	11		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	12		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	13		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	14		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	15		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
A	16		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	1		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	2		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	3		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	4		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	5		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	6		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	7		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	8		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	9		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	10		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	11		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	12		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	13		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	14		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	15		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	16		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	17		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
B	18		2026-01-01	2026-12-31	720		yes	1	monthly	fixed-term	active			0
C	1		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
C	2		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
C	3		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
C	4		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
C	5		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
C	6		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			1
C	7		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
C	8		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
C	9		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
D	1		2026-01-01	2026-12-31	800		yes	1	monthly	fixed-term	active			0
D	2		2026-01-01	2026-12-31	800		yes	1	monthly	fixed-term	active			1
D	3		2026-01-01	2026-12-31	800		yes	1	monthly	fixed-term	active			0
D	4		2026-01-01	2026-12-31	800		yes	1	monthly	fixed-term	active			0
D	5		2026-01-01	2026-12-31	800		yes	1	monthly	fixed-term	active			0
D	6		2026-01-01	2026-12-31	800		yes	1	monthly	fixed-term	active			0
D	7		2026-01-01	2026-12-31	800		yes	1	monthly	fixed-term	active			0
D	8		2026-01-01	2026-12-31	800		yes	1	monthly	fixed-term	active			0
D	9		2026-01-01	2026-12-31	800		yes	1	monthly	fixed-term	active			0
D	10		2026-01-01	2026-12-31	800		yes	1	monthly	fixed-term	active			0
E	1		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
E	2		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
E	3		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
E	4		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
E	5		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
E	6		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
E	7		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
E	8		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
E	9		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
E	10		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	1		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	2		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	3		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	4		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	5		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	6		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			2
F	7		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	8		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	9		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	10		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	11		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	12		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	13		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	14		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	15		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	16		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	17		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
F	18		2026-01-01	2026-12-31	750		yes	1	monthly	fixed-term	active			0
G	1		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	2		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	3		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	4		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	5		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	6		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	7		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	8		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	9		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	10		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	11		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	12		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	13		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	14		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	15		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	16		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	17		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	18		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	19		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	20		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	21		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	22		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	23		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	24		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	25		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	26		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	27		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	28		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	29		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	30		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	31		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
G	32		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	1		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	2		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	3		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	4		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	5		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	6		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			1
H	7		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	8		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	9		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	10		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	11		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	12		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			1
H	13		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	14		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	15		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	16		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	17		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	18		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	19		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	20		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	21		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	22		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	23		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	24		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	25		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	26		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	27		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	28		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	29		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	30		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	31		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
H	32		2026-01-01	2026-12-31	770		yes	1	monthly	fixed-term	active			0
I	1		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	2		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	3		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	4		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	5		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	6		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	7		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	8		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	9		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	10		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	11		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			1
I	12		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	13		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	14		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	15		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	16		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	17		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	18		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	19		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	20		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	21		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	22		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	23		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	24		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	25		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	26		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	27		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	28		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	29		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	30		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	31		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
I	32		2026-01-01	2026-12-31	850		yes	1	monthly	fixed-term	active			0
J	1		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	2		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	3		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	4		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			1
J	5		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	6		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	7		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	8		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			4
J	9		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	10		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	11		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			1
J	12		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	13		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			1
J	14		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	15		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	16		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	17		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	18		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	19		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	20		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			1
J	21		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	22		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	23		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	24		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	25		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	26		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
J	27		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			1
J	28		2026-01-01	2026-12-31	870		yes	1	monthly	fixed-term	active			0
K	1		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	2		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	3		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	terminated			0
K	4		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	5		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	6		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	7		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	8		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	9		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	10		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	11		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	12		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	13		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	14		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	terminated			0
K	15		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	16		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	17		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	18		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	19		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	20		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	21		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	22		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	23		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	24		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	25		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	26		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	27		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	28		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	29		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	30		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	31		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
K	32		2026-01-01	2026-12-31	830		yes	1	monthly	fixed-term	active			0
`.trim();

// Columns: facility  room  renter_email  outstanding_amount  months_overdue
const OUTSTANDING_TSV = `
B2	7		900	1
B2	11		900	
C2	17		900	
E2	22		900	
BR	30		720	
RBR	21		1300	
B	6		720	
E	9		750	
G	30		770	
I	2		850	
I	5		850	
I	14		850	
I	25		850	
`.trim();

// Columns: facility  room  renter_email  penalty_date  amount
const PENALTIES_TSV = `
A2	3		April 2026	20
A2	4		April 2026	20
A2	10		April 2026	20
A2	11		April 2026	20
A2	12		April 2026	60
A2	18		April 2026	20
A2	20		April 2026	40
A2	22		April 2026	20
A2	25		April 2026	60
A2	26		April 2026	20
B2	1		April 2026	20
B2	6		April 2026	20
B2	15		April 2026	160
B2	17		April 2026	60
B2	19		April 2026	60
B2	24		April 2026	20
B2	26		April 2026	20
B2	27		April 2026	20
C2	2		April 2026	60
C2	6		April 2026	100
C2	7		April 2026	20
C2	8		April 2026	120
C2	10		April 2026	20
C2	11		April 2026	20
C2	13		April 2026	140
C2	14		April 2026	60
C2	16		April 2026	100
C2	19		April 2026	20
C2	24		April 2026	140
C2	25		April 2026	20
C2	26		April 2026	120
C2	27		April 2026	20
D2	5		April 2026	60
D2	6		April 2026	20
D2	9		April 2026	100
D2	12		April 2026	20
D2	13		April 2026	60
D2	14		April 2026	60
D2	15		April 2026	60
D2	19		April 2026	40
D2	20		April 2026	140
D2	22		April 2026	60
E2	2		April 2026	100
E2	5		April 2026	140
E2	14		April 2026	40
E2	15		April 2026	160
E2	19		April 2026	20
E2	21		April 2026	120
E2	23		April 2026	20
BR	2		April 2026	100
BR	7		April 2026	20
BR	11		April 2026	60
BR	23		April 2026	40
BR	29		April 2026	20
RB	4		April 2026	20
RB	8		April 2026	20
RB	11		April 2026	20
RB	12		April 2026	20
RB	13		April 2026	20
RB	20		April 2026	20
RB	30		April 2026	20
RBR	2		April 2026	60
RBR	6		April 2026	20
RBR	15		April 2026	20
RBR	16		April 2026	120
RBR	20		April 2026	20
RBR	23		April 2026	100
MA	9		April 2026	20
MA	11		April 2026	20
MA	12		April 2026	20
MA	18		April 2026	20
MA	20		April 2026	20
MA	21		April 2026	100
MA	24		April 2026	40
MA	29		April 2026	100
MA	30		April 2026	20
MA	33		April 2026	140
MA	37		April 2026	20
MA	39		April 2026	20
MA	41		April 2026	40
MA	42		April 2026	120
MA	43		April 2026	40
MA	46		April 2026	20
MA	52		April 2026	20
A	1		April 2026	60
A	9		April 2026	20
B	1		April 2026	20
B	3		April 2026	140
B	4		April 2026	20
B	10		April 2026	20
B	12		April 2026	40
C	1		April 2026	20
C	3		April 2026	20
E	6		April 2026	20
F	8		April 2026	40
F	16		April 2026	20
G	2		April 2026	60
G	8		April 2026	20
G	9		April 2026	20
G	14		April 2026	60
G	19		April 2026	100
G	27		April 2026	20
G	28		April 2026	40
H	1		April 2026	20
H	3		April 2026	20
H	12		April 2026	120
H	19		April 2026	40
H	20		April 2026	40
H	28		April 2026	20
H	29		April 2026	100
H	31		April 2026	20
I	8		April 2026	120
I	9		April 2026	140
I	17		April 2026	60
I	20		April 2026	40
I	22		April 2026	140
I	26		April 2026	40
I	30		April 2026	20
I	31		April 2026	20
J	1		April 2026	100
J	3		April 2026	140
J	9		April 2026	60
J	12		April 2026	20
J	16		April 2026	140
J	26		April 2026	100
K	8		April 2026	100
K	16		April 2026	60
K	17		April 2026	20
K	18		April 2026	40
K	19		April 2026	20
K	20		April 2026	20
K	24		April 2026	40
K	31		April 2026	40
`.trim();

// ─── Parsing ─────────────────────────────────────────────────────────────────

function parseLeases() {
  return LEASES_TSV.split('\n').map((line, idx) => {
    const parts = line.split('\t');
    if (parts.length < 15) {
      throw new Error(`Lease line ${idx + 1}: expected 15 tab-separated fields, got ${parts.length}`);
    }
    const [facility, roomNumber, email, start, end, rent, depAmt, depPaid, dueDay, freq, leaseType, status, termDate, termReason, children] = parts.map((s) => s.trim());
    if (!['active', 'terminated', 'expired', 'pending'].includes(status)) {
      throw new Error(`Lease line ${idx + 1}: invalid status "${status}"`);
    }
    if (freq !== 'monthly') throw new Error(`Lease line ${idx + 1}: unsupported frequency "${freq}"`);
    if (!['monthly', 'fixed-term'].includes(leaseType)) {
      throw new Error(`Lease line ${idx + 1}: invalid lease type "${leaseType}"`);
    }
    return {
      facility,
      roomNumber: String(roomNumber),
      emailOverride: email || null,
      startDate: new Date(`${start}T00:00:00Z`),
      endDate: new Date(`${end}T00:00:00Z`),
      monthlyRent: Number(rent),
      depositAmount: depAmt === '' ? 0 : Number(depAmt),
      depositPaid: depPaid === 'yes',
      paymentDueDay: Number(dueDay),
      leaseType,
      status,
      terminationDate: termDate || null,
      terminationReason: termReason || null,
      childrenCount: children === '' ? 0 : Number(children),
    };
  });
}

function parseOutstanding() {
  return OUTSTANDING_TSV.split('\n').map((line, idx) => {
    // Client data often omits the trailing `months_overdue` cell — pad to 5 cols.
    const parts = line.split('\t');
    while (parts.length < 5) parts.push('');
    if (parts.length < 4) throw new Error(`Outstanding line ${idx + 1}: need at least 4 cols, got ${parts.length}`);
    const [facility, roomNumber, , amount, months] = parts.map((s) => s.trim());
    return {
      facility,
      roomNumber: String(roomNumber),
      outstandingAmount: Number(amount),
      monthsOverdue: months === '' ? 1 : Number(months),
    };
  });
}

function parsePenalties() {
  return PENALTIES_TSV.split('\n').map((line, idx) => {
    const parts = line.split('\t');
    if (parts.length < 5) throw new Error(`Penalty line ${idx + 1}: need 5 cols, got ${parts.length}`);
    const [facility, roomNumber, , penaltyDate, amount] = parts.map((s) => s.trim());
    if (penaltyDate !== 'April 2026') {
      throw new Error(`Penalty line ${idx + 1}: unexpected date "${penaltyDate}"`);
    }
    return {
      facility,
      roomNumber: String(roomNumber),
      paymentMonth: APRIL_2026,
      amount: Number(amount),
    };
  });
}

// ─── Idempotent upserts ──────────────────────────────────────────────────────

async function findRenterByEmail(email) {
  const res = await runQuery({
    from: [{ collectionId: 'renters' }],
    where: {
      fieldFilter: {
        field: { fieldPath: 'personalInfo.email' },
        op: 'EQUAL',
        value: { stringValue: email },
      },
    },
    limit: 1,
  });
  return res[0] || null;
}

async function findLeaseByRoom(facilityId, roomId) {
  const res = await runQuery({
    from: [{ collectionId: 'leases' }],
    where: {
      compositeFilter: {
        op: 'AND',
        filters: [
          { fieldFilter: { field: { fieldPath: 'facilityId' }, op: 'EQUAL', value: { stringValue: facilityId } } },
          { fieldFilter: { field: { fieldPath: 'roomId' }, op: 'EQUAL', value: { stringValue: roomId } } },
        ],
      },
    },
    limit: 1,
  });
  return res[0] || null;
}

async function findScheduleByLease(leaseId) {
  const res = await runQuery({
    from: [{ collectionId: 'payment_schedules' }],
    where: {
      fieldFilter: { field: { fieldPath: 'leaseId' }, op: 'EQUAL', value: { stringValue: leaseId } },
    },
    limit: 1,
  });
  return res[0] || null;
}

async function findPenalty(leaseId, paymentMonth) {
  const res = await runQuery({
    from: [{ collectionId: 'penalties' }],
    where: {
      compositeFilter: {
        op: 'AND',
        filters: [
          { fieldFilter: { field: { fieldPath: 'leaseId' }, op: 'EQUAL', value: { stringValue: leaseId } } },
          { fieldFilter: { field: { fieldPath: 'paymentMonth' }, op: 'EQUAL', value: { stringValue: paymentMonth } } },
        ],
      },
    },
    limit: 1,
  });
  return res[0] || null;
}

function buildRenterPayload(facility, roomNumber, email) {
  const now = new Date();
  return {
    personalInfo: {
      firstName: 'Renter',
      lastName: `${facility}-${roomNumber}`,
      idNumber: '',
      dateOfBirth: null,
      phone: '',
      email,
      emergencyContact: { name: '', phone: '', relationship: '' },
    },
    address: { street: '', city: '', province: '', postalCode: '' },
    employment: { employer: '', position: '', monthlyIncome: 0, workPhone: '' },
    bankDetails: { accountHolder: '', bankName: '', accountNumber: '', branchCode: '' },
    documents: {},
    status: 'active',
    notes: 'Placeholder — needs real details',
    source: SOURCE_TAG,
    createdAt: now,
    updatedAt: now,
  };
}

function buildLeasePayload({ facilityId, roomId, renterId, lease }) {
  const now = new Date();
  return {
    facilityId,
    roomId,
    renterId,
    childrenCount: lease.childrenCount,
    terms: {
      startDate: lease.startDate,
      endDate: lease.endDate,
      monthlyRent: lease.monthlyRent,
      depositAmount: lease.depositAmount,
      depositPaid: lease.depositPaid,
      // If deposit is paid, mark paid-date = start date (placeholder).
      depositPaidDate: lease.depositPaid ? lease.startDate : null,
    },
    businessRules: LEASE_BUSINESS_RULES,
    status: lease.status,
    source: SOURCE_TAG,
    createdAt: now,
    updatedAt: now,
  };
}

function buildSchedulePayments({ monthlyRent, depositAmount, depositPaid, startDate, aprilOverdue }) {
  const payments = [];

  // Deposit row
  const depositEntry = {
    month: `2026-01-deposit`,
    dueDate: startDate,
    amount: depositAmount,
    type: 'deposit',
    status: depositPaid ? 'paid' : 'pending',
  };
  if (depositPaid) {
    depositEntry.paidAmount = depositAmount;
    depositEntry.paidDate = startDate;
    depositEntry.paymentMethod = 'cash';
  }
  payments.push(depositEntry);

  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
    '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

  const paidMonths = new Set(['2026-01', '2026-02', '2026-03']);

  for (const m of months) {
    const [y, mm] = m.split('-').map(Number);
    const dueDate = new Date(Date.UTC(y, mm - 1, 1));
    const entry = {
      month: m,
      dueDate,
      amount: monthlyRent,
      type: 'rent',
    };

    const isApril = m === APRIL_2026;
    const paid = paidMonths.has(m) || (isApril && !aprilOverdue);

    if (paid) {
      entry.status = 'paid';
      entry.paidAmount = monthlyRent;
      entry.paidDate = dueDate;
      entry.paymentMethod = 'cash';
    } else {
      entry.status = 'pending';
    }
    payments.push(entry);
  }

  return payments;
}

function buildSchedulePayload({ leaseId, facilityId, roomId, renterId, lease, aprilOverdue }) {
  const now = new Date();
  return {
    leaseId,
    facilityId,
    roomId,
    renterId,
    paymentDueDateSetting: 'first_day',
    payments: buildSchedulePayments({
      monthlyRent: lease.monthlyRent,
      depositAmount: lease.depositAmount,
      depositPaid: lease.depositPaid,
      startDate: lease.startDate,
      aprilOverdue,
    }),
    source: SOURCE_TAG,
    createdAt: now,
    updatedAt: now,
  };
}

function buildPenaltyPayload({ leaseId, facilityId, roomId, renterId, paymentScheduleId, paymentMonth, amount }) {
  const now = new Date();
  return {
    leaseId,
    facilityId,
    roomId,
    renterId,
    paymentScheduleId,
    paymentMonth,
    originalDueDate: new Date(Date.UTC(2026, 3, 1)),  // 2026-04-01
    penaltyAmount: amount,
    penaltyType: 'late_payment',
    reason: `Late payment — ${paymentMonth} (imported from client 2026-04 take-on)`,
    status: 'applied',
    appliedDate: PENALTY_APPLIED_DATE,
    source: SOURCE_TAG,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nProject: ${PROJECT_ID}`);
  console.log(`Mode:    ${DRY_RUN ? 'DRY-RUN (no writes)' : 'LIVE WRITE'}`);
  console.log(`Stage:   ${ONLY || 'all (renters → leases → schedules → penalties)'}\n`);

  const leases = parseLeases();
  const outstanding = parseOutstanding();
  const penalties = parsePenalties();
  console.log(`Parsed ${leases.length} leases, ${outstanding.length} outstanding rows, ${penalties.length} penalties.\n`);

  if (!DRY_RUN) await getAccessToken();

  // Pre-fetch facilities + rooms so we can resolve by name/number.
  console.log('── Fetching facilities + rooms ──');
  const facilities = await listCollection('facilities');
  const facilityByName = new Map(facilities.map((f) => [f.data.name, f]));
  console.log(`  facilities: ${facilities.length}`);

  const rooms = await listCollection('rooms');
  // Map: `${facilityId}|${roomNumber}` → room
  const roomByKey = new Map(rooms.map((r) => [`${r.data.facilityId}|${r.data.roomNumber}`, r]));
  console.log(`  rooms:      ${rooms.length}\n`);

  // Resolve each lease → facilityId + roomId up front (fail fast on missing).
  const resolved = leases.map((lease) => {
    const fac = facilityByName.get(lease.facility);
    if (!fac) throw new Error(`Facility "${lease.facility}" not found — did you run import-takeon-yakaza.cjs?`);
    const room = roomByKey.get(`${fac.id}|${lease.roomNumber}`);
    if (!room) throw new Error(`Room ${lease.facility}/${lease.roomNumber} not found`);
    return { ...lease, facilityId: fac.id, roomId: room.id };
  });

  const outstandingSet = new Set(outstanding.map((o) => `${o.facility}|${o.roomNumber}`));

  // Storage so later stages can re-use ids without re-querying.
  const renterIdByEmail = new Map();
  const leaseIdByKey = new Map();     // `${facilityId}|${roomId}` → leaseId
  const scheduleIdByLease = new Map();

  // ── Stage: Renters ─────────────────────────────────────────────────────────
  if (!ONLY || ONLY === 'renters' || ONLY === 'leases' || ONLY === 'schedules' || ONLY === 'penalties') {
    console.log('── Stage 1: Renters ──');
    let created = 0, reused = 0, i = 0;
    for (const lease of resolved) {
      const email = lease.emailOverride || `${lease.facility}-${lease.roomNumber}@temp.com`;
      if (renterIdByEmail.has(email)) continue;

      if (DRY_RUN) {
        renterIdByEmail.set(email, `DRY_RENTER_${email}`);
        created++;
      } else {
        const existing = await findRenterByEmail(email);
        if (existing) {
          renterIdByEmail.set(email, existing.id);
          reused++;
        } else {
          const id = await createDocument('renters', buildRenterPayload(lease.facility, lease.roomNumber, email));
          renterIdByEmail.set(email, id);
          created++;
        }
      }
      i++;
      if (!DRY_RUN && i % 50 === 0) console.log(`  … ${i}/${resolved.length} renters`);
    }
    console.log(`  ${created} created, ${reused} already existed.\n`);
  }

  // ── Stage: Leases ──────────────────────────────────────────────────────────
  if (!ONLY || ONLY === 'leases' || ONLY === 'schedules' || ONLY === 'penalties') {
    console.log('── Stage 2: Leases ──');
    let created = 0, reused = 0, i = 0;
    for (const lease of resolved) {
      const email = lease.emailOverride || `${lease.facility}-${lease.roomNumber}@temp.com`;
      const renterId = renterIdByEmail.get(email);

      if (!renterId && !DRY_RUN) {
        // Happens only if --only=leases was used and renter doesn't exist yet.
        const r = await findRenterByEmail(email);
        if (!r) throw new Error(`Renter missing for ${email}. Run stage 'renters' first.`);
        renterIdByEmail.set(email, r.id);
      }
      const effectiveRenterId = renterIdByEmail.get(email) || `DRY_RENTER_${email}`;

      const key = `${lease.facilityId}|${lease.roomId}`;
      if (DRY_RUN) {
        leaseIdByKey.set(key, `DRY_LEASE_${lease.facility}_${lease.roomNumber}`);
        created++;
      } else {
        const existing = await findLeaseByRoom(lease.facilityId, lease.roomId);
        if (existing) {
          leaseIdByKey.set(key, existing.id);
          reused++;
        } else {
          const id = await createDocument(
            'leases',
            buildLeasePayload({
              facilityId: lease.facilityId,
              roomId: lease.roomId,
              renterId: effectiveRenterId,
              lease,
            }),
          );
          leaseIdByKey.set(key, id);
          created++;
        }
      }
      i++;
      if (!DRY_RUN && i % 50 === 0) console.log(`  … ${i}/${resolved.length} leases`);
    }
    console.log(`  ${created} created, ${reused} already existed.\n`);
  }

  // ── Stage: Payment Schedules (active leases only) ──────────────────────────
  if (!ONLY || ONLY === 'schedules' || ONLY === 'penalties') {
    console.log('── Stage 3: Payment schedules (active leases only) ──');
    let created = 0, reused = 0, skipped = 0, i = 0;
    for (const lease of resolved) {
      if (lease.status !== 'active') { skipped++; continue; }

      const key = `${lease.facilityId}|${lease.roomId}`;
      let leaseId = leaseIdByKey.get(key);
      if (!leaseId && !DRY_RUN) {
        const existing = await findLeaseByRoom(lease.facilityId, lease.roomId);
        if (!existing) throw new Error(`Lease missing for ${lease.facility}/${lease.roomNumber}. Run stage 'leases' first.`);
        leaseId = existing.id;
        leaseIdByKey.set(key, leaseId);
      }
      if (DRY_RUN) leaseId = leaseId || `DRY_LEASE_${lease.facility}_${lease.roomNumber}`;

      const email = lease.emailOverride || `${lease.facility}-${lease.roomNumber}@temp.com`;
      const renterId = renterIdByEmail.get(email) || `DRY_RENTER_${email}`;

      const aprilOverdue = outstandingSet.has(`${lease.facility}|${lease.roomNumber}`);

      if (DRY_RUN) {
        scheduleIdByLease.set(leaseId, `DRY_SCHEDULE_${lease.facility}_${lease.roomNumber}`);
        created++;
      } else {
        const existing = await findScheduleByLease(leaseId);
        if (existing) {
          scheduleIdByLease.set(leaseId, existing.id);
          reused++;
        } else {
          const id = await createDocument(
            'payment_schedules',
            buildSchedulePayload({
              leaseId,
              facilityId: lease.facilityId,
              roomId: lease.roomId,
              renterId,
              lease,
              aprilOverdue,
            }),
          );
          scheduleIdByLease.set(leaseId, id);
          created++;
        }
      }
      i++;
      if (!DRY_RUN && i % 50 === 0) console.log(`  … ${i} schedules processed`);
    }
    console.log(`  ${created} created, ${reused} already existed, ${skipped} skipped (terminated).\n`);
  }

  // ── Stage: Penalties ───────────────────────────────────────────────────────
  if (!ONLY || ONLY === 'penalties') {
    console.log('── Stage 4: Penalties ──');
    // Map facility|room → resolved lease for quick lookup.
    const leaseByKey = new Map(resolved.map((l) => [`${l.facility}|${l.roomNumber}`, l]));
    let created = 0, reused = 0, orphans = 0, i = 0;

    for (const p of penalties) {
      const lease = leaseByKey.get(`${p.facility}|${p.roomNumber}`);
      if (!lease || lease.status !== 'active') {
        console.log(`  ⚠  skipping orphan penalty ${p.facility}/${p.roomNumber} (R${p.amount}) — no active lease`);
        orphans++;
        continue;
      }

      const key = `${lease.facilityId}|${lease.roomId}`;
      let leaseId = leaseIdByKey.get(key);
      if (!leaseId && !DRY_RUN) {
        const existing = await findLeaseByRoom(lease.facilityId, lease.roomId);
        if (!existing) throw new Error(`Lease missing for ${lease.facility}/${lease.roomNumber}. Run stage 'leases' first.`);
        leaseId = existing.id;
        leaseIdByKey.set(key, leaseId);
      }
      if (DRY_RUN) leaseId = leaseId || `DRY_LEASE_${lease.facility}_${lease.roomNumber}`;

      let scheduleId = scheduleIdByLease.get(leaseId);
      if (!scheduleId && !DRY_RUN) {
        const existing = await findScheduleByLease(leaseId);
        if (existing) {
          scheduleId = existing.id;
          scheduleIdByLease.set(leaseId, scheduleId);
        } else {
          scheduleId = '';
        }
      }
      if (DRY_RUN) scheduleId = scheduleId || `DRY_SCHEDULE_${lease.facility}_${lease.roomNumber}`;

      const email = lease.emailOverride || `${lease.facility}-${lease.roomNumber}@temp.com`;
      const renterId = renterIdByEmail.get(email) || `DRY_RENTER_${email}`;

      if (DRY_RUN) { created++; i++; continue; }

      const existing = await findPenalty(leaseId, p.paymentMonth);
      if (existing) {
        reused++;
      } else {
        await createDocument(
          'penalties',
          buildPenaltyPayload({
            leaseId,
            facilityId: lease.facilityId,
            roomId: lease.roomId,
            renterId,
            paymentScheduleId: scheduleId,
            paymentMonth: p.paymentMonth,
            amount: p.amount,
          }),
        );
        created++;
      }
      i++;
      if (!DRY_RUN && i % 25 === 0) console.log(`  … ${i}/${penalties.length} penalties`);
    }
    console.log(`  ${created} created, ${reused} already existed, ${orphans} orphan(s) skipped.\n`);
  }

  console.log('── Summary ──');
  console.log(`  active leases:     ${resolved.filter((r) => r.status === 'active').length}`);
  console.log(`  terminated leases: ${resolved.filter((r) => r.status === 'terminated').length}`);
  console.log(`  outstanding Apr:   ${outstanding.length}`);
  console.log(`  penalties input:   ${penalties.length}`);
  console.log(DRY_RUN ? '\n(Dry run — no writes performed.)\n' : '\n✅ Import complete.\n');
}

main().catch((err) => {
  console.error('\n❌ Import failed:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
