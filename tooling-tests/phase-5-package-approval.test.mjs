import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  computeInventoryDigest,
  verifyApprovedPackageReview,
  verifyInstalledInventory,
} from '../scripts/verify-phase-5-package-approval.mjs';

const ROW_A =
  '@playwright/test@1.61.1|root-dev|sha512-8nKv6+0RJSL9FE4jYOEGXnPeM/Hg12qZpmqzZjRh3qM0Y7c3z1mrOTfFLids72RDQYVh9WpLEfR5WdpNX4fkig==';
const ROW_B =
  'lucide-react@1.24.0|icons-runtime|sha512-YT6mBD8lGKkg4nM39enlm94/sfJIiW0YKUT60fBy4YK8tai31ylg1VhGNWxkpSKHo9UagfnZqwIff3HTDQwXeA==';
const VALID_ROWS = [ROW_A, ROW_B];

function makeReview({
  decision = 'APPROVED',
  approvedBy = 'Mateus',
  approvedAt = '2026-07-15T12:34:56-03:00',
  rows = VALID_ROWS,
  digest = computeInventoryDigest(rows),
  note = '',
} = {}) {
  return `# Fixture review

<!-- phase-5-package-inventory:start -->
${rows.join('\n')}
<!-- phase-5-package-inventory:end -->

${note}
Decision: ${decision}
Approved by: ${approvedBy}
Approved at: ${approvedAt}
Inventory digest: ${digest}
`;
}

function removeField(review, field) {
  return review
    .split('\n')
    .filter((line) => !line.startsWith(`${field}:`))
    .join('\n');
}

describe('Phase 5 package approval record', () => {
  it('keeps the checked-in review structurally valid after Mateus approval', async () => {
    const reviewText = await readFile(
      new URL(
        '../.planning/phases/05-design-tokens-icon-policy-and-ui-primitives/05-01-PACKAGE-REVIEW.md',
        import.meta.url,
      ),
      'utf8',
    );
    const review = verifyApprovedPackageReview(reviewText);

    expect(review.decision).toBe('APPROVED');
    expect(review.approvedBy).toBe('Mateus');
    expect(review.inventory).toHaveLength(16);
    expect(review.inventoryDigest).toBe(
      'sha256:56d9bfb036d3b3d42acc09faa968911cfc5aa760def3c991288dfe2e8fcf8b7f',
    );
  });

  it('accepts one canonical approved record', () => {
    const review = verifyApprovedPackageReview(makeReview());

    expect(review.decision).toBe('APPROVED');
    expect(review.approvedBy).toBe('Mateus');
    expect(review.rows).toEqual(VALID_ROWS);
  });

  it.each(['PENDING', 'REJECTED'])('rejects a %s decision in approval mode', (decision) => {
    expect(() => verifyApprovedPackageReview(makeReview({ decision }))).toThrow(
      /Decision must be APPROVED/u,
    );
  });

  it('rejects a conflicting negative approval phrase', () => {
    expect(() =>
      verifyApprovedPackageReview(makeReview({ note: 'Approval note: NOT APPROVED' })),
    ).toThrow(/negative approval phrase/u);
  });

  it.each(['Decision', 'Approved by', 'Approved at', 'Inventory digest'])(
    'rejects a missing %s field',
    (field) => {
      expect(() => verifyApprovedPackageReview(removeField(makeReview(), field))).toThrow(
        new RegExp(`exactly one ${field.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}: field`, 'u'),
      );
    },
  );

  it.each(['Decision', 'Approved by', 'Approved at', 'Inventory digest'])(
    'rejects a duplicate %s field',
    (field) => {
      const original = makeReview();
      const value = original.split('\n').find((line) => line.startsWith(`${field}:`));
      expect(() => verifyApprovedPackageReview(`${original}${value}\n`)).toThrow(
        new RegExp(`exactly one ${field.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}: field`, 'u'),
      );
    },
  );

  it('rejects a reviewer other than Mateus', () => {
    expect(() => verifyApprovedPackageReview(makeReview({ approvedBy: 'Maria' }))).toThrow(
      /exactly Mateus/u,
    );
  });

  it.each([
    '2026-07-15',
    '2026-02-30T12:00:00Z',
    '2026-07-15T12:00:00',
    '2026-07-15T25:00:00Z',
    'not-a-date',
  ])('rejects invalid ISO-8601 approval time %s', (approvedAt) => {
    expect(() => verifyApprovedPackageReview(makeReview({ approvedAt }))).toThrow(/ISO-8601/u);
  });

  it('rejects malformed and mismatched digests', () => {
    expect(() => verifyApprovedPackageReview(makeReview({ digest: 'sha256:ABC' }))).toThrow(
      /malformed/u,
    );
    expect(() =>
      verifyApprovedPackageReview(makeReview({ digest: `sha256:${'0'.repeat(64)}` })),
    ).toThrow(/digest mismatch/u);
  });

  it('rejects duplicate package rows and non-canonical ordering', () => {
    expect(() => verifyApprovedPackageReview(makeReview({ rows: [ROW_A, ROW_A] }))).toThrow(
      /Duplicate canonical inventory row/u,
    );
    expect(() => verifyApprovedPackageReview(makeReview({ rows: [ROW_B, ROW_A] }))).toThrow(
      /must be sorted/u,
    );
  });
});

describe('installed inventory comparison', () => {
  it('accepts an exact installed inventory', () => {
    expect(verifyInstalledInventory(VALID_ROWS, [...VALID_ROWS].reverse())).toBe(true);
  });

  it.each([
    ['name', [ROW_A, ROW_B.replace('lucide-react', 'lucide-alt')], /missing approved package/u],
    ['version', [ROW_A, ROW_B.replace('@1.24.0', '@1.23.0')], /version diverges/u],
    ['scope', [ROW_A, ROW_B.replace('|icons-runtime|', '|desktop-runtime|')], /scope diverges/u],
    [
      'integrity',
      [ROW_A, ROW_B.replace(/sha512-.+$/u, ROW_A.split('|')[2])],
      /integrity diverges/u,
    ],
  ])('rejects installed %s divergence', (_property, installedRows, message) => {
    expect(() => verifyInstalledInventory(VALID_ROWS, installedRows)).toThrow(message);
  });

  it('rejects missing and extra installed rows', () => {
    expect(() => verifyInstalledInventory(VALID_ROWS, [ROW_A])).toThrow(
      /missing approved package/u,
    );
    expect(() =>
      verifyInstalledInventory(VALID_ROWS, [
        ...VALID_ROWS,
        '@types/react@19.2.17|root-dev|sha512-MXfmqaVPEVgkBT/aY0aGCkRWWtByiYQXo3xdQ8r5RzuFrPiRn8Gar2tQdXSUQ2GKV3bkXckek89V8wQBY2Q/Aw==',
      ]),
    ).toThrow(/unapproved package/u);
  });
});
