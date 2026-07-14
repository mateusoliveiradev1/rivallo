import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(resolve(rootDirectory, 'package.json'), 'utf8'));
const rustToolchain = readFileSync(resolve(rootDirectory, 'rust-toolchain.toml'), 'utf8');
const rustMinimum = rustToolchain.match(/^channel\s*=\s*"(\d+\.\d+\.\d+)"$/m)?.[1];

if (!rustMinimum) {
  throw new Error('rust-toolchain.toml must declare a numeric stable channel.');
}

const policy = [
  { id: 'node', label: 'Node.js', minimum: packageJson.engines.node.replace(/^>=/, '') },
  { id: 'pnpm', label: 'pnpm', minimum: packageJson.engines.pnpm.replace(/^>=/, '') },
  { id: 'rustc', label: 'rustc', minimum: rustMinimum },
  { id: 'cargo', label: 'Cargo', minimum: rustMinimum },
];

/** @returns {Record<string, string[]>} */
const injectedCommands = () => {
  const raw = process.env.RIVALLO_TOOLCHAIN_PROBE_COMMANDS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Object.values(parsed).some(
        (value) => !Array.isArray(value) || value.some((part) => typeof part !== 'string'),
      )
    ) {
      throw new Error('not an object of string arrays');
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`RIVALLO_TOOLCHAIN_PROBE_COMMANDS is invalid: ${message}`);
  }
};

const commandOverrides = injectedCommands();

/** @param {string} value */
const parseStableVersion = (value) => {
  const match = value.trim().match(/(?:^|\s|v)(\d+)\.(\d+)\.(\d+)(?![-.\w])/);
  return match ? match.slice(1).map(Number) : undefined;
};

/** @param {number[]} left @param {number[] | undefined} right */
const atLeast = (left, right) => {
  if (!right) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return true;
};

/** @param {string} id */
const probe = (id) => {
  const override = commandOverrides[id];
  const executable = process.platform === 'win32' ? `${id}.exe` : id;
  const [command, ...args] = override ?? [executable, '--version'];
  const environment =
    id === 'rustc' || id === 'cargo' ? { ...process.env, RUSTUP_AUTO_INSTALL: '0' } : process.env;
  if (process.platform === 'win32' && id === 'pnpm' && !override) {
    const located = spawnSync('where.exe', ['pnpm.cmd'], { encoding: 'utf8', env: environment });
    const shim = located.stdout?.split(/\r?\n/).find(Boolean);
    if (shim) {
      return spawnSync(
        process.execPath,
        [resolve(dirname(shim), 'node_modules', 'pnpm', 'bin', 'pnpm.mjs'), ...args],
        { encoding: 'utf8', env: environment },
      );
    }
  }
  return spawnSync(command, args, {
    encoding: 'utf8',
    env: environment,
  });
};

/** @param {{ id: string, label: string, minimum: string }} tool @param {string} detected */
const report = (tool, detected) => {
  console.error(`Expected tool: ${tool.label}.`);
  console.error(`Minimum version: ${tool.minimum}.`);
  console.error(`Detected version: ${detected}.`);
  const installName = tool.id === 'rustc' || tool.id === 'cargo' ? 'Rust' : tool.label;
  console.error(
    `Remediation: manually install ${installName} ${tool.minimum} or newer, then rerun pnpm toolchains.`,
  );
};

const detected = new Map();
let failed = false;
for (const tool of policy) {
  const result = probe(tool.id);
  const rawOutput = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  if (result.error || result.status !== 0) {
    const selected = rawOutput.match(/toolchain '([^']+)' is not installed/)?.[1];
    const value = selected ? `unavailable selected toolchain ${selected}` : 'unavailable';
    detected.set(tool.id, value);
    report(tool, value);
    failed = true;
    continue;
  }
  const displayOutput = rawOutput.replace(/^(?:rustc|cargo)\s+/, '');
  const version = parseStableVersion(rawOutput);
  if (!version) {
    detected.set(tool.id, displayOutput || 'unparsable output');
    report(tool, displayOutput || 'unparsable output');
    failed = true;
    continue;
  }
  const normalized = version.join('.');
  detected.set(tool.id, normalized);
  if (!atLeast(version, parseStableVersion(tool.minimum))) {
    report(tool, normalized);
    failed = true;
  }
}

if (
  detected.get('rustc') &&
  detected.get('cargo') &&
  detected.get('rustc') !== detected.get('cargo')
) {
  console.error('Rust/Cargo version mismatch.');
  console.error(`rustc: ${detected.get('rustc')}.`);
  console.error(`Cargo: ${detected.get('cargo')}.`);
  console.error(
    `Remediation: manually install matching Rust and Cargo ${rustMinimum} or newer, then rerun pnpm toolchains.`,
  );
  failed = true;
}

if (failed) process.exitCode = 1;
