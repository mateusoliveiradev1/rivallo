import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const aggregateMode = process.argv[2] === 'check';
const requiredFiles = [
  'eslint.config.mjs',
  '.prettierrc.json',
  'pnpm-workspace.yaml',
  'Cargo.toml',
  'rust-toolchain.toml',
  'scripts/check-rust-quality.mjs',
  'scripts/verify-cargo-architecture.mjs',
  'scripts/verify-openapi-drift.mjs',
  'scripts/verify-contract-client-drift.mjs',
  'scripts/verify-cargo-workspace.mjs',
  'tooling-tests/workspace-config.test.mjs',
  'tsconfig.json',
  'turbo.json',
  'vitest.config.mjs',
];

await Promise.all(requiredFiles.map((file) => access(resolve(repositoryRoot, file))));

const [packageManifest, turboConfig] = await Promise.all([
  readFile(resolve(repositoryRoot, 'package.json'), 'utf8'),
  readFile(resolve(repositoryRoot, 'turbo.json'), 'utf8'),
]);

const packageJson = JSON.parse(packageManifest);
const turboJson = JSON.parse(turboConfig);

for (const command of [
  'format:check',
  'lint',
  'smoke',
  'test',
  'toolchains',
  'typecheck',
  'rust:fmt',
  'rust:clippy',
  'rust:test',
  'rust:architecture',
  'contracts:openapi:generate',
  'contracts:openapi:check',
  'contracts:client:generate',
  'contracts:client:check',
  'desktop:build',
  'check',
]) {
  if (typeof packageJson.scripts?.[command] !== 'string') {
    throw new Error(`Missing meaningful root quality command: ${command}`);
  }
}

if (
  turboJson.tasks?.quality?.cache !== false ||
  !Array.isArray(turboJson.tasks?.quality?.outputs)
) {
  throw new Error('Turbo quality task must be non-cached and declare no build outputs.');
}

/** @param {string[]} args */
const runNode = (args) => {
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  if (result.status !== 0 || result.error) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  if (result.stdout) process.stdout.write(result.stdout);
};

/** @param {string} script */
const runPnpm = (script) => {
  let command = 'pnpm';
  let args = ['run', script];
  if (process.platform === 'win32') {
    const located = spawnSync('where.exe', ['pnpm.cmd'], { encoding: 'utf8' });
    const shim = located.stdout?.split(/\r?\n/).find(Boolean);
    if (!shim) {
      console.error('Quality aggregate stopped: pnpm was not found on PATH.');
      process.exit(1);
    }
    command = process.execPath;
    args = [resolve(resolve(shim, '..'), 'node_modules', 'pnpm', 'bin', 'pnpm.mjs'), ...args];
  }
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0 || result.error) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    console.error(`Quality aggregate stopped at: pnpm ${script}`);
    process.exit(result.status ?? 1);
  }
  if (result.stdout) process.stdout.write(result.stdout);
};

if (aggregateMode) {
  for (const script of [
    'toolchains',
    'format:check',
    'lint',
    'typecheck',
    'test',
    'rust:fmt',
    'rust:clippy',
    'rust:test',
    'rust:architecture',
    'contracts:openapi:check',
    'contracts:client:check',
    'smoke',
  ]) {
    runPnpm(script);
  }
  console.log('All repository quality checks passed.');
  process.exit(0);
}

runNode(['scripts/verify-cargo-workspace.mjs']);
runNode(['scripts/check-rust-quality.mjs', 'fmt']);

console.log('Root JavaScript quality configuration is complete.');
