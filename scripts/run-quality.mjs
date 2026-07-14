import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const requiredFiles = [
  'eslint.config.mjs',
  '.prettierrc.json',
  'pnpm-workspace.yaml',
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

for (const command of ['format:check', 'lint', 'smoke', 'test', 'typecheck']) {
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

console.log('Root JavaScript quality configuration is complete.');
