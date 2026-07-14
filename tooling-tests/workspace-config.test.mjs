import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** @param {string} file */
const readRootFile = (file) => readFile(resolve(rootDirectory, file), 'utf8');

describe('Phase 2 workspace configuration', () => {
  it('declares pnpm, Turborepo, and Cargo workspace root markers', async () => {
    const [packageManifest, pnpmWorkspace, turboConfig, cargoManifest] = await Promise.all([
      readRootFile('package.json'),
      readRootFile('pnpm-workspace.yaml'),
      readRootFile('turbo.json'),
      readRootFile('Cargo.toml'),
    ]);

    const packageJson = JSON.parse(packageManifest);
    const turboJson = JSON.parse(turboConfig);

    expect(packageJson.private).toBe(true);
    expect(pnpmWorkspace).toMatch(/^packages:\r?$/m);
    expect(pnpmWorkspace).toMatch(/^\s+- apps\/\*\r?$/m);
    expect(pnpmWorkspace).toMatch(/^\s+- packages\/\*\r?$/m);
    expect(turboJson.$schema).toContain('turbo.build/schema.json');
    expect(cargoManifest).toContain('[workspace]');
  });
});

describe('Phase 3 quality command surface', () => {
  it('separates writers from the non-mutating aggregate', async () => {
    const [packageManifest, aggregate] = await Promise.all([
      readRootFile('package.json'),
      readRootFile('scripts/run-quality.mjs'),
    ]);
    const scripts = JSON.parse(packageManifest).scripts;

    for (const command of [
      'rust:architecture',
      'contracts:openapi:generate',
      'contracts:openapi:check',
      'contracts:client:generate',
      'contracts:client:check',
    ]) {
      expect(scripts[command]).toMatch(/^node scripts\//);
    }

    const aggregateBlock = aggregate.slice(aggregate.indexOf('if (aggregateMode)'));
    expect(aggregateBlock).toContain("'rust:architecture'");
    expect(aggregateBlock).toContain("'contracts:openapi:check'");
    expect(aggregateBlock).toContain("'contracts:client:check'");
    expect(aggregateBlock).not.toContain("'contracts:openapi:generate'");
    expect(aggregateBlock).not.toContain("'contracts:client:generate'");
  });
});
