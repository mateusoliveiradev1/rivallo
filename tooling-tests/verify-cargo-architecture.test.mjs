import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import {
  auditCargoArchitecture,
  formatArchitectureFailures,
} from '../scripts/verify-cargo-architecture.mjs';

/** @param {string} name */
const packageId = (name) => `registry+https://example.test/${name}#1.0.0`;

/** @param {Record<string, string[]>} edges */
const metadataFor = (edges) => {
  const names = new Set(Object.keys(edges));
  for (const dependencies of Object.values(edges)) {
    for (const dependency of dependencies) names.add(dependency);
  }

  const ids = new Map([...names].map((name) => [name, packageId(name)]));
  return {
    packages: [...names].map((name) => ({ id: ids.get(name) ?? '', name })),
    workspace_members: [
      'rivallo-domain',
      'rivallo-application',
      'rivallo-contracts',
      'rivallo-platform',
    ].map((name) => ids.get(name) ?? ''),
    resolve: {
      nodes: [...names].map((name) => ({
        id: ids.get(name) ?? '',
        dependencies: (edges[name] ?? []).map((dependency) => ids.get(dependency) ?? ''),
      })),
    },
  };
};

const approvedEdges = {
  'rivallo-domain': [],
  'rivallo-application': ['rivallo-domain'],
  'rivallo-contracts': [],
  'rivallo-platform': ['rivallo-application', 'rivallo-contracts'],
};

describe('Cargo architecture audit', () => {
  it('accepts the approved D-01 resolved workspace graph', () => {
    expect(auditCargoArchitecture(metadataFor(approvedEdges))).toEqual([]);
  });

  it('rejects application-to-contracts with its dependency path', () => {
    const failures = auditCargoArchitecture(
      metadataFor({
        ...approvedEdges,
        'rivallo-application': ['rivallo-domain', 'rivallo-contracts'],
      }),
    );

    expect(formatArchitectureFailures(failures)).toMatch(
      /rivallo-application -> rivallo-contracts/,
    );
  });

  it('rejects inverted Phase-3 crate edges with their dependency path', () => {
    const failures = auditCargoArchitecture(
      metadataFor({ ...approvedEdges, 'rivallo-domain': ['rivallo-application'] }),
    );

    expect(formatArchitectureFailures(failures)).toMatch(/rivallo-domain -> rivallo-application/);
  });

  it('rejects transitive forbidden domain dependencies with its dependency path', () => {
    const failures = auditCargoArchitecture(
      metadataFor({ ...approvedEdges, 'rivallo-domain': ['serde'], serde: ['reqwest'] }),
    );

    expect(formatArchitectureFailures(failures)).toMatch(/rivallo-domain -> serde -> reqwest/);
  });

  it('accepts live workspace metadata', () => {
    const cargo = process.platform === 'win32' ? 'cargo.exe' : 'cargo';
    const stdout = execFileSync(cargo, ['metadata', '--format-version=1'], {
      encoding: 'utf8',
      env: { ...process.env, RUSTUP_AUTO_INSTALL: '0' },
      maxBuffer: 64 * 1024 * 1024,
    });

    expect(auditCargoArchitecture(JSON.parse(stdout))).toEqual([]);
  });
});
