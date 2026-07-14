import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectory = resolve(repositoryRoot, 'packages', 'contracts-client');
const generator = resolve(
  repositoryRoot,
  'node_modules',
  '@hey-api',
  'openapi-ts',
  'bin',
  'run.js',
);
const args = [generator, '--file', 'openapi-ts.config.ts'];

if (process.env.CONTRACT_CLIENT_OUTPUT) {
  args.push('--output', process.env.CONTRACT_CLIENT_OUTPUT);
}

const result = spawnSync(process.execPath, args, {
  cwd: packageDirectory,
  encoding: 'utf8',
});

if (result.error || result.status !== 0) {
  const detail = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  console.error('Contract client generation failed: pnpm contracts:client:generate');
  if (detail) console.error(detail);
  process.exit(result.status ?? 1);
}
