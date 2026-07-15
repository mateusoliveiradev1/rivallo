import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const INVENTORY_START = '<!-- phase-5-package-inventory:start -->';
const INVENTORY_END = '<!-- phase-5-package-inventory:end -->';
const APPROVAL_FIELDS = ['Decision', 'Approved by', 'Approved at', 'Inventory digest'];
const APPROVED_SCOPES = new Set([
  'root-dev',
  'desktop-runtime',
  'icons-runtime',
  'design-tokens-runtime',
]);
const NEGATIVE_APPROVAL_PATTERN =
  /\b(?:not approved|do not approve|approval (?:denied|revoked)|(?:nao|não) (?:aprovo|aprovado|aprovar))\b/iu;

function fail(message) {
  throw new Error(message);
}

function normalizeText(text) {
  if (typeof text !== 'string') {
    fail('Package review must be UTF-8 text.');
  }

  return text.replace(/\r\n?/gu, '\n');
}

function readExactlyOneField(lines, field) {
  const prefix = `${field}:`;
  const matches = lines.filter((line) => line.startsWith(prefix));

  if (matches.length !== 1) {
    fail(`Expected exactly one ${field}: field; found ${matches.length}.`);
  }

  const value = matches[0].slice(prefix.length).trim();
  if (value.length === 0) {
    fail(`${field}: must have a value.`);
  }

  return value;
}

function validateSha512Integrity(integrity) {
  if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(integrity)) {
    fail(`Invalid sha512 integrity: ${integrity}`);
  }

  const encoded = integrity.slice('sha512-'.length);
  const decoded = Buffer.from(encoded, 'base64');
  if (decoded.byteLength !== 64 || decoded.toString('base64') !== encoded) {
    fail(`Invalid sha512 integrity payload: ${integrity}`);
  }
}

export function parseInventoryRow(row) {
  if (typeof row !== 'string' || row.trim() !== row) {
    fail('Inventory rows must be unindented strings without surrounding whitespace.');
  }

  const match = row.match(
    /^((?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*)@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\|([^|]+)\|(sha512-[A-Za-z0-9+/]+={0,2})$/u,
  );
  if (!match) {
    fail(`Malformed canonical inventory row: ${row}`);
  }

  const [, name, version, scope, integrity] = match;
  if (!APPROVED_SCOPES.has(scope)) {
    fail(`Unsupported Phase 5 dependency scope for ${name}: ${scope}`);
  }
  validateSha512Integrity(integrity);

  return { name, version, scope, integrity, row };
}

function parseInventoryRows(rows, label) {
  if (!Array.isArray(rows) || rows.length === 0) {
    fail(`${label} inventory must contain at least one row.`);
  }

  const parsed = rows.map(parseInventoryRow);
  const names = new Set();
  const rawRows = new Set();
  for (const item of parsed) {
    if (rawRows.has(item.row)) {
      fail(`Duplicate ${label.toLowerCase()} inventory row: ${item.row}`);
    }
    if (names.has(item.name)) {
      fail(`Duplicate ${label.toLowerCase()} package name: ${item.name}`);
    }
    rawRows.add(item.row);
    names.add(item.name);
  }

  return parsed;
}

export function computeInventoryDigest(rows) {
  const parsed = parseInventoryRows(rows, 'Canonical');
  const canonicalRows = parsed.map(({ row }) => row).sort();
  return `sha256:${createHash('sha256').update(canonicalRows.join('\n'), 'utf8').digest('hex')}`;
}

function isValidIso8601(value) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|([+-])(\d{2}):(\d{2}))$/u,
  );
  if (!match) return false;

  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    ,
    zone,
    ,
    offsetHourText,
    offsetMinuteText,
  ] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);

  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return false;

  if (zone !== 'Z') {
    const offsetHour = Number(offsetHourText);
    const offsetMinute = Number(offsetMinuteText);
    if (offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0))
      return false;
  }

  return Number.isFinite(Date.parse(value));
}

