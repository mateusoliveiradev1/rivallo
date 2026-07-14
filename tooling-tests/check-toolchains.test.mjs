import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const validator = fileURLToPath(new URL('../scripts/check-toolchains.mjs', import.meta.url));

/** @param {Record<string, string>} tools @param {string} logFile */
const commands = (tools, logFile) =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(tools).map(([tool, version]) => [
        tool,
        [
          process.execPath,
          fileURLToPath(new URL('./fixtures/tool-version.mjs', import.meta.url)),
          tool,
          version,
          logFile,
        ],
      ]),
    ),
  );

/** @param {Record<string, string>} tools */
const runValidator = async (tools) => {
  const directory = await mkdtemp(join(tmpdir(), 'rivallo-toolchains-'));
  const logFile = join(directory, 'probes.jsonl');
  const child = spawn(process.execPath, [validator], {
    env: { ...process.env, RIVALLO_TOOLCHAIN_PROBE_COMMANDS: commands(tools, logFile) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => (stdout += chunk));
  child.stderr.on('data', (chunk) => (stderr += chunk));
  const status = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  const log = await readFile(logFile, 'utf8').catch(() => '');
  await rm(directory, { recursive: true, force: true });
  return { status, output: stdout + stderr, log };
};

const supported = { node: 'v24.16.0', pnpm: '11.8.0', rustc: '1.88.0', cargo: '1.88.0' };

describe('toolchain validator', () => {
  it('accepts stable compatible versions and protects every Rust/Cargo probe from rustup downloads', async () => {
    const result = await runValidator(supported);

    expect(result.status).toBe(0);
    expect(result.log).toContain('rustc:0');
    expect(result.log).toContain('cargo:0');
  });

  it.each([
    ['missing', { ...supported, node: 'MISSING' }, 'Node.js', 'unavailable'],
    ['below minimum', { ...supported, pnpm: '9.9.0' }, 'pnpm', '9.9.0'],
    ['unparsable', { ...supported, rustc: 'rustc unknown' }, 'rustc', 'unknown'],
    ['prerelease', { ...supported, cargo: '1.88.0-nightly' }, 'Cargo', '1.88.0-nightly'],
  ])(
    'rejects %s tool output with an actionable diagnostic',
    async (_name, tools, expectedTool, detected) => {
      const result = await runValidator(tools);

      expect(result.status).not.toBe(0);
      expect(result.output).toContain(`Expected tool: ${expectedTool}`);
      expect(result.output).toContain('Minimum version:');
      expect(result.output).toContain(`Detected version: ${detected}`);
      expect(result.output).toContain('Remediation: manually install');
    },
  );

  it('rejects Rust/Cargo release mismatches and exposes both detected versions', async () => {
    const result = await runValidator({ ...supported, cargo: '1.89.0' });

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('rustc: 1.88.0');
    expect(result.output).toContain('Cargo: 1.89.0');
  });

  it('fails closed for an unavailable selected Rust channel without invoking an installer', async () => {
    const result = await runValidator({ ...supported, rustc: 'UNAVAILABLE:1.88.0' });

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('Expected tool: rustc');
    expect(result.output).toContain('Minimum version: 1.88.0');
    expect(result.output).toContain('Detected version: unavailable selected toolchain 1.88.0');
    expect(result.output).toContain('manually install Rust 1.88.0');
    expect(result.output).not.toContain('rustup toolchain install');
  });
});
