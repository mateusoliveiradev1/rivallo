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
