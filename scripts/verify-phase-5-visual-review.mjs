import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const automatedIds = Array.from(
  { length: 7 },
  (_, index) => `A-${String(index + 1).padStart(2, '0')}`,
);
const manualIds = Array.from(
  { length: 14 },
  (_, index) => `M-${String(index + 1).padStart(2, '0')}`,
);
const genericFailNotes = new Set(['erro', 'falhou', 'gap', 'problema', 'ajustar', 'não passou']);

/** @typedef {{ id: string, result: 'PASS' | 'FAIL' | 'PENDING', note: string }} EvidenceRow */

/** @param {string} source @returns {{ rows: Map<string, EvidenceRow>, duplicates: Set<string> }} */
function parseRows(source) {
  const rows = new Map();
  const duplicates = new Set();
  const pattern = /^\|\s+([AM]-\d{2})\s+\|\s+(PASS|FAIL|PENDING)\s+\|\s+(.*?)\s+\|$/gmu;
  for (const match of source.matchAll(pattern)) {
    const [, id, result, note] = match;
    if (rows.has(id)) duplicates.add(id);
    rows.set(id, { id, result, note: note.trim() });
  }
  return { rows, duplicates };
}

/** @param {string} source @param {string} name */
function terminalField(source, name) {
  const lineMatches = [...source.matchAll(new RegExp(`^${name}: (.*)$`, 'gmu'))];
  const occurrenceCount = [...source.matchAll(new RegExp(`${name}:`, 'gu'))].length;
  return {
    validCount: lineMatches.length === 1 && occurrenceCount === 1,
    value: lineMatches[0]?.[1]?.trim() ?? '',
  };
}

/** @param {string} source */
export function computeEvidenceDigest(source) {
  const { rows } = parseRows(source);
  const canonicalRows = [];
  for (const id of [...automatedIds, ...manualIds]) {
    const row = rows.get(id);
    if (row && (row.id.startsWith('A-') || row.result !== 'PENDING')) {
      canonicalRows.push(`${row.id}|${row.result}|${row.note}`);
    }
  }
  canonicalRows.sort();
  return `sha256:${createHash('sha256').update(canonicalRows.join('\n'), 'utf8').digest('hex')}`;
}

/** @param {string} source */
export function validateVisualReview(source) {
  const errors = [];
  const { rows, duplicates } = parseRows(source);

  for (const id of duplicates) errors.push(`Duplicate evidence row: ${id}.`);
  for (const id of [...automatedIds, ...manualIds]) {
    if (!rows.has(id)) errors.push(`Missing evidence row: ${id}.`);
  }
  for (const id of automatedIds) {
    const row = rows.get(id);
    if (row?.result !== 'PASS' || !row.note || row.note === '—') {
      errors.push(`Automated evidence ${id} must be PASS with a concrete note.`);
    }
  }
  for (const id of manualIds) {
    const row = rows.get(id);
    if (!row || row.result === 'PENDING' || !row.note || row.note === '—') {
      errors.push(`Manual evidence ${id} must be PASS or FAIL with a concrete note.`);
    }
  }

  const decision = terminalField(source, 'Decision');
  const reviewer = terminalField(source, 'Reviewed by');
  const reviewedAt = terminalField(source, 'Reviewed at');
  const digest = terminalField(source, 'Evidence digest');
  const terminalFields = {
    Decision: decision,
    'Reviewed by': reviewer,
    'Reviewed at': reviewedAt,
    'Evidence digest': digest,
  };
  for (const [name, field] of Object.entries(terminalFields)) {
    if (!field.validCount) errors.push(`${name} must appear exactly once as a terminal field.`);
  }

  if (!['APPROVED', 'REJECTED'].includes(decision.value)) {
    errors.push('Decision must be APPROVED or REJECTED.');
  }
  if (reviewer.value !== 'Mateus') errors.push('Reviewed by must be exactly Mateus.');
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/u.test(
      reviewedAt.value,
    ) ||
    Number.isNaN(Date.parse(reviewedAt.value))
  ) {
    errors.push('Reviewed at must be a valid ISO-8601 timestamp with timezone.');
  }

  /** @type {EvidenceRow[]} */
  const manualRows = [];
  for (const id of manualIds) {
    const row = rows.get(id);
    if (row) manualRows.push(row);
  }
  const failedRows = manualRows.filter((row) => row.result === 'FAIL');
  if (decision.value === 'APPROVED' && failedRows.length > 0) {
    errors.push('APPROVED requires every manual evidence row to PASS.');
  }
  if (decision.value === 'REJECTED' && failedRows.length === 0) {
    errors.push('REJECTED requires at least one concrete FAIL row.');
  }
  for (const row of failedRows) {
    const normalized = row.note.toLocaleLowerCase('pt-BR').trim();
    if (row.note === '—' || row.note.length < 20 || genericFailNotes.has(normalized)) {
      errors.push(`FAIL row ${row.id} requires a concrete, actionable gap note.`);
    }
  }

  const expectedDigest = computeEvidenceDigest(source);
  if (!/^sha256:[a-f0-9]{64}$/u.test(digest.value) || digest.value !== expectedDigest) {
    errors.push(`Evidence digest mismatch; expected ${expectedDigest}.`);
  }

  return { valid: errors.length === 0, errors };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const reviewPath = process.argv[2];
  if (!reviewPath) {
    console.error('Usage: node scripts/verify-phase-5-visual-review.mjs <review-file>');
    process.exit(2);
  }
  const source = await readFile(resolve(reviewPath), 'utf8');
  const result = validateVisualReview(source);
  if (!result.valid) {
    for (const error of result.errors) console.error(`- ${error}`);
    console.error('Visual review record is incomplete or inconsistent.');
    process.exit(1);
  }
  console.log('Visual review record structure is valid. This does not determine visual quality.');
}
