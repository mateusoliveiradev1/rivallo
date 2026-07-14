import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** @param {string} path */
const rootFile = (path) => readFile(resolve(root, path), 'utf8');

/** @param {string} directory @returns {Promise<string[]>} */
const sourceFiles = async (directory) => {
  const entries = await readdir(resolve(root, directory), { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = `${directory}/${entry.name}`;
      return entry.isDirectory()
        ? sourceFiles(path)
        : Promise.resolve(['.rs', '.ts', '.tsx'].includes(extname(entry.name)) ? [path] : []);
    }),
  );
  return nested.flat();
};

describe('Phase 4 inert local-persistence boundary', () => {
  it('keeps the port and public recovery taxonomy application-owned', async () => {
    const [application, applicationManifest] = await Promise.all([
      rootFile('crates/application/src/persistence.rs'),
      rootFile('crates/application/Cargo.toml'),
    ]);

    expect(application).toContain('pub trait LocalPersistencePort');
    expect(application).toContain('Unavailable');
    expect(application).toContain('InvalidData');
    expect(application).not.toMatch(/sqlite|sqlx|rusqlite|migration|schema|seed/i);
    expect(applicationManifest).not.toMatch(/sqlite|sqlx|rusqlite|platform/i);
  });

  it('requires a resolver-injected platform adapter with no storage side effects', async () => {
    const [adapter, platformManifest] = await Promise.all([
      rootFile('crates/platform/src/persistence/sqlite.rs'),
      rootFile('crates/platform/Cargo.toml'),
    ]);

    expect(adapter).toContain('pub trait LocalDataDirectoryResolver');
    expect(adapter).toContain('pub struct SqlitePersistenceAdapter');
    expect(adapter).toContain('impl<R: LocalDataDirectoryResolver> LocalPersistencePort');
    expect(adapter).toContain('resolver: R');
    expect(adapter).not.toMatch(
      /std::fs|create_dir|create_new|File::|Connection|connect\(|execute\(|migration|schema|seed/i,
    );
    expect(adapter).not.toMatch(/\.\.\/|\.\.\\|target\/|target\\|Cargo\.toml/);
    expect(platformManifest).not.toMatch(/\b(sqlite|sqlx|rusqlite)\b/i);
  });

  it('keeps SQLite knowledge out of inner and UI-facing source', async () => {
    const protectedFiles = (
      await Promise.all(
        [
          'crates/domain/src',
          'crates/application/src',
          'apps/desktop/src',
          'apps/desktop/src-tauri/src',
        ].map(sourceFiles),
      )
    ).flat();
    const protectedSources = await Promise.all(protectedFiles.map(rootFile));

    for (const source of protectedSources) expect(source).not.toMatch(/sqlite|sqlx|rusqlite/i);
  });
});
