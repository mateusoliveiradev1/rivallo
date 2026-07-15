import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** @typedef {'dependencies' | 'devDependencies' | 'optionalDependencies' | 'peerDependencies'} DirectSection */
/** @typedef {'root' | 'desktop' | 'icons' | 'designTokens'} Owner */
/** @typedef {'root-dev' | 'desktop-runtime' | 'icons-runtime' | 'design-tokens-runtime'} ApprovedScope */
/** @typedef {{ name: string, version: string, scope: ApprovedScope, integrity: string, row: string }} InventoryItem */
/** @typedef {Partial<Record<DirectSection, Record<string, string>>>} DirectManifest */
/** @typedef {Record<Owner, DirectManifest>} OwnerManifests */
/** @typedef {{ decision: string, approvedBy: string, approvedAt: string, inventoryDigest: string, inventory: InventoryItem[], rows: string[], text: string }} PackageReview */

const INVENTORY_START = '<!-- phase-5-package-inventory:start -->';
const INVENTORY_END = '<!-- phase-5-package-inventory:end -->';
const APPROVAL_FIELDS = ['Decision', 'Approved by', 'Approved at', 'Inventory digest'];
/** @type {Set<ApprovedScope>} */
const APPROVED_SCOPES = new Set([
  'root-dev',
  'desktop-runtime',
  'icons-runtime',
  'design-tokens-runtime',
]);
const NEGATIVE_APPROVAL_PATTERN =
  /\b(?:not approved|do not approve|approval (?:denied|revoked)|(?:nao|não) (?:aprovo|aprovado|aprovar))\b/iu;
/** @type {DirectSection[]} */
const DIRECT_SECTIONS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
/** @type {Readonly<Record<ApprovedScope, { owner: Owner, section: DirectSection }>>} */
const OWNER_BY_SCOPE = Object.freeze({
  'root-dev': { owner: 'root', section: 'devDependencies' },
  'desktop-runtime': { owner: 'desktop', section: 'dependencies' },
  'icons-runtime': { owner: 'icons', section: 'dependencies' },
  'design-tokens-runtime': { owner: 'designTokens', section: 'dependencies' },
});
/** @type {Readonly<Record<Owner, string>>} */
const OWNER_PATHS = Object.freeze({
  root: 'package.json',
  desktop: 'apps/desktop/package.json',
  icons: 'packages/icons/package.json',
  designTokens: 'packages/design-tokens/package.json',
});
const ALLOWED_WORKSPACE_LINKS = new Map([
  ['desktop|dependencies|@rivallo/design-tokens', 'workspace:*'],
  ['desktop|dependencies|@rivallo/icons', 'workspace:*'],
]);
const ALLOWED_PLATFORM_PEERS = new Map([['icons|peerDependencies|react', '19.2.7']]);

// Captured from `git show HEAD:<owner-manifest>` immediately before the approved
// Phase 5 transaction. Keeping the direct baseline here makes --installed stable
// after the transaction commit and prevents later HEAD movement from weakening it.
/** @type {Readonly<OwnerManifests>} */
export const APPROVED_DIRECT_BASELINE = Object.freeze({
  root: {
    devDependencies: {
      '@eslint/js': '^9.31.0',
      '@tauri-apps/cli': '2.11.4',
      '@types/node': '^24.0.0',
      '@vitejs/plugin-react': '6.0.3',
      eslint: '^9.31.0',
      globals: '^16.0.0',
      orval: '8.21.0',
      prettier: '^3.6.0',
      turbo: '^2.5.0',
      typescript: '^5.8.0',
      'typescript-eslint': '^8.36.0',
      vite: '8.1.4',
      vitest: '^3.2.0',
    },
  },
  desktop: {
    dependencies: {
      '@rivallo/contracts-client': 'workspace:*',
      '@tauri-apps/api': '2.11.1',
      react: '19.2.7',
      'react-dom': '19.2.7',
    },
  },
  icons: {},
  designTokens: {},
});

/** @param {string} message @returns {never} */
function fail(message) {
  throw new Error(message);
}

/** @param {unknown} text @returns {string} */
function normalizeText(text) {
  if (typeof text !== 'string') {
    fail('Package review must be UTF-8 text.');
  }

  return text.replace(/\r\n?/gu, '\n');
}

/** @param {string[]} lines @param {string} field @returns {string} */
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

/** @param {string} integrity */
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

/** @param {string} row @returns {InventoryItem} */
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
  if (!APPROVED_SCOPES.has(/** @type {ApprovedScope} */ (scope))) {
    fail(`Unsupported Phase 5 dependency scope for ${name}: ${scope}`);
  }
  const approvedScope = /** @type {ApprovedScope} */ (scope);
  validateSha512Integrity(integrity);

  return { name, version, scope: approvedScope, integrity, row };
}

