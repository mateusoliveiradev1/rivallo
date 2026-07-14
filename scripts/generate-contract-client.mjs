import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectory = resolve(repositoryRoot, 'packages', 'contracts-client');
const generator = resolve(repositoryRoot, 'node_modules', 'orval', 'dist', 'bin', 'orval.mjs');
const args = [generator, '--config', 'orval.config.ts'];
const output = process.env.CONTRACT_CLIENT_OUTPUT
  ? resolve(process.env.CONTRACT_CLIENT_OUTPUT)
  : resolve(packageDirectory, 'src', 'generated', 'contracts.ts');
const prettier = resolve(repositoryRoot, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
const prettierConfig = resolve(repositoryRoot, '.prettierrc.json');

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

const formatting = spawnSync(
  process.execPath,
  [prettier, '--config', prettierConfig, '--write', output],
  {
    cwd: repositoryRoot,
    encoding: 'utf8',
  },
);

if (formatting.error || formatting.status !== 0) {
  const detail = `${formatting.stdout ?? ''}${formatting.stderr ?? ''}`.trim();
  console.error('Contract client formatting failed: pnpm contracts:client:generate');
  if (detail) console.error(detail);
  process.exit(formatting.status ?? 1);
}
