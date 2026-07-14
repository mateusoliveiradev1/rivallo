import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** @param {string} file */
const rootFile = (file) => readFile(resolve(root, file), 'utf8');

describe('Phase 4 local PostgreSQL infrastructure', () => {
  it('declares one bounded PostgreSQL service with persistent storage and readiness', async () => {
    const compose = await rootFile('docker-compose.yml');

    expect(compose).toMatch(/^services:\s*\r?\n {2}postgres:\s*$/m);
    const servicesBlock = compose.split(/^volumes:\s*$/m)[0];
    expect(servicesBlock.match(/^ {2}[a-z][\w-]*:\s*$/gm)).toEqual(['  postgres:']);
    expect(compose).toContain('image: postgres:17-alpine');
    expect(compose).toContain('127.0.0.1:${RIVALLO_POSTGRES_PORT:-5432}:5432');
    expect(compose).toContain('${RIVALLO_POSTGRES_DB:-rivallo_dev}');
    expect(compose).toContain('${RIVALLO_POSTGRES_USER:-rivallo}');
    expect(compose).toContain('${RIVALLO_POSTGRES_PASSWORD:-rivallo_local}');
    expect(compose).toContain('rivallo-postgres-data:/var/lib/postgresql/data');
    expect(compose).toMatch(/healthcheck:[\s\S]*pg_isready/);
    expect(compose).toContain('$$POSTGRES_USER');
    expect(compose).toContain('$$POSTGRES_DB');
    expect(compose).toMatch(/^volumes:\s*\r?\n {2}rivallo-postgres-data:\s*$/m);
    expect(compose).not.toMatch(/initdb|migration|schema|seed|fixture|neon|build:|depends_on:/i);
  });

  it('documents preserving normal operations apart from explicit destructive cleanup', async () => {
    const documentation = await rootFile('docs/operations/local-development.md');
    const trackedFiles = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });

    expect(documentation).toContain('docker compose up -d postgres');
    expect(documentation).toContain('docker compose ps postgres');
    expect(documentation).toMatch(/Normal stop[\s\S]*docker compose down/);
    expect(documentation).toMatch(/Destructive cleanup[\s\S]*docker compose down --volumes/);
    expect(documentation.indexOf('docker compose down --volumes')).toBeGreaterThan(
      documentation.indexOf('docker compose down'),
    );
    expect(documentation).toContain('RIVALLO_POSTGRES_PORT');
    expect(documentation).toContain('non-secret local development defaults');
    expect(trackedFiles.split(/\r?\n/)).not.toContain('.env');
  });
});

describe('Phase 4 scoped CI', () => {
  it('exposes exactly three non-publishing Linux jobs over real root commands', async () => {
    const [workflow, packageManifest, qualityRunner, vitestConfig] = await Promise.all([
      rootFile('.github/workflows/ci.yml'),
      rootFile('package.json'),
      rootFile('scripts/run-quality.mjs'),
      rootFile('vitest.config.mjs'),
    ]);
    const packageJson = JSON.parse(packageManifest);
    const jobs = workflow.split(/^jobs:\s*$/m)[1];

    expect(workflow).toMatch(/^on:\s*\r?\n {2}pull_request:\s*$/m);
    expect(workflow).toMatch(/push:\s*\r?\n {4}branches: \[main\]/);
    expect(jobs.match(/^ {2}[a-z][\w-]+:\s*$/gm)).toEqual([
      '  javascript-typescript:',
      '  rust-contracts:',
      '  desktop-linux:',
    ]);
    expect(workflow.match(/runs-on: ubuntu-latest/g)).toHaveLength(3);
    expect(workflow.match(/pnpm install --frozen-lockfile/g)).toHaveLength(3);
    expect(workflow.match(/uses: actions\/checkout@v4/g)).toHaveLength(3);
    expect(workflow.match(/uses: pnpm\/action-setup@v4/g)).toHaveLength(3);
    expect(workflow.match(/uses: actions\/setup-node@v4/g)).toHaveLength(3);
    expect(workflow.match(/cache: pnpm/g)).toHaveLength(3);
    expect(workflow.match(/cache-dependency-path: pnpm-lock.yaml/g)).toHaveLength(3);

    expect(workflow).toContain('pnpm format:check');
    expect(workflow).toContain('pnpm lint');
    expect(workflow).toContain('pnpm typecheck');
    expect(workflow).toContain('pnpm rust:fmt');
    expect(workflow).toContain('pnpm rust:clippy');
    expect(workflow).toContain('pnpm rust:test');
    expect(workflow).toContain('pnpm rust:architecture');
    expect(workflow).toContain('pnpm contracts:openapi:check');
    expect(workflow).toContain('pnpm contracts:client:check');
    expect(workflow).toContain('pnpm desktop:build');
    expect(packageJson.scripts['desktop:build']).toBe('node scripts/build-desktop.mjs');
    expect(qualityRunner).toContain("'desktop:build'");
    expect(vitestConfig).toContain('fileParallelism: false');

    expect(workflow).not.toMatch(
      /upload-artifact|download-artifact|actions\/cache|publish|release|deploy|docker|matrix:|windows-|macos-|contracts:(?:openapi|client):generate|--bundles?/i,
    );
  });
});
