import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(repositoryRoot, 'contracts', 'openapi.json');
const cargo = process.platform === 'win32' ? 'cargo.exe' : 'cargo';
const environment = { ...process.env, RUSTUP_AUTO_INSTALL: '0' };
const args = [
  'run',
  '--quiet',
  '--package',
  'rivallo-platform',
  '--bin',
  'export-openapi',
  '--',
  '--output',
  output,
];

mkdirSync(dirname(output), { recursive: true });

const result = spawnSync(cargo, args, {
  cwd: repositoryRoot,
  encoding: 'utf8',
  env: environment,
});

if (result.error || result.status !== 0) {
  const detail = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  console.error(`OpenAPI generation failed: ${cargo} ${args.join(' ')}`);
  if (detail) console.error(detail);
  process.exit(result.status ?? 1);
}
