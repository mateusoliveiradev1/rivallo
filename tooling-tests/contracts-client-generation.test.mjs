import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectory = resolve(repositoryRoot, 'packages', 'contracts-client');
const generatedDirectory = resolve(packageDirectory, 'src', 'generated');
const packageRequire = createRequire(join(packageDirectory, 'package.json'));

/** @param {string} script @param {NodeJS.ProcessEnv} [environment] */
const runNode = (script, environment = {}) =>
  spawnSync(process.execPath, [script], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, ...environment },
  });

/** @param {string} directory */
const inventory = (directory) =>
  readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)))
    .sort();

describe('generated contracts client', () => {
  it('exposes generated metadata, types, and the direct Fetch operation from the package root', async () => {
    const publicEntrypoint = packageRequire.resolve('@rivallo/contracts-client');
    const contractClient = await import(publicEntrypoint);

    expect(contractClient.contractManifestForGeneration).toBeTypeOf('function');
    expect(contractClient.getContractManifestForGenerationUrl()).toBe('/_contract/manifest');
    expect(contractClient).not.toHaveProperty('client');
    expect(contractClient).not.toHaveProperty('createClient');
  });

  it('derives the direct Fetch operation and types solely from committed local OpenAPI', () => {
    const configuration = readFileSync(resolve(packageDirectory, 'orval.config.ts'), 'utf8');
    const document = JSON.parse(
      readFileSync(resolve(repositoryRoot, 'contracts', 'openapi.json'), 'utf8'),
    );
    const generated = readFileSync(join(generatedDirectory, 'contracts.ts'), 'utf8');

    expect(configuration).toContain("import { defineConfig } from 'orval'");
    expect(configuration).toContain("target: '../../contracts/openapi.json'");
    expect(configuration).toContain("client: 'fetch'");
    expect(configuration).not.toMatch(/https?:\/\/|mutator|mock|baseUrl|security/i);
    expect(document.paths['/_contract/manifest'].get.parameters).toBeUndefined();
    expect(generated).toContain('export interface ContractManifest');
    expect(generated).toContain('contractManifestForGeneration');
    expect(generated).toContain('options?: RequestInit');
  });

  it('writes byte-identical complete generated trees', () => {
    expect(runNode('scripts/generate-contract-client.mjs').status).toBe(0);
    const firstFiles = inventory(generatedDirectory);
    const firstBytes = new Map(
      firstFiles.map((file) => [file, readFileSync(join(generatedDirectory, file))]),
    );

    expect(runNode('scripts/generate-contract-client.mjs').status).toBe(0);
    expect(inventory(generatedDirectory)).toEqual(firstFiles);
    for (const file of firstFiles) {
      const previousBytes = firstBytes.get(file);
      if (!previousBytes) throw new Error(`Missing generated file snapshot: ${file}`);
      expect(readFileSync(join(generatedDirectory, file)).equals(previousBytes)).toBe(true);
    }
  });

  it('checks a complete temporary tree without mutating committed output', () => {
    const before = new Map(
      inventory(generatedDirectory).map((file) => [
        file,
        readFileSync(join(generatedDirectory, file)),
      ]),
    );

    expect(runNode('scripts/verify-contract-client-drift.mjs').status).toBe(0);
    expect(inventory(generatedDirectory)).toEqual([...before.keys()]);
    for (const [file, bytes] of before) {
      expect(readFileSync(join(generatedDirectory, file)).equals(bytes)).toBe(true);
    }
  });

  it('reports supplied-tree drift without repairing it', () => {
    const temporaryDirectory = mkdtempSync(resolve(tmpdir(), 'rivallo-contract-client-test-'));
    const changedOutput = resolve(temporaryDirectory, 'generated');

    try {
      cpSync(generatedDirectory, changedOutput, { recursive: true });
      const changedFile = join(changedOutput, 'contracts.ts');
      const changedBytes = Buffer.concat([readFileSync(changedFile), Buffer.from('\n')]);
      writeFileSync(changedFile, changedBytes);

      const result = runNode('scripts/verify-contract-client-drift.mjs', {
        CONTRACT_CLIENT_DIRECTORY: changedOutput,
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('pnpm contracts:client:generate');
      expect(readFileSync(changedFile).equals(changedBytes)).toBe(true);
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it('has no transitive public auth, security, SSE, retry, or backoff surface', () => {
    const generatedPublicSource = inventory(generatedDirectory)
      .map((file) => readFileSync(join(generatedDirectory, file), 'utf8'))
      .join('\n');
    const packageEntrypoint = readFileSync(resolve(packageDirectory, 'src', 'index.ts'), 'utf8');

    expect(inventory(generatedDirectory)).toEqual(['contracts.ts']);
    expect(packageEntrypoint).toBe("export * from './generated/contracts.js';\n");
    expect(`${packageEntrypoint}\n${generatedPublicSource}`).not.toMatch(
      /\b(auth|security|sse|retry|backoff)\b/i,
    );
  });
});
