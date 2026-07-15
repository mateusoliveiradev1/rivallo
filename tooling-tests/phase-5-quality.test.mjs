import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cleanVerifier = resolve(repositoryRoot, 'scripts/verify-clean-worktree.mjs');

/** @param {string} path */
const readRootFile = (path) => readFile(resolve(repositoryRoot, path), 'utf8');

async function createGitFixture() {
  const fixtureRoot = await mkdtemp(resolve(tmpdir(), 'rivallo-quality-'));
  const repository = resolve(fixtureRoot, 'repository');
  const harness = resolve(fixtureRoot, 'aggregate.mjs');
  const counter = resolve(fixtureRoot, 'counter.txt');
  await mkdir(repository);
  await writeFile(resolve(repository, '.gitignore'), 'ignored/\n');
  await writeFile(resolve(repository, 'tracked.txt'), 'baseline\n');
  await writeFile(
    harness,
    `import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const [mode, counter] = process.argv.slice(2);
await appendFile(counter, 'run\\n');
if (mode === 'tracked') await writeFile(resolve('tracked.txt'), 'changed\\n');
if (mode === 'untracked') await writeFile(resolve('unexpected.txt'), 'created\\n');
if (mode === 'ignored') {
  await mkdir(resolve('ignored'), { recursive: true });
  await writeFile(resolve('ignored', 'evidence.txt'), 'local\\n');
}
`,
  );
  execFileSync('git', ['init', '--quiet'], { cwd: repository });
  execFileSync('git', ['config', 'user.email', 'quality@example.invalid'], { cwd: repository });
  execFileSync('git', ['config', 'user.name', 'Quality Fixture'], { cwd: repository });
  execFileSync('git', ['add', '.gitignore', 'tracked.txt'], { cwd: repository });
  execFileSync('git', ['commit', '--quiet', '-m', 'fixture'], { cwd: repository });
  return { repository, harness, counter };
}

/**
 * @param {string} repository
 * @param {string} harness
 * @param {string} counter
 * @param {string} mode
 */
function runVerifier(repository, harness, counter, mode) {
  return spawnSync(
    process.execPath,
    [cleanVerifier, '--', process.execPath, harness, mode, counter],
    {
      cwd: repository,
      encoding: 'utf8',
    },
  );
}

describe('Phase 5 quality surfaces', () => {
  it('wires every authored surface to real non-mutating root commands', async () => {
    const [manifestSource, qualitySource, eslintSource, tsconfigSource] = await Promise.all([
      readRootFile('package.json'),
      readRootFile('scripts/run-quality.mjs'),
      readRootFile('eslint.config.mjs'),
      readRootFile('tsconfig.json'),
    ]);
    const manifest = JSON.parse(manifestSource);

    for (const command of [
      'components:test',
      'desktop:build',
      'format:check',
      'lint',
      'quality',
      'quality:clean',
      'tokens:check',
      'tokens:generate',
      'typecheck',
      'ui-lab:test',
    ]) {
      expect(manifest.scripts[command], `missing ${command}`).toBeTypeOf('string');
      expect(manifest.scripts[command].trim().length).toBeGreaterThan(0);
    }

    expect(manifest.scripts['ui-lab:test']).toContain('playwright test');
    expect(manifest.scripts['components:test']).toContain('vitest run');
    expect(manifest.scripts.quality).toContain('run-quality.mjs check');
    expect(manifest.scripts['quality:clean']).toContain('verify-clean-worktree.mjs');
    expect(qualitySource).toContain("'tokens:check'");
    expect(qualitySource).toContain("'components:test'");
    expect(qualitySource).toContain("'ui-lab:test'");
    expect(qualitySource).not.toMatch(/aggregateScripts[\s\S]*tokens:generate/u);
    expect(manifest.scripts['format:check']).toContain('browser-tests');
    expect(manifest.scripts['format:check']).toContain('apps/desktop/src/**/*.{ts,tsx,css}');
    expect(manifest.scripts.lint).toContain('browser-tests');
    expect(eslintSource).toContain("files: ['**/*.ts', '**/*.tsx']");
    expect(tsconfigSource).toContain('browser-tests/**/*.ts');
    expect(tsconfigSource).toContain('playwright.config.ts');
  });

  it('runs the supplied aggregate exactly twice and accepts unchanged clean or dirty baselines', async () => {
    const clean = await createGitFixture();
    const cleanResult = runVerifier(clean.repository, clean.harness, clean.counter, 'clean');
    expect(cleanResult.status, `${cleanResult.stdout}\n${cleanResult.stderr}`).toBe(0);
    expect((await readFile(clean.counter, 'utf8')).trim().split(/\r?\n/u)).toHaveLength(2);

    const dirty = await createGitFixture();
    await writeFile(resolve(dirty.repository, 'tracked.txt'), 'dirty baseline\n');
    const dirtyResult = runVerifier(dirty.repository, dirty.harness, dirty.counter, 'clean');
    expect(dirtyResult.status, `${dirtyResult.stdout}\n${dirtyResult.stderr}`).toBe(0);
  });

  it('accepts ignored evidence but rejects tracked and untracked status deltas actionably', async () => {
    const ignored = await createGitFixture();
    const ignoredResult = runVerifier(
      ignored.repository,
      ignored.harness,
      ignored.counter,
      'ignored',
    );
    expect(ignoredResult.status, `${ignoredResult.stdout}\n${ignoredResult.stderr}`).toBe(0);

    for (const mode of ['tracked', 'untracked']) {
      const fixture = await createGitFixture();
      const result = runVerifier(fixture.repository, fixture.harness, fixture.counter, mode);
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toContain('Quality command changed Git status');
      expect(`${result.stdout}\n${result.stderr}`).toMatch(
        /[?M]{1,2}\s+(tracked|unexpected)\.txt/u,
      );
    }
  });
});
