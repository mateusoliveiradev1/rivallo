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
  it('exposes the generated Fetch client and configuration surface only from the public package', async () => {
    const publicEntrypoint = packageRequire.resolve('@rivallo/contracts-client');
    const contractClient = await import(publicEntrypoint);

    expect(contractClient.client).toBeDefined();
    expect(contractClient.createClient).toBeTypeOf('function');
    expect(contractClient.createConfig).toBeTypeOf('function');
    expect(contractClient).not.toHaveProperty('Auth');
    expect(contractClient).not.toHaveProperty('serverSentEvents');
  });

  it('derives generated types, version schema, and Fetch client only from committed OpenAPI', () => {
    const configuration = readFileSync(resolve(packageDirectory, 'openapi-ts.config.ts'), 'utf8');
    const document = JSON.parse(
      readFileSync(resolve(repositoryRoot, 'contracts', 'openapi.json'), 'utf8'),
    );
    const generatedTypes = readFileSync(join(generatedDirectory, 'types.gen.ts'), 'utf8');
    const generatedClient = readFileSync(join(generatedDirectory, 'client.gen.ts'), 'utf8');

    expect(configuration).toContain("input: '../../contracts/openapi.json'");
    expect(configuration).toContain("'@hey-api/client-fetch'");
    expect(configuration).not.toMatch(/https?:\/\//);
    expect(document.info.version).toBe('0.1.0');
    expect(generatedTypes).toContain('export type ContractManifest');
    expect(generatedClient).toContain('createClient');
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

  it('checks in a temporary tree without mutating committed output', () => {
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

  it('reports controlled drift without repairing the supplied generated tree', () => {
    const temporaryDirectory = mkdtempSync(resolve(tmpdir(), 'rivallo-contract-client-test-'));
    const changedOutput = resolve(temporaryDirectory, 'generated');

    try {
      cpSync(generatedDirectory, changedOutput, { recursive: true });
      const changedFile = join(changedOutput, 'types.gen.ts');
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

  it('contains no handwritten schema definitions or configured auth and retry behavior', () => {
    const sourceFiles = inventory(resolve(packageDirectory, 'src')).map((file) =>
      file.replaceAll('\\', '/'),
    );
    const generatedFiles = inventory(generatedDirectory);
    const packageEntrypoint = readFileSync(resolve(packageDirectory, 'src', 'index.ts'), 'utf8');
    const configuration = readFileSync(resolve(packageDirectory, 'openapi-ts.config.ts'), 'utf8');

    expect(sourceFiles).toEqual(
      [
        ...generatedFiles.map((file) => `generated/${file.replaceAll('\\', '/')}`),
        'index.ts',
      ].sort(),
    );
    expect(packageEntrypoint).toBe("export * from './generated/index.js';\n");
    expect(configuration).not.toMatch(/auth|retry|axios|application/i);
  });
});
