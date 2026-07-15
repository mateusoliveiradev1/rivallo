import { spawnSync } from 'node:child_process';

const separatorIndex = process.argv.indexOf('--');
const commandParts = separatorIndex >= 0 ? process.argv.slice(separatorIndex + 1) : [];

if (commandParts.length === 0) {
  console.error(
    'Usage: node scripts/verify-clean-worktree.mjs -- <aggregate-command> [arguments...]',
  );
  process.exit(2);
}

const [command, ...args] = commandParts;

function gitStatus() {
  const result = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    encoding: 'utf8',
  });
  if (result.status !== 0 || result.error) {
    if (result.stderr) process.stderr.write(result.stderr);
    console.error(
      'Unable to read the Git status baseline. Run this command inside a Git repository.',
    );
    process.exit(result.status ?? 1);
  }
  return result.stdout.replace(/\r\n/gu, '\n');
}

/** @param {string} before @param {string} after */
function statusDelta(before, after) {
  const beforeLines = new Set(before.split('\n').filter(Boolean));
  const afterLines = new Set(after.split('\n').filter(Boolean));
  return {
    removed: [...beforeLines].filter((line) => !afterLines.has(line)),
    added: [...afterLines].filter((line) => !beforeLines.has(line)),
  };
}

/** @param {number} iteration */
function runAggregate(iteration) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0 || result.error) {
    if (result.error) console.error(result.error.message);
    console.error(`Quality aggregate failed during run ${iteration} of 2.`);
    process.exit(result.status ?? 1);
  }
}

const baseline = gitStatus();

for (let iteration = 1; iteration <= 2; iteration += 1) {
  runAggregate(iteration);
  const current = gitStatus();
  if (current !== baseline) {
    const delta = statusDelta(baseline, current);
    console.error(`Quality command changed Git status after run ${iteration} of 2.`);
    for (const line of delta.removed) console.error(`- ${line}`);
    for (const line of delta.added) console.error(`+ ${line}`);
    console.error('Restore or intentionally commit the reported files, then rerun quality:clean.');
    process.exit(1);
  }
}

console.log('Quality aggregate passed twice without changing Git status.');
