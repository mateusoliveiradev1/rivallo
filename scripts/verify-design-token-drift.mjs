import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const committedArtifact = process.env.DESIGN_TOKENS_CSS
  ? resolve(process.env.DESIGN_TOKENS_CSS)
  : resolve(repositoryRoot, 'packages/design-tokens/src/generated.css');

/** @param {string} reason */
function reportDrift(reason) {
  console.error(`Design token drift detected: ${reason}`);
  console.error('Regenerate the committed artifact with:');
  console.error('pnpm tokens:generate');
  process.exitCode = 1;
}

function run() {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'rivallo-design-token-check-'));
  const temporaryArtifact = join(temporaryDirectory, 'generated.css');

  try {
    const result = spawnSync(
      process.execPath,
      ['scripts/generate-design-tokens.mjs', '--output', temporaryArtifact],
      { cwd: repositoryRoot, encoding: 'utf8' },
    );
    if (result.error || result.status !== 0) {
      const detail = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
      console.error('Design token drift check failed to generate isolated output.');
      if (detail) console.error(detail);
      process.exitCode = result.status ?? 1;
      return;
    }

    if (!existsSync(committedArtifact)) {
      reportDrift(`tracked artifact is missing at ${committedArtifact}.`);
      return;
    }

    if (!readFileSync(temporaryArtifact).equals(readFileSync(committedArtifact))) {
      reportDrift(`tracked bytes differ at ${committedArtifact}.`);
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

run();
