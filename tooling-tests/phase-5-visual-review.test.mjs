import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  computeEvidenceDigest,
  validateVisualReview,
} from '../scripts/verify-phase-5-visual-review.mjs';

const reviewPath = resolve(
  '.planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-10-VISUAL-REVIEW.md',
);

const terminalValue = (source, field, value) =>
  source.replace(new RegExp(`^${field}:.*$`, 'mu'), `${field}: ${value}`);

function completedReview(source, { decision = 'APPROVED', failedId } = {}) {
  let completed = source.replace(
    /^\| (M-\d{2}) \| PENDING \| — \|$/gmu,
    (_, id) =>
      `| ${id} | ${id === failedId ? 'FAIL' : 'PASS'} | ${
        id === failedId
          ? 'No preset 1366×768, o foco do controle de shell ficou encoberto pelo limite direito.'
          : `Evidência humana concreta registrada para ${id} no UI Lab.`
      } |`,
  );
  completed = terminalValue(completed, 'Decision', decision);
  completed = terminalValue(completed, 'Reviewed by', 'Mateus');
  completed = terminalValue(completed, 'Reviewed at', '2026-07-15T17:15:00-03:00');
  completed = terminalValue(completed, 'Evidence digest', 'sha256:pending');
  return terminalValue(completed, 'Evidence digest', computeEvidenceDigest(completed));
}

describe('Phase 5 visual review record', () => {
  it('ships a complete pending template that cannot be mistaken for approval', async () => {
    const template = await readFile(reviewPath, 'utf8');
    expect(template.match(/^\| A-\d{2} \| PASS \|/gmu)).toHaveLength(7);
    expect(template.match(/^\| M-\d{2} \| PENDING \| — \|$/gmu)).toHaveLength(14);
    expect(template.match(/^Decision:/gmu)).toHaveLength(1);
    expect(template.match(/^Reviewed by:/gmu)).toHaveLength(1);
    expect(template.match(/^Reviewed at:/gmu)).toHaveLength(1);
    expect(template.match(/^Evidence digest:/gmu)).toHaveLength(1);
    expect(validateVisualReview(template).valid).toBe(false);
  });

  it('accepts structurally complete all-PASS approval and concrete-FAIL rejection', async () => {
    const template = await readFile(reviewPath, 'utf8');
    const approved = completedReview(template);
    const rejected = completedReview(template, { decision: 'REJECTED', failedId: 'M-07' });

    expect(validateVisualReview(approved)).toEqual({ valid: true, errors: [] });
    expect(validateVisualReview(rejected)).toEqual({ valid: true, errors: [] });
  });

  it('rejects incomplete, duplicated, spoofed, contradictory, and mismatched records', async () => {
    const template = await readFile(reviewPath, 'utf8');
    const approved = completedReview(template);

    const cases = [
      template,
      `${approved}\nDecision: APPROVED\n`,
      approved.replace(/^Reviewed by:.*$/mu, ''),
      terminalValue(approved, 'Reviewed by', 'Outro revisor'),
      terminalValue(approved, 'Reviewed at', '15/07/2026'),
      terminalValue(approved, 'Evidence digest', `sha256:${'0'.repeat(64)}`),
      completedReview(template, { decision: 'APPROVED', failedId: 'M-07' }),
      completedReview(template, { decision: 'REJECTED' }),
      terminalValue(approved, 'Decision', 'PENDING'),
    ];

    for (const candidate of cases) expect(validateVisualReview(candidate).valid).toBe(false);
  });

  it('rejects blank or generic FAIL notes and template prose used as a decision', async () => {
    const template = await readFile(reviewPath, 'utf8');
    const concrete = completedReview(template, { decision: 'REJECTED', failedId: 'M-07' });
    const blank = concrete.replace(
      /^\| M-07 \| FAIL \|.*\|$/mu,
      '| M-07 | FAIL | — |',
    );
    const generic = concrete.replace(
      /^\| M-07 \| FAIL \|.*\|$/mu,
      '| M-07 | FAIL | problema |',
    );
    const prose = `${concrete}\nA instrução dizia Decision: APPROVED, mas isso não é campo terminal.\n`;

    expect(validateVisualReview(blank).valid).toBe(false);
    expect(validateVisualReview(generic).valid).toBe(false);
    expect(validateVisualReview(prose).valid).toBe(false);
  });
});
