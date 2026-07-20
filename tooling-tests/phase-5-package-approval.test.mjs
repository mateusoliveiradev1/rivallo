import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  computeInventoryDigest,
  verifyApprovedPackageReview,
  verifyInstalledInventory,
  verifyInstalledWorkspace,
} from '../scripts/verify-phase-5-package-approval.mjs';

const ROW_A =
  '@playwright/test@1.61.1|root-dev|sha512-8nKv6+0RJSL9FE4jYOEGXnPeM/Hg12qZpmqzZjRh3qM0Y7c3z1mrOTfFLids72RDQYVh9WpLEfR5WdpNX4fkig==';
const ROW_B =
  'lucide-react@1.24.0|icons-runtime|sha512-YT6mBD8lGKkg4nM39enlm94/sfJIiW0YKUT60fBy4YK8tai31ylg1VhGNWxkpSKHo9UagfnZqwIff3HTDQwXeA==';
const VALID_ROWS = [ROW_A, ROW_B];
const WORKSPACE_BASELINE = {
  root: { devDependencies: { existing: '^1.0.0' } },
  desktop: { dependencies: { '@rivallo/contracts-client': 'workspace:*' } },
  icons: {},
  designTokens: {},
};

function makeInstalledWorkspace() {
  return {
    approvedRows: VALID_ROWS,
    baselineManifests: structuredClone(WORKSPACE_BASELINE),
    currentManifests: {
      root: {
        devDependencies: /** @type {Record<string, string>} */ ({
          existing: '^1.0.0',
          '@playwright/test': '1.61.1',
        }),
      },
      desktop: {
        dependencies: /** @type {Record<string, string>} */ ({
          '@rivallo/contracts-client': 'workspace:*',
          '@rivallo/design-tokens': 'workspace:*',
          '@rivallo/icons': 'workspace:*',
        }),
      },
      icons: {
        dependencies: /** @type {Record<string, string>} */ ({ 'lucide-react': '1.24.0' }),
        peerDependencies: /** @type {Record<string, string>} */ ({ react: '19.2.7' }),
      },
      designTokens: {},
    },
    lockfileText: `packages:
  '@playwright/test@1.61.1':
    resolution: {integrity: ${ROW_A.split('|')[2]}}
  lucide-react@1.24.0:
    resolution: {integrity: ${ROW_B.split('|')[2]}}
`,
  };
}

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

/** @param {string} review @param {string} field */
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
    expect(review.inventory).toHaveLength(17);
    expect(review.inventoryDigest).toBe(
      'sha256:557f4d9a4e4c70efbc32a73e684c88767bb8d350870c8b3e25083c13660ab7f1',
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

describe('installed workspace comparison', () => {
  it('accepts preserved baseline entries, the exact registry delta, approved links, and lock integrities', () => {
    expect(verifyInstalledWorkspace(makeInstalledWorkspace())).toEqual({
      approvedCount: 2,
      workspaceLinkCount: 2,
      platformPeerCount: 1,
    });
  });

  it('rejects an extra or missing approved direct dependency', () => {
    const extra = makeInstalledWorkspace();
    extra.currentManifests.root.devDependencies = {
      ...extra.currentManifests.root.devDependencies,
      unapproved: '1.0.0',
    };
    expect(() => verifyInstalledWorkspace(extra)).toThrow(/Unapproved direct dependency/u);

    const missing = makeInstalledWorkspace();
    missing.currentManifests.icons.dependencies = {};
    expect(() => verifyInstalledWorkspace(missing)).toThrow(/missing approved package/u);
  });

  it('rejects a modified or removed baseline dependency', () => {
    const modified = makeInstalledWorkspace();
    modified.currentManifests.root.devDependencies.existing = '^2.0.0';
    expect(() => verifyInstalledWorkspace(modified)).toThrow(/Baseline direct dependency changed/u);

    const removed = makeInstalledWorkspace();
    removed.currentManifests.root.devDependencies = {
      '@playwright/test': '1.61.1',
    };
    expect(() => verifyInstalledWorkspace(removed)).toThrow(
      /Baseline direct dependency was removed/u,
    );
  });

  it('rejects an approved package placed in the wrong owner scope', () => {
    const fixture = makeInstalledWorkspace();
    fixture.currentManifests.icons.dependencies = {};
    fixture.currentManifests.desktop.dependencies = {
      ...fixture.currentManifests.desktop.dependencies,
      'lucide-react': '1.24.0',
    };
    expect(() => verifyInstalledWorkspace(fixture)).toThrow(/wrong scope/u);
  });

  it('rejects a wrong or additional workspace link', () => {
    const wrongSpecifier = makeInstalledWorkspace();
    wrongSpecifier.currentManifests.desktop.dependencies['@rivallo/icons'] = 'workspace:^';
    expect(() => verifyInstalledWorkspace(wrongSpecifier)).toThrow(/Unapproved workspace link/u);

    const extraLink = makeInstalledWorkspace();
    extraLink.currentManifests.desktop.dependencies = {
      ...extraLink.currentManifests.desktop.dependencies,
      '@rivallo/future': 'workspace:*',
    };
    expect(() => verifyInstalledWorkspace(extraLink)).toThrow(/Unapproved workspace link/u);
  });

  it('rejects a missing or mismatched React platform peer', () => {
    const missing = makeInstalledWorkspace();
    missing.currentManifests.icons.peerDependencies = {};
    expect(() => verifyInstalledWorkspace(missing)).toThrow(/Required platform peer is missing/u);

    const mismatched = makeInstalledWorkspace();
    mismatched.currentManifests.icons.peerDependencies.react = '^19.0.0';
    expect(() => verifyInstalledWorkspace(mismatched)).toThrow(/must be 19\.2\.7/u);
  });

  it('rejects lockfile integrity drift', () => {
    const fixture = makeInstalledWorkspace();
    fixture.lockfileText = fixture.lockfileText.replace(ROW_B.split('|')[2], ROW_A.split('|')[2]);
    expect(() => verifyInstalledWorkspace(fixture)).toThrow(/integrity diverges/u);
  });
});
