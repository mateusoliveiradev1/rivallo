import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** @param {string} file */
const rootFile = (file) => readFile(resolve(root, file), 'utf8');

/** @param {string} directory */
const sourceFiles = async (directory) => {
  const entries = await readdir(resolve(root, directory), { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => resolve(entry.parentPath, entry.name));
};

describe('Phase 3 contracts pipeline', () => {
  it('proves Rust metadata and schemas produce the committed OpenAPI/client chain', async () => {
    const [contracts, platform, document, generated] = await Promise.all([
      rootFile('crates/contracts/src/lib.rs'),
      rootFile('crates/platform/src/lib.rs'),
      rootFile('contracts/openapi.json'),
      rootFile('packages/contracts-client/src/generated/contracts.ts'),
    ]);

    expect(contracts).toContain('CONTRACT_VERSION');
    expect(contracts).toContain('ContractManifest');
    expect(platform).toContain('contract_manifest_for_generation');
    expect(document).toContain('"/_contract/manifest"');
    expect(generated).toContain('ContractManifest');
    expect(generated).toContain('contractManifestForGeneration');

    for (const script of [
      'scripts/verify-openapi-drift.mjs',
      'scripts/verify-contract-client-drift.mjs',
    ]) {
      execFileSync(process.execPath, [script], { cwd: root, stdio: 'pipe' });
    }
  }, 30_000);
});

describe('Phase 3 scope fences', () => {
  it('keeps inner crates and the contract pipeline free of runtime implementation', async () => {
    const files = await Promise.all(
      ['crates/domain', 'crates/application', 'crates/contracts'].map(sourceFiles),
    );
    files.push(
      [
        'scripts/generate-contract-client.mjs',
        'scripts/generate-openapi.mjs',
        'scripts/verify-contract-client-drift.mjs',
        'scripts/verify-openapi-drift.mjs',
      ].map((file) => resolve(root, file)),
    );
    const inventory = await Promise.all(
      files.flat().map(async (file) => [file, await readFile(file, 'utf8')]),
    );
    const prohibited = [
      /\b(axum|actix_web|warp|rocket)\b/i,
      /\btauri\b/i,
      /\b(sqlx|rusqlite|diesel|postgres|mongodb|redis)\b/i,
      /\b(docker|dockerfile|github actions|\.github\/workflows)\b/i,
      /\b(authentication|authorization|jwt|session|oauth)\b/i,
      /\b(multiplayer|websocket|socket\.io)\b/i,
    ];
    for (const [file, content] of inventory) {
      for (const pattern of prohibited)
        expect(content, `${file} must not contain ${pattern}`).not.toMatch(pattern);
    }
  });

  it('keeps the neutral operation test-only and unregistered', async () => {
    const [platform, document] = await Promise.all([
      rootFile('crates/platform/src/lib.rs'),
      rootFile('contracts/openapi.json'),
    ]);
    const operation = JSON.parse(document).paths['/_contract/manifest'].get;

    expect(operation.parameters).toBeUndefined();
    expect(operation.security).toBeUndefined();
    expect(operation.responses['200'].content['application/json'].schema.$ref).toBe(
      '#/components/schemas/ContractManifest',
    );
    expect(platform).toContain('test-only contract introspection');
    expect(platform).not.toMatch(/(Router|route\(|serve\(|listener|register\()/);
  });

  it('bounds the contracts-client package to generated direct Fetch output only', async () => {
    const files = await sourceFiles('packages/contracts-client/src');
    const relativeFiles = files
      .map((file) => file.slice(root.length + 1).replaceAll('\\', '/'))
      .sort();
    const [entrypoint, generated] = await Promise.all([
      rootFile('packages/contracts-client/src/index.ts'),
      rootFile('packages/contracts-client/src/generated/contracts.ts'),
    ]);

    expect(relativeFiles).toEqual([
      'packages/contracts-client/src/generated/contracts.ts',
      'packages/contracts-client/src/index.ts',
    ]);
    expect(entrypoint).toBe("export * from './generated/contracts.js';\n");
    expect(`${entrypoint}\n${generated}`).not.toMatch(/\b(auth|security|sse|retry|backoff)\b/i);
  });
});
