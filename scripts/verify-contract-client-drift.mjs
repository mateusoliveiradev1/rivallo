import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const committedOutput = process.env.CONTRACT_CLIENT_DIRECTORY
  ? resolve(process.env.CONTRACT_CLIENT_DIRECTORY)
  : resolve(repositoryRoot, 'packages', 'contracts-client', 'src', 'generated');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'rivallo-contract-client-'));
const temporaryOutput = join(temporaryDirectory, 'generated');

/** @param {string} directory */
const inventory = (directory) =>
  readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)))
    .sort();

try {
  const result = spawnSync(process.execPath, ['scripts/generate-contract-client.mjs'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env, CONTRACT_CLIENT_OUTPUT: temporaryOutput },
  });

  if (result.error || result.status !== 0) {
    const detail = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    console.error('Contract client drift check failed to generate isolated output.');
    if (detail) console.error(detail);
    process.exit(result.status ?? 1);
  }

  const expectedFiles = inventory(committedOutput);
  const actualFiles = inventory(temporaryOutput);
  const filesMatch =
    expectedFiles.length === actualFiles.length &&
    expectedFiles.every((file, index) => file === actualFiles[index]);
  const bytesMatch =
    filesMatch &&
    expectedFiles.every((file) =>
      readFileSync(join(committedOutput, file)).equals(readFileSync(join(temporaryOutput, file))),
    );

  if (!bytesMatch) {
    console.error('Contract client drift detected. Regenerate the committed output with:');
    console.error('pnpm contracts:client:generate');
    process.exitCode = 1;
  }
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}
