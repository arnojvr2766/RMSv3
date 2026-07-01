#!/usr/bin/env node
/**
 * RentDesk Data Take-on Import — Yakaza (RBR) client
 * ---------------------------------------------------
 * Single-tenant project. Imports facilities + rooms from the client-supplied
 * spreadsheet. Shapes match the UI forms (FacilityForm / RoomForm).
 *
 *   20 facilities, 509 rooms (as provided by client 2026-04).
 *
 * Idempotent: re-running will NOT create duplicates. Facilities matched by
 * `name`; rooms by (`facilityId`, `roomNumber`). Existing docs are updated.
 *
 * Authentication (tried in order):
 *   1. --key /path/to/serviceAccountKey.json
 *   2. GOOGLE_APPLICATION_CREDENTIALS env var
 *   3. gcloud auth application-default login (ADC)
 *   4. Firebase CLI stored credentials (~/.config/configstore/firebase-tools.json)
 *      — works automatically if you've run `firebase login`.
 *
 * Usage:
 *   node scripts/import-takeon-yakaza.js --dry-run
 *   node scripts/import-takeon-yakaza.js
 *
 * Flags:
 *   --project <id>       Firestore project id (default: rmsv3-becf7)
 *   --dry-run            Print planned writes, do not touch Firestore
 *   --key <path>         Path to service-account key JSON
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

// ─── Init Admin SDK ──────────────────────────────────────────────────────────

// Public OAuth client used by firebase-tools (safe to embed; taken from
// firebase-tools source). Lets us reuse `firebase login` creds.
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

// ─── Minimal HTTPS helpers (no external deps) ────────────────────────────────

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

// ─── OAuth / access token ────────────────────────────────────────────────────

let cachedAccessToken = null;
let cachedAccessTokenExp = 0;

async function getAccessTokenFromServiceAccount(keyPath) {
  // Build a signed JWT and exchange for access_token.
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
    if (!fs.existsSync(abs)) {
      console.error(`Service-account key not found: ${abs}`);
      process.exit(1);
    }
    result = await getAccessTokenFromServiceAccount(abs);
    console.log(`(auth: service-account key)`);
  } else {
    const rt = readFirebaseCliRefreshToken();
    if (!rt) {
      console.error(
        'No credentials found. Run:\n  firebase login\n' +
        'Or pass --key path/to/serviceAccountKey.json'
      );
      process.exit(1);
    }
    result = await getAccessTokenFromRefreshToken(rt);
    console.log(`(auth: firebase-tools CLI credentials)`);
  }
  cachedAccessToken = result.token;
  cachedAccessTokenExp = result.expiresAt;
  return cachedAccessToken;
}

// ─── Firestore REST helpers ──────────────────────────────────────────────────

const BASE = () => `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function authHeaders() {
  const t = await getAccessToken();
  return { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
}

// Convert a plain JS value into Firestore REST "Value" form.
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
  const res = await httpsRequest(
    'POST',
    `${BASE()}:runQuery`,
    await authHeaders(),
    { structuredQuery }
  );
  if (!Array.isArray(res)) return [];
  return res
    .filter((r) => r.document)
    .map((r) => ({
      name: r.document.name,
      id: r.document.name.split('/').pop(),
      data: r.document.fields ? Object.fromEntries(Object.keys(r.document.fields).map(k => [k, fromFsValue(r.document.fields[k])])) : {},
    }));
}

async function createDocument(collectionId, obj) {
  const res = await httpsRequest(
    'POST',
    `${BASE()}/${collectionId}`,
    await authHeaders(),
    { fields: toFsFields(obj) }
  );
  return res.name.split('/').pop();
}

async function patchDocument(collectionId, docId, obj) {
  const mask = Object.keys(obj).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${BASE()}/${collectionId}/${docId}?${mask}`;
  await httpsRequest('PATCH', url, await authHeaders(), { fields: toFsFields(obj) });
}

// ─── Client data (from client spreadsheet 2026-04) ───────────────────────────

const FACILITY_NAMES = [
  'A2', 'B2', 'C2', 'D2', 'E2', 'BR', 'RB', 'RBR', 'MA',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
];

// Columns: facility_name  room_number  room_type  monthly_rent  deposit_amount  capacity  status
const ROOMS_TSV = `
A2	1	single	900		1	occupied
A2	2	single	900		1	available
A2	3	single	900		1	occupied
A2	4	single	900		1	occupied
A2	5	single	900		1	occupied
A2	6	single	900		1	occupied
A2	7	single	900		1	occupied
A2	8	single	900		1	occupied
A2	9	single	900		1	occupied
A2	10	single	900		1	occupied
A2	11	single	900		1	occupied
A2	12	single	900		1	occupied
A2	13	single	900		1	available
A2	14	single	900		1	occupied
A2	15	single	900		1	occupied
A2	16	single	900		1	occupied
A2	17	single	900		1	occupied
A2	18	single	900		1	occupied
A2	19	single	900		1	occupied
A2	20	single	900		1	occupied
A2	21	single	900		1	occupied
A2	22	single	900		1	occupied
A2	23	single	900		1	occupied
A2	24	single	900		1	occupied
A2	25	single	900		1	occupied
A2	26	single	900		1	occupied
A2	27	single	900		1	occupied
A2	28	single	900		1	occupied
A2	29	single	900		1	occupied
A2	30	single	900		1	occupied
B2	1	single	900		1	occupied
B2	2	single	900		1	occupied
B2	3	single	900		1	occupied
B2	4	single	900		1	occupied
B2	5	single	900		1	occupied
B2	6	single	900		1	occupied
B2	7	single	900		1	occupied
B2	8	single	900		1	occupied
B2	9	single	900		1	occupied
B2	10	single	900		1	occupied
B2	11	single	900		1	occupied
B2	12	single	900		1	occupied
B2	13	single	900		1	occupied
B2	14	single	900		1	occupied
B2	15	single	900		1	occupied
B2	16	single	900		1	occupied
B2	17	single	900		1	occupied
B2	18	single	900		1	occupied
B2	19	single	900		1	occupied
B2	20	single	900		1	occupied
B2	21	single	900		1	occupied
B2	22	single	900		1	occupied
B2	23	single	900		1	occupied
B2	24	single	900		1	occupied
B2	25	single	900		1	occupied
B2	26	single	900		1	occupied
B2	27	single	900		1	occupied
B2	28	single	900		1	occupied
B2	29	single	900		1	occupied
B2	30	single	900		1	occupied
C2	1	single	1500		2	occupied
C2	2	single	900		1	occupied
C2	3	single	900		1	occupied
C2	4	single	900		1	occupied
C2	5	single	900		1	occupied
C2	6	single	900		1	occupied
C2	7	single	900		1	occupied
C2	8	single	900		1	occupied
C2	9	single	900		1	occupied
C2	10	single	900		1	occupied
C2	11	single	900		1	occupied
C2	12	single	900		1	occupied
C2	13	single	900		1	occupied
C2	14	single	900		1	occupied
C2	15	single	900		1	occupied
C2	16	single	900		1	occupied
C2	17	single	900		1	occupied
C2	18	single	900		1	occupied
C2	19	single	900		1	occupied
C2	20	single	900		1	occupied
C2	21	single	900		1	occupied
C2	22	single	900		1	occupied
C2	23	single	900		1	occupied
C2	24	single	900		1	occupied
C2	25	single	900		1	occupied
C2	26	single	900		1	occupied
C2	27	single	900		1	occupied
D2	1	single	1500		1	occupied
D2	2	single	1500		1	occupied
D2	3	single	1500		1	occupied
D2	4	single	1500		1	occupied
D2	5	single	900		1	occupied
D2	6	single	900		1	occupied
D2	7	single	900		1	occupied
D2	8	single	900		1	occupied
D2	9	single	900		1	occupied
D2	10	single	900		1	occupied
D2	11	single	900		1	occupied
D2	12	single	900		1	occupied
D2	13	single	900		1	occupied
D2	14	single	900		1	occupied
D2	15	single	900		1	occupied
D2	16	single	900		1	occupied
D2	17	single	900		1	occupied
D2	18	single	900		1	occupied
D2	19	single	900		1	occupied
D2	20	single	900		1	occupied
D2	21	single	900		1	occupied
D2	22	single	900		1	occupied
E2	1	single	1500		1	occupied
E2	2	single	1500		1	occupied
E2	3	single	1500		1	occupied
E2	4	single	900		1	occupied
E2	5	single	900		1	occupied
E2	6	single	900		1	occupied
E2	7	single	900		1	occupied
E2	8	single	900		1	occupied
E2	9	single	900		1	occupied
E2	10	single	900		1	occupied
E2	11	single	900		1	occupied
E2	12	single	900		1	occupied
E2	13	single	900		1	occupied
E2	14	single	900		1	occupied
E2	15	single	900		1	occupied
E2	16	single	900		1	occupied
E2	17	single	900		1	occupied
E2	18	single	900		1	occupied
E2	19	single	900		1	occupied
E2	20	single	900		1	occupied
E2	21	single	900		1	occupied
E2	22	single	900		1	occupied
E2	23	single	900		1	occupied
BR	1	double	1090		2	occupied
BR	2	double	1590		2	occupied
BR	3	double	1590		2	occupied
BR	4	double	1590		2	occupied
BR	5	double	1090		2	occupied
BR	6	double	1090		2	occupied
BR	7	double	1090		2	occupied
BR	8	double	1590		2	occupied
BR	9	double	1590		2	occupied
BR	10	double	1590		2	occupied
BR	11	double	1090		2	occupied
BR	12	double	1090		2	occupied
BR	13	double	780		2	occupied
BR	14	double	780		2	occupied
BR	15	double	780		2	occupied
BR	16	double	780		2	occupied
BR	17	double	780		2	occupied
BR	18	double	780		2	occupied
BR	19	double	780		2	occupied
BR	20	double	780		2	occupied
BR	21	double	780		2	occupied
BR	22	double	780		2	occupied
BR	23	double	780		2	occupied
BR	24	double	780		2	occupied
BR	25	double	720		2	occupied
BR	26	double	720		2	occupied
BR	27	double	720		2	occupied
BR	28	double	720		2	occupied
BR	29	double	720		2	occupied
BR	30	double	720		2	occupied
RB	1	double	750		2	occupied
RB	2	double	750		2	occupied
RB	3	double	750		2	occupied
RB	4	double	750		2	occupied
RB	5	double	750		2	occupied
RB	6	double	750		2	occupied
RB	7	double	750		2	occupied
RB	8	double	750		2	occupied
RB	9	double	750		2	occupied
RB	10	double	750		2	occupied
RB	11	double	750		2	occupied
RB	12	double	750		2	occupied
RB	13	double	750		2	occupied
RB	14	double	750		2	occupied
RB	15	double	750		2	occupied
RB	16	double	750		2	occupied
RB	17	double	750		2	occupied
RB	18	double	750		2	occupied
RB	19	double	750		2	occupied
RB	20	double	750		2	occupied
RB	21	double	750		2	occupied
RB	22	double	750		2	occupied
RB	23	double	750		2	occupied
RB	24	double	750		2	occupied
RB	25	double	750		2	occupied
RB	26	double	750		2	occupied
RB	27	double	750		2	occupied
RB	28	double	750		2	occupied
RB	29	double	750		2	occupied
RB	30	double	750		2	occupied
RBR	1	double	1300		2	occupied
RBR	2	double	1300		2	occupied
RBR	3	double	1300		2	occupied
RBR	4	double	1300		2	occupied
RBR	5	double	1300		2	occupied
RBR	6	double	1300		2	occupied
RBR	7	double	1300		2	occupied
RBR	8	double	1300		2	occupied
RBR	9	double	1300		2	occupied
RBR	10	double	1300		2	occupied
RBR	11	double	1300		2	occupied
RBR	12	double	1300		2	occupied
RBR	13	double	1300		2	occupied
RBR	14	double	1300		2	occupied
RBR	15	double	1300		2	occupied
RBR	16	double	1300		2	occupied
RBR	17	double	1300		2	occupied
RBR	18	double	1300		2	occupied
RBR	19	double	1300		2	occupied
RBR	20	double	1300		2	occupied
RBR	21	double	1300		2	occupied
RBR	22	double	1300		2	occupied
RBR	23	double	1300		2	occupied
RBR	24	double	1300		2	occupied
MA	1	single	1650		1	occupied
MA	2	single	1650		1	occupied
MA	3	single	1650		1	occupied
MA	4	single	1650		1	occupied
MA	5	single	1650		1	occupied
MA	6	single	1650		1	occupied
MA	7	single	1650		1	occupied
MA	8	single	1650		1	occupied
MA	9	single	1650		1	occupied
MA	10	single	1650		1	occupied
MA	11	single	1650		1	occupied
MA	12	single	1650		1	occupied
MA	13	single	1650		1	occupied
MA	14	single	1650		1	occupied
MA	15	single	1650		1	occupied
MA	16	single	1650		1	occupied
MA	17	single	1650		1	occupied
MA	18	single	1650		1	occupied
MA	19	single	1650		1	occupied
MA	20	single	1650		1	occupied
MA	21	single	1650		1	occupied
MA	22	single	1650		1	occupied
MA	23	single	1650		1	occupied
MA	24	single	1650		1	occupied
MA	25	single	1650		1	occupied
MA	26	single	1650		1	occupied
MA	27	single	1650		1	occupied
MA	28	single	1650		1	occupied
MA	29	single	1650		1	occupied
MA	30	single	1650		1	occupied
MA	31	single	1650		1	available
MA	32	single	1650		1	occupied
MA	33	single	1650		1	occupied
MA	34	single	1650		1	occupied
MA	35	single	1650		1	occupied
MA	36	single	1650		1	occupied
MA	37	single	1650		1	occupied
MA	38	single	1650		1	occupied
MA	39	single	1650		1	occupied
MA	40	single	1650		1	occupied
MA	41	single	1650		1	occupied
MA	42	single	1650		1	occupied
MA	43	single	1650		1	occupied
MA	44	single	1650		1	occupied
MA	45	single	1650		1	occupied
MA	46	single	1650		1	occupied
MA	47	single	1650		1	occupied
MA	48	single	1650		1	occupied
MA	49	single	1650		1	occupied
MA	50	single	1650		1	occupied
MA	51	single	1650		1	occupied
MA	52	single	1650		1	occupied
MA	53	single	1650		1	occupied
MA	54	single	1650		1	occupied
MA	55	single	1650		1	occupied
MA	56	single	1650		1	occupied
A	1	single	720		1	occupied
A	2	single	720		1	occupied
A	3	single	720		1	occupied
A	4	single	720		1	occupied
A	5	single	720		1	occupied
A	6	single	720		1	occupied
A	7	single	720		1	occupied
A	8	single	720		1	occupied
A	9	single	720		1	occupied
A	10	single	720		1	occupied
A	11	single	720		1	occupied
A	12	single	720		1	occupied
A	13	single	720		1	occupied
A	14	single	720		1	occupied
A	15	single	720		1	occupied
A	16	single	720		1	occupied
B	1	single	720		1	occupied
B	2	single	720		1	occupied
B	3	single	720		1	occupied
B	4	single	720		1	occupied
B	5	single	720		1	occupied
B	6	single	720		1	occupied
B	7	single	720		1	occupied
B	8	single	720		1	occupied
B	9	single	720		1	occupied
B	10	single	720		1	occupied
B	11	single	720		1	occupied
B	12	single	720		1	occupied
B	13	single	720		1	occupied
B	14	single	720		1	occupied
B	15	single	720		1	occupied
B	16	single	720		1	occupied
B	17	single	720		1	occupied
B	18	single	720		1	occupied
C	1	single	750		1	occupied
C	2	single	750		1	occupied
C	3	single	750		1	occupied
C	4	single	750		1	occupied
C	5	single	750		1	occupied
C	6	single	750		1	occupied
C	7	single	750		1	occupied
C	8	single	750		1	occupied
C	9	single	750		1	occupied
D	1	single	800		1	occupied
D	2	single	800		1	occupied
D	3	single	800		1	occupied
D	4	single	800		1	occupied
D	5	single	800		1	occupied
D	6	single	800		1	occupied
D	7	single	800		1	occupied
D	8	single	800		1	occupied
D	9	single	800		1	occupied
D	10	single	800		1	occupied
E	1	single	750		1	occupied
E	2	single	750		1	occupied
E	3	single	750		1	occupied
E	4	single	750		1	occupied
E	5	single	750		1	occupied
E	6	single	750		1	occupied
E	7	single	750		1	occupied
E	8	single	750		1	occupied
E	9	single	750		1	occupied
E	10	single	750		1	occupied
F	1	single	750		1	occupied
F	2	single	750		1	occupied
F	3	single	750		1	occupied
F	4	single	750		1	occupied
F	5	single	750		1	occupied
F	6	single	750		1	occupied
F	7	single	750		1	occupied
F	8	single	750		1	occupied
F	9	single	750		1	occupied
F	10	single	750		1	occupied
F	11	single	750		1	occupied
F	12	single	750		1	occupied
F	13	single	750		1	occupied
F	14	single	750		1	occupied
F	15	single	750		1	occupied
F	16	single	750		1	occupied
F	17	single	750		1	occupied
F	18	single	750		1	occupied
G	1	single	770		1	occupied
G	2	single	770		1	occupied
G	3	single	770		1	occupied
G	4	single	770		1	occupied
G	5	single	770		1	occupied
G	6	single	770		1	occupied
G	7	single	770		1	occupied
G	8	single	770		1	occupied
G	9	single	770		1	occupied
G	10	single	770		1	occupied
G	11	single	770		1	occupied
G	12	single	770		1	occupied
G	13	single	770		1	occupied
G	14	single	770		1	occupied
G	15	single	770		1	occupied
G	16	single	770		1	occupied
G	17	single	770		1	occupied
G	18	single	770		1	occupied
G	19	single	770		1	occupied
G	20	single	770		1	occupied
G	21	single	770		1	occupied
G	22	single	770		1	occupied
G	23	single	770		1	occupied
G	24	single	770		1	occupied
G	25	single	770		1	occupied
G	26	single	770		1	occupied
G	27	single	770		1	occupied
G	28	single	770		1	occupied
G	29	single	770		1	occupied
G	30	single	770		1	occupied
G	31	single	770		1	occupied
G	32	single	770		1	occupied
H	1	single	770		1	occupied
H	2	single	770		1	occupied
H	3	single	770		1	occupied
H	4	single	770		1	occupied
H	5	single	770		1	occupied
H	6	single	770		1	occupied
H	7	single	770		1	occupied
H	8	single	770		1	occupied
H	9	single	770		1	occupied
H	10	single	770		1	occupied
H	11	single	770		1	occupied
H	12	single	770		1	occupied
H	13	single	770		1	occupied
H	14	single	770		1	occupied
H	15	single	770		1	occupied
H	16	single	770		1	occupied
H	17	single	770		1	occupied
H	18	single	770		1	occupied
H	19	single	770		1	occupied
H	20	single	770		1	occupied
H	21	single	770		1	occupied
H	22	single	770		1	occupied
H	23	single	770		1	occupied
H	24	single	770		1	occupied
H	25	single	770		1	occupied
H	26	single	770		1	occupied
H	27	single	770		1	occupied
H	28	single	770		1	occupied
H	29	single	770		1	occupied
H	30	single	770		1	occupied
H	31	single	770		1	occupied
H	32	single	770		1	occupied
I	1	single	850		1	occupied
I	2	single	850		1	occupied
I	3	single	850		1	occupied
I	4	single	850		1	occupied
I	5	single	850		1	occupied
I	6	single	850		1	occupied
I	7	single	850		1	occupied
I	8	single	850		1	occupied
I	9	single	850		1	occupied
I	10	single	850		1	occupied
I	11	single	850		1	occupied
I	12	single	850		1	occupied
I	13	single	850		1	occupied
I	14	single	850		1	occupied
I	15	single	850		1	occupied
I	16	single	850		1	occupied
I	17	single	850		1	occupied
I	18	single	850		1	occupied
I	19	single	850		1	occupied
I	20	single	850		1	occupied
I	21	single	850		1	occupied
I	22	single	850		1	occupied
I	23	single	850		1	occupied
I	24	single	850		1	occupied
I	25	single	850		1	occupied
I	26	single	850		1	occupied
I	27	single	850		1	occupied
I	28	single	850		1	occupied
I	29	single	850		1	occupied
I	30	single	850		1	occupied
I	31	single	850		1	occupied
I	32	single	850		1	occupied
J	1	single	870		1	occupied
J	2	single	870		1	occupied
J	3	single	870		1	occupied
J	4	single	870		1	occupied
J	5	single	870		1	occupied
J	6	single	870		1	occupied
J	7	single	870		1	occupied
J	8	single	870		1	occupied
J	9	single	870		1	occupied
J	10	single	870		1	occupied
J	11	single	870		1	occupied
J	12	single	870		1	occupied
J	13	single	870		1	occupied
J	14	single	870		1	occupied
J	15	single	870		1	occupied
J	16	single	870		1	occupied
J	17	single	870		1	occupied
J	18	single	870		1	occupied
J	19	single	870		1	occupied
J	20	single	870		1	occupied
J	21	single	870		1	occupied
J	22	single	870		1	occupied
J	23	single	870		1	occupied
J	24	single	870		1	occupied
J	25	single	870		1	occupied
J	26	single	870		1	occupied
J	27	single	870		1	occupied
J	28	single	870		1	occupied
K	1	single	830		1	occupied
K	2	single	830		1	occupied
K	3	single	830		1	available
K	4	single	830		1	occupied
K	5	single	830		1	occupied
K	6	single	830		1	occupied
K	7	single	830		1	occupied
K	8	single	830		1	occupied
K	9	single	830		1	occupied
K	10	single	830		1	occupied
K	11	single	830		1	occupied
K	12	single	830		1	occupied
K	13	single	830		1	occupied
K	14	single	830		1	available
K	15	single	830		1	occupied
K	16	single	830		1	occupied
K	17	single	830		1	occupied
K	18	single	830		1	occupied
K	19	single	830		1	occupied
K	20	single	830		1	occupied
K	21	single	830		1	occupied
K	22	single	830		1	occupied
K	23	single	830		1	occupied
K	24	single	830		1	occupied
K	25	single	830		1	occupied
K	26	single	830		1	occupied
K	27	single	830		1	occupied
K	28	single	830		1	occupied
K	29	single	830		1	occupied
K	30	single	830		1	occupied
K	31	single	830		1	occupied
K	32	single	830		1	occupied
`.trim();

// ─── Shape matches FacilityForm / RoomForm (single-tenant) ───────────────────

// Defaults for facilities (client didn't supply these — placeholders, editable in UI).
const FACILITY_DEFAULTS = {
  address: '',
  contactInfo: { phone: '', email: '' },
  defaultBusinessRules: {
    defaultMonthlyRent: 0,
    defaultDepositAmount: 0,
    lateFeeAmount: 50,
    lateFeeStartDay: 4,
    childSurcharge: 10,
    gracePeriodDays: 3,
    paymentMethods: ['cash', 'eft', 'mobile', 'card'],
  },
  primaryColor: '#FFD300',
  status: 'active',
};

// ─── Parse ───────────────────────────────────────────────────────────────────

const VALID_ROOM_TYPES = ['single', 'double', 'family', 'studio'];
const VALID_ROOM_STATUSES = ['available', 'occupied', 'maintenance', 'unavailable', 'locked', 'empty'];

function parseRooms() {
  const rooms = [];
  ROOMS_TSV.split('\n').forEach((line, idx) => {
    if (!line.trim()) return;
    const parts = line.split('\t');
    if (parts.length < 7) {
      throw new Error(`Rooms line ${idx + 1}: expected 7 tab-separated fields, got ${parts.length}`);
    }
    const [facility_name, room_number, room_type, monthly_rent, deposit_amount, capacity, status] = parts.map(s => s.trim());
    if (!FACILITY_NAMES.includes(facility_name)) {
      throw new Error(`Rooms line ${idx + 1}: unknown facility "${facility_name}"`);
    }
    if (!VALID_ROOM_TYPES.includes(room_type)) {
      throw new Error(`Rooms line ${idx + 1}: invalid room_type "${room_type}"`);
    }
    if (!VALID_ROOM_STATUSES.includes(status)) {
      throw new Error(`Rooms line ${idx + 1}: invalid status "${status}"`);
    }
    rooms.push({
      facilityName: facility_name,
      roomNumber: String(room_number),
      type: room_type,
      monthlyRent: Number(monthly_rent),
      depositAmount: deposit_amount === '' ? 0 : Number(deposit_amount),
      capacity: Number(capacity),
      status,
    });
  });
  return rooms;
}

// ─── Upsert helpers ──────────────────────────────────────────────────────────

async function findFacilityByName(name) {
  const rows = await runQuery({
    from: [{ collectionId: 'facilities' }],
    where: {
      fieldFilter: {
        field: { fieldPath: 'name' },
        op: 'EQUAL',
        value: { stringValue: name },
      },
    },
    limit: 1,
  });
  return rows[0] || null;
}

async function findRoom(facilityId, roomNumber) {
  const rows = await runQuery({
    from: [{ collectionId: 'rooms' }],
    where: {
      compositeFilter: {
        op: 'AND',
        filters: [
          { fieldFilter: { field: { fieldPath: 'facilityId' }, op: 'EQUAL', value: { stringValue: facilityId } } },
          { fieldFilter: { field: { fieldPath: 'roomNumber' }, op: 'EQUAL', value: { stringValue: roomNumber } } },
        ],
      },
    },
    limit: 1,
  });
  return rows[0] || null;
}

async function upsertFacility(name) {
  const existing = await findFacilityByName(name);
  const now = new Date();

  if (existing) {
    console.log(`  ~ facility "${name}" exists → ${existing.id} (no changes)`);
    return existing.id;
  }

  const payload = {
    name,
    billingEntity: name,
    ...FACILITY_DEFAULTS,
    createdAt: now,
    updatedAt: now,
  };

  if (DRY_RUN) {
    console.log(`  + WOULD create facility "${name}"`);
    return `DRY_RUN_${name}`;
  }

  const id = await createDocument('facilities', payload);
  console.log(`  ✅ facility: ${name} → ${id}`);
  return id;
}

async function upsertRoom(facilityId, room) {
  const now = new Date();

  const payload = {
    facilityId,
    roomNumber: room.roomNumber,
    type: room.type,
    capacity: room.capacity,
    monthlyRent: room.monthlyRent,
    depositAmount: room.depositAmount,
    amenities: [],
    status: room.status,
    businessRules: {
      usesFacilityDefaults: true,
      lateFeeAmount: FACILITY_DEFAULTS.defaultBusinessRules.lateFeeAmount,
      lateFeeStartDay: FACILITY_DEFAULTS.defaultBusinessRules.lateFeeStartDay,
      childSurcharge: FACILITY_DEFAULTS.defaultBusinessRules.childSurcharge,
      gracePeriodDays: FACILITY_DEFAULTS.defaultBusinessRules.gracePeriodDays,
      paymentMethods: FACILITY_DEFAULTS.defaultBusinessRules.paymentMethods,
    },
    updatedAt: now,
  };

  if (DRY_RUN) {
    console.log(`    + WOULD create ${room.facilityName}/${room.roomNumber} (${room.type}, R${room.monthlyRent}, ${room.status})`);
    return;
  }

  const existing = await findRoom(facilityId, room.roomNumber);
  if (existing) {
    await patchDocument('rooms', existing.id, payload);
    return;
  }
  await createDocument('rooms', { ...payload, createdAt: now });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nProject: ${PROJECT_ID}`);
  console.log(`Mode:    ${DRY_RUN ? 'DRY-RUN (no writes)' : 'LIVE WRITE'}`);

  const rooms = parseRooms();
  console.log(`Parsed ${FACILITY_NAMES.length} facilities, ${rooms.length} rooms.\n`);

  // Prime token (prints auth source).
  if (!DRY_RUN) await getAccessToken();

  console.log('── Step 1: Facilities ──');
  const facilityIds = new Map();
  for (const name of FACILITY_NAMES) {
    if (DRY_RUN) {
      facilityIds.set(name, `DRY_RUN_${name}`);
      console.log(`  + WOULD create facility "${name}"`);
    } else {
      facilityIds.set(name, await upsertFacility(name));
    }
  }

  console.log('\n── Step 2: Rooms ──');
  const perFacilityCounts = {};
  let i = 0;
  for (const room of rooms) {
    const fid = facilityIds.get(room.facilityName);
    if (!fid) throw new Error(`No facilityId for "${room.facilityName}"`);
    await upsertRoom(fid, room);
    perFacilityCounts[room.facilityName] = (perFacilityCounts[room.facilityName] || 0) + 1;
    i++;
    if (!DRY_RUN && i % 25 === 0) {
      console.log(`  … ${i}/${rooms.length} rooms`);
    }
  }

  console.log('\n── Summary ──');
  Object.keys(perFacilityCounts).sort().forEach(f => {
    console.log(`  ${f}: ${perFacilityCounts[f]} rooms`);
  });
  console.log(`  TOTAL: ${rooms.length} rooms across ${FACILITY_NAMES.length} facilities`);
  console.log(DRY_RUN ? '\n(Dry run — no writes performed.)\n' : '\n✅ Import complete.\n');
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
