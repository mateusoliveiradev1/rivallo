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
    expect(pnpmWorkspace).toContain('packages: []');
    expect(turboJson.$schema).toContain('turbo.build/schema.json');
    expect(cargoManifest).toContain('[workspace]');
  });
});