export function parsePackageReview(text) {
  const normalized = normalizeText(text);
  const lines = normalized.split('\n');
  const fields = Object.fromEntries(
    APPROVAL_FIELDS.map((field) => [field, readExactlyOneField(lines, field)]),
  );

  const startIndexes = lines.flatMap((line, index) => (line === INVENTORY_START ? [index] : []));
  const endIndexes = lines.flatMap((line, index) => (line === INVENTORY_END ? [index] : []));
  if (startIndexes.length !== 1 || endIndexes.length !== 1) {
    fail(
      `Expected exactly one canonical inventory block; found ${startIndexes.length} start marker(s) and ${endIndexes.length} end marker(s).`,
    );
  }

  const start = startIndexes[0];
  const end = endIndexes[0];
  if (end <= start + 1) {
    fail('Canonical inventory block is empty or inverted.');
  }

  const rows = lines.slice(start + 1, end);
  while (rows[0] === '') rows.shift();
  while (rows.at(-1) === '') rows.pop();
  if (rows.some((row) => row === '')) {
    fail(
      'Canonical inventory rows must be contiguous; blank rows are allowed only at block edges.',
    );
  }
  const inventory = parseInventoryRows(rows, 'Canonical');
  const sortedRows = rows.toSorted();
  if (rows.some((row, index) => row !== sortedRows[index])) {
    fail('Canonical inventory rows must be sorted by JavaScript code-point order.');
  }

  const recordedDigest = fields['Inventory digest'];
  if (!/^sha256:[0-9a-f]{64}$/u.test(recordedDigest)) {
    fail(`Inventory digest is malformed: ${recordedDigest}`);
  }
  const computedDigest = computeInventoryDigest(rows);
  if (recordedDigest !== computedDigest) {
    fail(`Inventory digest mismatch: recorded ${recordedDigest}; computed ${computedDigest}.`);
  }

  const decision = fields.Decision;
  if (!new Set(['PENDING', 'APPROVED', 'REJECTED']).has(decision)) {
    fail(`Unsupported Decision: ${decision}`);
  }

  return {
    decision,
    approvedBy: fields['Approved by'],
    approvedAt: fields['Approved at'],
    inventoryDigest: computedDigest,
    inventory,
    rows,
    text: normalized,
  };
}

export function verifyApprovedPackageReview(text) {
  const review = parsePackageReview(text);

  if (review.decision !== 'APPROVED') {
    fail(`Decision must be APPROVED; found ${review.decision}.`);
  }
  if (review.approvedBy !== 'Mateus') {
    fail(`Approved by must be exactly Mateus; found ${review.approvedBy}.`);
  }
  if (!isValidIso8601(review.approvedAt)) {
    fail(
      `Approved at must be a valid ISO-8601 timestamp with timezone; found ${review.approvedAt}.`,
    );
  }
  if (NEGATIVE_APPROVAL_PATTERN.test(review.text)) {
    fail('The approval record contains a conflicting negative approval phrase.');
  }

  return review;
}

export function verifyInstalledInventory(approvedRows, installedRows) {
  const approved = parseInventoryRows(approvedRows, 'Approved');
  const installed = parseInventoryRows(installedRows, 'Installed');
  const installedByName = new Map(installed.map((item) => [item.name, item]));

  for (const expected of approved) {
    const actual = installedByName.get(expected.name);
    if (!actual) {
      fail(`Installed inventory is missing approved package ${expected.name}.`);
    }
    for (const property of ['version', 'scope', 'integrity']) {
      if (actual[property] !== expected[property]) {
        fail(
          `Installed ${expected.name} ${property} diverges: expected ${expected[property]}; found ${actual[property]}.`,
        );
      }
    }
  }

  const approvedNames = new Set(approved.map(({ name }) => name));
  const extras = installed.filter(({ name }) => !approvedNames.has(name));
  if (extras.length > 0) {
    fail(
      `Installed inventory contains unapproved package(s): ${extras.map(({ name }) => name).join(', ')}.`,
    );
  }
  if (installed.length !== approved.length) {
    fail(
      `Installed inventory count diverges: expected ${approved.length}; found ${installed.length}.`,
    );
  }

  return true;
}

async function runCli() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--record') {
    fail(
      'Usage: node scripts/verify-phase-5-package-approval.mjs --record <05-01-PACKAGE-REVIEW.md>',
    );
  }

  const recordPath = resolve(args[1]);
  const review = verifyApprovedPackageReview(await readFile(recordPath, 'utf8'));
  console.log(
    `Phase 5 package approval valid: ${review.inventory.length} exact package(s), ${review.inventoryDigest}, approved by Mateus at ${review.approvedAt}.`,
  );
}

const isCli = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
  runCli().catch((error) => {
    console.error(`Phase 5 package approval failed: ${error.message}`);
    console.error(
      'Review the exact inventory, set the four canonical approval fields, and rerun the command. No dependency transaction was performed.',
    );
    process.exitCode = 1;
  });
}