/** @param {string[]} rows @param {string} label @returns {InventoryItem[]} */
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

/** @param {string[]} rows @returns {string} */
export function computeInventoryDigest(rows) {
  const parsed = parseInventoryRows(rows, 'Canonical');
  const canonicalRows = parsed.map(({ row }) => row).sort();
  return `sha256:${createHash('sha256').update(canonicalRows.join('\n'), 'utf8').digest('hex')}`;
}

/** @param {string} value @returns {boolean} */
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

/** @param {string} text @returns {PackageReview} */
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

/** @param {string} text @returns {PackageReview} */
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

/** @param {string[]} approvedRows @param {string[]} installedRows @returns {true} */
export function verifyInstalledInventory(approvedRows, installedRows) {
  const approved = parseInventoryRows(approvedRows, 'Approved');
  const installed = parseInventoryRows(installedRows, 'Installed');
  const installedByName = new Map(installed.map((item) => [item.name, item]));

  for (const expected of approved) {
    const actual = installedByName.get(expected.name);
    if (!actual) {
      fail(`Installed inventory is missing approved package ${expected.name}.`);
    }
    for (const property of /** @type {const} */ (['version', 'scope', 'integrity'])) {
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

/**
 * @param {DirectManifest} manifest
 * @returns {{ section: DirectSection, name: string, specifier: string }[]}
 */
function directEntries(manifest) {
  return DIRECT_SECTIONS.flatMap((section) =>
    Object.entries(manifest?.[section] ?? {}).map(([name, specifier]) => ({
      section,
      name,
      specifier,
    })),
  );
}

/** @param {Owner} owner @param {DirectSection} section @param {string} name */
function manifestLabel(owner, section, name) {
  return `${OWNER_PATHS[owner]} ${section}.${name}`;
}

/** @param {string} lockfileText @param {string} name @param {string} version */
function lockfileIntegrity(lockfileText, name, version) {
  const packageKey = `${name}@${version}`;
  const escapedKey = packageKey.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const pattern = new RegExp(
    `^  ['"]?${escapedKey}['"]?:\\r?\\n    resolution: \\{integrity: ([^}]+)\\}`,
    'gmu',
  );
  const matches = [...lockfileText.matchAll(pattern)].map((match) => match[1]);

  if (matches.length !== 1) {
    fail(
      `Lockfile must contain exactly one package resolution with integrity for ${packageKey}; found ${matches.length}.`,
    );
  }
  return matches[0];
}

/**
 * @param {{
 *   approvedRows: string[],
 *   baselineManifests: OwnerManifests,
 *   currentManifests: OwnerManifests,
 *   lockfileText: string,
 * }} input
 */
export function verifyInstalledWorkspace({
  approvedRows,
  baselineManifests,
  currentManifests,
  lockfileText,
}) {
  const approved = parseInventoryRows(approvedRows, 'Approved');
  const approvedByName = new Map(approved.map((item) => [item.name, item]));
  const installedRows = [];
  const seenWorkspaceLinks = new Set();
  const seenPlatformPeers = new Set();

  for (const owner of /** @type {Owner[]} */ (Object.keys(OWNER_PATHS))) {
    const baseline = baselineManifests[owner] ?? {};
    const current = currentManifests[owner];
    if (!current) fail(`Missing installed owner manifest: ${OWNER_PATHS[owner]}.`);

    const baselineByKey = new Map(
      directEntries(baseline).map((entry) => [`${entry.section}|${entry.name}`, entry]),
    );
    const currentByKey = new Map(
      directEntries(current).map((entry) => [`${entry.section}|${entry.name}`, entry]),
    );

    for (const [key, expected] of baselineByKey) {
      const actual = currentByKey.get(key);
      const label = manifestLabel(owner, expected.section, expected.name);
      if (!actual) fail(`Baseline direct dependency was removed: ${label}.`);
      if (actual.specifier !== expected.specifier) {
        fail(
          `Baseline direct dependency changed: ${label}; expected ${expected.specifier}, found ${actual.specifier}.`,
        );
      }
    }

    for (const entry of currentByKey.values()) {
      const baselineEntry = baselineByKey.get(`${entry.section}|${entry.name}`);
      if (baselineEntry) continue;

      const workspaceKey = `${owner}|${entry.section}|${entry.name}`;
      const expectedPlatformPeer = ALLOWED_PLATFORM_PEERS.get(workspaceKey);
      if (expectedPlatformPeer) {
        if (entry.specifier !== expectedPlatformPeer) {
          fail(
            `Approved platform peer ${manifestLabel(owner, entry.section, entry.name)} must be ${expectedPlatformPeer}; found ${entry.specifier}.`,
          );
        }
        seenPlatformPeers.add(workspaceKey);
        continue;
      }
      if (entry.specifier.startsWith('workspace:')) {
        const expectedSpecifier = ALLOWED_WORKSPACE_LINKS.get(workspaceKey);
        if (entry.specifier !== expectedSpecifier) {
          fail(
            `Unapproved workspace link ${manifestLabel(owner, entry.section, entry.name)}: ${entry.specifier}.`,
          );
        }
        seenWorkspaceLinks.add(workspaceKey);
        continue;
      }

      const approvedItem = approvedByName.get(entry.name);
      if (!approvedItem) {
        fail(
          `Unapproved direct dependency added: ${manifestLabel(owner, entry.section, entry.name)}.`,
        );
      }
      const expectedOwner = OWNER_BY_SCOPE[approvedItem.scope];
      if (expectedOwner.owner !== owner || expectedOwner.section !== entry.section) {
        fail(
          `Approved ${entry.name} is in the wrong scope: expected ${expectedOwner.owner}/${expectedOwner.section}; found ${owner}/${entry.section}.`,
        );
      }
      if (entry.specifier !== approvedItem.version) {
        fail(
          `Approved ${entry.name} must use exact version ${approvedItem.version}; found ${entry.specifier}.`,
        );
      }
      const integrity = lockfileIntegrity(lockfileText, entry.name, entry.specifier);
      installedRows.push(`${entry.name}@${entry.specifier}|${approvedItem.scope}|${integrity}`);
    }
  }

  for (const workspaceKey of ALLOWED_WORKSPACE_LINKS.keys()) {
    if (!seenWorkspaceLinks.has(workspaceKey)) {
      const [, section, name] = workspaceKey.split('|');
      fail(`Required workspace link is missing: apps/desktop/package.json ${section}.${name}.`);
    }
  }

  for (const platformPeerKey of ALLOWED_PLATFORM_PEERS.keys()) {
    if (!seenPlatformPeers.has(platformPeerKey)) {
      const [owner, section, name] = platformPeerKey.split('|');
      fail(
        `Required platform peer is missing: ${manifestLabel(/** @type {Owner} */ (owner), /** @type {DirectSection} */ (section), name)}.`,
      );
    }
  }

  verifyInstalledInventory(approvedRows, installedRows);
  return {
    approvedCount: approved.length,
    workspaceLinkCount: seenWorkspaceLinks.size,
    platformPeerCount: seenPlatformPeers.size,
  };
}

/** @param {string} path @returns {Promise<DirectManifest>} */
async function readJson(path) {
  return JSON.parse(await readFile(resolve(path), 'utf8'));
}

/** @param {PackageReview} review */
async function verifyRepositoryInstallation(review) {
  const currentManifests = /** @type {OwnerManifests} */ (
    Object.fromEntries(
      await Promise.all(
        Object.entries(OWNER_PATHS).map(async ([owner, path]) => [owner, await readJson(path)]),
      ),
    )
  );
  const result = verifyInstalledWorkspace({
    approvedRows: review.rows,
    baselineManifests: APPROVED_DIRECT_BASELINE,
    currentManifests,
    lockfileText: await readFile(resolve('pnpm-lock.yaml'), 'utf8'),
  });
  return result;
}

async function runCli() {
  const args = process.argv.slice(2);
  if ((args.length !== 2 && args.length !== 3) || args[0] !== '--record') {
    fail(
      'Usage: node scripts/verify-phase-5-package-approval.mjs --record <05-01-PACKAGE-REVIEW.md> [--installed]',
    );
  }
  if (args.length === 3 && args[2] !== '--installed') {
    fail(`Unsupported option: ${args[2]}.`);
  }

  const recordPath = resolve(args[1]);
  const review = verifyApprovedPackageReview(await readFile(recordPath, 'utf8'));
  const installed = args[2] === '--installed' ? await verifyRepositoryInstallation(review) : null;
  console.log(
    `Phase 5 package approval valid: ${review.inventory.length} exact package(s), ${review.inventoryDigest}, approved by Mateus at ${review.approvedAt}.`,
  );
  if (installed) {
    console.log(
      `Installed inventory valid: ${installed.approvedCount} approved registry addition(s), ${installed.workspaceLinkCount} approved workspace link(s), ${installed.platformPeerCount} exact pre-existing platform peer(s), preserved baseline, and matching lockfile integrity.`,
    );
  }
}

const isCli = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isCli) {
  runCli().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Phase 5 package approval failed: ${message}`);
    console.error(
      'Review the exact inventory, set the four canonical approval fields, and rerun the command. No dependency transaction was performed.',
    );
    process.exitCode = 1;
  });
}
