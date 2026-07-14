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
      rootFile('packages/contracts-client/src/generated/index.ts'),
    ]);

    expect(contracts).toContain('CONTRACT_VERSION');
    expect(contracts).toContain('ContractManifest');
    expect(platform).toContain('openapi');
    expect(document).toContain('"version": "0.1.0"');
    expect(document).toContain('ContractManifest');
    expect(generated).toContain('ContractManifest');

    for (const script of [
      'scripts/verify-openapi-drift.mjs',
      'scripts/verify-contract-client-drift.mjs',
    ]) {
      execFileSync(process.execPath, [script], { cwd: root, stdio: 'pipe' });
    }
  });
});

describe('Phase 3 scope fences', () => {
  it('keeps the schema-first foundation free of runtime and later-phase implementation', async () => {
    const files = await Promise.all(['crates', 'scripts'].map(sourceFiles));
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
      /\b(football|club|player|squad|league)\b/i,
    ];
    const allowedGeneratorFiles = new Set([resolve(root, 'scripts/verify-cargo-architecture.mjs')]);

    for (const [file, content] of inventory) {
      if (allowedGeneratorFiles.has(file)) continue;
      for (const pattern of prohibited) {
        expect(content, `${file} must not contain ${pattern}`).not.toMatch(pattern);
      }
    }

    const document = await rootFile('contracts/openapi.json');
    expect(document).toContain('"paths": {}');
    expect(document).not.toMatch(/"\/[^"\\]+"\s*:/);
  });

  it('bounds the contracts-client package to its approved generated core allowance', async () => {
    const files = await sourceFiles('packages/contracts-client/src');
    const relativeFiles = files
      .map((file) => file.slice(root.length + 1).replaceAll('\\', '/'))
      .sort();
    const allowedGeneratedFiles = [
      'generated/client.gen.ts',
      'generated/client/client.gen.ts',
      'generated/client/index.ts',
      'generated/client/types.gen.ts',
      'generated/client/utils.gen.ts',
      'generated/core/auth.gen.ts',
      'generated/core/bodySerializer.gen.ts',
      'generated/core/params.gen.ts',
      'generated/core/pathSerializer.gen.ts',
      'generated/core/queryKeySerializer.gen.ts',
      'generated/core/serverSentEvents.gen.ts',
      'generated/core/types.gen.ts',
      'generated/core/utils.gen.ts',
      'generated/index.ts',
      'generated/sdk.gen.ts',
      'generated/types.gen.ts',
    ];

    expect(relativeFiles).toEqual(
      [
        ...allowedGeneratedFiles.map((file) => `packages/contracts-client/src/${file}`),
        'packages/contracts-client/src/index.ts',
      ].sort(),
    );

    const [entrypoint, publicBarrel, publicTypes, publicMetadata] = await Promise.all([
      rootFile('packages/contracts-client/src/index.ts'),
      rootFile('packages/contracts-client/src/generated/index.ts'),
      rootFile('packages/contracts-client/src/generated/types.gen.ts'),
      rootFile('packages/contracts-client/src/generated/sdk.gen.ts'),
    ]);
    for (const publicSource of [entrypoint, publicBarrel, publicTypes, publicMetadata]) {
      expect(publicSource).not.toMatch(/generated\/core|auth|retry|backoff|sse/i);
    }
  });
});
