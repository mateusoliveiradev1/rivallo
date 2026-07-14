import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const openapiDocument = resolve(repositoryRoot, 'contracts', 'openapi.json');
/** @param {string} script @param {NodeJS.ProcessEnv} [environment] */
const runNode = (script, environment = {}) =>
  spawnSync(process.execPath, [script], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, RUSTUP_AUTO_INSTALL: '0', ...environment },
  });

describe('OpenAPI export pipeline', () => {
  it('exports byte-identical Rust-owned schema documents', () => {
    expect(runNode('scripts/generate-openapi.mjs').status).toBe(0);
    const first = readFileSync(openapiDocument);
    expect(runNode('scripts/generate-openapi.mjs').status).toBe(0);
    expect(readFileSync(openapiDocument).equals(first)).toBe(true);
  });

  it('checks the committed document without mutating it', () => {
    const before = readFileSync(openapiDocument);
    expect(runNode('scripts/verify-openapi-drift.mjs').status).toBe(0);
    expect(readFileSync(openapiDocument).equals(before)).toBe(true);
  });

  it('reports controlled drift without repairing the expected document', () => {
    const temporaryDirectory = mkdtempSync(resolve(tmpdir(), 'rivallo-openapi-test-'));
    const changedDocument = resolve(temporaryDirectory, 'openapi.json');
    const changedBytes = Buffer.concat([readFileSync(openapiDocument), Buffer.from('\n')]);

    try {
      writeFileSync(changedDocument, changedBytes);
      const result = runNode('scripts/verify-openapi-drift.mjs', {
        OPENAPI_DOCUMENT: changedDocument,
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('pnpm contracts:openapi:generate');
      expect(readFileSync(changedDocument).equals(changedBytes)).toBe(true);
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it('preserves canonical versioned schemas without runtime registration', () => {
    const document = JSON.parse(readFileSync(openapiDocument, 'utf8'));
    const contractsSource = readFileSync(
      resolve(repositoryRoot, 'crates', 'contracts', 'src', 'lib.rs'),
      'utf8',
    );
    const platformSource = readFileSync(
      resolve(repositoryRoot, 'crates', 'platform', 'src', 'lib.rs'),
      'utf8',
    );
    const version = contractsSource.match(/CONTRACT_VERSION: &str = "([^"]+)"/)?.[1];

    expect(document.info.version).toBe(version);
    expect(document.components.schemas.ContractManifest).toBeDefined();
    expect(document.paths).toEqual({});
    expect(platformSource).not.toMatch(/axum|listen\(|route\(|server/i);
  });
});
