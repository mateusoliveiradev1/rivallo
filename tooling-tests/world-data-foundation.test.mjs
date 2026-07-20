import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('Phase 06.5 world-data foundation', () => {
  it('keeps the official package checksum synchronized with its exact world payload', async () => {
    const packageRoot = resolve(root, 'data/packages/official.rivallo.foundation');
    const [manifestSource, world] = await Promise.all([
      readFile(resolve(packageRoot, 'manifest.json'), 'utf8'),
      readFile(resolve(packageRoot, 'data/world.json')),
    ]);
    const manifest = JSON.parse(manifestSource);
    expect(manifest.packageId).toBe('official.rivallo.foundation');
    expect(manifest.checksum).toBe(`sha256:${createHash('sha256').update(world).digest('hex')}`);
  });

  it('keeps every bundled asset reference pinned to its exact SHA-256', async () => {
    /** @type {{ assets: Array<{ id: string; path: string; checksum: string }> }} */
    const world = JSON.parse(
      await readFile(
        resolve(root, 'data/packages/official.rivallo.foundation/data/world.json'),
        'utf8',
      ),
    );

    await Promise.all(
      world.assets.map(async (asset) => {
        const bytes = await readFile(resolve(root, 'apps/desktop/src', asset.path));
        expect(asset.checksum, asset.id).toBe(
          `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
        );
      }),
    );
  });

  it('runs the public package isolation guard successfully', () => {
    expect(() =>
      execFileSync(process.execPath, ['scripts/verify-public-data-packages.mjs'], {
        cwd: root,
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });
});
