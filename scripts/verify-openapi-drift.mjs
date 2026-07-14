import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const committedDocument = process.env.OPENAPI_DOCUMENT
  ? resolve(process.env.OPENAPI_DOCUMENT)
  : resolve(repositoryRoot, 'contracts', 'openapi.json');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'rivallo-openapi-'));
const temporaryDocument = join(temporaryDirectory, 'openapi.json');
const cargo = process.platform === 'win32' ? 'cargo.exe' : 'cargo';
const args = [
  'run',
  '--quiet',
  '--package',
  'rivallo-platform',
  '--bin',
  'export-openapi',
  '--',
  '--output',
  temporaryDocument,
];

try {
  const result = spawnSync(cargo, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, RUSTUP_AUTO_INSTALL: '0' },
  });

  if (result.error || result.status !== 0) {
    const detail = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    console.error(`OpenAPI drift check failed to export: ${cargo} ${args.join(' ')}`);
    if (detail) console.error(detail);
    process.exit(result.status ?? 1);
  }

  if (!readFileSync(temporaryDocument).equals(readFileSync(committedDocument))) {
    console.error('OpenAPI drift detected. Regenerate the committed document with:');
    console.error('pnpm contracts:openapi:generate');
    process.exitCode = 1;
  }
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}
