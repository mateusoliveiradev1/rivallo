import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** @param {string} path */
const rootFile = (path) => readFile(resolve(root, path), 'utf8');

describe('Phase 4 desktop sidecar build boundary', () => {
  it('prepares the locked local API sidecar before a no-bundle Tauri build', async () => {
    const [desktopPackage, helper, tauriConfig, gitignore] = await Promise.all([
      rootFile('apps/desktop/package.json'),
      rootFile('scripts/build-desktop.mjs'),
      rootFile('apps/desktop/src-tauri/tauri.conf.json'),
      rootFile('.gitignore'),
    ]);

    expect(desktopPackage).toContain('node ../../scripts/build-desktop.mjs');
    expect(helper).toContain("process.env.RUSTUP_AUTO_INSTALL = '0'");
    expect(helper).toContain("rustc, ['-vV']");
    expect(helper).toContain('rustcDetails.match(/^host:');
    expect(helper).toContain("'--locked'");
    expect(helper).toContain("'rivallo-platform'");
    expect(helper).toContain("'local_api'");
    expect(helper).toContain("await runTauri(['build', '--no-bundle'])");
    expect(helper).not.toMatch(/x86_64-pc-windows-msvc|aarch64-apple-darwin/);
    expect(tauriConfig).toContain('"externalBin": ["binaries/local_api"]');
    expect(gitignore).toContain('apps/desktop/src-tauri/binaries/local_api-*');
  });
});
